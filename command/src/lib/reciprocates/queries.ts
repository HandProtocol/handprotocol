import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { GrantStatus } from "@/lib/grants/types";
import type { CommandRole, CommandStatus } from "@/lib/supabase/profile";
import type { ApplicationStatus } from "@/lib/applications/types";

export type ReciprocateGrant = {
  id: string;
  slug: string;
  name: string;
  status: GrantStatus;
  amount_requested: number | null;
  amount_awarded: number | null;
  deadline: string | null;
  funder_name: string | null;
};

type GrantRow = Omit<ReciprocateGrant, "funder_name"> & {
  reciprocate_group: string | null;
  funders: { name: string | null } | null;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: CommandRole;
  status: CommandStatus;
  reciprocate_group: string | null;
};

type InviteRow = {
  code: string;
  email: string | null;
  role: CommandRole;
  reciprocate_group: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type ApplicationRow = {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  desired_role: CommandRole;
  reciprocate_group: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type ReciprocateGroupSummary = {
  name: string;
  grants: ReciprocateGrant[];
  activeGrantCount: number;
  awardedTotal: number;
  requestedTotal: number;
  profileCount: number;
  activeProfileCount: number;
  pendingApplicationCount: number;
  openInviteCount: number;
  lastSignalAt: string | null;
};

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

async function readClient() {
  if (!configured()) return null;
  try {
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

function cleanGroup(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function latest(values: (string | null | undefined)[]): string | null {
  return (
    values
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
  );
}

export async function listReciprocateGroups(): Promise<
  ReciprocateGroupSummary[]
> {
  const client = await readClient();
  if (!client) return [];

  const [grantResult, profileResult, inviteResult, applicationResult] =
    await Promise.all([
      client
        .from("grants")
        .select(
          "id, slug, name, status, amount_requested, amount_awarded, deadline, reciprocate_group, updated_at, funders(name)",
        )
        .not("reciprocate_group", "is", null)
        .order("updated_at", { ascending: false }),
      client
        .from("profiles")
        .select("id, email, display_name, role, status, reciprocate_group")
        .not("reciprocate_group", "is", null),
      client
        .from("invites")
        .select("code, email, role, reciprocate_group, expires_at, used_at, created_at")
        .not("reciprocate_group", "is", null),
      client
        .from("access_applications")
        .select(
          "id, email, name, organization, desired_role, reciprocate_group, status, created_at",
        )
        .not("reciprocate_group", "is", null),
    ]);

  const grants = ((grantResult.data ?? []) as unknown as (GrantRow & {
    updated_at: string;
  })[]).filter((g) => cleanGroup(g.reciprocate_group));
  const profiles = ((profileResult.data ?? []) as unknown as ProfileRow[]).filter(
    (p) => cleanGroup(p.reciprocate_group),
  );
  const invites = ((inviteResult.data ?? []) as unknown as InviteRow[]).filter(
    (i) => cleanGroup(i.reciprocate_group),
  );
  const applications = (
    (applicationResult.data ?? []) as unknown as ApplicationRow[]
  ).filter((a) => cleanGroup(a.reciprocate_group));

  const names = new Set<string>();
  grants.forEach((g) => names.add(cleanGroup(g.reciprocate_group)!));
  profiles.forEach((p) => names.add(cleanGroup(p.reciprocate_group)!));
  invites.forEach((i) => names.add(cleanGroup(i.reciprocate_group)!));
  applications.forEach((a) => names.add(cleanGroup(a.reciprocate_group)!));

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const groupGrants = grants.filter(
        (g) => cleanGroup(g.reciprocate_group) === name,
      );
      const groupProfiles = profiles.filter(
        (p) => cleanGroup(p.reciprocate_group) === name,
      );
      const groupInvites = invites.filter(
        (i) => cleanGroup(i.reciprocate_group) === name,
      );
      const groupApplications = applications.filter(
        (a) => cleanGroup(a.reciprocate_group) === name,
      );
      const grantSummaries = groupGrants.map((g) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        status: g.status,
        amount_requested: g.amount_requested,
        amount_awarded: g.amount_awarded,
        deadline: g.deadline,
        funder_name: g.funders?.name ?? null,
      }));

      return {
        name,
        grants: grantSummaries,
        activeGrantCount: grantSummaries.filter((g) =>
          ["discovery", "drafting", "submitted"].includes(g.status),
        ).length,
        awardedTotal: grantSummaries.reduce(
          (sum, g) => sum + (g.amount_awarded ?? 0),
          0,
        ),
        requestedTotal: grantSummaries.reduce(
          (sum, g) => sum + (g.amount_requested ?? 0),
          0,
        ),
        profileCount: groupProfiles.length,
        activeProfileCount: groupProfiles.filter((p) => p.status === "active")
          .length,
        pendingApplicationCount: groupApplications.filter(
          (a) => a.status === "pending",
        ).length,
        openInviteCount: groupInvites.filter((i) => !i.used_at).length,
        lastSignalAt: latest([
          ...groupGrants.map((g) => g.updated_at),
          ...groupInvites.map((i) => i.created_at),
          ...groupApplications.map((a) => a.created_at),
        ]),
      };
    });
}
