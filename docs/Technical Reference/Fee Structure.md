---
tags: [reference, fees, economics, tokenomics]
---

# Fee Structure

[[🏠 Home]] > Technical Reference > Fee Structure

Every fee charged by the Aurellion protocol, where it comes from, where it goes, and how it's calculated.

---

## Overview

Aurellion charges fees at two layers:

| Layer                 | Fee Type         | Rate           | Recipient                |
| --------------------- | ---------------- | -------------- | ------------------------ |
| **CLOB Trading**      | Taker fee        | 10 bps (0.1%)  | Protocol treasury        |
| **CLOB Trading**      | Maker fee        | 5 bps (0.05%)  | Protocol treasury        |
| **CLOB Trading**      | LP fee           | 5 bps (0.05%)  | Liquidity pool providers |
| **Physical Delivery** | Logistics bounty | 200 bps (2%)   | Driver(s)                |
| **Physical Delivery** | Protocol fee     | 25 bps (0.25%) | `feeRecipient` address   |
| **AuSys Orders**      | Transaction fee  | 200 bps (2%)   | Node operators (shared)  |
| **RWY Staking**       | Protocol cut     | 100 bps (1%)   | Protocol treasury        |

---

## CLOB Fees

### Taker Fee

Charged to the order that **takes** liquidity (matches against an existing order).

```
takerFee = quoteAmount × takerFeeBps / 10000
         = (price × fillAmount / 1e18) × 10 / 10000
         = quoteAmount × 0.1%
```

Default: `takerFeeBps = 10` (0.1%). Configurable by owner via `CLOBAdminFacet`.

### Maker Fee

Charged to the resting order that **provides** liquidity.

```
makerFee = quoteAmount × makerFeeBps / 10000
         = quoteAmount × 0.05%
```

Default: `makerFeeBps = 5` (0.05%). Configurable by owner.

### LP Fee

A portion of every trade goes to liquidity pool providers:

```
lpFee = quoteAmount × lpFeeBps / 10000
      = quoteAmount × 0.05%
```

Accumulated in `collectedLPFees[poolId]` and claimable by LP token holders.

### Fee Collection

CLOB fees accumulate in `collectedFees[quoteToken]` within `AppStorage`. Withdrawn by owner via `CLOBAdminFacet.withdrawFees(quoteToken, recipient)`.

### Full Trade Example (CLOB only)

```
Buyer places market order: 10 tokens at market price
Best ask: 500 USDC/token
Fill price: 500 USDC
Fill amount: 10 tokens
Quote amount: 5,000 USDC

Taker fee (buyer): 5,000 × 0.1% = 5.00 USDC  → Protocol
Maker fee (seller): 5,000 × 0.05% = 2.50 USDC → Protocol
LP fee: 5,000 × 0.05% = 2.50 USDC             → Pool providers

Buyer receives: 10 tokens
Seller receives: 5,000 - 2.50 = 4,997.50 USDC
Buyer pays: 5,000 + 5.00 = 5,005.00 USDC
```

---

## Physical Delivery Fees (Bridge / BridgeFacet)

Applied when a trade requires physical delivery via a UnifiedOrder.

### Logistics Bounty

Driver payment, calculated at order creation:

```
bounty = orderValue × BOUNTY_PERCENTAGE / 10000
       = (price × quantity) × 200 / 10000
       = orderValue × 2%
```

`BOUNTY_PERCENTAGE = 200` is a hardcoded constant in `BridgeFacet.sol`. Not configurable.

Paid to the driver immediately when `handOff()` is called — no need to wait for full settlement.

### Protocol Fee

```
protocolFee = orderValue × PROTOCOL_FEE_PERCENTAGE / 10000
            = orderValue × 25 / 10000
            = orderValue × 0.25%
```

`PROTOCOL_FEE_PERCENTAGE = 25` is hardcoded. Sent to `feeRecipient` at settlement.

### Total Escrow at Order Creation

```
orderValue    = price × quantity
bounty        = orderValue × 2%
protocolFee   = orderValue × 0.25%
totalEscrow   = orderValue + bounty + protocolFee
              = orderValue × 102.25%
```

