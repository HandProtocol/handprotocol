import assert from 'node:assert/strict'
import test from 'node:test'
import { agentCard, mcpToolList } from './contracts.js'

test('MCP publishes every initial coordination tool',()=>{
  const names=mcpToolList().map((tool)=>tool.name)
  assert.equal(names.length,15)
  assert.ok(names.includes('food_commit_match'))
  assert.ok(names.includes('food_create_donation'))
  assert.ok(names.includes('food_report_incident'))
})

test('A2A card advertises discovery, negotiation, fulfillment, and events',()=>{
  const card=agentCard('https://coordination.example')
  assert.equal(card.url,'https://coordination.example/a2a')
  assert.deepEqual((card.skills as Array<{id:string}>).map((skill)=>skill.id),['food-discovery','food-negotiation','food-fulfillment','food-events'])
})
