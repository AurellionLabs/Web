# AGENTS.md - Aurellion Monorepo

Web3/DeFi platform with Next.js 14, Solidity 0.8.28 (Diamond Pattern), Ponder indexer, TypeScript throughout.

## Build Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # TypeScript check + Next.js build
npm run build:full       # Compile contracts + extract ABIs + build
npm run contract:update # Compile contracts + generate ABIs + typechain
npm run contract:compile # Compile Solidity contracts only
npm run contract:gen    # Generate TypeScript types from ABIs
npm run contract:deploy # Deploy contracts to baseSepolia
npm run contract:validate # Validate ABI consistency
npm run typecheck        # TypeScript only (tsc --noEmit)
npm run lint             # Next.js ESLint
npm run format           # Prettier format all files
```

## Testing Commands

### Single Test Execution

```bash
# Vitest (unit/integration tests)
npx vitest run test/infrastructure/services/OrderBridgeService.test.ts  # Service test
npx vitest run test/repositories/CLOBRepository.test.ts                 # Repository test
npx vitest run test/hooks/useUnifiedOrder.test.ts                       # Hook test
npx vitest run -t "test name pattern"                                   # By pattern
npx vitest run test/infrastructure/services/**/*.service.test.ts        # All service tests
npx vitest run test/infrastructure/repositories/**/*.unit.test.ts      # All repo tests

# Hardhat (smart contract tests)
npx hardhat test test/OrderBridge.test.ts                               # Single contract
npx hardhat test test/OrderBridge.test.ts --grep "test name"            # By pattern

# Forge (Diamond tests)
forge test --match-contract ContractName -vv                           # Single contract
forge test --match-test "testName" -vv                                 # Single test

# Playwright (browser tests)
npx playwright test path/to/test.spec.ts                               # Single file
npx playwright test path/to/test.spec.ts --grep "test name"            # By pattern

# E2E Tests
npx vitest run --config e2e/vitest.config.ts                           # All E2E
```

### Full Test Suites

```bash
npm run test             # All Vitest tests
npm run test:unit        # Excludes deployment tests
npm run test:coverage    # With coverage report
npm run test:service     # Unit + integration tests
npm run test:service:unit
npm run test:service:integration
npm run test:repo:unit
npm run test:hooks
npm run test:hardhat     # All Hardhat tests
npm run test:diamond     # Forge Diamond tests
npm run test:e2e         # Uses Hardhat chain
npm run test:e2e:fast    # Fast mode
npm run test:e2e:anvil   # With Anvil chain
npm run test:browser     # All Playwright tests
npm run test:browser:headed
```

### Additional Test Commands

```bash
npm run test:deployment      # Deployment verification tests
npm run test:smoke           # Smoke tests
npm run validate:queries     # GraphQL query validation
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
- Prefer function components with hooks over class components
- Extract reusable logic into custom hooks (`useX.ts`)
- Use Radix UI primitives for accessible UI components
- Colocate component styles with components using Tailwind CSS

### Data Fetching

- Use TanStack Query (React Query) for server state
- Define query keys as arrays: `['entity', id, options]`
- Prefer custom hooks that wrap useQuery/useMutation
- Handle loading/error states explicitly in UI

### Solidity

- **Formatting**: 4 spaces, 120 char width (Foundry)
- **Naming**: Contracts `PascalCase`, events/errors `PascalCase`, internal `_prefix`
- **Documentation**: NatSpec required (`@title`, `@notice`, `@dev`, `@return`)
- **Pattern**: Diamond proxy pattern with facets
- **Testing**: Use Forge for Diamond facet tests

## Project Structure

```
app/                  # Next.js App Router (pages/api, layouts, etc.)
components/           # React components (UI primitives in components/ui/)
contracts/            # Solidity contracts
  diamond/           # Diamond facets
  mocks/             # Mock contracts for testing
hooks/               # React hooks (custom hooks)
infrastructure/       # Services & repositories
  services/          # Business logic services
  repositories/      # Data access layer
  shared/            # Shared utilities (event aggregators)
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

## Cursor Cloud specific instructions

### Environment Setup

- Package manager: `bun` (installed at `~/.bun/bin/bun`). The `.npmrc` has `legacy-peer-deps=true`.
- After `bun install`, run `bun run contract:compile` to generate `typechain-types/` needed by the frontend.
- ESLint 8 + `eslint-config-next@14` are required (not ESLint 9). The `.eslintrc.json` extends `next/core-web-vitals`.
- Dev server: `npm run dev` (Next.js on port 3000 by default).

### Testing

- `npm run lint` — ESLint via Next.js. Pre-existing warnings about React hooks deps and 2 `react/no-unescaped-entities` errors.
- `npm run test` — Vitest suite. `npm run test:hardhat` — Hardhat contract tests (33 passing, 3 pre-existing failures in `OrderRepository` ABI mismatch).
- `npm run test:service:unit` — Has a pre-existing ESM/CJS incompatibility with `chai-as-promised@8` under `ts-node`.

### P2P Trading (manual testing)

- The app uses MetaMask for wallet connection. When switching MetaMask accounts, you **must do a hard page refresh (F5)** for the DApp to properly update its wallet signer. Without this, the old signer persists and contract calls fail with misleading errors (e.g. "You cannot accept your own offer").
- The quote token for P2P trades is **AURA** (not USDC). Mint test AURA at `/customer/faucet`.
- Google Maps Places autocomplete is used for delivery addresses in the P2P flow. Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- The app runs on **Base Sepolia** testnet (chain ID 84532).
