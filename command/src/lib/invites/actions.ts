"use server";

/*
  HAND Command Center — invite server actions.

  Invites are the hand-off mechanism (see docs/ACCESS-CONTROL.md): an admin
  pre-assigns a role (+ optional reciprocate_group) and an expiry; the redeemer
  signs in and lands at status='active' on that role. One-time use.

  Service-role writes BYPASS RLS, so every mutation gates on
  requireCapability('users.manage') FIRST — that is the real write gate. The
  invites_admin_all RLS policy is defense-in-depth for the read path.

  createInvite() is exported with a stable signature: a later Apply-flow build
  imports it for its approve step.
*/
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  requireCapability,
  getCurrentUser,
  type CommandRole,
} from "@/lib/supabase/profile";
import { sendEmail } from "@/lib/notify/email";
import type { CreateInviteResult, RedeemResult } from "./types";

const VALID_ROLES: CommandRole[] = [
  "admin",
  "funding_lead",
  "develop_rep",
  "contributor",
  "viewer",
];

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "command" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_COMMAND_BASE_URL?.replace(/\/$/, "") ||
    "https://command.handprotocol.org"
  );
}

function inviteLink(code: string): string {
  return `${baseUrl()}/auth/invite/${code}`;
}

// URL-safe random code. crypto-grade (no Math.random); hex is already URL-safe.
function generateCode(): string {
  return randomBytes(24).toString("hex");
}

function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type CreateInviteArgs = {
  role: CommandRole;
  email?: string;
  reciprocate_group?: string;
  expiresInDays?: number;
  sendEmail?: boolean;
};

/**
 * Create a one-time invite. Admin-only (users.manage). Returns the code, the
 * redemption link, and whether an email was actually dispatched.
 *
 * STABLE SIGNATURE — the Apply-flow build imports this for its approve step.
 */
export async function createInvite({
  role,
  email,
  reciprocate_group,
  expiresInDays = 14,
  sendEmail: shouldEmail,
}: CreateInviteArgs): Promise<CreateInviteResult> {
  const admin = await requireCapability("users.manage");

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const days = Number.isFinite(expiresInDays) && expiresInDays > 0
    ? Math.min(Math.round(expiresInDays), 365)
    : 14;

  const code = generateCode();
  const cleanEmail = email?.trim() || null;
  const cleanGroup = reciprocate_group?.trim() || null;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const client = adminClient();
  const { error } = await client.from("invites").insert({
    code,
    email: cleanEmail,
    role,
    reciprocate_group: cleanGroup,
    expires_at: expiresAt.toISOString(),
    created_by: admin.id,
  });
  if (error) {
    throw new Error(`Could not create invite: ${error.message}`);
  }

  const link = inviteLink(code);

  let emailed = false;
  if (shouldEmail && cleanEmail) {
    const result = await sendEmail({
      to: cleanEmail,
      subject: "You're invited to the HAND Command Center",
      html: inviteEmailHtml(link, role),
      text: inviteEmailText(link, role),
    });
    emailed = result.ok;
  }

  revalidatePath("/settings");
  return { code, link, emailed };
}

/** Revoke an invite. Admin-only. Hard-deletes the row (it's single-use). */
export async function revokeInvite(code: string): Promise<{ ok: true }> {
  await requireCapability("users.manage");
  const client = adminClient();
  const { error } = await client.from("invites").delete().eq("code", code);
  if (error) {
    throw new Error(`Could not revoke invite: ${error.message}`);
  }
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Redeem an invite for the currently-authenticated user. Validates the code,
 * upserts the caller's profile to the invite's role at status='active', and
 * stamps the invite used. Idempotent: a re-redeem by the same user succeeds.
 *
 * Returns a typed result rather than throwing on the expected failure modes so
 * the redemption page can show a clear message.
 */
export async function redeemInvite(code: string): Promise<RedeemResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not-authenticated" };

  const client = adminClient();

  const { data: invite, error } = await client
    .from("invites")
    .select("code, role, reciprocate_group, expires_at, used_at, used_by")
    .eq("code", code)
    .maybeSingle();

  if (error || !invite) return { ok: false, error: "invalid" };

  // Idempotency: already redeemed by this same user → treat as success.
  if (invite.used_at) {
    if (invite.used_by === user.id) {
      return {
        ok: true,
        role: invite.role as CommandRole,
        reciprocate_group: (invite.reciprocate_group as string | null) ?? null,
      };
    }
    return { ok: false, error: "used" };
  }

  if (new Date(invite.expires_at as string).getTime() <= Date.now()) {
    return { ok: false, error: "expired" };
  }

  const role = invite.role as CommandRole;
  const group = (invite.reciprocate_group as string | null) ?? null;

  // Apply the invited role + active status to the caller's profile. The
  // handle_new_user trigger creates a pending row on first sign-up, so in the
  // normal flow this is an UPDATE. We upsert defensively in case the row is
  // somehow absent; profiles.email is NOT NULL, so only include it when we have
  // one (never overwrite an existing email with null).
  const profileRow: Record<string, unknown> = {
    id: user.id,
    role,
    status: "active",
    reciprocate_group: group,
  };
  if (user.email) profileRow.email = user.email;

  const { error: profileErr } = await client
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });
  if (profileErr) {
    throw new Error(`Could not apply invite role: ${profileErr.message}`);
  }

  // Stamp the invite consumed. Guard on used_at IS NULL so a concurrent redeem
  // can't double-stamp; if it lost the race the profile write above is still a
  // safe idempotent no-op.
  await client
    .from("invites")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("code", code)
    .is("used_at", null);

  return { ok: true, role, reciprocate_group: group };
}

// ─── Email bodies ───────────────────────────────────────────────────────────
function inviteEmailHtml(link: string, role: CommandRole): string {
  const safeLink = escapeHtml(link);
  return [
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1208;line-height:1.6">`,
    `<h2 style="margin:0 0 12px">You're invited to the HAND Command Center</h2>`,
    `<p style="margin:0 0 16px">You've been invited to join as <strong>${escapeHtml(role)}</strong>. Click below to accept and set up your access.</p>`,
    `<p style="margin:0 0 20px"><a href="${safeLink}" style="display:inline-block;background:#d97706;color:#1a1208;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Accept invite</a></p>`,
    `<p style="margin:0 0 4px;font-size:13px;color:#555">Or paste this link into your browser:</p>`,
    `<p style="margin:0;font-size:13px;word-break:break-all"><a href="${safeLink}">${safeLink}</a></p>`,
    `<p style="margin:24px 0 0;font-size:12px;color:#888">HAND Protocol · 501(c)(3) in formation · Austin, TX</p>`,
    `</div>`,
  ].join("");
}

function inviteEmailText(link: string, role: CommandRole): string {
  return [
    "You're invited to the HAND Command Center.",
    "",
    `You've been invited to join as ${role}. Open this link to accept:`,
    link,
    "",
    "HAND Protocol · 501(c)(3) in formation · Austin, TX",
  ].join("\n");
}
