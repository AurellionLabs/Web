---
tags: [reference, testing, hardhat, vitest, bun, docker]
---

# Testing Guide

[[🏠 Home]] > Technical Reference > Testing Guide

How to run, write, and understand tests across the Aurellion codebase. The monorepo uses **Bun** as its package manager and runtime.

---

## Test Stack

| Layer            | Framework          | Command                                  | Location               |
| ---------------- | ------------------ | ---------------------------------------- | ---------------------- |
| Smart contracts  | Hardhat (via bunx) | `bunx --bun hardhat test`                | `test/`                |
| Unit/integration | Vitest (via bunx)  | `bunx vitest run`                        | `test/`                |
| Indexer          | Vitest             | `cd indexer && vitest run`               | `indexer/test/smoke/`  |
| Repository tests | Vitest             | `bunx vitest run test/repositories/`     | `test/repositories/`   |
| Hook tests       | Vitest             | `bunx vitest run test/hooks/`            | `test/hooks/`          |
| Service tests    | Bun test           | `bun test test/infrastructure/services/` | `test/infrastructure/` |

---

## Package Manager & Runtime

The monorepo uses **Bun** exclusively (`packageManager: "bun@1.2.8"`):

```bash
# Install everything
bun install --frozen-lockfile

# NOT npm install, NOT pnpm install
```

Node.js version: **22** (as used in CI)

---

## Smart Contract Tests (Hardhat)

```bash
# Run all Hardhat tests
bunx --bun hardhat test

# Run specific test file
bunx --bun hardhat test test/OrderBridge.test.ts

# With gas reporting
REPORT_GAS=true bunx --bun hardhat test

# Run on forked Base Sepolia
bunx --bun hardhat test --network hardhat  # (fork configured in hardhat.config.ts)
```

---

## Vitest Tests

```bash
# Run all Vitest tests (excluding deployment tests)
bunx vitest run --exclude 'test/deployment/**'

# Or via npm script alias:
bun run test:unit

# Run with coverage
bunx vitest run --coverage
# Alias: bun run test:coverage

# Specific test suites:
bunx vitest run test/repositories/CLOBRepository.test.ts   # bun run test:repo:clob
bunx vitest run test/services/OrderBridgeService.test.ts   # bun run test:service:bridge
bunx vitest run test/hooks/useUnifiedOrder.test.ts         # bun run test:hooks

# Watch mode
bunx vitest
```

---

## Service/Repository Tests (Bun test)

```bash
# Unit tests
bun test test/infrastructure/services/**/*.service.test.ts
# Alias: bun run test:service:unit

# Integration tests
bun test test/infrastructure/services/**/*.service.integration.test.ts
# Alias: bun run test:service:integration

# Repository unit tests
bun test test/infrastructure/repositories/**/*.unit.test.ts
# Alias: bun run test:repo:unit
```

---

## Indexer Tests

```bash
cd indexer

# Start Postgres first (if smoke tests need it)
docker compose up -d

# Run all indexer tests
vitest run
# Alias: bun run test

# Watch mode
bun run test:watch
```

Smoke tests skip gracefully if the indexer isn't running — they check for a reachable GraphQL endpoint before asserting.

---

## Full Test Sequence (mirrors CI)

```bash
# 1. Install
bun install --frozen-lockfile

# 2. Type check
bun run typecheck

# 3. Compile contracts (generates artifacts for tests)
bunx --bun hardhat compile

# 4. Generate ABIs
bun scripts/gen-all.ts

# 5. Validate ABIs
bun scripts/validate-abis.ts

# 6. Vitest
bunx vitest run

# 7. Hardhat
bunx --bun hardhat test

# 8. Indexer (separate job in CI)
cd indexer && bun install --frozen-lockfile && vitest run
```

---

## Writing a Contract Test (Hardhat)

```typescript
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('AssetsFacet', () => {
  let diamond: any;
  let nodeOwner: any;

  beforeEach(async () => {
    [, nodeOwner] = await ethers.getSigners();
    diamond = await deployDiamond();

    // Register and validate a node
    await diamond
      .connect(nodeOwner)
      .registerNode('FARM', 100, '-1.28', '36.81', 'Test Farm');
    const [nodeHash] = await diamond.getOwnerNodes(nodeOwner.address);
    await diamond.validateNode(nodeHash); // owner-only
  });

  it('mints an asset as a valid node', async () => {
    const assetDef = {
      name: 'Test Goat',
      assetClass: 'LIVESTOCK',
      attributes: [],
    };

    const tx = await diamond
      .connect(nodeOwner)
      .nodeMint(nodeOwner.address, assetDef, 5, 'LIVESTOCK', '0x');
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: any) => {
        try {
          return diamond.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'MintedAsset');

    expect(event).to.not.be.undefined;
    expect(event.args.account).to.equal(nodeOwner.address);

    const balance = await diamond.balanceOf(
      nodeOwner.address,
      event.args.tokenId,
    );
    expect(balance).to.equal(5n);
  });

  it('reverts if caller has no valid node', async () => {
    const [, , nonNode] = await ethers.getSigners();
    await expect(
      diamond
        .connect(nonNode)
        .nodeMint(
          nonNode.address,
          { name: '', assetClass: '', attributes: [] },
          1,
          'LIVESTOCK',
          '0x',
        ),
    ).to.be.revertedWithCustomError(diamond, 'InvalidNode');
  });
});
```

