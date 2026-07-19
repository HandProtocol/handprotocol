import type { Config } from './config.js'
import { createHmac } from 'node:crypto'
import { requireScope } from './auth.js'
import { rpc, selectRows, serviceRpc } from './database.js'
import { agentCard, mcpToolList } from './contracts.js'
import { callTool } from './tools.js'
import { idempotencyKey, objectBody } from './policy.js'
import { verifyStripeSignature } from './stripe.js'
import { confirmationPrompt, intakePrompt, verifyTwilioRequest } from './voice.js'
import { decryptLocation, encryptLocation } from './location.js'
import { HttpError, type JsonObject, type RequestContext, type Scope } from './types.js'

type Result = { status?: number; body?: unknown; contentType?: string; headers?: Record<string, string> }

const resources: Record<string, { table: string; scope: Scope }> = {
  needs: { table: 'food_needs', scope: 'food:records:read' },
  supplies: { table: 'food_supplies', scope: 'food:records:read' },
  matches: { table: 'food_match_candidates', scope: 'food:records:read' },
  commitments: { table: 'food_commitments', scope: 'food:commitments' },
  runs: { table: 'food_match_runs', scope: 'food:records:read' },
  events: { table: 'food_events', scope: 'food:events' },
  venues: { table: 'food_venues', scope: 'food:events' },
  payments: { table: 'food_payment_orders', scope: 'food:payments' },
  mandates: { table: 'food_agent_mandates', scope: 'food:records:read' },
  conversations: { table: 'food_conversations', scope: 'food:records:read' },
}

function routeResource(pathname: string): string | null {
  const match = pathname.match(/^\/v1\/([a-z_]+)\/?$/)
  return match?.[1] ?? null
}

function formBody(context: RequestContext): URLSearchParams {
  return new URLSearchParams(context.rawBody.toString('utf8'))
}

async function mcp(context: RequestContext, config: Config): Promise<Result> {
  const payload = objectBody(context.body)
  const id = payload.id ?? null
  const method = payload.method
  if (method === 'initialize') return { body: { jsonrpc: '2.0', id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'wxl-food', version: '0.1.0' } } } }
  if (method === 'tools/list') return { body: { jsonrpc: '2.0', id, result: { tools: mcpToolList() } } }
  if (method === 'tools/call') {
    const params = objectBody(payload.params)
    const name = String(params.name ?? '')
    const args = objectBody(params.arguments ?? {})
    const result = await callTool(name, { config, principal: context.principal, arguments: args, idempotencyKey: context.headers['idempotency-key'] as string | undefined })
    return { body: { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result } } }
  }
  return { status: 400, body: { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } } }
}

async function a2a(context: RequestContext, config: Config): Promise<Result> {
  const payload = objectBody(context.body)
  const id = payload.id ?? null
  if (payload.method === 'message/send') {
    const principal = requireScope(context.principal, 'food:records:write')
    const params = objectBody(payload.params)
    const message = objectBody(params.message)
    const metadata = objectBody(message.metadata ?? {})
    const tool = String(metadata.tool ?? '')
    if (!tool) throw new HttpError(400, 'A2A message metadata.tool is required', 'invalid_task')
    const args = objectBody(metadata.arguments ?? {})
    const contextId = typeof params.contextId === 'string' ? params.contextId : crypto.randomUUID()
    const taskKey = String(metadata.idempotency_key ?? '')
    const task = await rpc(config, principal, 'create_food_a2a_task', { p_context_id: contextId, p_skill_id: tool, p_input: args, p_idempotency_key: taskKey }) as JsonObject
    try {
      const result = await callTool(tool, { config, principal, arguments: args, idempotencyKey: taskKey })
      await serviceRpc(config, 'complete_food_a2a_task', { p_task_id: task.id, p_status: 'completed', p_output: result, p_error: null })
      return { body: { jsonrpc: '2.0', id, result: { id: task.id, contextId, status: { state: 'completed', timestamp: new Date().toISOString() }, artifacts: [{ artifactId: crypto.randomUUID(), parts: [{ kind: 'data', data: result }] }] } } }
    } catch (error) {
      await serviceRpc(config, 'complete_food_a2a_task', { p_task_id: task.id, p_status: 'failed', p_output: null, p_error: { message: error instanceof Error ? error.message : 'Task failed' } })
      throw error
    }
  }
  if (payload.method === 'tasks/get') {
    const principal = requireScope(context.principal, 'food:records:read')
    const params = objectBody(payload.params)
    const rows = await selectRows(config, principal, 'food_a2a_tasks', new URLSearchParams({ id: `eq.${String(params.id ?? '')}`, select: '*' }))
    return { body: { jsonrpc: '2.0', id, result: Array.isArray(rows) ? rows[0] ?? null : rows } }
  }
  return { status: 400, body: { jsonrpc: '2.0', id, error: { code: -32601, message: 'A2A method not found' } } }
}

