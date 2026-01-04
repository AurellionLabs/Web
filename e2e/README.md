# E2E Testing Framework

A comprehensive end-to-end testing framework for the Aurellion platform that provides:

- **Local Chain Management** - Spin up Hardhat or Anvil chains for testing
- **UI Flow Simulation** - Test exact UI flows via TypeScript function calls
- **Interface Coverage Tracking** - Runtime validation that all interface methods are tested
- **Beautiful Reporting** - Visual coverage reports and test output

## Quick Start

```bash
# Run all E2E tests (uses Hardhat by default)
npm run test:e2e

# Run with verbose output
npm run test:e2e:verbose

# Run with Anvil instead of Hardhat
npm run test:e2e:anvil

# Run with coverage validation (fails if coverage < 100%)
npm run test:e2e:coverage

# Watch mode for development
npm run test:e2e:watch
```

## Architecture

```
e2e/
├── chain/                 # Local chain management
│   ├── chain-manager.ts   # Hardhat/Anvil lifecycle
│   ├── contract-deployer.ts # Deploy contracts
│   └── anvil-runner.ts    # Anvil-specific features
├── coverage/              # Interface coverage system
│   ├── interface-registry.ts # Register interfaces
│   ├── coverage-tracker.ts   # Track method coverage
│   └── coverage-validator.ts # Validate & report
├── flows/                 # UI flow simulation
│   ├── wallet-mock.ts     # Mock window.ethereum
│   ├── flow-context.ts    # Test context & users
│   ├── action-simulator.ts # Generic action helpers
│   ├── rwy-flows.ts       # RWY domain flows
│   ├── pool-flows.ts      # Pool domain flows
│   └── order-flows.ts     # Order domain flows
├── utils/                 # Test utilities
│   ├── test-accounts.ts   # Pre-configured wallets
│   ├── assertions.ts      # Custom matchers
│   └── event-helpers.ts   # Event verification
├── setup/                 # Test setup
│   ├── global-setup.ts    # Runs once before all tests
│   ├── global-teardown.ts # Runs once after all tests
│   └── test-setup.ts      # Per-file setup
├── tests/                 # Test files
│   ├── rwy/              # RWY flow tests
│   ├── pool/             # Pool flow tests
│   └── orders/           # Order flow tests
└── vitest.config.ts      # Vitest configuration
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { getContext } from '../../setup/test-setup';
import { createRWYFlows } from '../../flows/rwy-flows';

describe('My Feature Flow', () => {
  let context;
  let flows;

  beforeAll(() => {
    context = getContext();
    flows = createRWYFlows(context);
  });

  it('should do something', async () => {
    const user = context.getUser('customer1');
    const result = await flows.someAction(user, params);
    expect(result.success).toBe(true);
  });
});
```

### Available Test Users

The framework provides pre-configured test users:

| Name                                  | Role     | Description             |
| ------------------------------------- | -------- | ----------------------- |
| `deployer`                            | deployer | Contract deployer/owner |
| `operator1`, `operator2`              | operator | RWY operators           |
| `customer1`, `customer2`, `customer3` | customer | Buyers/customers        |
| `driver1`, `driver2`                  | driver   | Delivery drivers        |
| `node1`, `node2`                      | node     | Node operators          |
| `investor1`, `investor2`, `investor3` | investor | Pool investors          |
| `provider1`, `provider2`              | provider | Pool providers          |
| `attacker`                            | attacker | For security tests      |

### Using Flow Helpers

Each domain has a dedicated flow helper that mirrors UI hooks:

```typescript
// RWY Flows
const rwyFlows = createRWYFlows(context);
await rwyFlows.createOpportunity(operator, { ... });
await rwyFlows.stake(investor, opportunityId, '100');
await rwyFlows.claimProfits(investor, opportunityId);

// Pool Flows
const poolFlows = createPoolFlows(context);
await poolFlows.createPool(provider, { ... });
await poolFlows.stake(investor, poolId, '500');
await poolFlows.claimReward(investor, poolId);

// Order Flows
const orderFlows = createOrderFlows(context);
await orderFlows.createJob(customer, { ... });
await orderFlows.acceptDelivery(driver, journeyId);
await orderFlows.completeDelivery(driver, journeyId);
```

