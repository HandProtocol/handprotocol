import type { Config } from './config.js'
import { rpc, selectRows } from './database.js'
import { requireScope } from './auth.js'
import { idempotencyKey, objectBody, stringField } from './policy.js'
import { HttpError, type JsonObject, type Principal } from './types.js'

type ToolContext = {
  config: Config
  principal: Principal | null
  arguments: JsonObject
  idempotencyKey?: string
}

function requiredKey(context: ToolContext): string {
  const key = context.idempotencyKey ?? (typeof context.arguments.idempotency_key === 'string' ? context.arguments.idempotency_key : '')
  return idempotencyKey({ 'idempotency-key': key })
}

export async function callTool(name: string, context: ToolContext): Promise<unknown> {
  const args = objectBody(context.arguments)
  switch (name) {
    case 'food_search_public_resources': {
      const principal = context.principal ?? { subject: 'public', accessToken: context.config.supabaseAnonKey, scopes: new Set(['food:public'] as const), role: 'anon' }
      return selectRows(context.config, principal, 'food_spots', new URLSearchParams({ status: 'eq.verified', limit: '50' }))
    }
    case 'food_create_need':
      return rpc(context.config, requireScope(context.principal, 'food:records:write'), 'create_food_need', { p_input: args, p_idempotency_key: requiredKey(context) })
    case 'food_update_need':
      return rpc(context.config, requireScope(context.principal, 'food:records:write'), 'transition_food_need', { p_need_id: stringField(args, 'need_id'), p_to_status: stringField(args, 'status'), p_idempotency_key: requiredKey(context), p_reason: typeof args.reason === 'string' ? args.reason : '' })
    case 'food_create_supply':
      return rpc(context.config, requireScope(context.principal, 'food:provider'), 'create_food_supply', { p_input: args, p_idempotency_key: requiredKey(context) })
    case 'food_find_matches':
      return rpc(context.config, requireScope(context.principal, 'food:records:read'), 'request_food_match_run', { p_need_id: typeof args.need_id === 'string' ? args.need_id : null, p_trigger_reason: typeof args.trigger_reason === 'string' ? args.trigger_reason : 'agent_request', p_idempotency_key: requiredKey(context) })
    case 'food_explain_match': {
      const principal = requireScope(context.principal, 'food:records:read')
      const query = new URLSearchParams({ id: `eq.${stringField(args, 'candidate_id')}`, select: 'id,eligible,hard_rule_results,score_components,explanation_codes,rejection_reasons,proposed_quantity,rank' })
      return selectRows(context.config, principal, 'food_match_candidates', query)
    }
    case 'food_commit_match':
      return rpc(context.config, requireScope(context.principal, 'food:commitments'), 'commit_food_match', { p_candidate_id: stringField(args, 'candidate_id'), p_quantity: args.quantity, p_mandate_id: args.mandate_id ?? null, p_actor_principal: context.principal?.subject ?? '', p_idempotency_key: requiredKey(context) })
    case 'food_cancel_commitment':
      return rpc(context.config, requireScope(context.principal, 'food:commitments'), 'cancel_food_commitment', { p_commitment_id: stringField(args, 'commitment_id'), p_reason: stringField(args, 'reason'), p_idempotency_key: requiredKey(context) })
    case 'food_schedule_fulfillment':
      return rpc(context.config, requireScope(context.principal, 'food:commitments'), 'schedule_food_fulfillment', { p_commitment_id: stringField(args, 'commitment_id'), p_input: args, p_idempotency_key: requiredKey(context) })
    case 'food_record_checkpoint':
      return rpc(context.config, requireScope(context.principal, 'food:commitments'), 'record_food_commitment_checkpoint', { p_commitment_id: stringField(args, 'commitment_id'), p_input: args, p_idempotency_key: requiredKey(context) })
    case 'food_create_payment':
      return rpc(context.config, requireScope(context.principal, 'food:payments'), 'create_food_payment_order', { p_commitment_id: stringField(args, 'commitment_id'), p_mandate_id: args.mandate_id ?? null, p_delivery_cents: args.delivery_cents ?? 0, p_subsidy_cents: 0, p_tax_cents: args.tax_cents ?? 0, p_tip_cents: args.tip_cents ?? 0, p_idempotency_key: requiredKey(context) })
    case 'food_create_donation':
      return rpc(context.config, requireScope(context.principal, 'food:payments'), 'create_food_donation', { p_campaign_id: stringField(args, 'campaign_id'), p_amount_cents: args.amount_cents, p_receipt_language: args.receipt_language ?? 'en', p_idempotency_key: requiredKey(context) })
    case 'food_create_potluck':
      return rpc(context.config, requireScope(context.principal, 'food:events'), 'create_food_potluck', { p_input: args, p_idempotency_key: requiredKey(context) })
    case 'food_respond_to_event_invite':
      return rpc(context.config, requireScope(context.principal, 'food:events'), 'respond_food_event_invite', { p_invite_id: stringField(args, 'invite_id'), p_response: stringField(args, 'response'), p_guest_count: args.guest_count ?? 0, p_dietary_needs: args.dietary_needs ?? [], p_accessibility_needs: args.accessibility_needs ?? [], p_idempotency_key: requiredKey(context) })
    case 'food_report_incident':
      return rpc(context.config, requireScope(context.principal, 'food:records:write'), 'report_food_incident', { p_resource_type: stringField(args, 'resource_type'), p_resource_id: stringField(args, 'resource_id'), p_reason: stringField(args, 'reason'), p_idempotency_key: requiredKey(context) })
    default:
      throw new HttpError(404, `Unknown tool: ${name}`, 'tool_not_found')
  }
}
