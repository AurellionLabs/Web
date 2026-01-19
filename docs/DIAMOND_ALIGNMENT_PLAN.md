# Diamond Facet Alignment Remediation Plan

## Summary

| Legacy Contract | Diamond Facet   | Action                          | Priority |
| --------------- | --------------- | ------------------------------- | -------- |
| AuraAsset.sol   | AssetsFacet     | **REWRITE** - Full ERC1155 impl | CRITICAL |
| Aurum.sol       | NodesFacet      | MODIFY - Add AuSys integration  | HIGH     |
| RWYVault.sol    | RWYStakingFacet | MODIFY - Minor alignment        | MEDIUM   |
| AuSys.sol       | **AuSysFacet**  | **CREATE** - New facet          | CRITICAL |
| OrderBridge.sol | BridgeFacet     | MODIFY - Add missing features   | HIGH     |
| IAuraCLOB.sol   | CLOB Facets     | MODIFY - Add logistics/drivers  | MEDIUM   |

---

## 1. AssetsFacet → Full ERC1155 (AuraAsset Mirror)

### Current: 79 lines → Target: ~400 lines

### Changes Required

#### 1.1 Inherit ERC1155 Base

```solidity
import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ERC1155Burnable } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

contract AssetsFacet is ERC1155, ERC1155Burnable, ERC1155Supply {
```

**Note**: ERC1155 stores balances internally. We need Diamond-compatible storage.

#### 1.2 Storage Additions (DiamondStorage.sol)

```solidity
// ERC1155 Core Storage
mapping(uint256 => mapping(address => uint256)) erc1155Balances;
mapping(address => mapping(address => bool)) erc1155OperatorApprovals;
string erc1155URI;

// ERC1155Supply
mapping(uint256 => uint256) erc1155TotalSupply;
mapping(uint256 => bool) erc1155Exists;

// AuraAsset-specific
struct Attribute {
    string name;
    string[] values;
    string description;
}

struct AssetDefinition {
    string name;
    string assetClass;
    Attribute[] attributes;
}

mapping(string => AssetDefinition) nameToSupportedAssets;
mapping(string => uint256) nameToSupportedAssetIndex;
string[] supportedAssetNames;

mapping(string => string) nameToSupportedClass;
mapping(string => uint256) nameToSupportedClassIndex;
string[] supportedClassNames;

mapping(bytes32 => string) hashToClass;
mapping(bytes32 => bool) isClassActive;
mapping(bytes32 => uint256) hashToTokenID;
bytes32[] ipfsID;

// Custody tracking
mapping(uint256 => address) tokenCustodian;
mapping(uint256 => uint256) tokenCustodyAmount;

// NodeManager interface address (self-reference for Diamond)
address nodeManagerAddress;
```

#### 1.3 Functions to Implement

**ERC1155 Core (override to use Diamond storage):**

- `balanceOf(address, uint256)`
- `balanceOfBatch(address[], uint256[])`
- `setApprovalForAll(address, bool)`
- `isApprovedForAll(address, address)`
- `safeTransferFrom(address, address, uint256, uint256, bytes)`
- `safeBatchTransferFrom(address, address, uint256[], uint256[], bytes)`
- `_beforeTokenTransfer(...)` - hook for ERC1155Supply
- `uri(uint256)` - metadata URI

**AuraAsset-specific:**

```solidity
// URI Management
function setURI(string memory newuri) external; // onlyOwner

// Node Minting (validNode modifier)
function nodeMint(
    address account,
    AssetDefinition memory asset,
    uint256 amount,
    string memory className,
    bytes memory data
) external returns (bytes32 hash, uint256 tokenID);

// Redemption (burn + custody release)
function redeem(uint256 tokenId, uint256 amount) external;

// Custody Info
function getCustodyInfo(uint256 tokenId) external view returns (address custodian, uint256 amount);
function isInCustody(uint256 tokenId) external view returns (bool);

// Asset/Class Registry
function addSupportedAsset(AssetDefinition memory asset) external; // onlyOwner
function removeSupportedAsset(AssetDefinition memory asset) external; // onlyOwner
function addSupportedClass(string memory className) external; // onlyOwner
function removeSupportedClass(string memory className) external; // onlyOwner

// Batch Minting
function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external; // onlyOwner

// Utility
function lookupHash(AssetDefinition memory asset) external pure returns (uint256);
```

