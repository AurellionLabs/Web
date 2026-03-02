---
tags: [concepts, orders, lifecycle, settlement]
---

# Order Lifecycle

[[🏠 Home]] > Core Concepts > Order Lifecycle

This page traces every possible state an order can be in — from initial placement on the CLOB all the way through physical delivery and financial settlement. Aurellion combines digital trading and physical logistics into a single unified lifecycle.

---

## Two Order Types

Aurellion has two distinct order systems that work together:

| System            | Contract                             | Status Tracking             |
| ----------------- | ------------------------------------ | --------------------------- |
| **CLOB Order**    | `CLOBCoreFacet` / `OrderRouterFacet` | ACTIVE → FILLED / CANCELLED |
| **Unified Order** | `BridgeFacet`                        | PENDING_TRADE → SETTLED     |
| **AuSys Order**   | `AuSysFacet`                         | CREATED → SETTLED           |

A full physical delivery flow involves all three in sequence.

---

## CLOB Order States

```
                    ┌─────────────────────────────────────────┐
                    │              CLOB ORDER                  │
                    └─────────────────────────────────────────┘

                         placeOrder() called
                               │
                               ▼
                           ┌───────┐
                           │ACTIVE │ ← In order book, awaiting match
                           └───┬───┘
                    ┌──────────┼──────────────────────┐
                    │          │                       │
                 match      partial fill          cancelOrder()
                    │          │                       │
                    ▼          ▼                       ▼
               ┌────────┐ ┌──────────────┐     ┌───────────┐
               │ FILLED │ │PARTIALLY     │     │ CANCELLED │
               └────────┘ │FILLED        │     └───────────┘
                          └──────┬───────┘
                                 │ remaining filled
                                 ▼
                             ┌────────┐
                             │ FILLED │
                             └────────┘
```

**ACTIVE → FILLED:** Both buy and sell sides matched; tokens and payment exchanged.
**ACTIVE → CANCELLED:** Maker cancels, or GTD order expires (`OrderExpired` event).
**ACTIVE → PARTIALLY_FILLED → FILLED:** Multiple fills over time (GTC orders).

---

## Unified Order States (Bridge)

For orders requiring physical delivery, a `UnifiedOrder` tracks the combined lifecycle:

```
                    ┌──────────────────────────────────────────┐
                    │             UNIFIED ORDER                 │
                    └──────────────────────────────────────────┘

              createUnifiedOrder() — buyer escrows funds
                               │
                               ▼
                    ┌─────────────────────┐
                    │  PENDING_TRADE  (0) │ ← Waiting for CLOB match
                    └──────────┬──────────┘
                               │ bridgeTradeToLogistics()
                               │ (seller/token identified)
                               ▼
                    ┌─────────────────────┐
                    │  TRADE_MATCHED  (1) │ ← Matched, awaiting logistics
                    └──────────┬──────────┘
                               │ createLogisticsOrder()
                               ▼
                    ┌─────────────────────┐
                    │  IN_LOGISTICS   (2) │ ← Physical delivery in progress
                    └──────────┬──────────┘
                               │ All journeys DELIVERED
                               │ settleOrder()
                               ▼
                    ┌─────────────────────┐
                    │    SETTLED      (3) │ ← Complete. Funds distributed.
                    └─────────────────────┘

              At any point before IN_LOGISTICS:
                    cancelBridgeOrder() → CANCELLED (4)
                    Escrow refunded to buyer
```

---

## AuSys Logistics Order States

The physical delivery tracking lives in `AuSysFacet`:

```
              createOrder() — payment escrowed
                     │
                     ▼
              ┌────────────┐
              │  CREATED   │ ← Order exists, no journeys active
              └─────┬──────┘
                    │ createJourney() × N (up to 10)
                    │ At least one journey starts
                    ▼
              ┌────────────┐
              │ PROCESSING │ ← Journeys in progress
              └─────┬──────┘
                    │ All journeys DELIVERED
                    │ settleOrder()
                    ▼
              ┌────────────┐
              │  SETTLED   │ ← Funds distributed
              └────────────┘

              From CREATED only:
              cancelOrder() → CANCELLED (3)
              Escrow refunded
```

