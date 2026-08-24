import { loadConfig } from './config.js'
import { serviceRpc } from './database.js'
import type { JsonObject } from './types.js'

const config = loadConfig()
const worker = `events:${process.pid}`

async function loop(): Promise<void> {
  for (;;) {
    const jobs = await serviceRpc(config, 'lease_food_outbox', { p_worker: worker, p_topics: ['food.event.created'], p_limit: 10, p_lease_seconds: 60 })
    if (!Array.isArray(jobs) || jobs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      continue
    }
    for (const raw of jobs) {
      const job = raw as JsonObject
      try {
        const payload = job.payload as JsonObject
        await serviceRpc(config, 'plan_food_potluck', { p_event_id: payload.event_id, p_worker: worker })
        await serviceRpc(config, 'complete_food_outbox', { p_id: job.id, p_worker: worker, p_error: null })
      } catch (error) {
        await serviceRpc(config, 'complete_food_outbox', { p_id: job.id, p_worker: worker, p_error: error instanceof Error ? error.message : 'Event planning failed' })
      }
    }
  }
}

void loop()
