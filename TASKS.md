## D — CLOB V2 Hook Wiring ✅ COMPLETE

Commit `cd7a75d`:

- `useCLOBV2.ts` `fetchCircuitBreaker`: wired `clobV2Repository.getCircuitBreaker()` (was TODO/no-op)
- `useUserCLOBOrders`: wired `clobV2Repository.getUserOrders()` + `enhanceOrder()` (was returning empty array)
- `clob-v2-service.ts` `placeMarketOrder`: replaced static max/min fallback with real order book query.
  Now fetches best ask (buy) / best bid (sell) and applies `maxSlippageBps` properly.
- All 58 vitest files still passing.
