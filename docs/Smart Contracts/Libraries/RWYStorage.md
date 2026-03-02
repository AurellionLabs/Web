# RWYStorage

Storage library for the Real World Yield (RWY) staking system.

## Overview

`RWYStorage` defines the storage layouts for the RWY system using the Diamond storage pattern with a dedicated storage slot. It defines structs for:

- Opportunities (investment vehicles created by operators)
- Stakes (user positions in opportunities)
- Collateral, insurance, and custody proofs

## Storage Position

```solidity
bytes32 constant RWY_STORAGE_POSITION = keccak256("diamond.rwy.storage");
```

This ensures RWY storage is isolated from other Diamond facets.

## Enums

### OpportunityStatus

```solidity
enum OpportunityStatus {
    PENDING,      // Created but not yet open for funding
    FUNDING,      // Open for staking
    FUNDED,       // Target amount reached, ready for delivery
    IN_TRANSIT,   // Commodities being delivered to operator
    PROCESSING,   // Operator processing commodities
    SELLING,      // Processed goods being sold on CLOB
    DISTRIBUTING, // Profits being distributed to stakers
    COMPLETED,    // All profits claimed, opportunity finished
    CANCELLED     // Opportunity cancelled, stakers can reclaim
}
```

## Structs

### CollateralInfo

Information about operator collateral deposits.

```solidity
struct CollateralInfo {
    address token;      // ERC20 or ERC1155 contract address
    uint256 tokenId;    // 0 for ERC20, specific ID for ERC1155
    uint256 amount;     // Amount deposited as collateral
}
```

**Note:** Supports both ERC20 (tokenId = 0) and ERC1155 (tokenId > 0) collateral.

---

### InsuranceInfo

Insurance coverage for an opportunity.

```solidity
struct InsuranceInfo {
    bool isInsured;           // Whether the opportunity has insurance
    string documentUri;       // URI to insurance document (ipfs://... or https://...)
    uint256 coverageAmount;   // Coverage amount in wei
    uint256 expiryDate;       // Insurance expiry timestamp
}
```

**documentUri format:** IPFS (`ipfs://Qm...`) or HTTPS URL to hosted PDF

---

### CustodyProof

Proof of physical asset custody.

```solidity
struct CustodyProof {
    string documentUri;   // URI to custody proof document
    uint256 timestamp;    // When proof was submitted
    address submitter;    // Who submitted the proof
    string proofType;     // Type (e.g., "CUSTODY_CERTIFICATE", "DELIVERY_RECEIPT")
}
```

---

### TokenizationProof

Proof of asset tokenization.

```solidity
struct TokenizationProof {
    string documentUri;   // URI to tokenization document
    uint256 timestamp;    // When proof was submitted
    address submitter;    // Who submitted the proof
}
```

---

### Opportunity

An investment opportunity created by an operator.

```solidity
struct Opportunity {
    // Identity
    bytes32 id;
    address operator;
    string name;
    string description;

    // Input commodity (what stakers deposit)
    address inputToken;      // ERC1155 contract (e.g., AuraAsset)
    uint256 inputTokenId;    // Token ID of input commodity
    uint256 targetAmount;    // Total amount needed
    uint256 stakedAmount;    // Current amount staked

    // Output commodity (what operator produces)
    address outputToken;     // ERC1155 contract for output
    uint256 outputTokenId;   // Token ID of output (set after processing)
    uint256 expectedOutputAmount;  // Expected output quantity

    // Economics
    uint256 promisedYieldBps;  // Promised yield in basis points (1500 = 15%)
    uint256 operatorFeeBps;    // Operator's fee in basis points
    uint256 minSalePrice;      // Minimum acceptable sale price per unit

    // Timelines
    uint256 fundingDeadline;     // Deadline for reaching target
    uint256 processingDeadline;  // Deadline for completing processing
    uint256 createdAt;
    uint256 fundedAt;
    uint256 completedAt;

    // Status
    OpportunityStatus status;

    // Operator collateral
    CollateralInfo collateral;

    // Insurance information
    InsuranceInfo insurance;
}
```

---

### RWYStake

A user's stake in an opportunity.

```solidity
struct RWYStake {
    uint256 amount;     // Amount of input commodity staked
    uint256 stakedAt;   // Timestamp of stake
    bool claimed;       // Whether profits have been claimed
}
```

---

