import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { authenticate } from './auth.js'
import { loadConfig } from './config.js'
import { handle } from './app.js'
import { HttpError, type RequestContext } from './types.js'

const config = loadConfig()

async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += value.length
    if (size > 1_000_000) throw new HttpError(413, 'Request body exceeds one megabyte', 'payload_too_large')
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

function jsonBody(raw: Buffer, contentType: string | undefined): unknown {
  if (!raw.length) return {}
  if (contentType?.includes('application/json')) {
    try { return JSON.parse(raw.toString('utf8')) as unknown } catch { throw new HttpError(400, 'Request body is not valid JSON', 'invalid_json') }
  }
  return {}
}

function send(response: ServerResponse, status: number, payload: unknown, contentType = 'application/json', extra: Record<string, string> = {}): void {
  const output = contentType === 'application/json' ? JSON.stringify(payload) : String(payload ?? '')
  response.writeHead(status, {
    'content-type': `${contentType}; charset=utf-8`,
    'content-length': Buffer.byteLength(output),
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
    ...extra,
  })
  response.end(output)
}

const server = createServer(async (request, response) => {
  try {
    const host = request.headers.host ?? '127.0.0.1'
    const url = new URL(request.url ?? '/', `http://${host}`)
    const origin = request.headers.origin
    const cors: Record<string, string> = origin && config.corsOrigins.has(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}
    if (request.method === 'OPTIONS') {
      send(response, 204, '', 'text/plain', { ...cors, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'Authorization,Content-Type,Idempotency-Key' })
      return
    }
    const rawBody = await body(request)
    const principal = await authenticate(request.headers, config)
    const context: RequestContext = {
      method: request.method ?? 'GET', pathname: url.pathname, query: url.searchParams,
      headers: request.headers, rawBody, body: jsonBody(rawBody, request.headers['content-type']), principal,
    }
    const result = await handle(context, config)
    send(response, result.status ?? 200, result.body ?? null, result.contentType, { ...cors, ...result.headers })
  } catch (error) {
    const known = error instanceof HttpError
    send(response, known ? error.status : 500, { error: { code: known ? error.code : 'internal_error', message: known ? error.message : 'Internal server error' } })
  }
})

server.listen(config.port, '0.0.0.0', () => {
  process.stdout.write(`WXL:FOOD Coordination API listening on ${config.port}\n`)
})
