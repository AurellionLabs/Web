# OrderUtilsLib

Library for order utilities - validation, address conversion, and helpers.

## Overview

Provides common utilities used across order management facets. Helps reduce contract size by extracting shared logic.

## Errors

| Error                  | Description                 |
| ---------------------- | --------------------------- |
| `InvalidPrice()`       | Price is zero               |
| `InvalidAmount()`      | Amount is zero              |
| `InvalidTimeInForce()` | Invalid time-in-force value |
| `OrderExpired()`       | GTD order has expired       |

## Key Functions

### `validateOrderParams()`

Validates order parameters.

```solidity
function validateOrderParams(
    uint96 price,
    uint96 amount,
    uint8 timeInForce,
    uint40 expiry
) internal view
```

**Parameters:**

- `price` - Order price (must be > 0)
- `amount` - Order amount (must be > 0)
- `timeInForce` - Time-in-force option
- `expiry` - Expiration timestamp (required for GTD)

### `getOrCreateMarket()`

Gets existing market or creates new one.

```solidity
function getOrCreateMarket(
    DiamondStorage.AppStorage storage s,
    address baseToken,
    uint256 baseTokenId,
    address quoteToken
) internal returns (bytes32 marketId)
```

**Parameters:**

- `s` - App storage reference
- `baseToken` - Base token address
- `base Base token ID
- `quoteToken` - Quote tokenTokenId` - address

**Returns:**

- `marketId` - Market identifier

## Address Conversion

### `addressToString()`

Converts address to hex string.

```solidity
function addressToString(address _addr) internal pure returns (string memory)
```

### `stringToAddress()`

Converts hex string to address.

```solidity
function stringToAddress(string memory _str) internal pure returns (address)
```

## BitPacking Helpers

### `unpackPriceAmountFilled()`

Unpacks price, amount, and filled amount from packed storage.

```solidity
function unpackPriceAmountFilled(uint256 packed)
    internal pure returns (uint96 price, uint96 amount, uint64 filled)
```

### `getMarketOrderPrice()`

Calculates market order price with slippage.

```solidity
function getMarketOrderPrice(
    DiamondStorage.AppStorage storage s,
    bytes32 marketId,
    bool isBuy,
    uint16 maxSlippageBps
) internal view returns (uint96)
```

**Parameters:**

- `s` - App storage
- `marketId` - Market identifier
- `isBuy` - true for buy order
- `maxSlippageBps` - Max slippage in basis points

**Returns:**

- Adjusted price with slippage

## Usage

```solidity
import { OrderUtilsLib } from './libraries/OrderUtilsLib.sol';

// Validate order
OrderUtilsLib.validateOrderParams(price, amount, timeInForce, expiry);

// Get or create market
bytes32 marketId = OrderUtilsLib.getOrCreateMarket(s, baseToken, tokenId, quoteToken);

// Address conversion
string memory addrStr = OrderUtilsLib.addressToString(tokenAddress);
```

## Related

- [OrderRouterFacet](../Facets/OrderRouterFacet.md)
- [CLOBLib](./CLOBLib.md)
- [DiamondStorage](./DiamondStorage.md)