**Modifier:**

```solidity
modifier validNode(address node) {
    // Check via NodesFacet.getNodeStatus()
    require(
        INodesFacet(address(this)).getNodeStatus(node) == bytes1(uint8(1)),
        "Invalid node"
    );
    _;
}
```

#### 1.4 Events to Add

```solidity
event MintedAsset(
    address indexed account,
    bytes32 indexed hash,
    uint256 indexed tokenId,
    string name,
    string assetClass,
    string className
);

event AssetAttributeAdded(
    bytes32 indexed hash,
    uint256 indexed attributeIndex,
    string name,
    string[] values,
    string description
);

event CustodyEstablished(
    uint256 indexed tokenId,
    address indexed custodian,
    uint256 amount
);

event CustodyReleased(
    uint256 indexed tokenId,
    address indexed custodian,
    uint256 amount,
    address indexed redeemer
);
```

---

## 2. NodesFacet Alignment (Aurum.sol Mirror)

### Current: 886 lines → Target: ~950 lines

### Changes Required

#### 2.1 Storage Additions

```solidity
// Admin system (from AurumNodeManager)
mapping(address => bool) nodeAdmins;
```

#### 2.2 Functions to Add

**Admin System:**

```solidity
function setNodeAdmin(address _admin) external; // onlyOwner
function revokeNodeAdmin(address _admin) external; // onlyOwner
function isNodeAdmin(address _admin) external view returns (bool);
```

**AuSys Integration (from aurumNode):**

```solidity
// Journey operations - calls internal AuSysFacet
function nodeHandoff(bytes32 nodeHash, bytes32 journeyId) external; // onlyNodeOwner
function nodeHandOn(bytes32 nodeHash, bytes32 journeyId) external; // onlyNodeOwner
function nodeSign(bytes32 nodeHash, bytes32 journeyId) external; // onlyNodeOwner

// AuSys approval (set approval for AuSys to handle node's tokens)
function approveAusysForTokens(bytes32 nodeHash) external; // onlyNodeOwner
function revokeAusysApproval(bytes32 nodeHash) external; // onlyNodeOwner
```

**Node Item Minting:**

```solidity
// Mint via node (calls AssetsFacet.nodeMint internally)
function addItem(
    bytes32 nodeHash,
    address itemOwner,
    uint256 amount,
    DiamondStorage.AssetDefinition memory asset,
    string memory className,
    bytes memory data
) external returns (uint256 tokenId); // onlyNodeOwner
```

**Capacity Management (callable by AuSysFacet):**

```solidity
function reduceCapacityForOrder(
    bytes32 nodeHash,
    address token,
    uint256 tokenId,
    uint256 quantityToReduce
) external; // onlyAuSys or internal
```

#### 2.3 Events to Add

```solidity
event NodeAdminSet(address indexed admin);
event NodeAdminRevoked(address indexed admin);
```

---

## 3. NEW: AuSysFacet (AuSys.sol Mirror)

### Target: ~500 lines (new file)

### 3.1 Storage Additions (DiamondStorage.sol)

