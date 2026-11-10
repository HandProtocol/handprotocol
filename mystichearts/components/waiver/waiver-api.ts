import { KOHSI_KEY, KOHSI_URL } from "../kohsi-booking";

// The waiver suite lives in Kohsi (the collective's booking system): Kohsi keeps every published
// version of every form unchanged and records exactly which version (by hash) each person signed,
// then emails them their copy. This file is the site's side of that API.

export type BlockType = "h" | "p" | "strong" | "li" | "initial";
export type Block = { t: BlockType; text: string };
export type FormKind = "release" | "event" | "minor" | "volunteer" | "media" | "agreement";

export type WaiverForm = {
  key: string;
  version: number;
  hash: string;
  title: string;
  summary: string;
  kind: FormKind;
  sort: number;
  validDays: number | null;
  blocks: Block[];
};

export type SignRequest = {
  forms: { key: string; version: number; hash: string; initials?: string }[];
  signer: { name: string; email: string; phone?: string; adult: true };
  emergency: { name: string; phone: string };
  minors?: { name: string; birthDate: string }[];
  media?: "yes" | "no";
  event?: string;
  signature: { typed: string; drawn?: string };
  consent: { electronic: true; readAll: true };
  website: string;
};

export type Envelope = {
  id: string;
  signedAt: string;
  receiptHash: string;
  forms: { key: string; version: number; title: string }[];
};

export type ApiError = { code: string; message: string };

export class WaiverApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const headers = (extra: Record<string, string> = {}) => ({ authorization: `Bearer ${KOHSI_KEY}`, ...extra });

async function read<T>(res: Response): Promise<T> {
  const body: unknown = await res.json().catch(() => null);
  const envelope = body as { ok?: boolean; data?: T; error?: ApiError } | null;
  if (!res.ok || !envelope?.ok) {
    throw new WaiverApiError(envelope?.error?.code ?? `http_${res.status}`, envelope?.error?.message ?? "Something went wrong.");
  }
  return envelope.data as T;
}

export function waiversReady(): boolean {
  return KOHSI_KEY.length > 0;
}

export async function loadForms(signal?: AbortSignal): Promise<WaiverForm[]> {
  const res = await fetch(`${KOHSI_URL}/v1/waivers/forms`, { headers: headers(), signal });
  const data = await read<WaiverForm[] | { forms: WaiverForm[] }>(res);
  const list = Array.isArray(data) ? data : data.forms;
  return [...list].sort((a, b) => a.sort - b.sort);
}

export async function signForms(request: SignRequest, idempotencyKey: string): Promise<Envelope> {
  const res = await fetch(`${KOHSI_URL}/v1/waivers/signatures`, {
    method: "POST",
    headers: headers({ "content-type": "application/json", "idempotency-key": idempotencyKey }),
    body: JSON.stringify(request),
  });
  const data = await read<{ envelope: Envelope }>(res);
  return data.envelope;
}
