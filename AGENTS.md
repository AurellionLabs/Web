# AGENTS.md - Aurellion Monorepo

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

Aurellion is a Web3/DeFi platform with:

- **Next.js 14** frontend (React 18, App Router)
- **Solidity 0.8.28** smart contracts (Diamond Pattern EIP-2535)
- **Ponder** blockchain indexer
- **TypeScript** throughout

## Build & Development Commands

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run build                  # TypeScript check + Next.js build
npm run build:full             # Compile contracts + extract ABIs + build
npm run typecheck              # TypeScript type checking only

# Formatting & Linting
npm run format                 # Prettier format all files
npm run lint                   # Next.js ESLint
```

## Testing Commands

### Unit/Integration Tests (Vitest)

```bash
npm run test                   # Run all Vitest tests
npm run test:unit              # Run unit tests (excludes network-dependent deployment tests)
npm run test:vitest            # Same as 'test'
npm run test:coverage          # Run with coverage report

# Run single test file
npx vitest run path/to/test.test.ts

# Run tests matching pattern
npx vitest run -t "test name pattern"

# Watch mode
npx vitest
```

### Smart Contract Tests

```bash
npm run test:hardhat           # Run Hardhat tests
npm run test:diamond           # Run Forge tests for Diamond contracts

# Run single Hardhat test
npx hardhat test test/MyContract.test.ts

# Run single Forge test
forge test --match-test testFunctionName -vv
forge test --match-contract ContractName -vv
```

### E2E Tests

```bash
npm run test:e2e               # Run E2E tests (uses Hardhat chain)
npm run test:e2e:watch         # Watch mode
npm run test:e2e:anvil         # Use Anvil chain instead
npm run test:e2e:coverage      # With coverage validation

# Run single E2E test
npx vitest run --config e2e/vitest.config.ts e2e/tests/mytest.test.ts
```

### Browser E2E Tests (Playwright)

```bash
npm run test:browser           # Run all browser tests
npm run test:browser:headed    # Run with visible browser
npm run test:browser:debug     # Debug mode

# Run single Playwright test
npx playwright test path/to/test.spec.ts
npx playwright test -g "test name pattern"
```

## Code Style Guidelines

### Formatting (Prettier)

- 2-space indentation
- Semicolons required
- Single quotes
- 80 character line width

### TypeScript Conventions

**Imports (order):**

1. `'use client'` directive (if client component)
2. React core (`import React, { useState } from 'react'`)
3. External libraries
4. Internal utilities (`@/lib/...`)
5. Internal components (`@/app/components/...`)
6. Types and providers

**Naming:**

- Components: `PascalCase` (e.g., `TradePanel`, `OrderBook`)
- Props interfaces: `ComponentNameProps` (e.g., `TradePanelProps`)
- Hooks: `use` prefix (e.g., `useOrderBook`, `useCLOB`)
- Functions/variables: `camelCase`
- Boolean variables: `is`/`has` prefix (e.g., `isLoading`, `hasOrders`)
- Constants: `SCREAMING_SNAKE_CASE`

**Types:**

- Use `interface` for props and data structures
- Use `type` for unions and simple types
- Prefix service/repository interfaces with `I` (e.g., `ICLOBService`)

**Exports:**

- Named export for main component/function
- Default export at file end
- Example:
  ```typescript
  export const MyComponent: React.FC<MyComponentProps> = () => { ... };
  export default MyComponent;
  ```

### React Patterns

```typescript
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  /** Description of prop */
  value: string;
  onUpdate?: (value: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  value,
  onUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const computedValue = useMemo(() => {
    return processValue(value);
  }, [value]);

  const handleClick = useCallback(() => {
    onUpdate?.(computedValue);
  }, [computedValue, onUpdate]);

  return <div className={cn('base-class', isLoading && 'loading')} />;
};