```solidity
// ======= AUSYS =======
// Enums stored as uint8 in structs
// JourneyStatus: 0=Pending, 1=InTransit, 2=Delivered, 3=Canceled
// OrderStatus: 0=Created, 1=Processing, 2=Settled, 3=Canceled

struct Location {
    string lat;
    string lng;
}

struct ParcelData {
    Location startLocation;
    Location endLocation;
    string startName;
    string endName;
}

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
    ParcelData locationData;
    uint8 currentStatus; // OrderStatus
    bytes32 contractualAgreement;
}

struct AuSysJourney {
    ParcelData parcelData;
    bytes32 journeyId;
    uint8 currentStatus; // JourneyStatus
    address sender;
    address receiver;
    address driver;
    uint256 journeyStart;
    uint256 journeyEnd;
    uint256 bounty;
    uint256 ETA;
}

// State mappings
address payToken; // Configurable payment token
mapping(bytes32 => AuSysOrder) ausysOrders;
bytes32[] ausysOrderIds;
mapping(bytes32 => bytes32) journeyToOrderId;
mapping(address => bytes32[]) driverToJourneyIds;
mapping(bytes32 => AuSysJourney) ausysJourneys;
mapping(address => mapping(bytes32 => bool)) customerHandOff;
mapping(address => mapping(bytes32 => bool)) driverPickupSigned;
mapping(address => mapping(bytes32 => bool)) driverDeliverySigned;
mapping(bytes32 => bool) journeyRewardPaid;

// RBAC
bytes32 constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 constant DRIVER_ROLE = keccak256("DRIVER_ROLE");
bytes32 constant DISPATCHER_ROLE = keccak256("DISPATCHER_ROLE");
mapping(bytes32 => mapping(address => bool)) ausysRoles;

// Counters
uint256 ausysJourneyIdCounter;
uint256 ausysOrderIdCounter;
```

### 3.2 Functions to Implement

**Configuration:**

```solidity
function setPayToken(address _payToken) external; // onlyOwner
function getPayToken() external view returns (address);
```

**RBAC:**

```solidity
function setAuSysAdmin(address admin) external; // onlyOwner
function revokeAuSysAdmin(address admin) external; // onlyOwner
function setDriver(address driver, bool enable) external; // adminOnly
function setDispatcher(address dispatcher, bool enable) external; // adminOnly
function hasRole(bytes32 role, address account) external view returns (bool);
```

**Order Management:**

```solidity
function orderCreation(AuSysOrder memory order) external returns (bytes32);
function getAuSysOrder(bytes32 id) external view returns (AuSysOrder memory);
```

**Journey Management:**

```solidity
function journeyCreation(
    address sender,
    address receiver,
    ParcelData memory _data,
    uint256 bounty,
    uint256 ETA
) external;

function orderJourneyCreation(
    bytes32 orderId,
    address sender,
    address receiver,
    ParcelData memory _data,
    uint256 bounty,
    uint256 ETA,
    uint256 tokenQuantity,
    uint256 assetId
) external;

function getJourney(bytes32 id) external view returns (AuSysJourney memory);
```

**Signature System:**

```solidity
function packageSign(bytes32 id) external; // customerDriverCheck
function handOn(bytes32 id) external returns (bool); // isPending, customerDriverCheck
function handOff(bytes32 id) external returns (bool); // isInProgress, customerDriverCheck
```

**Driver Assignment:**

```solidity
function assignDriverToJourneyId(address driver, bytes32 journeyId) external;
```

### 3.3 Events

```solidity
event AuSysAdminSet(address indexed admin);
event EmitSig(address indexed user, bytes32 indexed id);
event AuSysOrderSettled(bytes32 indexed orderId);
event AuSysOrderStatusUpdated(bytes32 indexed orderId, uint8 newStatus);
event AuSysJourneyStatusUpdated(bytes32 indexed journeyId, uint8 newStatus);
event JourneyCanceled(bytes32 indexed journeyId, address indexed sender, uint256 refundedAmount);
event FundsEscrowed(address indexed from, uint256 amount);
event FundsRefunded(address indexed to, uint256 amount);
event DriverAssigned(address indexed driver, bytes32 indexed journeyId);
event SellerPaid(address indexed seller, uint256 amount);
event NodeFeeDistributed(address indexed node, uint256 amount);
event JourneyCreated(bytes32 indexed journeyId, address indexed sender, address indexed receiver);
event AuSysOrderCreated(
    bytes32 indexed orderId,
    address indexed buyer,
    address indexed seller,
    address token,
    uint256 tokenId,
    uint256 tokenQuantity,
    uint256 price,
    uint256 txFee,
    uint8 currentStatus,
    address[] nodes,
    ParcelData locationData
);
```

### 3.4 Modifiers

