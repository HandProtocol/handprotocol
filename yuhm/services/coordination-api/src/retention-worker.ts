import { loadConfig } from './config.js'
import { serviceRpc } from './database.js'

const config = loadConfig()

async function loop(): Promise<void> {
  for (;;) {
    try {
      await serviceRpc(config, 'enforce_food_retention', {})
    } catch (error) {
      process.stderr.write(`Retention run failed: ${error instanceof Error ? error.message : 'unknown error'}\n`)
    }
    await new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1_000))
  }
}

void loop()
