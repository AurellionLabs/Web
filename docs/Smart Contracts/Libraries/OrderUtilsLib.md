# OrderUtilsLib

Library for order utilities - validation, address conversion, and market management.

## Overview

`OrderUtilsLib` provides helper functions for order handling:

- Order parameter validation
- Market creation and lookup
- Address string conversion (Solidity <-> string)
- Bitpacking helpers
- Market order price calculation

Extracted from `OrderRouterFacet` to reduce contract size and stack depth.

## Errors

```solidity
error InvalidPrice();        // Price is zero
error InvalidAmount();       // Amount is zero
error InvalidTimeInForce();  // Invalid TIF value
error OrderExpired();        // GTD order past expiry
```

## Functions

### `validateOrderParams()`

Validates order parameters before placement.

```solidity
function validateOrderParams(
    uint96 price,
    uint96 amount,
    uint8 timeInForce,
    uint40 expiry
) internal view
```

**Validation rules:**

- `price` must be > 0
- `amount` must be > 0
- `timeInForce` must be valid (0-3)
- If `timeInForce == TIF_GTD`, expiry must be in the future

---

### `getOrCreateMarket()`

Gets an existing market or creates a new one.

```solidity
function getOrCreateMarket(
    DiamondStorage.AppStorage storage s,
    address baseToken,
    uint256 baseTokenId,
    address quoteToken
) internal returns (bytes32 marketId)
```

**Parameters:**

- `s` - Diamond app storage
- `baseToken` - Base token (ERC1155) address
- `baseTokenId` - Base token ID
- `quoteToken` - Quote token (ERC20) address

**Returns:** Market ID (keccak256 hash of the trading pair)

**Behavior:**

- If market exists, returns existing ID
- If market doesn't exist, creates new market and returns new ID
- Increments `totalMarkets` counter

---

### `addressToString()`

Converts an address to its hexadecimal string representation.

```solidity
function addressToString(address _addr) internal pure returns (string memory)
```

**Example:**

```
address(0x1234567890123456789012345678901234567890)
→ "0x1234567890123456789012345678901234567890"
```

**Use case:** Storing addresses in string-based storage (e.g., Market struct)

---

### `stringToAddress()`

Converts a hexadecimal string back to an address.

```solidity
function stringToAddress(string memory _str) internal pure returns (address)
```

**Requirements:**

- String must be 42 characters (0x + 40 hex chars)
- Supports both lowercase and uppercase hex

**Example:**

```
"0x1234567890123456789012345678901234567890"
→ address(0x1234567890123456789012345678901234567890)
```

---

### `unpackPriceAmountFilled()`

Extracts price, amount, and filled amount from packed storage.

```solidity
function unpackPriceAmountFilled(uint256 packed)
    internal pure returns (uint96 price, uint96 amount, uint64 filled)
```

**Note:** This is a convenience wrapper around `CLOBLib` functions.

---

### `getMarketOrderPrice()`

Calculates the price for a market order with slippage protection.

```solidity
function getMarketOrderPrice(
    DiamondStorage.AppStorage storage s,
    bytes32 marketId,
    bool isBuy,
    uint16 maxSlippageBps
) internal view returns (uint96)
```

**Parameters:**

- `s` - Diamond app storage
- `marketId` - Market identifier
- `isBuy` - True for buy order, false for sell
- `maxSlippageBps` - Maximum slippage in basis points (e.g., 50 = 0.5%)

**Logic:**

- **Buy order:** Get best ask, add slippage buffer
- **Sell order:** Get best bid, subtract slippage buffer

**Returns:** Adjusted price with slippage, or 0 if no liquidity

**Example:**

```
Best ask = 1000, maxSlippageBps = 50 (0.5%)
Buy order price = 1000 * (10000 + 50) / 10000 = 1005

Best bid = 1000, maxSlippageBps = 50
Sell order price = 1000 * (10000 - 50) / 10000 = 995
```

## Internal Helpers

### `_getBestPriceFromTree()`

Gets the best price from a price tree.

```solidity
function _getBestPriceFromTree(
    DiamondStorage.RBTreeMeta storage meta,
    mapping(uint256 => DiamondStorage.RBNode) storage nodes,
    bool getMin
) private view returns (uint256)
```

**Logic:**

- Traverses to leftmost node for minimum (asks)
- Traverses to rightmost node for maximum (bids)
- Returns 0 if tree is empty

## Market ID Generation

Markets are identified by a hash of the trading pair:

```solidity
marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken))
```

This creates a unique identifier for each unique trading pair.

## Storage Layout

### Market Struct

```solidity
struct Market {
    string baseToken;       // Address as string
    uint256 baseTokenId;    // Token ID (0 for ERC20)
    string quoteToken;      // Address as string
    bool active;            // Whether market is active
    uint256 createdAt;      // Creation timestamp
}
```

## Usage Examples

### Creating a Market

```solidity
bytes32 marketId = OrderUtilsLib.getOrCreateMarket(
    s,
    0x123...,  // baseToken
    1,         // baseTokenId
    0xabc...   // quoteToken
);
```

### Validating an Order

```solidity
OrderUtilsLib.validateOrderParams({
    price: 1000e18,
    amount: 10e18,
    timeInForce: CLOBLib.TIF_GTC,
    expiry: 0  // Ignored for GTC
});
```

### Market Order with Slippage

```solidity
uint96 marketPrice = OrderUtilsLib.getMarketOrderPrice({
    s: s,
    marketId: marketId,
    isBuy: true,
    maxSlippageBps: 100  // 1% max slippage
});
```

## Related

- [CLOBLib](./CLOBLib.md) - Order packing constants
- [DiamondStorage](./DiamondStorage.md) - Storage layouts
- [OrderBookLib](./OrderBookLib.md) - Price level management