```solidity
modifier customerDriverCheck(bytes32 id);
modifier isInProgress(bytes32 id);
modifier isPending(bytes32 id);
modifier isCompleted(bytes32 id);
modifier adminOnly();
```

---

## 4. BridgeFacet Alignment (OrderBridge.sol Mirror)

### Current: 309 lines → Target: ~400 lines

### 4.1 Storage Additions

```solidity
// Add to UnifiedOrder struct
ParcelData deliveryData;
bytes32[] journeyIds;

// Add lookup mappings
mapping(bytes32 => bytes32) clobTradeToUnifiedOrder;
mapping(bytes32 => bytes32) clobOrderToUnifiedOrder;
mapping(address => bytes32[]) buyerUnifiedOrders;
mapping(address => bytes32[]) sellerUnifiedOrders;
```

### 4.2 Functions to Add

```solidity
// Views
function getBuyerOrders(address buyer) external view returns (bytes32[] memory);
function getSellerOrders(address seller) external view returns (bytes32[] memory);

// Admin
function setBountyPercentage(uint256 _percentage) external; // onlyOwner
function setProtocolFeePercentage(uint256 _percentage) external; // onlyOwner
function updateClobAddress(address _clob) external; // onlyOwner
function updateAusysAddress(address _ausys) external; // onlyOwner
```

### 4.3 Constants Alignment

```solidity
uint256 public constant BOUNTY_PERCENTAGE = 200;        // 2% (was 100/1%)
uint256 public constant PROTOCOL_FEE_PERCENTAGE = 25;   // 0.25% (was 50/0.5%)
```

### 4.4 Update createUnifiedOrder

Add `ParcelData calldata deliveryData` parameter.

---

## 5. RWYStakingFacet Alignment (RWYVault.sol Mirror)

### Current: 533 lines → Target: ~550 lines

### 5.1 Changes Required

**Support ETH Collateral:**

```solidity
// In createOpportunity - add payable
function createOpportunity(...) external payable onlyApprovedOperator {
    // If msg.value > 0, use ETH as collateral
    // Otherwise, use token collateral
}
```

**Add Missing Admin Functions:**

```solidity
function setCLOBAddress(address _clob) external; // onlyOwner
function setQuoteToken(address _quoteToken) external; // onlyOwner
function pause() external; // onlyOwner
function unpause() external; // onlyOwner
```

**Storage Addition:**

```solidity
// In RWYStorage
address clobAddress;
address quoteToken;
```

---

## 6. CLOB Logistics (IAuraCLOB Alignment)

### Create CLOBLogisticsFacet.sol (~350 lines)

### 6.1 Storage Additions

```solidity
// Driver tracking
struct DriverInfo {
    address driver;
    bool isActive;
    bool isAvailable;
    Location currentLocation;
    uint256 totalDeliveries;
    uint256 completedDeliveries;
    uint256 totalEarnings;
    uint256 rating; // Scaled by 100
}

struct LogisticsOrder {
    bytes32 orderId;
    bytes32 tradeId;
    address buyer;
    address seller;
    address sellerNode;
    address token;
    uint256 tokenId;
    uint256 quantity;
    uint256 totalPrice;
    uint256 escrowedAmount;
    uint256 driverBounty;
    Location pickupLocation;
    Location deliveryLocation;
    uint8 status; // LogisticsStatus enum
    address assignedDriver;
    uint256 createdAt;
    uint256 deliveredAt;
}

mapping(address => DriverInfo) clobDrivers;
address[] clobDriverList;
mapping(bytes32 => LogisticsOrder) clobLogisticsOrders;
bytes32[] clobLogisticsOrderIds;
```

### 6.2 Functions to Implement

