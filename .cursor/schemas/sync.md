# Sync (mobile + server)

Mobile offline writes queue in a local **outbox**; when online, the app calls `tdtd-node` sync routes. Web builds do not use these tables on the client.

## Server (`tdtd-node`)

| Table | Purpose |
|-------|---------|
| `sync_device_state` | Per-user pull cursor (`last_pull_cursor` text, `updated_at`) |

Routes (authenticated):

- `GET /api/sync/pull?since={cursor}` — changes since cursor (MVP may return empty `changes` until row-level sync is wired).
- `POST /api/sync/push` — batched mutations with `idempotencyKey` per change.

Conflict policy (default): **last-write-wins** per row id; document overrides per table when implemented.

**Domain sync (GAP-042):** When row-level sync is wired, `pullSync` / `pushSync` must filter all domain changes by authenticated `userId`. Schema prepared by [GAP-001.md](../gaps/GAP-001.md).

## Mobile local only (`tdtd-frontend/src/mobile/db`)

| Table | Purpose |
|-------|---------|
| `sync_outbox` | Pending mutations: `id`, `table_name`, `operation`, `payload_json`, `idempotency_key`, `created_at`, `status` |
| `sync_meta` | Key/value (e.g. `lastPullCursor`, `lastSyncedAt`) |

DDL mirrors server rules in [`tdtd-node/src/db/migrate.ts`](../../tdtd-node/src/db/migrate.ts) for domain tables when the SQLite plugin is enabled.
