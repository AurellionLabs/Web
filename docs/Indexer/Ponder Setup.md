---
tags: [indexer, ponder, events, infrastructure, docker, bun]
---

# Ponder Indexer Setup

[[🏠 Home]] > Indexer > Ponder Setup

Aurellion uses **Ponder** as its event indexer. Ponder listens to all Diamond contract events, stores them in PostgreSQL, and exposes a GraphQL API that the frontend queries instead of hitting the blockchain directly.

---

## Why Ponder?

| Feature     | The Graph              | Ponder                    |
| ----------- | ---------------------- | ------------------------- |
| Language    | AssemblyScript         | TypeScript                |
| Local dev   | Difficult              | First-class support       |
| Debugging   | Standard Node.js tools | Standard Node.js tools    |
| Type safety | Limited                | Full TypeScript types     |
| Custom API  | Schema only            | Full HTTP handler support |

Ponder gives Aurellion full TypeScript across the entire stack — same language as the frontend and domain layer.

---

## Indexer Structure

```
indexer/
├── abis/                           ← Diamond ABI fragments
├── src/
│   └── handlers/                   ← Event handler functions
│       ├── index.ts                 ← Handler registry
│       └── *.ts                    ← Per-domain handlers
├── test/
│   └── smoke/                      ← Vitest smoke tests
├── generated-schema.ts             ← Auto-generated (DO NOT EDIT)
├── ponder.config.ts                ← Main Ponder configuration
├── ponder.config.generated.ts      ← Auto-generated config
├── ponder-env.d.ts                 ← TypeScript env types
├── Dockerfile                      ← Multi-stage bun build
├── docker-compose.yml              ← Local dev (Postgres + pgAdmin)
├── docker-compose.prod.yml         ← Production (Postgres + Indexer + Traefik)
├── healthcheck.sh                  ← Docker HEALTHCHECK script
└── package.json                    ← Indexer-specific dependencies
```

---

## Runtime Stack

| Component            | Technology                                     | Why                                  |
| -------------------- | ---------------------------------------------- | ------------------------------------ |
| Runtime              | **Bun** (`oven/bun:1`)                         | Fast JS/TS runtime, built-in bundler |
| Package manager      | **bun**                                        | Monorepo root uses `bun@1.2.8`       |
| Containers           | **Docker Compose**                             | Both dev and production              |
| Database             | **PostgreSQL 16 Alpine**                       | Ponder persistence layer             |
| Reverse proxy (prod) | **Traefik**                                    | SSL termination, routing             |
| Registry             | **GHCR** (`ghcr.io/aurellionlabs/web/indexer`) | GitHub Container Registry            |
| CI/CD                | **GitHub Actions**                             | Build → push → SSH deploy            |

---

## Configuration (ponder.config.ts)

```typescript
import { createConfig } from '@ponder/core';
import { http } from 'viem';

export default createConfig({
  networks: {
    baseSepolia: {
      chainId: 84532,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL_84532),
    },
  },
  contracts: {
    Diamond: {
      network: 'baseSepolia',
      abi: diamondAbi,
      address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK, // 36030424
    },
  },
});
```

The auto-generated config (`ponder.config.generated.ts`) is produced by:

```bash
bun scripts/generate-indexer.ts
```

and includes all facet ABIs concatenated.

---

## Schema Architecture

### Current: Dumb Indexer Pattern

Raw events stored as-is. No aggregation in the indexer — the repository layer handles state derivation:

```typescript
// generated-schema.ts
export const mintedAssetEvents = onchainTable('mintedAssetEvents', (t) => ({
  id: t.text().primaryKey(),
  account: t.hex(),
  hash: t.hex(),
  tokenId: t.bigint(),
  name: t.text(),
  assetClass: t.text(),
  className: t.text(),
  block_timestamp: t.bigint(),
  transaction_hash: t.hex(),
}));
```

Table name = camelCase event name (Ponder pluralises it, creating the double `ss` in queries):

- `MintedAsset` event → `mintedAssetEvents` table → `mintedAssetEventss` in GraphQL

---

## Indexed Events

### Asset Events

| Event                 | Table                        |
| --------------------- | ---------------------------- |
| `MintedAsset`         | `mintedAssetEventss`         |
| `CustodyEstablished`  | `custodyEstablishedEventss`  |
| `SupportedClassAdded` | `supportedClassAddedEventss` |

### Node Events

| Event                 | Table                        |
| --------------------- | ---------------------------- |
| `NodeRegistered`      | `nodeRegisteredEventss`      |
| `SupportedAssetAdded` | `supportedAssetAddedEventss` |
| `NodeCapacityUpdated` | `nodeCapacityUpdatedEventss` |

### CLOB Events

| Event                | Table                       |
| -------------------- | --------------------------- |
| `RouterOrderPlaced`  | `routerOrderPlacedEventss`  |
| `TradeExecuted`      | `tradeExecutedEventss`      |
| `MarketDepthChanged` | `marketDepthChangedEventss` |
| `PoolCreated`        | `poolCreatedEventss`        |
| `LiquidityAdded`     | `liquidityAddedEventss`     |

### Bridge / Logistics Events

| Event                   | Table                          |
| ----------------------- | ------------------------------ |
| `UnifiedOrderCreated`   | `unifiedOrderCreatedEventss`   |
| `LogisticsOrderCreated` | `logisticsOrderCreatedEventss` |
| `JourneyStatusUpdated`  | `journeyStatusUpdatedEventss`  |
| `OrderSettled`          | `orderSettledEventss`          |

### AuSys Events

