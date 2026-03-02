---
tags: [smart-contracts, facets, clob, admin]
---

# CLOBAdminFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > CLOBAdminFacet

`CLOBAdminFacet.sol` handles all owner-only administrative operations for the CLOB system — fee configuration, market management, circuit breakers, and fee collection.

---

## Overview

| Property | Value                                                          |
| -------- | -------------------------------------------------------------- |
| File     | `contracts/diamond/facets/CLOBAdminFacet.sol`                  |
| Access   | All functions: `onlyOwner`                                     |
| Storage  | [[Smart Contracts/Libraries/DiamondStorage]] — CLOB V2 section |

---

## Fee Configuration

### `setTakerFee(uint16 newTakerFeeBps)`

Sets the taker fee in basis points. Maximum allowed: 1000 (10%).

```
newTakerFeeBps = 10  →  0.1% per trade (default)
newTakerFeeBps = 50  →  0.5% per trade
```

### `setMakerFee(uint16 newMakerFeeBps)`

Sets the maker fee in basis points.

```
newMakerFeeBps = 5   →  0.05% per trade (default)
newMakerFeeBps = 0   →  Maker rebate model (when combined with higher taker fee)
```

### `withdrawFees(address quoteToken, address recipient)`

Withdraws accumulated CLOB fees for a specific quote token to the specified recipient.

```
collectedFees[quoteToken] → recipient wallet
collectedFees[quoteToken] = 0
```

---

## Market Management

### `createMarket(address baseToken, uint256 baseTokenId, address quoteToken) → bytes32 marketId`

Explicitly creates a new market (also auto-created on first order). Initialises the Red-Black Tree structures and circuit breaker.

**Emits:** `MarketCreated(marketId, baseToken, baseTokenId, quoteToken)`

### `pauseMarket(bytes32 marketId)`

Manually pauses a market. Equivalent to tripping the circuit breaker.

### `unpauseMarket(bytes32 marketId)`

Manually unpauses a paused market.

### `setMarketActive(bytes32 marketId, bool active)`

Activates or deactivates a market entirely. Inactive markets reject all order placement.

---

## Circuit Breaker Configuration

### `setCircuitBreaker(bytes32 marketId, uint256 priceChangeThreshold, uint256 cooldownPeriod)`

Configures the circuit breaker for a specific market:

| Parameter              | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `priceChangeThreshold` | Max price move (as percentage × 1e18) before pause |
| `cooldownPeriod`       | Blocks the market stays paused after circuit trips |

### `setGlobalPriceChangeThreshold(uint256 threshold)`

Sets the default threshold used when creating new markets.

### `setGlobalCooldownPeriod(uint256 period)`

Sets the default cooldown used for new markets.

### `setEmergencyTimelock(uint256 timelock)`

Sets the minimum delay before emergency admin actions take effect.

---

## MEV Protection Config

### `setCommitmentThreshold(uint256 threshold)`

Changes the order size above which commit-reveal is required.

```
Default: 10,000e18 (10,000 quote tokens)
Lower = more orders require commit-reveal = more MEV protection, worse UX
Higher = fewer orders protected
```

### `setMinRevealDelay(uint8 delay)`

Sets the minimum blocks between commit and reveal.

```
Default: 2 blocks (~4 seconds on Base)
```

### `setMaxOrdersPerBlock(uint256 max)`

Rate limit per address per block.

### `setMaxVolumePerBlock(uint256 max)`

Maximum total volume per block (in quote token units).

---

## System Pause

### `pause()`

Pauses the entire Diamond — affects all CLOB operations that have `whenNotPaused`.

```solidity
s.paused = true;
```

### `unpause()`

Resumes normal operations.

---

## Events

| Event                        | Parameters                                     |
| ---------------------------- | ---------------------------------------------- |
| `MarketCreated`              | `marketId, baseToken, baseTokenId, quoteToken` |
| `MarketPaused`               | `marketId`                                     |
| `MarketUnpaused`             | `marketId`                                     |
| `FeesWithdrawn`              | `quoteToken, recipient, amount`                |
| `TakerFeeUpdated`            | `oldBps, newBps`                               |
| `MakerFeeUpdated`            | `oldBps, newBps`                               |
| `CircuitBreakerUpdated`      | `marketId, threshold, cooldown`                |
| `CommitmentThresholdUpdated` | `oldThreshold, newThreshold`                   |
| `SystemPaused`               | `by`                                           |
| `SystemUnpaused`             | `by`                                           |

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Core Concepts/CLOB Trading]]
- [[Technical Reference/Fee Structure]]
