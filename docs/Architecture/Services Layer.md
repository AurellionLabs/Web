---
tags: [architecture, services, infrastructure, typescript]
---

# Services Layer

[[🏠 Home]] > [[Architecture/System Overview]] > Services Layer

Aurellion has a dedicated **services layer** in `infrastructure/services/` that sits between the repository layer and the UI. Services handle complex multi-step operations that involve both on-chain transactions and off-chain data processing — things too complex for a repository (which only reads) and too involved for a React component.

---

## Service Directory

```
infrastructure/services/
├── clob-v2-service.ts          ← CLOB V2 order operations wrapper
├── driver.service.ts           ← Driver logistics orchestration
├── order-bridge-service.ts     ← Bridge between CLOB and AuSys
├── order-service.ts            ← AuSys order operations (legacy)
├── pool.service.ts             ← AMM pool interactions
├── price-history-service.ts    ← OHLCV candlestick aggregation
├── redemption-service.ts       ← Token-to-physical-delivery flow
├── route-calculation-service.ts ← Optimal delivery route finding
├── rwy-service.ts              ← RWY staking operations
└── signature-listener.service.ts ← Blockchain event signature monitoring
```

---

## RouteCalculationService

**File:** `infrastructure/services/route-calculation-service.ts`

The most architecturally interesting service. Calculates optimal multi-hop delivery routes through the node network using geographic algorithms.

### Algorithm

```
Input:
  originNodeAddress  — where the goods currently are
  destinationLat/Lng — customer's delivery coordinates
  confirmationLevel  — number of nodes in route (1-5)

Steps:
1. Fetch all active, valid nodes from Ponder indexer
2. Filter nodes with GPS coordinates
3. For each candidate node, calculate:
   - distanceFromOrigin (Haversine)
   - distanceToDestination (Haversine)
   - totalViaDistance = distanceFromOrigin + distanceToDestination
   - directDistance = origin to destination
   - deviation = (totalViaDistance - directDistance) / directDistance
4. Keep only nodes with deviation < 30% (MAX_DEVIATION_RATIO)
5. Score remaining nodes:
   score = 100 - (deviation × 100) + (validNode × 20)
6. Take top (confirmationLevel × 3) candidates
7. Fisher-Yates shuffle for randomness/unpredictability
8. Select (confirmationLevel - 1) intermediate nodes
9. Sort selected nodes by distanceFromOrigin (route order)
10. Build: [originNode, node1, node2, ..., destination]

Output:
  { nodes: string[], totalDistance: km, estimatedDays: number }
estimatedDays = nodes.length + 2  (base 2 days + 1 per node)
```

### Haversine Distance

```typescript
haversineDistance(lat1, lng1, lat2, lng2): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = sin(dLat/2)² + cos(lat1) × cos(lat2) × sin(dLng/2)²;
  return R × 2 × atan2(√a, √(1-a));
}
```

### Usage

```typescript
const routeService = new RouteCalculationService();

const route = await routeService.calculateRoute(
  originNodeAddress, // '0xNodeAddress...'
  destinationLat, // -1.286389
  destinationLng, // 36.817223
  confirmationLevel, // 3 (origin + 2 intermediate nodes)
);

// route.nodes = ['0xOriginNode', '0xIntermediateNode', '0xFinalNode']
// route.totalDistance = 450.3  (km)
// route.estimatedDays = 5
```

---

## PriceHistoryService

**File:** `infrastructure/services/price-history-service.ts`

Aggregates raw CLOB trade events from the Ponder indexer into **OHLCV candlestick data** for price charts.

### Candlestick Aggregation

```typescript
export type TimePeriod = '1h' | '1d' | '1w' | '1m' | '1y';

// Candle intervals per period
'1h' → 5-minute candles  (12 candles)
'1d' → 1-hour candles    (24 candles)
'1w' → 4-hour candles    (42 candles)
'1m' → 1-day candles     (30 candles)
'1y' → 1-week candles    (52 candles)
```

### Output

```typescript
interface PriceHistoryData {
  candles: OHLCVCandle[]; // For lightweight-charts library
  lastPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface OHLCVCandle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

### Usage in Frontend

```typescript
const priceService = new PriceHistoryService();
const data = await priceService.getPriceHistory(baseToken, baseTokenId, '1d');

// Feed directly to lightweight-charts
chart.setData(data.candles);
```

---

## RedemptionService

**File:** `infrastructure/services/redemption-service.ts`

Handles the **token-to-physical-delivery** flow — the process of burning ERC-1155 tokens and initiating physical delivery from the custodian node to the token holder.

### Redemption Flow

```
User holds 10 goat tokens
User wants physical delivery at their location
        │
        ▼
