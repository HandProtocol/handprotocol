const RESEND_API_BASE = "https://api.resend.com";
const HAND_DOMAIN = "handprotocol.org";
export const RESEND_INBOUND_ENDPOINT =
  process.env.NEXT_PUBLIC_RESEND_INBOUND_WEBHOOK_URL ||
  "https://handprotocol.org/.netlify/functions/resend-inbound-forward";

export type ResendApiError = {
  status: number;
  message: string;
  code?: string;
};

export type ResendDomain = {
  id: string;
  name: string;
  status?: string;
  region?: string;
  capabilities?: {
    sending?: "enabled" | "disabled";
    receiving?: "enabled" | "disabled";
  };
  records?: {
    record?: string;
    name?: string;
    type?: string;
    value?: string;
    priority?: number;
    status?: string;
  }[];
};

export type ResendWebhook = {
  id: string;
  endpoint: string;
  status?: string;
  events?: string[];
  created_at?: string;
};

export type ResendControlSnapshot = {
  keyPresent: boolean;
  keySource: "RESEND_FULL_ACCESS_API_KEY" | "RESEND_API_KEY" | "missing";
  keyRestricted: boolean;
  errors: ResendApiError[];
  domain: ResendDomain | null;
  webhooks: ResendWebhook[];
  inboundWebhook: ResendWebhook | null;
  forwarding: {
    endpoint: string;
    webhookSecretSet: boolean;
    forwardTo: string;
    forwardFrom: string;
  };
};

export function getResendApiKey() {
  if (process.env.RESEND_FULL_ACCESS_API_KEY) {
    return {
      key: process.env.RESEND_FULL_ACCESS_API_KEY,
      source: "RESEND_FULL_ACCESS_API_KEY" as const,
    };
  }
  if (process.env.RESEND_API_KEY) {
    return {
      key: process.env.RESEND_API_KEY,
      source: "RESEND_API_KEY" as const,
    };
  }
  return { key: "", source: "missing" as const };
}

async function resendFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ data: T | null; error: ResendApiError | null }> {
  const { key } = getResendApiKey();
  if (!key) {
    return {
      data: null,
      error: { status: 0, message: "No Resend API key configured" },
    };
  }

  const res = await fetch(`${RESEND_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      data: null,
      error: {
        status: res.status,
        message:
          data && typeof data.message === "string"
            ? data.message
            : "Resend request failed",
        code: data && typeof data.name === "string" ? data.name : undefined,
      },
    };
  }

  return { data: data as T, error: null };
}

export async function listResendDomains() {
  return resendFetch<{ data?: ResendDomain[]; object?: string }>("/domains");
}

export async function listResendWebhooks() {
  return resendFetch<{ data?: ResendWebhook[]; object?: string }>("/webhooks");
}

export async function enableDomainReceiving(domainId: string) {
  return resendFetch<{ object: "domain"; id: string }>(`/domains/${domainId}`, {
    method: "PATCH",
    body: { capabilities: { receiving: "enabled" } },
  });
}

export async function createInboundWebhook() {
  return resendFetch<{
    object: "webhook";
    id: string;
    signing_secret?: string;
  }>("/webhooks", {
    method: "POST",
    body: {
      endpoint: RESEND_INBOUND_ENDPOINT,
      events: ["email.received"],
    },
  });
}

export async function getResendControlSnapshot(): Promise<ResendControlSnapshot> {
  const { key, source } = getResendApiKey();
  const errors: ResendApiError[] = [];

  let domains: ResendDomain[] = [];
  let webhooks: ResendWebhook[] = [];

  if (key) {
    const [domainResult, webhookResult] = await Promise.all([
      listResendDomains(),
      listResendWebhooks(),
    ]);
    if (domainResult.error) errors.push(domainResult.error);
    if (webhookResult.error) errors.push(webhookResult.error);
    domains = domainResult.data?.data || [];
    webhooks = webhookResult.data?.data || [];
  }

  const keyRestricted = errors.some((error) =>
    /restricted to only send emails/i.test(error.message),
  );
  const domain = domains.find((item) => item.name === HAND_DOMAIN) || null;
  const inboundWebhook =
    webhooks.find(
      (item) =>
        item.endpoint === RESEND_INBOUND_ENDPOINT &&
        (item.events || []).includes("email.received"),
    ) || null;

  return {
    keyPresent: Boolean(key),
    keySource: source,
    keyRestricted,
    errors,
    domain,
    webhooks,
    inboundWebhook,
    forwarding: {
      endpoint: RESEND_INBOUND_ENDPOINT,
      webhookSecretSet: Boolean(process.env.RESEND_WEBHOOK_SECRET),
      forwardTo: process.env.RESEND_FORWARD_TO || "handprotocol@gmail.com",
      forwardFrom:
        process.env.RESEND_FORWARD_FROM ||
        "HAND Protocol <reachout@handprotocol.org>",
    },
  };
}