export default MyComponent;
```

### Error Handling

**TypeScript/React:**

```typescript
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('[ServiceName] Operation failed:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}
```

**Result Objects:** Use `{ success: boolean; data?: T; error?: string }` pattern.

### Solidity Conventions

**File Structure:**

1. SPDX license identifier
2. Pragma statement
3. Local imports (Diamond libraries)
4. OpenZeppelin imports

**Naming:**

- Contracts: `PascalCase` + role suffix (e.g., `CLOBFacetV2`)
- Events: `PascalCase` (e.g., `OrderCreated`)
- Errors: `PascalCase` (e.g., `InvalidPrice`)
- Internal functions: `_` prefix (e.g., `_placeOrder`)
- Public functions: `camelCase` (e.g., `placeLimitOrder`)
- Constants: `SCREAMING_SNAKE_CASE`

**Formatting (Foundry):**

- 4-space indentation
- 120 character line width

**Error Handling:**

```solidity
error InvalidPrice();
error InsufficientBalance(uint256 required, uint256 available);

function placeOrder(uint256 price) external {
    if (price == 0) revert InvalidPrice();
    // ...
}
```

**Documentation (NatSpec):**

```solidity
/// @title CLOB Trading Facet
/// @notice Handles limit order placement and matching
/// @dev Uses Diamond storage pattern
contract CLOBFacetV2 {
    /// @notice Places a new limit order
    /// @param price Order price in wei
    /// @return orderId The created order ID
    function placeLimitOrder(uint256 price) external returns (uint256 orderId) {
        // implementation
    }
}
```

## Path Aliases

Use `@/` for absolute imports from project root:

```typescript
import { Button } from '@/app/components/ui/button';
import { useOrderBook } from '@/hooks/useOrderBook';
import { formatWei } from '@/lib/formatters';
```

## Project Structure

```
app/                    # Next.js App Router
  components/           # React components
  providers/            # React context providers
contracts/              # Solidity contracts
  diamond/              # Diamond pattern facets
hooks/                  # React hooks
infrastructure/         # Services and repositories
lib/                    # Utility functions
test/                   # Unit tests
e2e/                    # E2E tests
  tests/                # Test files
  browser/              # Playwright tests
indexer/                # Ponder blockchain indexer
typechain-types/        # Generated contract types
```

## Git Hooks

Pre-commit runs `lint-staged` (Prettier formatting).
Pre-push runs `npm run build:full`.

## Important Notes

- ESLint is ignored during builds (`ignoreDuringBuilds: true`)
- TypeChain generates ethers-v6 types in `typechain-types/`
- E2E tests run sequentially (blockchain state dependency)
- Test timeout: 30s (unit), 120s (E2E), 60s (Hardhat)

## Git Rules for AI Agents

- **NEVER push PRD files** (`prd.json`, `progress.txt`) to remote - these are local working files
- **NEVER commit ralph/ directory contents** except for documentation updates to AGENTS.md or README files
- PRDs should remain local for the developer/agent running them

## Indexer Development Rules

### Pure Dumb Indexer Pattern

The indexer follows a "pure dumb" pattern where it ONLY stores raw blockchain events.
All business logic and aggregation happens in the frontend repository layer.

**Architecture:**

```
Blockchain Events
       ↓
Ponder Handlers (raw insert only)
       ↓
diamond_{event_name}_events tables
       ↓
Frontend GraphQL Queries (query raw event tables)
       ↓
Event Aggregators (pure functions in infrastructure/shared/)
       ↓
Domain Types (Order, Journey, Node, Asset)
       ↓
UI Components
```

**Key Rules:**

1. **Raw events only**: The indexer stores raw events, NOT aggregate/materialized tables
2. **No business logic in handlers**: Handlers only insert event data into tables
3. **Schema is auto-generated**: Run `npm run generate:indexer` to regenerate from contract ABIs
4. **Table naming**: `diamond_{event_name}_events` (e.g., `diamond_order_placed_with_tokens_events`)
5. **Snake_case columns**: Database columns use `snake_case` (e.g., `token_id`, not `tokenId`)
6. **Aggregation in frontend**: Use `infrastructure/shared/event-aggregators.ts` for aggregation

**Key Files:**

| File                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `scripts/generate-indexer.ts`                | Generator script (auto-generates everything) |
| `indexer/generated-schema.ts`                | Ponder schema (auto-generated)               |
| `indexer/src/handlers/*.generated.ts`        | Event handlers (auto-generated)              |
| `infrastructure/shared/indexer-types.ts`     | TypeScript types for raw events              |
| `infrastructure/shared/event-aggregators.ts` | Pure functions for aggregation               |
| `infrastructure/shared/graph-queries.ts`     | GraphQL queries for raw event tables         |

**Adding New Events:**

1. Add the event to a Solidity facet contract
2. Run `npm run build:full` to compile contracts
3. Run `npm run generate:indexer` to regenerate schema and handlers
4. No manual changes needed - the generator handles everything

**Querying Events:**

```typescript
// Query raw events
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_ALL_ORDER_EVENTS,
  convertOrderEventsResponse,
} from '@/infrastructure/shared/graph-queries';
import { aggregateOrders } from '@/infrastructure/shared/event-aggregators';

const response = await graphqlRequest(endpoint, GET_ALL_ORDER_EVENTS);
const events = convertOrderEventsResponse(response);
const orders = aggregateOrders(events); // Pure function
```

**Why Pure Dumb?**

- **Simpler indexer**: No business logic to maintain in the indexer
- **Faster iteration**: Schema changes don't require handler updates
- **Testable aggregation**: Aggregators are pure functions, easy to unit test
- **Flexible queries**: Frontend can query any combination of events
