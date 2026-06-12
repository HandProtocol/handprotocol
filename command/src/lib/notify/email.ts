/*
  Env-gated Resend transactional sender for the Command Center (server-side only).

  Mirrors notify/telegram.ts: dormant until configured, never throws. Email is
  Telegram's quieter sibling here — it flips on the moment the Resend sending
  domain verifies and RESEND_API_KEY + EMAIL_FROM are set. Until then every call
  no-ops with { ok:false, reason:'email-unconfigured' } and makes no network
  request, so invite/apply flows degrade to the copyable link.

    RESEND_API_KEY   — Resend API key (server env only, never in the browser bundle)
    EMAIL_FROM       — verified sender, e.g. "HAND Protocol <team@handprotocol.org>"

  Best-effort: a failed send must never break the surrounding action.
*/

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "email-unconfigured" | "send-failed"; detail?: string };

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "[email] skipped — missing RESEND_API_KEY or EMAIL_FROM (email dormant until Resend is configured)",
    );
    return { ok: false, reason: "email-unconfigured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(`[email] send failed ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, reason: "send-failed", detail: `${res.status}` };
    }

    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn(`[email] send threw: ${detail}`);
    return { ok: false, reason: "send-failed", detail };
  }
}