---

## Journey States (Physical Leg)

Each journey is a single delivery leg. Multi-hop orders have multiple journeys:

```
              createJourney() — journey created
                     │
                     ▼
              ┌────────────┐
              │  PENDING   │ ← Awaiting driver assignment + signatures
              └─────┬──────┘
                    │ Sender signs + Driver signs (packageSign × 2)
                    │ Tokens escrowed into Diamond
                    ▼
              ┌────────────┐
              │ IN_TRANSIT │ ← Goods on the move
              └─────┬──────┘
                    │ Driver calls handOff()
                    │ Bounty paid to driver
                    ▼
              ┌────────────┐
              │ DELIVERED  │ ← Successful delivery
              └────────────┘

              From PENDING only:
              cancelJourney() → CANCELLED (3)
```

---

## Complete End-to-End Timeline

```
T+0  Customer browses CLOB. Finds seller's listing for 10 East African Goats.

T+1  Customer calls placeOrder(isBuy=true, price=500 USDC, amount=10)
     → CLOB order placed. 5,000 USDC escrowed.

T+1  Immediate matching: Seller's sell order at 480 USDC fills.
     → CLOB order FILLED.

T+1  Customer calls createUnifiedOrder(clobOrderId, sellerNode, price, qty, deliveryData)
     → Unified order created. Additional escrow: 2% bounty + 0.25% protocol fee.
     → Status: PENDING_TRADE

T+2  bridgeTradeToLogistics() called (automated or manual)
     → Seller/token identified. Status: TRADE_MATCHED.

T+3  Seller calls createLogisticsOrder(unifiedOrderId)
     → Journey created. Status: IN_LOGISTICS / Journey: PENDING.

T+4  Dispatcher assigns driver: assignDriverToJourney(journeyId, driverAddress)

T+4  Driver calls packageSign(journeyId) — pickup signature.
     Seller node calls packageSign(journeyId) — handoff signature.
     → Journey: IN_TRANSIT. Tokens escrowed from node.

T+24h Driver arrives. Calls handOff(journeyId).
     → Bounty (2% = 100 USDC) paid to driver instantly.
     → Journey: DELIVERED.

T+24h settleOrder() triggered:
     → 10 ERC-1155 goat tokens transfer to buyer's wallet.
     → Seller receives 4,875 USDC (5,000 - 100 bounty - 12.5 protocol fee - 12.5 fee).
     → Protocol fee 12.5 USDC → feeRecipient.
     → Unified order: SETTLED.
```

---

## P2P Order Lifecycle

Direct peer-to-peer trades bypass the CLOB:

```
Creator creates offer: createP2POffer(token, tokenId, qty, price, isSellerInit, target, expiry)
        │
        ▼
   OFFER_OPEN ← Anyone (or target) can accept
        │ acceptP2POffer()
        ▼
  OFFER_ACCEPTED → Triggers AuSys order creation → follows logistics flow above

   OR
        │ cancelP2POffer() / expiry reached
        ▼
   OFFER_CANCELLED → Escrow refunded
```

---

## Settlement Accounting

At final settlement, the escrowed amount is distributed:

| Recipient | Amount                          | Source           |
| --------- | ------------------------------- | ---------------- |
| Buyer     | ERC-1155 tokens                 | Diamond custody  |
| Seller    | `orderValue - fees`             | Escrowed USDC    |
| Driver(s) | `2% × orderValue`               | Escrowed USDC    |
| Nodes     | `2% txFee` split proportionally | AuSys txFee pool |
| Protocol  | `0.25% × orderValue`            | Escrowed USDC    |

---

## Related Pages

- [[Core Concepts/CLOB Trading]]
- [[Core Concepts/Journey and Logistics]]
- [[Smart Contracts/Facets/BridgeFacet]]
- [[Smart Contracts/Facets/AuSysFacet]]
- [[Architecture/Data Flow]]
