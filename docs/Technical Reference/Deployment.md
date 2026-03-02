---
tags: [reference, deployment, addresses, network, base-sepolia, docker]
---

# Deployment Reference

[[🏠 Home]] > Technical Reference > Deployment

All current contract addresses, deployment metadata, and infrastructure configuration for Aurellion on Base Sepolia (testnet).

> **Source of truth:** `chain-constants.ts` and `deployments/baseSepolia-*.json` in the monorepo. Always cross-reference these files if you suspect an address has changed.

---

## Network

| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Network         | **Base Sepolia**                                             |
| Chain ID        | `84532`                                                      |
| Explorer        | [https://sepolia.basescan.org](https://sepolia.basescan.org) |
| Default RPC     | `https://sepolia.base.org`                                   |
| Hardhat default | `baseSepolia`                                                |
| Indexer GraphQL | `https://indexer.aurellionlabs.com/graphql`                  |

---

## Primary Diamond

> Single entry point for all Aurellion contract interactions.

| Property          | Value                                        |
| ----------------- | -------------------------------------------- |
| **Diamond Proxy** | `0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7` |
| Deploy Block      | `37798377`                                   |
| Deployer          | `0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF` |

> ⚠️ **V2 Note:** This Diamond replaced an earlier deployment (`0x2516CAdb7b3d4E94094bC4580C271B8559902e3f`) that had storage conflicts between V1 and V2 order book structures. Always use this address.

---

## Diamond Facet Implementations

All addresses sourced directly from deployment JSON files. Block numbers = when the facet implementation was deployed (not when it was cut into the Diamond).

| Facet                                                                    | Address                                      | Block    |
| ------------------------------------------------------------------------ | -------------------------------------------- | -------- |
| DiamondCutFacet                                                          | `0xf20eBBF5cD6D9Be29C07aefC7A90Fb42C5Fd7770` | 37798347 |
| DiamondLoupeFacet                                                        | `0x63a67381E5158A5183df4C2dd2a72AfF409eAA01` | 37798349 |
| OwnershipFacet                                                           | `0x03fc08c2Ee451E86e798DeF0e7262556b66E13e1` | 37798351 |
| ERC1155ReceiverFacet                                                     | `0xFDb90E10F42b3Da93DBFaC5fEFE8D75E31775e34` | 37798353 |
| [[Smart Contracts/Facets/RWYStakingFacet\|RWYStakingFacet]]              | `0xa695B719138d91A06FA9Ec24589EA73bdCb10830` | 37798363 |
| OperatorFacet                                                            | `0x37e5d45e2c1d8f753a50025084E22C312D19DA9b` | 37798365 |
| [[Smart Contracts/Facets/BridgeFacet\|BridgeFacet]]                      | `0x83365e0d2fD97Bb0Ba5eCF8D52dF371F2a14315b` | 37798367 |
| [[Smart Contracts/Facets/CLOBCoreFacet\|CLOBFacet]] (view)               | `0x76235E5138910F7033610530d6c01082F23C9d90` | 37798370 |
| [[Smart Contracts/Facets/OrderRouterFacet\|OrderRouterFacet]] ⭐         | `0x2bd1D7DCd64F6705898A9E5aeD5d39c0462B08AB` | 37798373 |
| [[Smart Contracts/Facets/AssetsFacet\|AssetsFacet]]                      | `0x73755152A5002F3020Efa4bc2e0333267c22eaA8` | 37798436 |
| [[Smart Contracts/Facets/NodesFacet\|NodesFacet]]                        | `0xc23eB03C84626dE9228c64377f8111a97F8CaEc1` | 37798451 |
| OrdersFacet                                                              | `0x3da9c79805af442d1EC0163843b92DF289717a15` | 37798361 |
| [[Smart Contracts/Facets/AuSysFacet\|AuSysFacet]]                        | `0xCA6e4044AA25400F593Efed0B11694f1a6f7c053` | 37885943 |
| [[Smart Contracts/Facets/CLOBLogisticsFacet\|CLOBLogisticsFacet]] ⭐ new | `0x66fD1A58dd7d0097bFb558F083b750748e7dd8DD` | 38304361 |

⭐ = Key integration points.

---

## Legacy / Standalone Contracts

Pre-Diamond architecture. **No longer the primary system.** Kept for historical data and legacy integrations.

| Contract                | Address                                      | Block    | Superseded By                 |
| ----------------------- | -------------------------------------------- | -------- | ----------------------------- |
| AuStake                 | `0x6d00C0cE97E10794d8771743915a2C0DB6d99492` | 36423442 | RWYStakingFacet               |
| Aura (ERC-20)           | `0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6` | 36423435 | _(quote token, still active)_ |
| AurumNodeManager        | `0x725793e4Ebb067df8167D43be56b4d86A6c964F3` | 36423440 | NodesFacet                    |
| AuSys (standalone)      | `0x94a61417e11C2e4FB756DBF2a0CaC7f433eaE6Aa` | 36423438 | AuSysFacet (Diamond)          |
| AuSysFacet (standalone) | `0xbA875188D8a538A7DcCdA91f3bD98c0d18b8E21f` | —        | AuSysFacet (Diamond)          |
| AuraAsset (ERC-1155)    | `0xb3090aBF81918FF50e921b166126aD6AB9a03944` | 36423444 | AssetsFacet                   |
| CLOB V1                 | `0xDd33fF6AE3E20E59D1AC20336358F024a2861304` | 36423451 | OrderRouterFacet              |
| CLOB V2 Diamond         | `0x2516CAdb7b3d4E94094bC4580C271B8559902e3f` | 36246491 | Primary Diamond               |
| RWYVault                | `0xfC2d5b8464f14a051661E6dE14DB3F703C601938` | 35861876 | RWYStakingFacet               |
| OrderBridge             | `0xad1f2aBF1baE127464Ea5ADd8A540c7bfDade226` | —        | BridgeFacet                   |

---

## Tokens

| Token                | Address                                      | Decimals | Notes                       |
| -------------------- | -------------------------------------------- | -------- | --------------------------- |
| AURA (ERC-20)        | `0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6` | 18       | Testnet quote token         |
| AuraAsset (ERC-1155) | `0xb3090aBF81918FF50e921b166126aD6AB9a03944` | N/A      | Legacy RWA token            |
| USDC (mainnet)       | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6        | Base Sepolia USDC (planned) |

---

## Deployment Block Reference

| Contract             | Block             | Timestamp  |
| -------------------- | ----------------- | ---------- |
| Diamond (primary V2) | 37798377          | —          |
| CLOBLogisticsFacet   | 38304361          | 2026-03-01 |
| AuSysFacet (Diamond) | 37885943          | 2026-02-19 |
| AssetsFacet          | 37798436          | —          |
| NodesFacet           | 37798451          | —          |
| Legacy contracts     | 36423435–36423451 | 2026-01-09 |

---

## Frontend Environment Variables

```env
# Contract addresses (from chain-constants.ts — do not hardcode manually)
NEXT_PUBLIC_DIAMOND_ADDRESS=0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7
NEXT_PUBLIC_AURA_ASSET_ADDRESS=0xb3090aBF81918FF50e921b166126aD6AB9a03944
NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS=0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6
NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL=AURA
NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS=18

# Indexer (also in chain-constants.ts)
NEXT_PUBLIC_INDEXER_URL=https://indexer.aurellionlabs.com/graphql

# RPC (never commit API keys)
NEXT_PUBLIC_RPC_URL_84532=https://base-sepolia.rpc.provider/<api-key>

# Auth
NEXT_PUBLIC_PRIVY_APP_ID=<your-privy-app-id>

# Chain
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532
```

> **Note:** Most of these are auto-exported from `chain-constants.ts`. Import directly: `import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants'`

---

## Indexer Environment Variables

```env
NEXT_PUBLIC_RPC_URL_84532=https://base-sepolia.rpc.provider/<api-key>
NEXT_PUBLIC_DIAMOND_ADDRESS=0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7
POSTGRES_PASSWORD=<your-postgres-password>
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/ponder_indexer
DATABASE_SCHEMA=public
```

---

## Deploying New Facets

```bash
# 1. Write and test the new facet
bunx --bun hardhat test test/<facet>/

# 2. Compile
bunx --bun hardhat compile

# 3. Deploy facet implementation
bunx --bun hardhat run scripts/unified-deploy.ts --network baseSepolia
# Output: baseSepolia-<timestamp>.json with new facet address

# 4. Get function selectors for the facet
bun scripts/get-selectors.ts --contract NewFacet

# 5. Execute diamondCut (Add / Replace / Remove)
bunx --bun hardhat run scripts/diamond-cut.ts --network baseSepolia \
  --facetAddress <NEW_ADDRESS> --action Add --selectors <sel1,sel2,...>

# 6. Verify on Basescan
bunx --bun hardhat verify --network baseSepolia <NEW_ADDRESS>

# 7. If new events: regenerate indexer schema
bun run generate:indexer
# Review generated-schema.ts — new tables should appear

# 8. Commit + push → GitHub Actions builds new Docker image → deploys indexer
# (Deployment is automatic via .github/workflows/deploy-indexer.yml)

# 9. chain-constants.ts is auto-updated by deployment scripts
# Commit and push the updated chain-constants.ts
```

---

## Running the Indexer

The indexer runs as a **Docker container** — never directly with Node, Bun, or any process manager on the host.

```bash
# Production (SSH to server at /srv/Web/indexer)
docker compose -f docker-compose.prod.yml up -d          # Start
docker compose -f docker-compose.prod.yml logs -f indexer # Tail logs
docker compose -f docker-compose.prod.yml ps              # Status
docker compose -f docker-compose.prod.yml restart indexer # Restart
docker compose -f docker-compose.prod.yml stop indexer    # Stop

# Local dev
cd indexer && docker compose up -d   # Postgres + pgAdmin
ponder dev                           # Ponder with hot reload
```

Image: `ghcr.io/aurellionlabs/web/indexer:<branch>` (from GHCR)

See [[Indexer/Ponder Setup]] for full Docker documentation.

---

## Mainnet Readiness Checklist

- [ ] Replace AURA quote token with USDC (change `QUOTE_TOKEN_DECIMALS` to 6)
- [ ] Independent security audit (BridgeFacet, CLOBMatchingFacet, AuSysFacet, RWYStakingFacet)
- [ ] Set Diamond owner to multisig
- [ ] Set `feeRecipient` to multisig
- [ ] Set `emergencyTimelock` to production value
- [ ] Configure `commitmentThreshold` for USDC 6-decimal precision
- [ ] KYC/KYB process for node operators
- [ ] Node validation off-chain pipeline
- [ ] Price oracle integration for circuit breaker thresholds
- [ ] Gas benchmarking on Base mainnet

---

## Related Pages

- [[Architecture/Diamond Proxy Pattern]]
- [[Smart Contracts/Overview]]
- [[Indexer/Ponder Setup]]
- [[Technical Reference/Upgrading Facets]]
