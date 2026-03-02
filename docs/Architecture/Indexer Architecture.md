---
tags: [architecture, indexer, ponder, events, docker, bun]
---

# Indexer Architecture

[[🏠 Home]] > [[Architecture/System Overview]] > Indexer Architecture

The Ponder indexer is the read-layer of Aurellion. It transforms raw blockchain events into a queryable database that powers the frontend without hitting the RPC on every user interaction.

---

## Design Philosophy: Dumb Indexer

Aurellion's indexer uses the **dumb indexer pattern**:

> Store raw events exactly as emitted. No aggregation in the indexer. Let the repository layer derive state.

**Advantages:**

- Simple handlers — each handler is one `db.insert()`
- Zero business logic in the indexer — aggregation bugs don't corrupt historical data
- Re-indexing is trivial: wipe the database, replay from `startBlock`
- Schema auto-generated from ABIs — adding a new event auto-creates a new table

**Planned evolution:** Aggregate tables (`assets`, `orders`, `journeys`) in the schema generator.

---

## Event → Database Pipeline

```
Base Sepolia RPC (WebSocket)
         │
         │ New block with event logs
         ▼
Ponder Core (TypeScript, running inside Docker)
  ├── ABI decoding: raw bytes → typed args
  ├── Handler dispatch: event name → handler function
  └── DB write: context.db.tableName.create(...)
         │
         ▼
PostgreSQL 16 (Docker container: aurellion_postgres)
  ├── mintedAssetEventss
  ├── unifiedOrderCreatedEventss
  ├── tradeExecutedEventss
  └── ... (one table per event type)
         │
         ▼
Ponder GraphQL + REST API  (port 42069)
  ├── Auto-generated queries per table
  ├── Filtering, sorting, cursor pagination
  └── Available at https://indexer.aurellionlabs.com/graphql
```

---

## Handler Structure

```typescript
// indexer/src/handlers/assets.ts
import { ponder } from '@/generated';

ponder.on('Diamond:MintedAsset', async ({ event, context }) => {
  await context.db.mintedAssetEvents.create({
    data: {
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      account: event.args.account,
      hash: event.args.hash,
      tokenId: event.args.tokenId,
      name: event.args.name,
      assetClass: event.args.assetClass,
      className: event.args.className,
      block_number: event.block.number,
      block_timestamp: event.block.timestamp,
      transaction_hash: event.transaction.hash,
    },
  });
});
```

---

## Schema Generation

```bash
# From monorepo root
bun scripts/generate-indexer.ts

# Or via alias
bun run generate:indexer
```

Reads contract ABIs → writes:

- `indexer/generated-schema.ts` (Ponder table definitions)
- `indexer/ponder.config.generated.ts` (contract + network config)

**Never manually edit generated files** — overwritten on next run.

---

## Solidity Type → Ponder Column Mapping

| Solidity              | Ponder Column | GraphQL                 |
| --------------------- | ------------- | ----------------------- |
| `address`             | `t.hex()`     | String (0x-prefixed)    |
| `bytes32`             | `t.hex()`     | String                  |
| `uint256` / `uint128` | `t.bigint()`  | BigInt (string in JSON) |
| `uint96` / `uint64`   | `t.bigint()`  | BigInt                  |
| `uint8` / `uint16`    | `t.integer()` | Int                     |
| `bool`                | `t.boolean()` | Boolean                 |
| `string`              | `t.text()`    | String                  |

---

## Docker Deployment

The indexer runs as a Docker container, never directly with Node or Bun on the host.

### Dev (local)

```bash
cd indexer
docker compose up -d        # postgres:16 + pgAdmin
ponder dev                  # Ponder dev server with hot reload
```

### Production

```bash
# All operations via docker compose
docker compose -f docker-compose.prod.yml up -d          # Start all
docker compose -f docker-compose.prod.yml logs -f indexer # Tail logs
docker compose -f docker-compose.prod.yml ps              # Status
docker compose -f docker-compose.prod.yml restart indexer # Restart
docker compose -f docker-compose.prod.yml stop indexer    # Stop
docker compose -f docker-compose.prod.yml down            # Teardown
docker compose -f docker-compose.prod.yml down -v         # Teardown + wipe data
```

### Container Names

| Container | Name                 | Purpose                                |
| --------- | -------------------- | -------------------------------------- |
| Indexer   | `aurellion_indexer`  | Ponder process                         |
| Database  | `aurellion_postgres` | PostgreSQL 16                          |
| Traefik   | `aurellion_traefik`  | SSL + reverse proxy (optional profile) |

---

## CI/CD Pipeline

Triggered by push to `main` or `dev` when indexer-related files change:

```
Push to main/dev
       │
       ▼
GitHub Actions: build job
  bun install
  bunx --bun hardhat compile
  bun scripts/gen-all.ts
  docker build -f indexer/Dockerfile
  docker push ghcr.io/aurellionlabs/web/indexer:<branch>
       │
       ▼
GitHub Actions: deploy job
  SSH into /srv/Web
  git pull origin <branch>
  cd indexer/
  docker compose pull indexer
  docker compose stop indexer
  psql: DROP SCHEMA public CASCADE; CREATE SCHEMA public;  ← schema reset
  docker compose up -d indexer
  wait for HTTP 200 on :42069 (90s timeout)
  if unhealthy → auto-rollback to previous image digest
  docker image prune -f
```

### Schema Reset on Deploy

Every deployment drops and recreates the PostgreSQL schema. This forces a clean re-sync from `DIAMOND_DEPLOY_BLOCK = 36030424`. This avoids Ponder's "app hash conflict" error when the schema or config changes between deployments.

---

## Reorg Handling

Ponder handles chain reorganisations automatically:

1. Reorg detected via WebSocket
2. Affected blocks rolled back in the database
3. Handlers re-run for the canonical chain
4. Frontend sees consistent data with no manual intervention

---

## Health Monitoring

```bash
# Container-level health check (Docker manages this)
docker inspect aurellion_indexer --format='{{.State.Health.Status}}'
# Expected: "healthy"

# Direct HTTP check
curl http://localhost:42069/
# Returns Ponder status JSON

# From outside via Traefik
curl https://indexer.aurellionlabs.com/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ mintedAssetEventss(limit:1) { items { id } } }"}'
```

---

## Resetting the Indexer

```bash
# On production server
cd /srv/Web/indexer

# Wipe data and restart
docker compose -f docker-compose.prod.yml stop indexer
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d ponder_indexer \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
docker compose -f docker-compose.prod.yml start indexer

# Full reset including database volume (data loss)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

---

## Related Pages

- [[Indexer/Ponder Setup]]
- [[Indexer/Schema and Queries]]
- [[Architecture/Data Flow]]
