---
tags: [smart-contracts, storage, diamond, library]
---

# DiamondStorage

[[🏠 Home]] > [[Smart Contracts/Overview]] > Libraries > DiamondStorage

`DiamondStorage.sol` is the single source of truth for all on-chain state in the Aurellion Diamond. Every facet reads and writes through the `appStorage()` accessor, which resolves to a fixed EVM storage slot, preventing collisions across upgrades.

---

## Storage Position

```solidity
bytes32 constant APP_STORAGE_POSITION = keccak256('diamond.app.storage');

function appStorage() internal pure returns (AppStorage storage s) {
    bytes32 position = APP_STORAGE_POSITION;
    assembly { s.slot := position }
}
```

This deterministic slot means:

- No storage variable can "shift" when new facets are added
- The same struct can be accessed from any facet without a shared import at runtime
- Storage layout upgrades are additive (append-only to avoid slot collisions)

---

## RBAC Role Constants

```solidity
bytes32 constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");
bytes32 constant DRIVER_ROLE      = keccak256("DRIVER_ROLE");
bytes32 constant DISPATCHER_ROLE  = keccak256("DISPATCHER_ROLE");
```

Roles are checked via `ausysRoles[role][address]` in AppStorage.

---

## AppStorage — Domain Sections

### Ownership

| Field          | Type      | Description                |
| -------------- | --------- | -------------------------- |
| `owner`        | `address` | Diamond contract owner     |
| `pendingOwner` | `address` | Pending ownership transfer |
| `initialized`  | `bool`    | Prevents double-init       |

### Node Registry

| Field        | Type                                                | Description                      |
| ------------ | --------------------------------------------------- | -------------------------------- |
| `nodes`      | `mapping(bytes32 => Node)`                          | nodeHash → Node struct           |
| `ownerNodes` | `mapping(address => bytes32[])`                     | owner → list of their nodeHashes |
| `nodeList`   | `address[]`                                         | All registered node addresses    |
| `totalNodes` | `uint256`                                           | Node count                       |
| `nodeAssets` | `mapping(bytes32 => mapping(uint256 => NodeAsset))` | nodeHash → assetId → asset       |
| `nodeAdmins` | `mapping(address => bool)`                          | Admin override for node ops      |

### ERC-1155 (AssetsFacet)

| Field                      | Type                                              | Description                 |
| -------------------------- | ------------------------------------------------- | --------------------------- |
| `erc1155Balances`          | `mapping(uint256 => mapping(address => uint256))` | tokenId → account → balance |
| `erc1155OperatorApprovals` | `mapping(address => mapping(address => bool))`    | ERC-1155 operator approvals |
| `erc1155URI`               | `string`                                          | Base metadata URI           |
| `erc1155TotalSupply`       | `mapping(uint256 => uint256)`                     | Total supply per tokenId    |

### Aura Asset Registry

| Field                   | Type                                              | Description                       |
| ----------------------- | ------------------------------------------------- | --------------------------------- |
| `nameToSupportedAssets` | `mapping(string => AssetDefinition)`              | Asset definitions by name         |
| `supportedClassNames`   | `string[]`                                        | All class names                   |
| `hashToClass`           | `mapping(bytes32 => string)`                      | mint hash → class name            |
| `isClassActive`         | `mapping(bytes32 => bool)`                        | classNameHash → active            |
| `hashToTokenID`         | `mapping(bytes32 => uint256)`                     | mint hash → tokenId               |
| `ipfsID`                | `bytes32[]`                                       | All mint hashes (for enumeration) |
| `tokenCustodyAmount`    | `mapping(uint256 => uint256)`                     | Total custody per tokenId         |
| `tokenCustodianAmounts` | `mapping(uint256 => mapping(address => uint256))` | Per-custodian custody amounts     |

### CLOB (V1)

| Field        | Type                                                | Description                 |
| ------------ | --------------------------------------------------- | --------------------------- |
| `markets`    | `mapping(bytes32 => Market)`                        | marketId → Market           |
| `clobOrders` | `mapping(bytes32 => CLOBOrder)`                     | orderId → CLOBOrder         |
| `trades`     | `mapping(bytes32 => Trade)`                         | tradeId → Trade             |
| `pools`      | `mapping(bytes32 => LiquidityPool)`                 | poolId → pool               |
| `bidOrders`  | `mapping(bytes32 => mapping(uint256 => bytes32[]))` | marketId → price → orderIds |
| `askOrders`  | `mapping(bytes32 => mapping(uint256 => bytes32[]))` | marketId → price → orderIds |

### CLOB V2 (Production)

| Field                 | Type                                                 | Description                                    |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `packedOrders`        | `mapping(bytes32 => PackedOrder)`                    | Gas-efficient packed orders                    |
| `orderNonce`          | `uint256`                                            | Global nonce for unique IDs                    |
| `bidTreeMeta`         | `mapping(bytes32 => RBTreeMeta)`                     | Red-Black Tree metadata per market             |
| `askTreeMeta`         | `mapping(bytes32 => RBTreeMeta)`                     | Red-Black Tree metadata per market             |
| `bidTreeNodes`        | `mapping(bytes32 => mapping(uint256 => RBNode))`     | Tree nodes                                     |
| `bidLevels`           | `mapping(bytes32 => mapping(uint256 => PriceLevel))` | FIFO queue per price level                     |
| `orderQueue`          | `mapping(bytes32 => OrderQueueNode)`                 | FIFO linked list nodes                         |
| `committedOrders`     | `mapping(bytes32 => CommittedOrder)`                 | MEV commit-reveal state                        |
| `minRevealDelay`      | `uint8`                                              | Min blocks between commit and reveal           |
| `commitmentThreshold` | `uint256`                                            | Large order threshold (requires commit-reveal) |
| `maxOrdersPerBlock`   | `uint256`                                            | Rate limit                                     |
| `circuitBreakers`     | `mapping(bytes32 => CircuitBreaker)`                 | Per-market circuit breaker                     |
| `takerFeeBps`         | `uint16`                                             | Taker fee in basis points                      |
| `makerFeeBps`         | `uint16`                                             | Maker fee in basis points                      |

