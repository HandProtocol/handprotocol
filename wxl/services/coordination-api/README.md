# WXL:FOOD Coordination API

This long-running TypeScript service is the authenticated command boundary for WXL:FOOD. It is not a Netlify function.

It exposes:

- versioned REST resources under `/v1`
- the remote MCP endpoint at `/mcp`
- an A2A Agent Card and task endpoint
- signed Stripe webhooks
- signed Twilio Voice webhooks with English, Spanish, speech, keypad, replay prompts, and coordinator transfer

SMS is intentionally not implemented in this scope.

## Processes

Build all TypeScript processes with `npm run build:api`, then run them as separately supervised services:

```text
npm run start:api
npm run start:event-worker
npm run start:payment-worker
npm run start:retention-worker
```

The API and each worker use the server-only variables in `.env.example`. The service-role key must never be available to the Vite application.

Stripe and voice integrations remain inactive when their provider variables are absent. Live money and voice intake also remain behind their independent operating gates.

`LOCATION_ENCRYPTION_KEY` must be a base64-encoded 32-byte key. Rotate it only through a planned location re-encryption operation. Losing the key makes stored exact locations unrecoverable.
