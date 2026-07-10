"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/supabase/profile";
import {
  createInboundWebhook,
  enableDomainReceiving,
  getResendControlSnapshot,
} from "@/lib/resend/control";

export type ResendActionState = {
  ok: boolean;
  message: string;
  signingSecret?: string;
};

async function requireSettingsAccess() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    await requireCapability("settings.manage");
  }
}

export async function enableReceivingAction(
  _prevState: ResendActionState,
): Promise<ResendActionState> {
  await requireSettingsAccess();

  const snapshot = await getResendControlSnapshot();
  if (!snapshot.domain) {
    return {
      ok: false,
      message:
        "handprotocol.org was not visible to this Resend key. Use a full-access key.",
    };
  }

  const result = await enableDomainReceiving(snapshot.domain.id);
  revalidatePath("/resend");

  if (result.error) {
    return {
      ok: false,
      message: result.error.message,
    };
  }

  return {
    ok: true,
    message:
      "Receiving was enabled in Resend. Add or verify the receiving MX record next.",
  };
}

export async function createInboundWebhookAction(
  _prevState: ResendActionState,
): Promise<ResendActionState> {
  await requireSettingsAccess();

  const result = await createInboundWebhook();
  revalidatePath("/resend");

  if (result.error) {
    return {
      ok: false,
      message: result.error.message,
    };
  }

  return {
    ok: true,
    message:
      "Webhook created. Save this signing secret in Netlify as RESEND_WEBHOOK_SECRET.",
    signingSecret: result.data?.signing_secret,
  };
}