---

## Writing an Indexer Smoke Test (Vitest)

```typescript
// indexer/test/smoke/assets.smoke.test.ts
import { describe, it, expect } from 'vitest';
import { request, gql } from 'graphql-request';

const INDEXER_URL = process.env.INDEXER_URL ?? 'http://localhost:42069';

describe('Assets smoke', () => {
  it('returns mintedAsset events', async () => {
    const query = gql`
      query {
        mintedAssetEventss(limit: 5) {
          items {
            id
            account
            tokenId
          }
        }
      }
    `;

    const data = await request(INDEXER_URL, query).catch(() => null);
    if (!data) return; // Skip if indexer not running

    expect(data.mintedAssetEventss.items).toBeInstanceOf(Array);
  });
});
```

---

## Local Dev Database (Docker)

For integration tests that need a live database:

```bash
cd indexer

# Starts postgres:16-alpine + pgAdmin
docker compose up -d

# Connection details (dev only):
# host: localhost:5432
# user: postgres
# password: aurellion_secure_2026
# database: ponder_indexer
# pgAdmin: http://localhost:5050 (admin@aurellion.com / admin)

# Stop
docker compose down

# Wipe data
docker compose down -v
```

---

## CI Pipeline (Actual)

Three jobs defined in `.github/workflows/ci.yml`:

### Job 1: `lint-and-test` (ubuntu-latest, Node 22, Bun latest)

```yaml
- run: bun install --frozen-lockfile
- run: CI=true bun run lint || true
- run: bun run typecheck
- run: bunx --bun hardhat compile
- uses: actions/upload-artifact@v4 # Upload artifacts between jobs
  with: { name: hardhat-artifacts, path: artifacts/ }
- run: bun scripts/gen-all.ts
- run: bun scripts/validate-abis.ts
- run: bunx vitest run
- run: bunx --bun hardhat test
```

### Job 2: `indexer-tests` (needs: lint-and-test)

```yaml
- run: bun install --frozen-lockfile
- uses: actions/download-artifact@v4 # Reuse compiled artifacts
  with: { name: hardhat-artifacts, path: artifacts/ }
- run: cd indexer && bun install --frozen-lockfile
- run: cd indexer && bun run test # vitest run
```

### Job 3: `build-indexer` (needs: both above)

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    context: .
    file: ./indexer/Dockerfile
    push: false # Test build only — push happens in deploy-indexer.yml
    tags: indexer:test
```

**Push to GHCR and deploy to server** happens in `.github/workflows/deploy-indexer.yml` — triggered on push to `main` or `dev` branches when indexer-related files change.

---

## Key Test Patterns

### Must-Pass (Critical Path)

| Scenario                                 | Test Type        |
| ---------------------------------------- | ---------------- |
| Valid node mints tokens                  | Hardhat          |
| Invalid node cannot mint → `InvalidNode` | Hardhat          |
| Buy order placed and escrowed            | Hardhat / Vitest |
| Order matches — tokens exchanged         | Hardhat          |
| Journey completes — bounty paid          | Hardhat          |
| Unified order settles                    | Hardhat          |
| Cancel order refunds escrow              | Hardhat          |

### Edge Cases

| Scenario                         | Expected                    |
| -------------------------------- | --------------------------- |
| FOK with insufficient liquidity  | `FOKNotFilled`              |
| GTD order past expiry            | Auto-cancelled              |
| Order > `commitmentThreshold`    | `OrderRequiresCommitReveal` |
| Rate limit exceeded              | `RateLimitExceeded`         |
| Second `handOff` on same journey | `RewardAlreadyPaid`         |
| Unstake after FUNDED             | `CannotUnstake`             |

---

## Related Pages

- [[Indexer/Ponder Setup]]
- [[Technical Reference/Developer Quickstart]]
- [[Technical Reference/Troubleshooting]]
