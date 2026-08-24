import type { IncomingHttpHeaders } from 'node:http'

export type Lane = 'aid' | 'marketplace' | 'potluck'

export type Scope =
  | 'food:public'
  | 'food:records:read'
  | 'food:records:write'
  | 'food:commitments'
  | 'food:payments'
  | 'food:location'
  | 'food:events'
  | 'food:provider'
  | 'food:coordinator'

export type Principal = {
  subject: string
  accessToken: string
  scopes: Set<Scope>
  role: string
}

export type RequestContext = {
  method: string
  pathname: string
  query: URLSearchParams
  headers: IncomingHttpHeaders
  rawBody: Buffer
  body: unknown
  principal: Principal | null
}

export type JsonObject = Record<string, unknown>

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = 'request_error') {
    super(message)
  }
}
