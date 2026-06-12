"use server";

/*
  HAND Command Center — access-application server actions.

  Two trust zones live in this file:

  1. submitApplication() is PUBLIC (no auth). It writes with the service_role,
     which BYPASSES RLS, so it is hardened defensively:
       - honeypot field → silent success, no row written
       - every field length-capped before insert
       - email shape validated; required fields enforced
       - desired_role server-side clamped to the self-service set (never 'admin')
       - no raw IP stored (ip_hash stays null); only a coarse source/user_agent
       - never throws to the visitor; returns { ok } or a typed validation error
       - secrets/internal errors are swallowed (logged), never surfaced
     Best-effort Telegram ping + dormant applicant email ack ride after the
     insert and can never fail the request.

  2. approveApplication()/rejectApplication() are ADMIN-only. They gate on
     requireCapability('users.manage') FIRST (the real write gate, since
     service-role bypasses RLS), then mutate. Approve issues an invite via the
     shared createInvite() and stamps the code back onto the application so the
     two records stay linked (see docs/ACCESS-CONTROL.md "Apply flow").
*/
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { requireCapability, type CommandRole } from "@/lib/supabase/profile";
import { createInvite } from "@/lib/invites/actions";
import { notify } from "@/lib/notify/telegram";
import { sendEmail } from "@/lib/notify/email";
import {
  APPLICATION_LIMITS,
  isSelfServiceRole,
  type AccessApplication,
  type SubmitApplicationInput,
  type SubmitApplicationResult,
  type SubmitFieldError,
} from "./types";

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

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// Trim, collapse, and hard-cap a free-text field. Returns null for empty so
// optional columns stay null rather than "".
function clean(raw: unknown, max: number): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, max);
}