async function stripeWebhook(context: RequestContext, config: Config): Promise<Result> {
  if (!config.stripeWebhookSecret) throw new HttpError(503, 'Stripe webhook is not configured', 'provider_unavailable')
  verifyStripeSignature(context.rawBody, context.headers['stripe-signature'] as string | undefined, config.stripeWebhookSecret)
  const event = objectBody(context.body)
  const data = objectBody(event.data)
  const object = objectBody(data.object)
  await serviceRpc(config, 'record_food_stripe_event', { p_event_id: event.id, p_event_type: event.type, p_object_id: object.id ?? null, p_payload: event })
  return { body: { received: true } }
}

async function voice(context: RequestContext, config: Config): Promise<Result> {
  if (!config.twilioAuthToken) throw new HttpError(503, 'Voice intake is not configured', 'provider_unavailable')
  const params = formBody(context)
  const incomingUrl = `${config.publicBaseUrl}${context.pathname}`
  verifyTwilioRequest(config.twilioAuthToken, incomingUrl, params, context.headers['x-twilio-signature'] as string | undefined)
  const language: 'en' | 'es' = params.get('Digits') === '9' || params.get('Language')?.startsWith('es') ? 'es' : 'en'
  const digits = params.get('Digits')
  const speech = params.get('SpeechResult')?.trim()
  if (digits === '0') {
    const body = config.coordinatorPhone
      ? `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${language === 'es' ? 'Conectando con coordinación.' : 'Connecting you with a coordinator.'}</Say><Dial>${config.coordinatorPhone}</Dial></Response>`
      : `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${language === 'es' ? 'La coordinación no está disponible. Intente de nuevo más tarde.' : 'A coordinator is unavailable. Please try again later.'}</Say></Response>`
    return { contentType: 'application/xml', body }
  }
  if (speech) {
    const callId = params.get('CallSid') ?? crypto.randomUUID()
    if (!config.contactFingerprintSecret) throw new HttpError(503, 'Voice contact fingerprinting is not configured', 'provider_unavailable')
    const callerFingerprint = createHmac('sha256', config.contactFingerprintSecret).update(params.get('From') ?? '').digest('hex')
    await serviceRpc(config, 'ingest_food_voice_message', { p_provider_call_id: callId, p_contact_fingerprint: callerFingerprint, p_language: language, p_transcript: speech, p_confidence: Number(params.get('Confidence') ?? 0), p_idempotency_key: `voice:${callId}:${context.pathname}` })
    return { contentType: 'application/xml', body: confirmationPrompt(language, language === 'es' ? `Escuché: ${speech}.` : `I heard: ${speech}.`, `${config.publicBaseUrl}/webhooks/twilio/voice/confirm`) }
  }
  return { contentType: 'application/xml', body: intakePrompt(language, `${config.publicBaseUrl}/webhooks/twilio/voice/intake`) }
}

