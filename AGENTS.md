# AGENTS.md - Aurellion Monorepo

Web3/DeFi platform with Next.js 14, Solidity 0.8.28 (Diamond Pattern), Ponder indexer, TypeScript throughout.

## Build Commands

```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # TypeScript check + Next.js build
npm run build:full       # Compile contracts + extract ABIs + build
npm run contract:update # Compile contracts + generate ABIs + typechain
npm run contract:compile # Compile Solidity only
npm run contract:deploy # Deploy to baseSepolia
npm run typecheck        # TypeScript only (tsc --noEmit)
npm run lint             # Next.js ESLint
npm run format           # Prettier format all files
```

## Testing Commands

```bash
# Single test execution
npx vitest run test/infrastructure/services/OrderBridgeService.test.ts  # Service test
npx vitest run test/hooks/useUnifiedOrder.test.ts                       # Hook test
npx vitest run -t "test name pattern"                                   # By pattern
npx hardhat test test/OrderBridge.test.ts                              # Hardhat contract
forge test --match-contract DiamondTest -vv                           # Forge Diamond
npx playwright test path/to/test.spec.ts                               # Browser test

# Test suites
npm run test             # All Vitest tests
npm run test:unit        # Excludes deployment tests
npm run test:coverage    # With coverage
npm run test:hardhat     # Hardhat contract tests
npm run test:diamond     # Forge Diamond tests
npm run test:e2e         # E2E tests
npm run test:browser     # Playwright tests
npm run test:deployment  # Deployment verification
```

## Code Style

### TypeScript

- **Formatting**: 2 spaces, semicolons, single quotes, 80 char width (Prettier)
- **Strict Mode**: Enabled in tsconfig.json
- **Naming**: Components `PascalCase`, hooks `useX`, booleans `isX/hasX`, constants `SCREAMING_SNAKE_CASE`
- **Types**: `interface` for structures, `type` for unions, `I` prefix for service interfaces

### Import Order

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

import { Button } from '@/components/ui/button';
import { useOrderBook } from '@/hooks/useOrderBook';
import { formatWei } from '@/lib/formatters';
import { OrderSide } from '@/types';
import type { IOrderService } from '@/infrastructure/services/interfaces';
```

### File Naming

- Components: `PascalCase.tsx` | Hooks: `camelCase.ts`
- Services: `PascalCase.service.ts` | Repositories: `PascalCase.repository.ts`
- Utils: `camelCase.ts` | Constants: `SCREAMING_SNAKE_CASE.ts`

### Error Handling Pattern

```typescript
// Service layer - always return result object
async function getOrder(
  id: string,
): Promise<{ success: boolean; data?: Order; error?: string }> {
  try {
    const order = await repository.findById(id);
    return { success: true, data: order };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

// React hooks - handle result objects
const { data, error } = useQuery({
  queryKey: ['order', id],
  queryFn: () => orderService.getOrder(id),
});
```

### Component Patterns

- Use `'use client'` directive for client components
- Function components with hooks over class components
- Extract reusable logic into custom hooks (`useX.ts`)
- Use Radix UI primitives for accessible UI components
- Use TanStack Query (React Query) for server state

### Solidity

- **Formatting**: 4 spaces, 120 char width (Foundry)
- **Naming**: Contracts `PascalCase`, events/errors `PascalCase`, internal `_prefix`
- **Documentation**: NatSpec required (`@title`, `@notice`, `@dev`, `@return`)
- **Pattern**: Diamond proxy pattern with facets

## Project Structure

```
app/                  # Next.js App Router
components/           # React components (UI primitives in components/ui/)
contracts/            # Solidity contracts (diamond/ for facets, mocks/ for tests)
hooks/                # React custom hooks
infrastructure/       # Services & repositories (services/, repositories/, shared/)
lib/                 # Utilities, formatters, helpers
test/                 # Unit/integration tests
e2e/tests/            # E2E tests (Vitest)
e2e/browser/          # Playwright browser tests
indexer/              # Ponder indexer
typechain-types/      # Generated types from ABIs
scripts/              # Deployment scripts
```

## Indexer Pattern

Pure dumb indexer - only stores raw blockchain events. Business logic in frontend aggregators (`infrastructure/shared/event-aggregators.ts`). Schema auto-generated via `npm run generate:indexer`.

## Git Rules for Agents

- **NEVER push PRD files** (`prd.json`, `progress.txt`) to remote
- **NEVER commit ralph/ directory contents** except docs updates

## Environment (Cursor Cloud)

- Package manager: `bun` (`.npmrc` has `legacy-peer-deps=true`)
- After `bun install`, run `bun run contract:compile` to generate `typechain-types/`
- ESLint 8 + `eslint-config-next@14` (not ESLint 9)
- Dev server: `npm run dev` (port 3000)

## Pre-existing Issues

- `npm run lint`: Pre-existing warnings about React hooks deps and 2 `react/no-unescaped-entities` errors
- `npm run test:hardhat`: 33 passing, 3 pre-existing failures (ABI mismatch in `OrderRepository`)
- `npm run test:service:unit`: ESM/CJS incompatibility with `chai-as-promised@8` under `ts-node`

## P2P Trading (Manual Testing)

- When switching MetaMask accounts, **hard refresh (F5)** is required for DApp to update wallet signer
- Quote token: **AURA** (not USDC). Mint at `/customer/faucet`
- Google Maps Places autocomplete for delivery addresses (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` required)
- Runs on **Base Sepolia** testnet (chain ID 84532)