// Pragmatic email shape check. Not RFC-exhaustive; just enough to reject
// obvious garbage before a service-role insert. Length capped first.
function validEmail(value: string): boolean {
  if (value.length > APPLICATION_LIMITS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ─── PUBLIC: submit an application ──────────────────────────────────────────
/**
 * PUBLIC (no auth). Accept an access request from the apply form, validate +
 * harden it, and insert a pending row via the service_role. Best-effort team
 * Telegram ping + dormant applicant email ack follow. Never throws to the
 * visitor; returns { ok } or a typed validation error.
 */
export async function submitApplication(
  input: SubmitApplicationInput,
): Promise<SubmitApplicationResult> {
  // Honeypot: a hidden field humans never see/fill. If it's populated, treat as
  // a bot — return success but write nothing.
  if (input.company_website && String(input.company_website).trim()) {
    return { ok: true };
  }

  const fields: SubmitFieldError[] = [];

  const email = clean(input.email, APPLICATION_LIMITS.email) ?? "";
  if (!email || !validEmail(email)) fields.push("email");

  const name = clean(input.name, APPLICATION_LIMITS.name);
  if (!name) fields.push("name");

  // Clamp the requested role to the self-service set. 'admin' (or anything
  // unrecognized) is rejected server-side regardless of what was posted.
  const desiredRole = clean(input.desired_role, 40) ?? "";
  if (!isSelfServiceRole(desiredRole)) fields.push("desired_role");

  const message = clean(input.message, APPLICATION_LIMITS.message);

  if (fields.length > 0) {
    return { ok: false, error: "validation", fields };
  }

  const organization = clean(input.organization, APPLICATION_LIMITS.organization);
  const reciprocateGroup = clean(
    input.reciprocate_group,
    APPLICATION_LIMITS.reciprocate_group,
  );
  const source = clean(input.source, APPLICATION_LIMITS.source);

  // user_agent is read from the request headers, not the client payload, so a
  // caller can't stuff it. Capped defensively all the same. ip_hash stays null
  // by design — we don't store raw IPs for an anonymous-friendly form.
  let userAgent: string | null = null;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    userAgent = clean(h.get("user-agent"), APPLICATION_LIMITS.user_agent);
  } catch {
    userAgent = null;
  }

  // Without Supabase configured (local scaffold preview) there's nowhere to
  // write — report success so the form UX is exercisable, but skip the insert.
  if (!configured()) {
    return { ok: true };
  }

  try {
    const client = adminClient();
    const { error } = await client.from("access_applications").insert({
      email,
      name,
      organization,
      desired_role: desiredRole,
      reciprocate_group: reciprocateGroup,
      message,
      status: "pending",
      source,
      user_agent: userAgent,
      ip_hash: null,
    });
    if (error) {
      // Log server-side; never surface the DB error to the public caller.
      console.error(`[apply] insert failed: ${error.message}`);
      return { ok: false, error: "validation", fields: [] };
    }
  } catch (err) {
    console.error(
      `[apply] insert threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ok: false, error: "validation", fields: [] };
  }

  // Best-effort team notification + applicant ack. Neither can fail the request.
  await notify("alerts", {
    title: "New Command Center access request",
    lines: [
      `<b>${name}</b> · ${email}`,
      organization ? `Org: ${organization}` : "",
      `Wants: ${desiredRole}${reciprocateGroup ? ` · ${reciprocateGroup}` : ""}`,
      message ? `“${message.slice(0, 300)}”` : "",
      "Review in /settings → Applications",
    ].filter(Boolean),
  }).catch(() => {});

  await sendEmail({
    to: email,
    subject: "We received your HAND Command Center request",
    html: ackEmailHtml(name),
    text: ackEmailText(name),
  }).catch(() => {});

  revalidatePath("/settings");
  return { ok: true };
}

// ─── ADMIN: approve an application → issue an invite ────────────────────────
export type ApproveApplicationArgs = {
  role: CommandRole;
  reciprocate_group?: string;
  expiresInDays?: number;
  sendEmail?: boolean;
};

/**
 * Admin-only (users.manage). Load the application, issue an invite at the
 * chosen role via the shared createInvite(), stamp the invite code + review
 * metadata back onto the application, and return the redemption link so the UI
 * can surface it (the invite email is optional/dormant — the link always works).
 */
export async function approveApplication(
  id: string,
  { role, reciprocate_group, expiresInDays, sendEmail }: ApproveApplicationArgs,
): Promise<{ inviteLink: string }> {
  const admin = await requireCapability("users.manage");

  const client = adminClient();
  const { data: application, error } = await client
    .from("access_applications")
    .select("id, email, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !application) {
    throw new Error("Application not found");
  }
  const app = application as Pick<AccessApplication, "id" | "email" | "status">;
  if (app.status !== "pending") {
    throw new Error(`Application already ${app.status}`);
  }

  // Issue the invite. createInvite re-checks users.manage and validates the
  // role; it returns { code, link, emailed }.
  const invite = await createInvite({
    role,
    email: app.email,
    reciprocate_group,
    expiresInDays,
    sendEmail,
  });

  const { error: updateErr } = await client
    .from("access_applications")
    .update({
      status: "approved",
      invite_code: invite.code,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateErr) {
    throw new Error(`Could not update application: ${updateErr.message}`);
  }

  revalidatePath("/settings");
  return { inviteLink: invite.link };
}

// ─── ADMIN: reject an application ───────────────────────────────────────────
export async function rejectApplication(id: string): Promise<{ ok: true }> {
  const admin = await requireCapability("users.manage");

  const client = adminClient();
  const { error } = await client
    .from("access_applications")
    .update({
      status: "rejected",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(`Could not reject application: ${error.message}`);
  }

  revalidatePath("/settings");
  return { ok: true };
}

// ─── Applicant acknowledgement email (dormant until Resend is configured) ───
function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ackEmailHtml(name: string | null): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
  return [
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1208;line-height:1.6">`,
    `<h2 style="margin:0 0 12px">We received your request</h2>`,
    `<p style="margin:0 0 16px">${greeting}</p>`,
    `<p style="margin:0 0 16px">Thanks for asking to join the HAND Command Center. A member of the team will review your request and, if it's a fit, send you an invite link to set up access.</p>`,
    `<p style="margin:0 0 16px">No account is created until you accept that invite — there's nothing more to do for now.</p>`,
    `<p style="margin:24px 0 0;font-size:12px;color:#888">HAND Protocol · 501(c)(3) in formation · Austin, TX</p>`,
    `</div>`,
  ].join("");
}

function ackEmailText(name: string | null): string {
  const greeting = name ? `Hi ${name},` : "Hello,";
  return [
    "We received your request",
    "",
    greeting,
    "",
    "Thanks for asking to join the HAND Command Center. A member of the team will review your request and, if it's a fit, send you an invite link to set up access.",
    "",
    "No account is created until you accept that invite — there's nothing more to do for now.",
    "",
    "HAND Protocol · 501(c)(3) in formation · Austin, TX",
  ].join("\n");
}