export async function handle(context: RequestContext, config: Config): Promise<Result> {
  if (context.method === 'GET' && context.pathname === '/health') return { body: { status: 'ok', sms: 'deferred' } }
  if (context.method === 'GET' && context.pathname === '/.well-known/oauth-protected-resource') return { body: { resource: config.publicBaseUrl, authorization_servers: [`${config.supabaseUrl}/auth/v1`], scopes_supported: ['food:public','food:records:read','food:records:write','food:commitments','food:payments','food:location','food:events','food:provider','food:coordinator'], bearer_methods_supported: ['header'] } }
  if (context.method === 'GET' && context.pathname === '/.well-known/agent-card.json') return { body: agentCard(config.publicBaseUrl) }
  if (context.method === 'POST' && context.pathname === '/mcp') return mcp(context, config)
  if (context.method === 'POST' && context.pathname === '/a2a') return a2a(context, config)
  if (context.method === 'POST' && context.pathname === '/webhooks/stripe') return stripeWebhook(context, config)
  if (context.method === 'POST' && context.pathname.startsWith('/webhooks/twilio/voice/')) return voice(context, config)
  if (context.method === 'POST' && context.pathname === '/v1/participants/me') {
    const principal = requireScope(context.principal, 'food:records:write')
    const body = objectBody(context.body)
    return { body: await rpc(config, principal, 'ensure_food_participant', { p_display_name: body.display_name }) }
  }
  if (context.method === 'POST' && context.pathname === '/v1/locations') {
    const principal = requireScope(context.principal, 'food:location')
    const body = objectBody(context.body)
    if(typeof body.exact_location!=='string'||body.exact_location.trim().length<5)throw new HttpError(400,'A complete exact location is required','invalid_location')
    const ciphertext = encryptLocation(body.exact_location.trim(),config.locationEncryptionKey)
    return { status: 201,body: await rpc(config,principal,'create_food_location',{p_label:body.label,p_service_zone:body.service_zone,p_location_type:body.location_type,p_exact_location_ciphertext:ciphertext,p_sharing_policy:body.sharing_policy??'after_commitment',p_saved_for_reuse:body.saved_for_reuse??false,p_idempotency_key:idempotencyKey(context.headers)}) }
  }

  const coordinatorAction = context.pathname.match(/^\/v1\/coordinator\/(verifications|contacts|venues|lanes|campaigns|agents|agent-revocations)$/)
  if (context.method === 'POST' && coordinatorAction) {
    const principal = requireScope(context.principal, 'food:coordinator')
    const body = objectBody(context.body)
    const key = idempotencyKey(context.headers)
    let contactArgs:JsonObject={}
    if(coordinatorAction[1]==='contacts'){
      if(typeof body.address!=='string'||!body.address.trim())throw new HttpError(400,'Contact address is required','invalid_contact')
      if(!config.contactFingerprintSecret)throw new HttpError(503,'Contact fingerprinting is not configured','provider_unavailable')
      contactArgs={p_participant_id:body.participant_id,p_channel_type:body.channel_type,p_address_ciphertext:encryptLocation(body.address.trim(),config.contactEncryptionKey),p_address_fingerprint:createHmac('sha256',config.contactFingerprintSecret).update(body.address.trim()).digest('hex'),p_consent_status:body.consent_status,p_consent_source:body.consent_source,p_language:body.language??'en',p_accessibility_preferences:body.accessibility_preferences??{},p_quiet_hours_start:body.quiet_hours_start??null,p_quiet_hours_end:body.quiet_hours_end??null,p_idempotency_key:key}
    }
    const calls: Record<string, { name: string; args: JsonObject }> = {
      verifications: { name: 'record_food_verification', args: { p_participant_id: body.participant_id, p_verification_type: body.verification_type, p_issuer: body.issuer, p_evidence_status: body.evidence_status, p_evidence_reference: body.evidence_reference ?? '', p_expires_at: body.expires_at ?? null, p_review_note: body.review_note, p_idempotency_key: key } },
      contacts:{name:'record_food_contact_channel',args:contactArgs},
      venues: { name: 'review_food_venue', args: { p_venue_id: body.venue_id, p_approved: body.approved, p_review_expires_at: body.review_expires_at, p_note: body.note, p_idempotency_key: key } },
      lanes: { name: 'decide_food_lane_readiness', args: { p_lane: body.lane, p_stage: body.stage, p_decision: body.decision, p_volume_ceiling: body.volume_ceiling, p_incident_contact: body.incident_contact, p_evidence: body.evidence ?? {}, p_rollback_trigger: body.rollback_trigger, p_next_review_at: body.next_review_at, p_idempotency_key: key } },
      campaigns: { name: 'create_food_subsidy_campaign', args: { p_name: body.name, p_rules: body.rules ?? {}, p_starts_at: body.starts_at, p_ends_at: body.ends_at, p_idempotency_key: key } },
      agents: { name: 'certify_food_agent', args: { p_agent_principal: body.agent_principal, p_conformance_version: body.conformance_version, p_certified_actions: body.certified_actions ?? [], p_evidence: body.evidence ?? {}, p_expires_at: body.expires_at, p_review_note: body.review_note, p_idempotency_key: key } },
      'agent-revocations': { name: 'revoke_food_agent_certification', args: { p_agent_principal: body.agent_principal, p_reason: body.reason, p_idempotency_key: key } },
    }
    const call = calls[coordinatorAction[1] ?? '']
    if (!call) throw new HttpError(404, 'Coordinator action not found', 'not_found')
    return { body: await rpc(config, principal, call.name, call.args) }
  }

  const mandateRevoke = context.pathname.match(/^\/v1\/mandates\/([0-9a-f-]+)\/revoke$/)
  if (context.method === 'POST' && mandateRevoke) {
    const principal = requireScope(context.principal, 'food:records:write')
    const body = objectBody(context.body)
    return { body: await rpc(config, principal, 'revoke_food_agent_mandate', { p_mandate_id: mandateRevoke[1], p_reason: body.reason, p_idempotency_key: idempotencyKey(context.headers) }) }
  }
  const conversationMessage = context.pathname.match(/^\/v1\/conversations\/([0-9a-f-]+)\/messages$/)
  if (context.method === 'POST' && conversationMessage) {
    const principal = requireScope(context.principal, 'food:records:write')
    const body = objectBody(context.body)
    return { status: 201, body: await rpc(config, principal, 'send_food_message', { p_conversation_id: conversationMessage[1], p_channel: body.channel ?? 'web', p_body: body.body, p_structured_payload: body.structured_payload ?? {}, p_idempotency_key: idempotencyKey(context.headers) }) }
  }
  const eventLocation = context.pathname.match(/^\/v1\/events\/([0-9a-f-]+)\/location$/)
  if (context.method === 'POST' && eventLocation) {
    const principal = requireScope(context.principal, 'food:location')
    const body = objectBody(context.body)
    const encrypted=await rpc(config, principal, 'release_food_event_location', { p_event_id: eventLocation[1], p_purpose: body.purpose ?? 'event_arrival' })
    return { body: { exact_location:decryptLocation(encrypted,config.locationEncryptionKey) } }
  }
  const commitmentAction = context.pathname.match(/^\/v1\/commitments\/([0-9a-f-]+)\/(cancel|schedule|checkpoints)$/)
  if (context.method === 'POST' && commitmentAction) {
    const body = objectBody(context.body)
    const argumentsByAction: Record<string, JsonObject> = {
      cancel: { commitment_id: commitmentAction[1], reason: body.reason },
      schedule: { ...body, commitment_id: commitmentAction[1] },
      checkpoints: { ...body, commitment_id: commitmentAction[1] },
    }
    const toolByAction = { cancel: 'food_cancel_commitment', schedule: 'food_schedule_fulfillment', checkpoints: 'food_record_checkpoint' } as const
    return { body: await callTool(toolByAction[commitmentAction[2] as keyof typeof toolByAction], { config, principal: context.principal, arguments: argumentsByAction[commitmentAction[2] ?? ''] ?? body, idempotencyKey: idempotencyKey(context.headers) }) }
  }
  const commitmentLocation = context.pathname.match(/^\/v1\/commitments\/([0-9a-f-]+)\/location$/)
  if (context.method === 'POST' && commitmentLocation) {
    const principal = requireScope(context.principal, 'food:location')
    const body = objectBody(context.body)
    const precision=body.precision??'exact'
    const encrypted=await rpc(config, principal, 'release_food_location', { p_location_id: body.location_id, p_commitment_id: commitmentLocation[1], p_purpose: body.purpose ?? 'fulfillment_handoff', p_precision: precision, p_policy_decision_id: null })
    return { body: precision==='exact'?{exact_location:decryptLocation(encrypted,config.locationEncryptionKey)}:{service_zone:Buffer.from(String(encrypted).replace(/^\\x/,''),'hex').toString('utf8')} }
  }
  const supplyTransition = context.pathname.match(/^\/v1\/supplies\/([0-9a-f-]+)\/transition$/)
  if (context.method === 'POST' && supplyTransition) {
    const principal = requireScope(context.principal, 'food:provider')
    const body = objectBody(context.body)
    return { body: await rpc(config, principal, 'transition_food_supply', { p_supply_id: supplyTransition[1], p_to_status: body.status, p_idempotency_key: idempotencyKey(context.headers), p_reason: body.reason ?? '' }) }
  }

  const resource = routeResource(context.pathname)
  if (resource && resources[resource]) {
    const descriptor = resources[resource]
    if (context.method === 'GET') {
      const principal=context.principal??(resource==='events'?{subject:'public',accessToken:config.supabaseAnonKey,scopes:new Set(['food:public'] as const),role:'anon'}:null)
      return { body: await selectRows(config, requireScope(principal,resource==='events'?'food:public':descriptor.scope), descriptor.table, context.query) }
    }
    const body = objectBody(context.body)
    const key = idempotencyKey(context.headers)
    const toolByResource: Partial<Record<string, string>> = { needs: 'food_create_need', supplies: 'food_create_supply', matches: 'food_find_matches', commitments: 'food_commit_match', payments: 'food_create_payment', events: 'food_create_potluck' }
    const tool = toolByResource[resource]
    if (context.method === 'POST' && tool) return { status: 201, body: await callTool(tool, { config, principal: context.principal, arguments: body, idempotencyKey: key }) }
    if (context.method === 'POST' && resource === 'mandates') {
      const principal = requireScope(context.principal, 'food:records:write')
      return { status: 201, body: await rpc(config, principal, 'create_food_agent_mandate', { p_agent_principal: body.agent_principal, p_actions: body.actions ?? [], p_lanes: body.lanes ?? [], p_service_zones: body.service_zones ?? [], p_per_transaction_limit_cents: body.per_transaction_limit_cents ?? 0, p_daily_limit_cents: body.daily_limit_cents ?? 0, p_total_limit_cents: body.total_limit_cents ?? 0, p_expires_at: body.expires_at, p_idempotency_key: key }) }
    }
    if (context.method === 'POST' && resource === 'conversations') {
      const principal = requireScope(context.principal, 'food:records:write')
      return { status: 201, body: await rpc(config, principal, 'create_food_conversation', { p_subject: body.subject, p_channel: body.channel ?? 'web', p_language: body.language ?? 'en', p_related_need_id: body.related_need_id ?? null, p_idempotency_key: key }) }
    }
    if (context.method === 'POST' && resource === 'venues') {
      const principal = requireScope(context.principal, 'food:events')
      return { status: 201,body: await rpc(config,principal,'create_food_venue',{p_location_id:body.location_id,p_name:body.name,p_venue_type:body.venue_type,p_capacity:body.capacity,p_accessibility_features:body.accessibility_features??[],p_conduct_agreement_version:body.conduct_agreement_version??'',p_emergency_contact_configured:body.emergency_contact_configured??false,p_idempotency_key:key}) }
    }
  }
  throw new HttpError(404, 'Route not found', 'not_found')
}