### RWYAppStorage

The main storage struct.

```solidity
struct RWYAppStorage {
    // Opportunities
    mapping(bytes32 => Opportunity) opportunities;
    bytes32[] opportunityIds;
    uint256 opportunityCounter;

    // Stakes
    mapping(bytes32 => mapping(address => RWYStake)) stakes;
    mapping(bytes32 => address[]) opportunityStakers;
    mapping(bytes32 => mapping(address => bool)) isStaker;

    // Sale Proceeds
    mapping(bytes32 => uint256) saleProceeds;
    mapping(bytes32 => bool) proceedsFinalized;

    // Custody Proofs
    mapping(bytes32 => CustodyProof[]) custodyProofs;

    // Tokenization Proofs
    mapping(bytes32 => TokenizationProof) tokenizationProofs;

    // Configuration
    uint256 minOperatorCollateralBps;  // 2000 = 20% minimum
    uint256 maxYieldBps;               // 5000 = 50% max
    uint256 protocolFeeBps;            // 100 = 1%
    uint256 defaultProcessingDays;     // 30 days default

    // Addresses
    address clobAddress;
    address quoteToken;
    address feeRecipient;

    // Pause State
    bool paused;

    // Reentrancy Guard
    uint256 reentrancyStatus;

    // Reserved
    uint256[40] __reserved;
}
```

## Constants

```solidity
uint256 constant NOT_ENTERED = 1;
uint256 constant ENTERED = 2;
```

## Functions

### `rwyStorage()`

Access RWY storage at the dedicated slot.

```solidity
function rwyStorage() internal pure returns (RWYAppStorage storage rs)
```

---

### `getOpportunity()`

Get an opportunity by ID.

```solidity
function getOpportunity(bytes32 opportunityId)
    internal view returns (Opportunity storage)
```

---

### `getStake()`

Get a user's stake in an opportunity.

```solidity
function getStake(bytes32 opportunityId, address staker)
    internal view returns (RWYStake storage)
```

---

### `opportunityExists()`

Check if an opportunity exists.

```solidity
function opportunityExists(bytes32 opportunityId)
    internal view returns (bool)
```

---

### `isERC20Collateral()`

Check if collateral is ERC20 (vs ERC1155).

```solidity
function isERC20Collateral(CollateralInfo storage collateral)
    internal view returns (bool)
```

**Logic:** Returns `true` if `collateral.tokenId == 0`

## Storage Layout Diagram

```
RWY Storage (slot: keccak256("diamond.rwy.storage"))
│
├── opportunities: mapping(bytes32 => Opportunity)
│   └── [opportunityId] → Opportunity struct
│
├── opportunityIds: bytes32[]
│   └── List of all opportunity IDs
│
├── stakes: mapping(bytes32 => mapping(address => RWYStake))
│   └── [opportunityId][staker] → RWYStake
│
├── opportunityStakers: mapping(bytes32 => address[])
│   └── [opportunityId] → Array of stakers
│
├── saleProceeds: mapping(bytes32 => uint256)
│   └── [opportunityId] → Total proceeds from CLOB sale
│
├── custodyProofs: mapping(bytes32 => CustodyProof[])
│   └── [opportunityId] → Array of custody proofs
│
├── tokenizationProofs: mapping(bytes32 => TokenizationProof)
│   └── [opportunityId] → Tokenization proof
│
└── Configuration
    ├── minOperatorCollateralBps
    ├── maxYieldBps
    ├── protocolFeeBps
    ├── defaultProcessingDays
    ├── clobAddress
    ├── quoteToken
    ├── feeRecipient
    ├── paused
    └── reentrancyStatus
```

## Usage

```solidity
RWYStorage.RWYAppStorage storage rs = RWYStorage.rwyStorage();

// Create opportunity
rs.opportunities[opportunityId] = Opportunity({
    id: opportunityId,
    operator: msg.sender,
    // ... other fields
    status: OpportunityStatus.FUNDING
});

// Record stake
rs.stakes[opportunityId][staker] = RWYStake({
    amount: stakeAmount,
    stakedAt: block.timestamp,
    claimed: false
});
```

## Related

- [RWYLib](./RWYLib.md) - RWY operations
- [RWYStakingFacet](../Facets/RWYStakingFacet.md) - Main staking facet
- [DiamondStorage](./DiamondStorage.md) - Main Diamond storage
