import { createHash } from 'node:crypto'
import { HttpError, type JsonObject } from './types.js'

export function idempotencyKey(headers: Record<string, string | string[] | undefined>): string {
  const value = headers['idempotency-key']
  const key = (Array.isArray(value) ? value[0] : value)?.trim()
  if (!key || key.length < 8 || key.length > 200) throw new HttpError(400, 'Idempotency-Key must contain 8 to 200 characters', 'idempotency_key_required')
  return key
}

export function requestHash(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

export function objectBody(body: unknown): JsonObject {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'A JSON object is required', 'invalid_body')
  return body as JsonObject
}

export function stringField(body: JsonObject, key: string): string {
  const value = body[key]
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${key} is required`, 'invalid_body')
  return value.trim()
}