### Coverage Tracking

Coverage is tracked automatically when using flow helpers. You can also manually mark coverage:

```typescript
import { getCoverageTracker } from '../../coverage/coverage-tracker';

// Automatic (via flow helpers)
await rwyFlows.stake(user, opportunityId, amount);
// ^ Automatically marks IRWYService.stake as covered

// Manual marking
getCoverageTracker().mark('IMyInterface', 'myMethod');
```

### Custom Assertions

```typescript
import {
  assertTxSuccess,
  assertEventEmitted,
  assertBalance,
  assertReverts,
} from '../../utils/assertions';

// Transaction assertions
assertTxSuccess(receipt);
assertEventEmitted(receipt, contract, 'Transfer', { from, to, value });

// Balance assertions
assertBalance(await getBalance(user), '100');
assertBalanceGt(balance, '50');

// Revert assertions
await assertReverts(contract.doSomething(), 'Unauthorized');
```

## Environment Variables

| Variable                | Default   | Description                       |
| ----------------------- | --------- | --------------------------------- |
| `CHAIN`                 | `hardhat` | Chain type (`hardhat` or `anvil`) |
| `CHAIN_PORT`            | `8545`    | RPC port                          |
| `VERBOSE`               | `false`   | Enable verbose logging            |
| `DEPLOY_MODE`           | `full`    | Deployment mode                   |
| `VALIDATE_COVERAGE`     | `true`    | Validate coverage after tests     |
| `MIN_COVERAGE`          | `80`      | Minimum coverage percentage       |
| `REQUIRE_FULL_COVERAGE` | `false`   | Require 100% coverage             |
| `FAIL_ON_COVERAGE`      | `false`   | Fail tests if coverage not met    |

## Coverage Report

After tests run, a coverage report is displayed:

```
┌─────────────────────────────────────────────────────────────┐
│                 Interface Coverage Report                    │
├─────────────────────┬──────────┬────────────────────────────┤
│ Interface           │ Coverage │ Missing Methods            │
├─────────────────────┼──────────┼────────────────────────────┤
│ IRWYService         │ 100%     │ ✓                          │
│ IPoolService        │ 100%     │ ✓                          │
│ IOrderService       │ 100%     │ ✓                          │
│ IDriverService      │ 100%     │ ✓                          │
└─────────────────────┴──────────┴────────────────────────────┘

✅ All interface methods are covered!
```

## Adding New Domains

1. Add interface definition to `coverage/interface-registry.ts`
2. Create flow helper in `flows/`
3. Create test file in `tests/`

Example:

```typescript
// 1. Register interface (coverage/interface-registry.ts)
{
  name: 'IMyService',
  category: 'service',
  domain: 'mydomain',
  methods: ['method1', 'method2', 'method3'],
}

// 2. Create flow helper (flows/my-flows.ts)
export class MyFlows {
  async method1(user: TestUser, params: any) {
    // Implementation that calls contract
    getCoverageTracker().mark('IMyService', 'method1');
  }
}

// 3. Create tests (tests/mydomain/my-flow.test.ts)
describe('My Domain Flow', () => {
  // Tests...
});
```

## Troubleshooting

### Chain won't start

- Ensure no other process is using port 8545
- Check if Hardhat or Anvil is installed

### Tests timeout

- Increase `testTimeout` in vitest.config.ts
- Check for infinite loops in contract calls

### Coverage not tracking

- Ensure flow helpers call `getCoverageTracker().mark()`
- Check interface is registered in `interface-registry.ts`

### Contract deployment fails

- Verify contract compiles: `npx hardhat compile`
- Check deploy.config.ts has correct contract names
