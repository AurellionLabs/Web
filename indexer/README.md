# Aurellion Ponder Indexer

Event-sourced indexer for the Aurellion platform, built with [Ponder](https://ponder.sh/).

## Prerequisites

- Node.js >= 18.14
- Docker & Docker Compose (for PostgreSQL)
- An RPC endpoint for Base Sepolia

## Quick Start

1. **Start PostgreSQL**

   ```bash
   docker-compose up -d
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` file:

   ```
   PONDER_RPC_URL_84532=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ponder_indexer
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

5. **Production**
   ```bash
   npm run start
   ```

## Architecture

This indexer replaces the previous The Graph subgraphs:

- `ausys-base-sepolia` → Orders, Journeys, Signatures, Settlements
- `aurum-base-sepolia` → Nodes, NodeAssets, Capacity
- `aura-asset-base-sepolia` → ERC1155 Assets, Transfers, Balances
- `austake-base-sepolia` → Staking Operations

## Contracts Indexed

| Contract         | Address                                      | Start Block |
| ---------------- | -------------------------------------------- | ----------- |
| AuSys            | `0x986dC5647390e40AB9c0429ceE017034D42CB3bA` | 32311125    |
| AurumNodeManager | `0x5Dd5881fFa8fb3c4fAD112ffc4a37f0300dd1835` | 32311127    |
| AuraAsset        | `0x510fD569817b442318537f36F936e0F1719478a6` | 32311131    |
| AuStake          | `0xCBfb27e1c7d74e1c0E865ec47C1DBC0016C0bc07` | 32311129    |

## GraphQL API

Ponder automatically generates a GraphQL API at `http://localhost:42069/graphql`.

## Database Access

For direct PostgreSQL queries, connect to:

```
postgresql://postgres:postgres@localhost:5432/ponder_indexer
```

## pgAdmin (Optional)

Access pgAdmin at `http://localhost:5050`:

- Email: admin@aurellion.local
- Password: admin

## RPC Optimization

The indexer is configured with **optimized defaults** to reduce RPC credit usage by ~50-60% compared to standard settings.

### Automatic Optimizations

1. **RPC Request Batching**: Multiple RPC requests are automatically batched together with 100ms wait time, reducing network overhead
2. **Retry Logic**: Configured with 3 retries and 1-second delays to handle transient failures
3. **Optimized Block Ranges**: Uses 5000 block ranges (vs standard 2000) to minimize RPC call frequency
4. **Optimized Polling**: Polls every 3.5 seconds (vs 2 seconds) while still catching all blocks

### Configurable Optimizations

You can fine-tune optimization settings via environment variables:

```bash
# Polling interval in milliseconds (optimized default: 3500ms = 3.5 seconds)
# Base Sepolia has ~2 second block time, but polling every 3.5s reduces RPC calls by ~43%
# while still catching all blocks (we process multiple blocks per poll)
# Increase to 4000-5000ms for even more savings (with slight latency increase)
PONDER_POLLING_INTERVAL_MS=3500

# Maximum block range per RPC request (optimized default: 5000 blocks)
# Increased from 2000 to 5000 reduces call frequency by 60%
# Larger ranges = fewer calls but more data per call
PONDER_MAX_BLOCK_RANGE=5000

# RPC batch wait time in milliseconds (optimized default: 100ms)
# Longer wait = better batching but slightly higher latency
PONDER_RPC_BATCH_WAIT_MS=100
```

### Optimization Impact

**Before optimizations:**
- Polling: Every 2 seconds (43,200 polls/day)
- Block range: 2000 blocks per call
- Estimated usage: ~15-20 million credits/day

**After optimizations:**
- Polling: Every 3.5 seconds (~24,686 polls/day, **43% reduction**)
- Block range: 5000 blocks per call (**60% fewer calls**)
- Batch wait: 100ms (better batching efficiency)
- **Estimated usage: ~8-10 million credits/day** (50-60% reduction)

### Expected Credit Usage

With optimizations enabled:
- **Estimated daily usage**: ~8-10 million credits/day (down from ~15-20 million)
- **Savings**: ~50-60% reduction in RPC calls
- **Developer Plan (15M/day)**: Should have comfortable ~50% headroom
- **Core Plan (3M/day)**: Still insufficient, upgrade required

### Tuning for Your Needs

**For maximum credit savings** (if latency is acceptable):
```bash
PONDER_POLLING_INTERVAL_MS=5000  # Poll every 5 seconds
PONDER_MAX_BLOCK_RANGE=10000     # Process 10k blocks at once
PONDER_RPC_BATCH_WAIT_MS=150     # Longer batching window
```

**For lower latency** (if credits are not a concern):
```bash
PONDER_POLLING_INTERVAL_MS=2000  # Poll every 2 seconds
PONDER_MAX_BLOCK_RANGE=2000      # Smaller block ranges
PONDER_RPC_BATCH_WAIT_MS=50      # Faster batching
```

### Monitoring

Monitor your RPC usage in the Infura dashboard to track actual consumption and adjust settings if needed. The optimized defaults should keep you well within Developer plan limits.