The buyer pays the full `totalEscrow` upfront when creating the UnifiedOrder.

### Full Physical Delivery Settlement Example

```
10 goats at 500 USDC each
orderValue   = 5,000 USDC
bounty       = 100 USDC  (2%)
protocolFee  = 12.50 USDC (0.25%)
totalEscrow  = 5,112.50 USDC escrowed by buyer

At settlement:
  Buyer receives:  10 ERC-1155 goat tokens
  Seller receives: 5,000 - 12.50 = 4,987.50 USDC
  Driver receives: 100 USDC (at handOff() time)
  Protocol receives: 12.50 USDC
```

---

## AuSys Transaction Fee (Direct Logistics)

When using `AuSysFacet` directly (without BridgeFacet), a 2% `txFee` applies:

```
txFee = price × tokenQuantity × 2 / 100
      = orderValue × 2%
```

Unlike the bridge bounty, this fee is **distributed to nodes** in the delivery chain, not to drivers:

```
txFee split:
  Each node = txFee / numberOfNodes

For 3 nodes on a 5,000 USDC order:
  txFee = 100 USDC
  Each node receives = 100 / 3 ≈ 33.33 USDC
```

Emitted as `NodeFeeDistributed(node, amount)` for each node.

---

## RWY Staking Fee

When operators process commodities and stakers claim profit:

```
totalProfit   = saleProceeds - costBasis
protocolCut   = totalProfit × protocolFeeBps / 10000
              = totalProfit × 1%
distributable = totalProfit - protocolCut
              = totalProfit × 99%

stakerShare   = distributable × (userStake / totalStaked)
```

Default `protocolFeeBps = 100` (1%). Configurable by owner.

### Example

```
1,000 kg wheat staked
Sale proceeds: 13,000 USDC
Cost basis:    10,000 USDC
Total profit:   3,000 USDC
Protocol fee:      30 USDC (1%)
Distributable:  2,970 USDC

Staker with 200/1000 kg (20%):
  Share = 2,970 × 20% = 594 USDC
  Returns: 200 wheat tokens + 594 USDC
```

---

## Fee Configuration

All configurable fee parameters (owner-only):

| Parameter                  | Contract        | Function                               | Default        |
| -------------------------- | --------------- | -------------------------------------- | -------------- |
| `takerFeeBps`              | CLOBAdminFacet  | `setTakerFee(uint16)`                  | 10 (0.1%)      |
| `makerFeeBps`              | CLOBAdminFacet  | `setMakerFee(uint16)`                  | 5 (0.05%)      |
| `feeRecipient`             | BridgeFacet     | `setFeeRecipient(address)`             | Contract owner |
| `protocolFeeBps`           | RWYStakingFacet | `setProtocolFeeBps(uint256)`           | 100 (1%)       |
| `minOperatorCollateralBps` | RWYStakingFacet | `setMinOperatorCollateralBps(uint256)` | 2000 (20%)     |
| `maxYieldBps`              | RWYStakingFacet | `setMaxYieldBps(uint256)`              | 5000 (50%)     |

Hardcoded constants (not configurable without contract upgrade):

- `BOUNTY_PERCENTAGE = 200` in BridgeFacet
- `PROTOCOL_FEE_PERCENTAGE = 25` in BridgeFacet
- AuSys txFee = 2% in AuSysFacet

---

## Mainnet Fee Projections

Assuming 1M USDC daily trading volume on Base mainnet:

| Source            | Daily Volume   | Fee Rate | Daily Revenue   |
| ----------------- | -------------- | -------- | --------------- |
| CLOB taker fees   | $1,000,000     | 0.1%     | $1,000          |
| CLOB maker fees   | $1,000,000     | 0.05%    | $500            |
| Physical delivery | $100,000       | 0.25%    | $250            |
| RWY protocol cut  | $50,000 profit | 1%       | $500            |
| **Total**         |                |          | **~$2,250/day** |

---

## Related Pages

- [[Smart Contracts/Facets/BridgeFacet]]
- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/RWYStakingFacet]]
- [[Core Concepts/Order Lifecycle]]