### Bridge (BridgeFacet)

| Field                     | Type                               | Description                      |
| ------------------------- | ---------------------------------- | -------------------------------- |
| `unifiedOrders`           | `mapping(bytes32 => UnifiedOrder)` | unifiedOrderId → order           |
| `unifiedOrderIds`         | `bytes32[]`                        | All unified order IDs            |
| `quoteTokenAddress`       | `address`                          | ERC-20 used for payment          |
| `feeRecipient`            | `address`                          | Protocol fee destination         |
| `journeys`                | `mapping(bytes32 => Journey)`      | Bridge journeys                  |
| `clobTradeToUnifiedOrder` | `mapping(bytes32 => bytes32)`      | Lookup: tradeId → unifiedOrderId |
| `buyerUnifiedOrders`      | `mapping(address => bytes32[])`    | Per-buyer order history          |

### AuSys (Logistics)

| Field                  | Type                                           | Description                   |
| ---------------------- | ---------------------------------------------- | ----------------------------- |
| `ausysOrders`          | `mapping(bytes32 => AuSysOrder)`               | Full logistics orders         |
| `ausysJourneys`        | `mapping(bytes32 => AuSysJourney)`             | Journey details               |
| `driverToJourneyIds`   | `mapping(address => bytes32[])`                | Driver → assigned journey IDs |
| `customerHandOff`      | `mapping(address => mapping(bytes32 => bool))` | Sender custody signature      |
| `driverPickupSigned`   | `mapping(address => mapping(bytes32 => bool))` | Driver pickup signature       |
| `driverDeliverySigned` | `mapping(address => mapping(bytes32 => bool))` | Driver delivery signature     |
| `ausysRoles`           | `mapping(bytes32 => mapping(address => bool))` | RBAC: role → address → has    |
| `openP2POfferIds`      | `bytes32[]`                                    | Open P2P offer IDs            |
| `userP2POffers`        | `mapping(address => bytes32[])`                | Per-user P2P offer history    |

---

## Key Struct Definitions

### Node

```solidity
struct Node {
    address owner;
    string nodeType;
    uint256 capacity;
    uint256 createdAt;
    bool active;
    bool validNode;
    string lat;
    string lng;
    string addressName;
}
```

### NodeAsset

```solidity
struct NodeAsset {
    address token;
    uint256 tokenId;
    uint256 price;
    uint256 capacity;
    uint256 createdAt;
}
```

### AssetDefinition

```solidity
struct AssetDefinition {
    string name;
    string assetClass;
    Attribute[] attributes;
}

struct Attribute {
    string name;
    string[] values;
    string description;
}
```

### PackedOrder (V2)

```solidity
struct PackedOrder {
    uint256 makerAndFlags;    // maker(160)|isBuy(1)|orderType(2)|status(2)|TIF(3)|nonce(88)
    uint256 priceAmountFilled; // price(96)|amount(96)|filledAmount(64)
    uint256 expiryCreatedMarket; // expiry(40)|createdAt(40)|marketIndex(32)|baseToken(160)
}
```

### UnifiedOrder

```solidity
struct UnifiedOrder {
    bytes32 clobOrderId;
    bytes32 clobTradeId;
    bytes32 ausysOrderId;
    address buyer;
    address seller;
    address sellerNode;
    address token;
    uint256 tokenId;
    uint256 tokenQuantity;
    uint256 price;
    uint256 bounty;
    uint256 escrowedAmount;
    uint8 status;         // OrderStatus constants
    uint8 logisticsStatus;
    uint256 createdAt;
    uint256 matchedAt;
    uint256 deliveredAt;
    uint256 settledAt;
    ParcelData deliveryData;
}
```

### AuSysOrder

```solidity
struct AuSysOrder {
    bytes32 id;
    address token;
    uint256 tokenId;
    uint256 tokenQuantity;
    uint256 price;
    uint256 txFee;
    address buyer;
    address seller;
    bytes32[] journeyIds;
    address[] nodes;
    uint256 requestedTokenQuantity;
    string startLat; string startLng;
    string endLat;   string endLng;
    string startName; string endName;
    uint8 currentStatus;
}
```

---

## RWY Storage (Separate Slot)

RWY state lives in its own storage struct to keep AppStorage manageable:

```solidity
bytes32 constant RWY_STORAGE_POSITION = keccak256('rwy.app.storage');
```

Key RWY fields: `opportunities`, `stakerPositions`, `minOperatorCollateralBps`, `maxYieldBps`, `protocolFeeBps`, `defaultProcessingDays`.

See [[Smart Contracts/Facets/RWYStakingFacet]] for the full RWY data model.

---

## Adding New Storage

**Always append** to `AppStorage`. Never reorder, never remove (use "tombstone" bools instead). New domains that require significant state should get their own storage slot like `RWYStorage`.

---

## Related Pages

- [[Architecture/Diamond Proxy Pattern]]
- [[Smart Contracts/Overview]]
- [[Smart Contracts/Facets/AssetsFacet]]
