# WXL:FOOD matching and routing worker

This Python service leases transactional outbox jobs and uses OR-Tools for deterministic min-cost allocation and vehicle routing.

The allocation order is encoded in cost bands: urgency, expiry and waste risk, unmet need, lateness risk, then logistics. Hard rules run before optimization and retain machine-readable evidence for every rejected and eligible edge.

The worker places five-minute atomic holds through database functions. It does not update operational records directly. Failed jobs release their lease with bounded exponential retry.

Run the worker with a server-only Postgres connection:

```text
DATABASE_URL=postgresql://... python -m wxl_food_worker.main
```

No SMS provider or SMS queue is part of this worker.