```solidity
// Driver Management
function registerDriver() external;
function setDriverAvailability(bool isAvailable) external;
function updateDriverLocation(Location calldata location) external;
function getDriverInfo(address driver) external view returns (DriverInfo memory);

// Delivery Flow
function acceptDelivery(bytes32 orderId, uint256 estimatedPickupTime, uint256 estimatedDeliveryTime) external;
function confirmPickup(bytes32 orderId, bytes calldata signature, Location calldata location) external;
function updateDeliveryLocation(bytes32 orderId, Location calldata location) external;
function confirmDelivery(bytes32 orderId, bytes calldata receiverSignature, Location calldata location) external;

// Settlement
function settleOrder(bytes32 orderId) external;
function disputeOrder(bytes32 orderId, string calldata reason) external;

// Views
function getLogisticsOrder(bytes32 orderId) external view returns (LogisticsOrder memory);
function getNodeInventory(address node, address token, uint256 tokenId) external view returns (uint256 available, uint256 reserved, uint256 price);
```

---

## 7. Implementation Order

| Phase | Day | Tasks                                                   |
| ----- | --- | ------------------------------------------------------- |
| 1     | 1   | Update DiamondStorage.sol with ALL new structs/mappings |
| 2     | 1-2 | Rewrite AssetsFacet as full ERC1155                     |
| 3     | 2   | Create AuSysFacet.sol (new)                             |
| 4     | 3   | Update NodesFacet with AuSys integration                |
| 5     | 3   | Update BridgeFacet                                      |
| 6     | 4   | Update RWYStakingFacet                                  |
| 7     | 4   | Create CLOBLogisticsFacet.sol                           |
| 8     | 5   | Integration testing                                     |
| 9     | 5-6 | Update Diamond.sol deployment with new facets           |

---

## 8. Files Summary

| File                     | Action  | Est. Lines |
| ------------------------ | ------- | ---------- |
| `DiamondStorage.sol`     | MODIFY  | +200 lines |
| `AssetsFacet.sol`        | REWRITE | ~400 lines |
| `NodesFacet.sol`         | MODIFY  | +70 lines  |
| `AuSysFacet.sol`         | CREATE  | ~500 lines |
| `BridgeFacet.sol`        | MODIFY  | +100 lines |
| `RWYStakingFacet.sol`    | MODIFY  | +30 lines  |
| `CLOBLogisticsFacet.sol` | CREATE  | ~350 lines |

**Total new/modified code: ~1,650 lines**

---

## Key Decisions Made

1. **ERC1155**: Combined AssetsFacet becomes full ERC1155 implementation
2. **Nodes**: Storage-based approach (no external node contracts)
3. **Staking**: Mirror RWYVault.sol (ERC1155 commodity staking)
4. **Pay Token**: Configurable via storage
5. **RBAC**: Replicate OpenZeppelin AccessControl pattern with custom mappings
6. **Event Names**: Don't need to match legacy exactly
7. **Facet Size**: If any facet exceeds contract size limit (24KB), split into multiple facets (e.g., `AssetsFacet` + `AssetsViewFacet`, or `AuSysCoreFacet` + `AuSysJourneyFacet`)

---

## 9. Testing Strategy - Test-Driven Development (TDD)

### Philosophy

Since we know the legacy contracts work correctly, we will:

1. **Write failing Forge tests first** based on legacy contract behavior
2. **Implement the facet code** to make the tests pass
3. **Verify parity** with legacy contract functionality

### 9.1 Forge Test Structure

```
test/
├── diamond/
│   ├── AssetsFacet.t.sol       # ERC1155 + AuraAsset parity tests
│   ├── NodesFacet.t.sol        # Aurum/AurumNodeManager parity tests
│   ├── AuSysFacet.t.sol        # AuSys parity tests
│   ├── BridgeFacet.t.sol       # OrderBridge parity tests
│   ├── RWYStakingFacet.t.sol   # RWYVault parity tests
│   └── CLOBLogisticsFacet.t.sol # IAuraCLOB logistics tests
└── integration/
    └── DiamondIntegration.t.sol # Full flow tests
```

### 9.2 Test Categories per Facet

**AssetsFacet Tests:**

