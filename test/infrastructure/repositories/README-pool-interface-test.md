# Pool Repository Interface Compliance Test

This test (`pool-repository-interface-compliance.test.ts`) provides simple mock-based validation for the `IPoolRepository` interface to ensure that any implementation returns the correct types as defined in the interface contract.

## What it tests

### Type Compliance Tests (11 tests)

Each method of the `IPoolRepository` interface is tested to ensure it returns the expected type:

- `getPoolById(id: string)` → `Pool`
- `getPoolStakeHistory(poolId: string)` → `StakeEvent[]`
- `findPoolsByInvestor(investorAddress: Address)` → `Pool[]`
- `findPoolsByProvider(providerAddress: Address)` → `Pool[]`
- `getAllPools()` → `Pool[]`
- `getPoolWithDynamicData(id: string)` → `(Pool & PoolDynamicData) | null`
- `getAllPoolsWithDynamicData()` → `(Pool & PoolDynamicData)[]`
- `getUserPoolsWithDynamicData(stakerAddress: Address)` → `(Pool & PoolDynamicData)[]`
- `getProviderPoolsWithDynamicData(providerAddress: Address)` → `(Pool & PoolDynamicData)[]`
- `getGroupedStakeHistory(poolId: string, interval: '1H' | '1D' | '1W' | '1M' | '1Y')` → `GroupedStakes`
- `calculatePoolDynamicData(pool: Pool, stakeHistory?: StakeEvent[])` → `PoolDynamicData`

### Method Call Validation (1 test)

Verifies that:

- All interface methods can be called with the expected parameter types
- Methods are actually invoked when called
- No runtime errors occur during method calls

## Why this test is useful

1. **Interface Compliance**: Ensures any implementation follows the contract defined by `IPoolRepository`
2. **Type Safety**: Validates that return types match the interface specification
3. **Regression Prevention**: Catches breaking changes to interface contracts
4. **Documentation**: Serves as living documentation of expected interface behavior
5. **Simple Mocking**: Uses minimal mocks to focus purely on interface compliance

## Running the test

```bash
npx ts-node -r tsconfig-paths/register node_modules/.bin/mocha test/infrastructure/repositories/pool-repository-interface-compliance.test.ts
```

## Test Strategy

- **Minimal Dependencies**: Uses simple mocks instead of complex setup
- **Type Validation**: Checks that all required properties exist with correct types
- **Interface Focus**: Tests interface contracts rather than implementation details
- **Fast Execution**: Runs quickly without external dependencies or complex setup