| Event                       | Table                              |
| --------------------------- | ---------------------------------- |
| `AuSysOrderCreated`         | `auSysOrderCreatedEventss`         |
| `JourneyCreated`            | `journeyCreatedEventss`            |
| `DriverAssigned`            | `driverAssignedEventss`            |
| `EmitSig`                   | `emitSigEventss`                   |
| `AuSysJourneyStatusUpdated` | `auSysJourneyStatusUpdatedEventss` |
| `P2POfferCreated`           | `p2POfferCreatedEventss`           |

### RWY Events

| Event                | Table                       |
| -------------------- | --------------------------- |
| `OpportunityCreated` | `opportunityCreatedEventss` |
| `CommodityStaked`    | `commodityStakedEventss`    |
| `ProfitDistributed`  | `profitDistributedEventss`  |

---

## Running Locally

```bash
cd indexer

# 1. Start PostgreSQL (and pgAdmin on port 5050)
docker compose up -d

# Postgres available at:
#   host: localhost:5432
#   user: postgres
#   password: aurellion_secure_2026
#   database: ponder_indexer

# 2. Install indexer dependencies
bun install

# 3. Regenerate schema if contracts changed
bun run generate:indexer   # or: cd .. && bun scripts/generate-indexer.ts

# 4. Start Ponder dev server (hot reload)
ponder dev

# GraphQL playground: http://localhost:42069/graphql
# REST endpoint:      http://localhost:42069
```

---

## Running Tests

```bash
cd indexer

# Run Vitest smoke tests
vitest run

# Watch mode
vitest
```

Smoke tests gracefully skip if the indexer isn't running — they're designed to be run after `ponder dev` is up.

---

## Production Architecture

```
GitHub Actions (CI)
  1. bun install
  2. bunx hardhat compile
  3. bun scripts/gen-all.ts
  4. docker build → push → ghcr.io/aurellionlabs/web/indexer:<branch>

GitHub Actions (Deploy) via SSH to /srv/Web
  1. git pull origin <branch>
  2. docker compose -f docker-compose.prod.yml pull indexer
  3. docker compose stop indexer
  4. DROP/recreate public schema in Postgres
  5. docker compose up -d indexer
  6. Health check loop (90s timeout, HTTP on :42069)
  7. Auto-rollback to previous image on failure
```

---

## Docker Setup

### Dockerfile (Multi-stage Bun Build)

```dockerfile
# Stage 1: Build — compiles contracts, generates ABIs
FROM oven/bun:1 AS builder
WORKDIR /app
# Copies monorepo root + indexer/, compiles contracts via hardhat
RUN bunx --bun hardhat compile
RUN bun scripts/gen-all.ts

# Stage 2: Runner — minimal Alpine image
FROM oven/bun:1-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ponder
# Non-root user: ponder
EXPOSE 42069
CMD ["bun", "run", "--cwd", "indexer", "start"]
```

### Production Compose Services

| Service    | Image                                     | Port    | Notes                             |
| ---------- | ----------------------------------------- | ------- | --------------------------------- |
| `postgres` | `postgres:16-alpine`                      | 5432    | Persistent volume `postgres_data` |
| `indexer`  | `ghcr.io/aurellionlabs/web/indexer:<tag>` | 42069   | Depends on postgres healthy       |
| `traefik`  | `traefik:v3.0`                            | 80, 443 | Optional, profile `with-traefik`  |

### Health Check

Docker uses `healthcheck.sh` as its `HEALTHCHECK` directive (interval 30s, timeout 15s, 5 retries). The script hits `http://localhost:42069/` and validates a 200 response.

```bash
# Check container health from host
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f indexer

# Manual health check
docker exec aurellion_indexer curl -sf http://localhost:42069/
```

---

## Important: Schema Reset on Every Deploy

The CI deploy script drops and recreates the PostgreSQL `public` schema on every deployment:

```bash
docker compose exec -T postgres psql -U postgres -d ponder_indexer \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
```

**Why:** Ponder stores a hash of its config/schema. If it detects a mismatch with the existing database (e.g., new events added), it refuses to start. Resetting the schema forces a clean re-sync from `startBlock`.

**Implication:** Every production deployment re-indexes from block `36030424`. On Base Sepolia this takes a few minutes depending on event volume and RPC throughput.

---

## Resetting Locally

```bash
# Full reset: stop containers, remove volumes, restart
docker compose down -v
docker compose up -d
ponder dev   # Re-syncs from startBlock
```

---

## Environment Variables

| Variable                      | Required  | Description                     |
| ----------------------------- | --------- | ------------------------------- |
| `NEXT_PUBLIC_RPC_URL_84532`   | ✅        | Base Sepolia RPC URL            |
| `POSTGRES_PASSWORD`           | ✅ (prod) | Postgres password               |
| `DATABASE_URL`                | ✅        | Full postgres connection string |
| `DATABASE_SCHEMA`             | Optional  | Default: `public`               |
| `PONDER_NETWORK`              | Optional  | Default: `baseSepolia`          |
| `PONDER_LOG_LEVEL`            | Optional  | Default: `info`                 |
| `NEXT_PUBLIC_DIAMOND_ADDRESS` | ✅        | Diamond proxy address           |

---

## Schema Generation

```bash
# From monorepo root:
bun scripts/generate-indexer.ts

# Or via npm script alias (calls the same thing):
bun run generate:indexer
```

**Never manually edit `generated-schema.ts`** — overwritten on next generation run.

---

## Related Pages

- [[Indexer/Schema and Queries]]
- [[Architecture/Data Flow]]
- [[Architecture/Indexer Architecture]]