```solidity
// ERC1155 Core
function test_balanceOf() external;
function test_balanceOfBatch() external;
function test_setApprovalForAll() external;
function test_safeTransferFrom() external;
function test_safeBatchTransferFrom() external;

// AuraAsset Parity
function test_nodeMint_validNode() external;
function test_nodeMint_revertInvalidNode() external;
function test_nodeMint_establishesCustody() external;
function test_redeem_releasesCustody() external;
function test_redeem_burnTokens() external;
function test_addSupportedClass() external;
function test_removeSupportedClass() external;
function test_lookupHash() external;
```

**AuSysFacet Tests:**

```solidity
// Order Management
function test_orderCreation() external;
function test_orderCreation_revertInvalidBuyer() external;

// Journey Management
function test_journeyCreation() external;
function test_orderJourneyCreation() external;

// Signature System
function test_packageSign_sender() external;
function test_packageSign_receiver() external;
function test_packageSign_driver() external;
function test_handOn_requiresSignatures() external;
function test_handOff_requiresSignatures() external;
function test_handOff_paysDriver() external;
function test_handOff_settlesOrder() external;

// RBAC
function test_setDriver() external;
function test_setDispatcher() external;
function test_assignDriverToJourney() external;
```

**NodesFacet Tests:**

```solidity
// AuSys Integration
function test_nodeHandoff() external;
function test_nodeHandOn() external;
function test_nodeSign() external;

// Admin System
function test_setNodeAdmin() external;
function test_revokeNodeAdmin() external;

// Capacity Management
function test_reduceCapacityForOrder() external;
```

### 9.3 Running Tests

```bash
# Run all Forge tests
forge test

# Run specific facet tests
forge test --match-contract AssetsFacetTest

# Run with verbosity
forge test -vvv

# Run with gas reporting
forge test --gas-report
```

---

## 10. Deployment Strategy

### 10.1 Deployment Order

1. **Deploy updated DiamondStorage** (storage changes only)
2. **Deploy new facets** to new addresses
3. **Diamond cut** - add/replace facet selectors
4. **Initialize** new facets if needed
5. **Verify** on block explorer

### 10.2 Diamond Cut Script

```typescript
// scripts/deploy-aligned-facets.ts
import { ethers } from 'hardhat';
import { FacetCutAction } from './libraries/diamond';

async function main() {
  const diamondAddress = process.env.DIAMOND_ADDRESS;

  // Deploy new facets
  const AssetsFacet = await ethers.getContractFactory('AssetsFacet');
  const assetsFacet = await AssetsFacet.deploy();

  const AuSysFacet = await ethers.getContractFactory('AuSysFacet');
  const auSysFacet = await AuSysFacet.deploy();

  const CLOBLogisticsFacet =
    await ethers.getContractFactory('CLOBLogisticsFacet');
  const clobLogisticsFacet = await CLOBLogisticsFacet.deploy();

  // Prepare diamond cut
  const cut = [
    {
      facetAddress: assetsFacet.address,
      action: FacetCutAction.Replace, // or Add for new functions
      functionSelectors: getSelectors(assetsFacet),
    },
    {
      facetAddress: auSysFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(auSysFacet),
    },
    {
      facetAddress: clobLogisticsFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(clobLogisticsFacet),
    },
  ];

  // Execute diamond cut
  const diamond = await ethers.getContractAt('IDiamondCut', diamondAddress);
  await diamond.diamondCut(cut, ethers.constants.AddressZero, '0x');

  console.log('Diamond cut complete');
}
```

### 10.3 Post-Deployment Verification

```bash
# Verify facet deployment
npx hardhat verify --network baseSepolia <FACET_ADDRESS>

# Verify Diamond has new selectors
npx hardhat run scripts/verify-diamond-facets.ts
```

---

## 11. Indexer Updates

### 11.1 New Events to Index

The indexer must be updated to handle new events from aligned facets:

**AssetsFacet Events:**

- `MintedAsset(address indexed account, bytes32 indexed hash, uint256 indexed tokenId, string name, string assetClass, string className)`
- `AssetAttributeAdded(bytes32 indexed hash, uint256 indexed attributeIndex, string name, string[] values, string description)`
- `CustodyEstablished(uint256 indexed tokenId, address indexed custodian, uint256 amount)`
- `CustodyReleased(uint256 indexed tokenId, address indexed custodian, uint256 amount, address indexed redeemer)`