1. Verify user balance: diamond.balanceOf(user, tokenId) >= quantity
2. Verify custody: diamond.getCustodyInfo(tokenId, originNode)
3. Calculate route: RouteCalculationService.calculateRoute(...)
4. Calculate fees: price × quantity × 2% txFee
5. Approve ERC-20 fee payment: IERC20.approve(diamond, fee)
6. Approve ERC-1155 burn: IERC1155.setApprovalForAll(diamond, true)
7. Call AuSysFacet.createOrder(token, tokenId, quantity, price, nodes, parcelData, seller)
8. Returns { success, orderId, journeyId }
```

### Usage

```typescript
const redemptionService = new RedemptionService();

const result = await redemptionService.requestRedemption({
  tokenId: '123456',
  quantity: 10n,
  deliveryAddress: 'Customer Farm, Nakuru',
  originNode: '0xOriginNodeAddress',
  confirmationLevel: 2,
  destinationLat: -0.3031,
  destinationLng: 36.08,
});

if (result.success) {
  console.log('Redemption order:', result.orderId);
}
```

---

## SignatureListenerService

**File:** `infrastructure/services/signature-listener.service.ts`

An ethers.js event listener that waits for **two distinct** `emitSig` events for a specific journey ID — indicating that both the sender and the driver have signed custody.

### Behaviour

```typescript
listenForSignature(contract, journeyId, timeoutMs = 120000): Promise<boolean>
```

- Creates an event filter for `emitSig()`
- Listens for distinct signers
- Returns `true` when 2 unique signatures detected
- Rejects after `timeoutMs` (default 2 minutes)

### Usage in UI

```typescript
// After creating a journey, wait for both parties to sign
const bothSigned = await listenForSignature(ausysContract, journeyId, 300000);
if (bothSigned) {
  // Transition UI to IN_TRANSIT state
  setJourneyStatus('in_transit');
}
```

> **Note:** This service has a known TODO — the bytes32/string ID comparison logic needs verification with real event data. The `// @ts-nocheck` flag is present.

---

## OrderBridgeService

**File:** `infrastructure/services/order-bridge-service.ts`

Orchestrates the complete flow from CLOB trade match to unified order creation to logistics initiation. Acts as a coordinator between `BridgeFacet` and `AuSysFacet`.

### Flow

```
CLOB trade matched
        ↓
OrderBridgeService.bridgeTrade(clobOrderId, tradeId, seller, token, tokenId, deliveryData)
        ↓
1. diamond.createUnifiedOrder(clobOrderId, sellerNode, price, qty, deliveryData)
2. diamond.bridgeTradeToLogistics(unifiedOrderId, tradeId, ausysOrderId, seller, token, tokenId)
3. routeService.calculateRoute(sellerNode, destLat, destLng, confirmationLevel)
4. diamond.createLogisticsOrder(unifiedOrderId)
        ↓
UnifiedOrder in IN_LOGISTICS state
Journey(s) created and ready for driver assignment
```

---

## CLOBv2Service

**File:** `infrastructure/services/clob-v2-service.ts`

Wraps `OrderRouterFacet` operations with pre-flight checks, approval management, and error normalisation.

### Key Methods

```typescript
class CLOBv2Service {
  // Places order with automatic approval handling
  async placeOrder(
    params: OrderParams,
  ): Promise<{ orderId: string; txHash: string }>;

  // Market order with slippage protection
  async placeMarketOrder(
    params: MarketOrderParams,
  ): Promise<{ orderId: string; txHash: string }>;

  // Cancels with receipt waiting
  async cancelOrder(orderId: string): Promise<void>;

  // Checks and executes approvals if needed
  private async ensureApproval(
    token: string,
    spender: string,
    amount: bigint,
  ): Promise<void>;
}
```

---

## RWYService

**File:** `infrastructure/services/rwy-service.ts`

Wraps `RWYStakingFacet` operations.

```typescript
class RWYService {
  async createOpportunity(params: OpportunityParams): Promise<string>;
  async stakeToOpportunity(
    opportunityId: string,
    amount: bigint,
  ): Promise<void>;
  async unstakeFromOpportunity(
    opportunityId: string,
    amount: bigint,
  ): Promise<void>;
  async claimProfit(opportunityId: string): Promise<void>;
  async getOpportunityDetails(opportunityId: string): Promise<RWYOpportunity>;
  async getUserStakePosition(
    opportunityId: string,
    address: string,
  ): Promise<bigint>;
}
```

---

## Context Pattern

Services are instantiated and provided to the React tree via context:

```
infrastructure/contexts/
├── contract-context.ts    ← Provides Diamond contract instances
├── repository-context.ts  ← Provides repository implementations
└── service-context.ts     ← Provides service instances
```

```typescript
// infrastructure/contexts/service-context.ts
export const ServiceContext = createContext<Services | null>(null);

export function useServices() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error('useServices must be within ServiceProvider');
  return ctx;
}
```

---

## Related Pages

- [[Architecture/Repository Pattern]]
- [[Frontend/Providers]]
- [[Core Concepts/Journey and Logistics]]
- [[Core Concepts/CLOB Trading]]
