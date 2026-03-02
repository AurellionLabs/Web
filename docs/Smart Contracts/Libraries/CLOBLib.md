---
tags: [smart-contracts, library, clob, utilities]
---

# CLOBLib

[[🏠 Home]] > [[Smart Contracts/Overview]] > Libraries > CLOBLib

`CLOBLib.sol` is a Solidity library containing shared utility functions used across multiple CLOB facets (`CLOBCoreFacet`, `CLOBMatchingFacet`, `OrderRouterFacet`). Extracting common logic into a library keeps individual facets under the 24KB size limit.

---

## Key Functions

### `calculateQuoteAmount(uint96 price, uint96 amount) → uint256`

Calculates the total quote token amount for a given price and base token amount.

```solidity
function calculateQuoteAmount(uint96 price, uint96 amount)
    internal pure returns (uint256) {
    return (uint256(price) * uint256(amount)) / 1e18;
}
```

**Used in:** `CLOBCoreFacet.placeLimitOrder` (to check if commit-reveal required), `OrderRouterFacet.placeOrder` (to calculate escrow).

**Example:**

```
price  = 500e18  (500 USDC per token, 18 decimals)
amount = 10      (10 base tokens)
result = (500e18 × 10) / 1e18 = 5000  (5000 USDC)
```

### `generateOrderId(address maker, uint256 nonce, bytes32 marketId) → bytes32`

Generates a deterministic order ID:

```solidity
return keccak256(abi.encodePacked(maker, nonce, marketId, block.number));
```

### `generateTradeId(bytes32 takerOrderId, bytes32 makerOrderId, uint256 timestamp) → bytes32`

Generates a unique trade ID from the two matched orders.

### `packOrderFlags(bool isBuy, uint8 orderType, uint8 status, uint8 timeInForce, uint88 nonce) → uint256`

Packs order metadata into a single uint256 for storage in `PackedOrder.makerAndFlags`.

### `unpackOrderFlags(uint256 packed) → (bool isBuy, uint8 orderType, uint8 status, uint8 timeInForce, uint88 nonce)`

Reverses the packing for read operations.

### `packPriceAmount(uint96 price, uint96 amount, uint64 filledAmount) → uint256`

Packs price/amount/filled into slot 2 of `PackedOrder`.

### `unpackPriceAmount(uint256 packed) → (uint96 price, uint96 amount, uint64 filledAmount)`

Reverses the packing.

---

## Constants

| Constant         | Value   | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| `PRICE_DECIMALS` | `1e18`  | Denominator for price/amount calculations |
| `BASIS_POINTS`   | `10000` | Fee calculation denominator               |
| `MAX_FEE_BPS`    | `1000`  | Maximum fee: 10%                          |

---

## Usage Pattern

```solidity
import { CLOBLib } from '../libraries/CLOBLib.sol';

contract CLOBCoreFacet {
    function placeLimitOrder(...) external {
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        if (quoteAmount >= s.commitmentThreshold) {
            revert OrderRequiresCommitReveal();
        }
        // ...
    }
}
```

---

## Related Libraries

| Library            | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `OrderBookLib`     | Red-Black Tree operations for price levels |
| `OrderMatchingLib` | Matching algorithm implementation          |
| `OrderUtilsLib`    | Parameter validation, market creation      |
| `RWYLib`           | RWY staking calculations                   |

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Smart Contracts/Facets/OrderRouterFacet]]
- [[Smart Contracts/Libraries/DiamondStorage]]