**AuSysFacet Events:**

- `AuSysOrderCreated(...)`
- `AuSysOrderStatusUpdated(bytes32 indexed orderId, uint8 newStatus)`
- `AuSysJourneyStatusUpdated(bytes32 indexed journeyId, uint8 newStatus)`
- `JourneyCreated(bytes32 indexed journeyId, address indexed sender, address indexed receiver)`
- `DriverAssigned(address indexed driver, bytes32 indexed journeyId)`
- `FundsEscrowed(address indexed from, uint256 amount)`
- `SellerPaid(address indexed seller, uint256 amount)`
- `NodeFeeDistributed(address indexed node, uint256 amount)`
- `EmitSig(address indexed user, bytes32 indexed id)`

**BridgeFacet Events:**

- Existing events unchanged, but `UnifiedOrder` struct expanded

**CLOBLogisticsFacet Events:**

- `DriverRegistered(address indexed driver)`
- `DriverAvailabilityUpdated(address indexed driver, bool isAvailable)`
- `DeliveryAccepted(bytes32 indexed orderId, address indexed driver)`
- `PickupConfirmed(bytes32 indexed orderId, address indexed driver)`
- `DeliveryConfirmed(bytes32 indexed orderId, address indexed driver)`
- `OrderSettled(bytes32 indexed orderId)`
- `OrderDisputed(bytes32 indexed orderId, string reason)`

### 11.2 Indexer Schema Updates

```bash
# Regenerate indexer schema from new ABIs
npm run build:full        # Compile contracts & extract ABIs
npm run generate:indexer  # Regenerate Ponder schema & handlers
```

### 11.3 New Tables Required

Following the "pure dumb indexer" pattern:

```
diamond_minted_asset_events
diamond_asset_attribute_added_events
diamond_custody_established_events
diamond_custody_released_events
diamond_ausys_order_created_events
diamond_ausys_order_status_updated_events
diamond_ausys_journey_status_updated_events
diamond_journey_created_events
diamond_driver_assigned_events
diamond_funds_escrowed_events
diamond_seller_paid_events
diamond_node_fee_distributed_events
diamond_driver_registered_events
diamond_delivery_accepted_events
diamond_pickup_confirmed_events
diamond_delivery_confirmed_events
diamond_order_settled_events
diamond_order_disputed_events
```

---

## 12. Updated Implementation Order (with TDD)

| Phase | Day | Tasks                                                   |
| ----- | --- | ------------------------------------------------------- |
| 1     | 1   | Update DiamondStorage.sol with ALL new structs/mappings |
| 2     | 1   | Write failing Forge tests for AssetsFacet               |
| 3     | 1-2 | Implement AssetsFacet to pass tests                     |
| 4     | 2   | Write failing Forge tests for AuSysFacet                |
| 5     | 2-3 | Implement AuSysFacet to pass tests                      |
| 6     | 3   | Write failing Forge tests for NodesFacet updates        |
| 7     | 3   | Update NodesFacet to pass tests                         |
| 8     | 3   | Update BridgeFacet (already partially done)             |
| 9     | 4   | Write tests and update RWYStakingFacet                  |
| 10    | 4   | Write tests and create CLOBLogisticsFacet               |
| 11    | 5   | Integration tests - full Diamond flow                   |
| 12    | 5   | Deploy new facets to testnet                            |
| 13    | 5   | Update indexer schema and regenerate handlers           |
| 14    | 6   | End-to-end testing with indexer                         |
| 15    | 6   | Production deployment preparation                       |

---

## 13. Checklist Before Production Deploy

- [ ] All Forge unit tests passing
- [ ] All Hardhat integration tests passing
- [ ] Diamond cut script tested on fork
- [ ] Indexer schema regenerated
- [ ] Indexer handlers tested with new events
- [ ] Frontend updated for new contract interfaces
- [ ] Gas optimization review completed
- [ ] Security review completed
- [ ] Deployment addresses documented
- [ ] Block explorer verification complete
