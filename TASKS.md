## D — CLOB V2 Hook Wiring ✅ COMPLETE

Commit `cd7a75d`:

- `useCLOBV2.ts` `fetchCircuitBreaker`: wired `clobV2Repository.getCircuitBreaker()` (was TODO/no-op)
- `useUserCLOBOrders`: wired `clobV2Repository.getUserOrders()` + `enhanceOrder()` (was returning empty array)
- `clob-v2-service.ts` `placeMarketOrder`: replaced static max/min fallback with real order book query.
  Now fetches best ask (buy) / best bid (sell) and applies `maxSlippageBps` properly.
- All 58 vitest files still passing.

## D — CircuitBreaker + MEV Commitment Indexing ✅ COMPLETE

Commit `d3d6801`.

- CLOBMEVFacet added to indexer generator (domain: clob-mev)
- clob-admin domain removed from EXCLUDED_INDEXER_DOMAINS → CircuitBreaker events now indexed
- New schema tables: CircuitBreakerConfigured, CircuitBreakerReset, CircuitBreakerTripped, OrderCommitted, OrderRevealed
- New handlers: clob-admin.generated.ts, clob-mev.generated.ts
- Implemented all 3 previously-stubbed repository methods: getCircuitBreaker, getCommitment, getUserCommitments

## Next Up

- Monitor CI on `d3d6801` push
- Consider: CLOB V2 UI components (circuit breaker status indicator, MEV protection UI)
- Consider: forge script for CLOBAdmin flows (configureCircuitBreaker, tripCircuitBreaker)
- Consider: forge script for CLOBMEVFacet commit/reveal flow
