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
