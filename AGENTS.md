# AGENTS.md - Aurellion Monorepo

Web3/DeFi platform with Next.js 14, Solidity 0.8.28 (Diamond Pattern), Ponder indexer, TypeScript throughout.

## Build Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # TypeScript check + Next.js build
npm run build:full       # Compile contracts + extract ABIs + build
npm run typecheck        # TypeScript only
npm run format           # Prettier format all files
npm run lint             # Next.js ESLint
```

## Testing Commands

### Unit/Integration Tests

```bash
npm run test             # All Vitest tests
npm run test:unit        # Excludes deployment tests
npx vitest run path/to/test.test.ts              # Single test file
npx vitest run -t "test name pattern"            # By pattern
npx vitest                                       # Watch mode
```

### Service/Repository Tests

```bash
npm run test:service     # Unit + integration tests
npm run test:service:unit
npm run test:service:integration
npx vitest run test/services/OrderBridgeService.test.ts  # Specific service
npm run test:repo:unit   # Repository unit tests
npx vitest run test/repositories/CLOBRepository.test.ts   # Specific repo
npm run test:hooks       # Hook tests
```

### Smart Contract Tests

```bash
npm run test:hardhat     # All Hardhat tests
npx hardhat test test/OrderBridge.test.ts         # Single Hardhat test
npm run test:diamond     # Forge Diamond tests
forge test --match-contract ContractName -vv      # Forge single contract
```

### E2E Tests

```bash
npm run test:e2e         # Uses Hardhat chain
npm run test:e2e:fast    # Fast mode
npm run test:e2e:anvil    # With Anvil chain
npx vitest run --config e2e/vitest.config.ts e2e/tests/mytest.test.ts
```

### Browser Tests

```bash
npm run test:browser             # All Playwright tests
npm run test:browser:headed      # Visible browser
npx playwright test path/to/test.spec.ts
```

## Code Style

### TypeScript

- **Formatting**: 2 spaces, semicolons, single quotes, 80 char width
- **Imports**: `'use client'`, React core, external libs, `@/lib/...`, `@/components/...`, types
- **Naming**: Components `PascalCase`, hooks `useX`, booleans `isX/hasX`, constants `SCREAMING_SNAKE_CASE`
- **Types**: `interface` for structures, `type` for unions, `I` prefix for services
- **Exports**: Named export + default at file end
- **Error handling**: Use `{ success: boolean; data?: T; error?: string }` pattern

### Solidity

- **Formatting**: 4 spaces, 120 char width (Foundry)
- **Naming**: Contracts `PascalCase`, events/errors `PascalCase`, internal `_prefix`, constants `SCREAMING_SNAKE_CASE`
- **Documentation**: NatSpec required (`@title`, `@notice`, `@dev`, `@return`)

## Path Aliases

```typescript
import { Button } from '@/app/components/ui/button';
import { useOrderBook } from '@/hooks/useOrderBook';
import { formatWei } from '@/lib/formatters';
```

## Project Structure

```
app/                  # Next.js App Router
contracts/diamond/    # Diamond facets
hooks/                # React hooks
infrastructure/       # Services & repositories
lib/                  # Utilities
test/                 # Unit tests
e2e/tests/            # E2E tests
e2e/browser/          # Playwright tests
indexer/              # Ponder indexer
typechain-types/      # Generated types
```

## Indexer Pattern

Pure dumb indexer - only stores raw blockchain events. Business logic in frontend aggregators (`infrastructure/shared/event-aggregators.ts`). Schema auto-generated via `npm run generate:indexer`.

## Git Rules for Agents

- **NEVER push PRD files** (`prd.json`, `progress.txt`) to remote
- **NEVER commit ralph/ directory contents** except docs updates
