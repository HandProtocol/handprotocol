import type { JsonObject } from './types.js'

export const mcpTools = [
  ['food_search_public_resources', 'Search privacy-safe public food resources'],
  ['food_create_need', 'Create a canonical food need'],
  ['food_update_need', 'Move or update an owned food need'],
  ['food_create_supply', 'Create a canonical food supply'],
  ['food_find_matches', 'Request a deterministic matching run'],
  ['food_explain_match', 'Read hard-rule and ranking explanations'],
  ['food_commit_match', 'Commit an eligible candidate under policy'],
  ['food_cancel_commitment', 'Cancel and release a commitment'],
  ['food_schedule_fulfillment', 'Schedule an eligible fulfillment'],
  ['food_record_checkpoint', 'Record fulfillment evidence'],
  ['food_create_payment', 'Create a marketplace payment order'],
  ['food_create_donation', 'Create a restricted subsidy donation'],
  ['food_create_potluck', 'Create a noncommercial potluck'],
  ['food_respond_to_event_invite', 'Respond to a potluck invitation'],
  ['food_report_incident', 'Place an operational record on incident hold'],
] as const

export function mcpToolList(): JsonObject[] {
  return mcpTools.map(([name, description]) => ({ name, description, inputSchema: { type: 'object', additionalProperties: true } }))
}

export function agentCard(baseUrl: string): JsonObject {
  return {
    name: 'yuhm Coordination Agent',
    description: 'Policy-governed food discovery, negotiation, fulfillment, commerce, and potluck coordination for Austin.',
    url: `${baseUrl}/a2a`,
    protocolVersion: '0.3.0',
    version: '0.1.0',
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ['application/json', 'text/plain'],
    defaultOutputModes: ['application/json', 'text/plain'],
    skills: [
      { id: 'food-discovery', name: 'Food discovery', description: 'Search public resources and eligible supplies', tags: ['food', 'discovery'] },
      { id: 'food-negotiation', name: 'Match negotiation', description: 'Create needs, compare candidates, and commit eligible matches', tags: ['matching', 'coordination'] },
      { id: 'food-fulfillment', name: 'Fulfillment coordination', description: 'Schedule routes and record checkpoints', tags: ['delivery', 'routing'] },
      { id: 'food-events', name: 'Potluck coordination', description: 'Plan noncommercial events, invitations, and contributions', tags: ['potluck', 'events'] },
    ],
  }
}
