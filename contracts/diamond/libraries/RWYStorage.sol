// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RWYStorage
 * @notice Storage library for Real World Yield (RWY) staking system
 * @dev Uses Diamond storage pattern with dedicated storage slot
 *
 * The RWY system allows:
 * - Operators to create "opportunities" for commodity processing
 * - Users to stake ERC1155 commodities into opportunities
 * - Commodities to be processed (e.g., goat -> meat)
 * - Processed goods to be sold on CLOB
 * - Profits to be distributed to stakers
 */
library RWYStorage {
    bytes32 constant RWY_STORAGE_POSITION = keccak256("diamond.rwy.storage");

    // ============================================================================
    // ENUMS
    // ============================================================================

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

    // ============================================================================
    // STRUCTS
    // ============================================================================

    /**
     * @notice Collateral information for operator deposits
     * @dev Supports both ERC20 (tokenId = 0) and ERC1155 (tokenId > 0) collateral
     */
    struct CollateralInfo {
        address token;      // ERC20 or ERC1155 contract address
        uint256 tokenId;    // 0 for ERC20, specific ID for ERC1155
        uint256 amount;     // Amount deposited as collateral
    }

    /**
     * @notice Insurance information for an opportunity
     */
    struct InsuranceInfo {
        bool isInsured;           // Whether the opportunity has insurance
        bytes32 insuranceDocHash; // IPFS hash of insurance document
        uint256 coverageAmount;   // Coverage amount in wei
        uint256 expiryDate;       // Insurance expiry timestamp
    }

    /**
     * @notice Custody proof for tracking physical asset custody
     */
    struct CustodyProof {
        bytes32 proofHash;        // IPFS hash of custody certificate
        uint256 timestamp;        // When proof was submitted
        address submitter;        // Who submitted the proof
        string proofType;         // Type of proof (e.g., "CUSTODY_CERTIFICATE", "DELIVERY_RECEIPT")
    }

    /**
     * @notice An RWY opportunity created by an operator
     */
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

        // Operator collateral (token-based, not ETH)
        CollateralInfo collateral;

        // Insurance information
        InsuranceInfo insurance;
    }

    /**
     * @notice A user's stake in an opportunity
     */
    struct RWYStake {
        uint256 amount;     // Amount of input commodity staked
        uint256 stakedAt;   // Timestamp of stake
        bool claimed;       // Whether profits have been claimed
    }

    /**
     * @notice RWY-specific storage struct
     */
    struct RWYAppStorage {
        // ======= OPPORTUNITIES =======
        mapping(bytes32 => Opportunity) opportunities;
        bytes32[] opportunityIds;
        uint256 opportunityCounter;

        // ======= STAKES =======
        // opportunityId => staker => Stake
        mapping(bytes32 => mapping(address => RWYStake)) stakes;
        // Track all stakers per opportunity for iteration
        mapping(bytes32 => address[]) opportunityStakers;
        // Quick lookup for staker existence
        mapping(bytes32 => mapping(address => bool)) isStaker;

        // ======= SALE PROCEEDS =======
        mapping(bytes32 => uint256) saleProceeds;
        mapping(bytes32 => bool) proceedsFinalized;

        // ======= CUSTODY PROOFS =======
        // opportunityId => array of custody proofs
        mapping(bytes32 => CustodyProof[]) custodyProofs;

        // ======= CONFIGURATION =======
        uint256 minOperatorCollateralBps;  // 2000 = 20% minimum collateral
        uint256 maxYieldBps;               // 5000 = 50% max promised yield
        uint256 protocolFeeBps;            // 100 = 1% protocol fee
        uint256 defaultProcessingDays;     // 30 days default

        // ======= ADDRESSES (from RWYVault.sol) =======
        address clobAddress;      // CLOB contract for selling processed goods
        address quoteToken;       // Quote token (payment token, e.g., AURUM)
        address feeRecipient;     // Protocol fee recipient

        // ======= PAUSE STATE (from RWYVault.sol) =======
        bool paused;

        // ======= REENTRANCY GUARD =======
        uint256 reentrancyStatus;

        // ======= RESERVED FOR UPGRADES =======
        uint256[40] __reserved;  // Reduced from 44 to account for new fields
    }

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    uint256 constant NOT_ENTERED = 1;
    uint256 constant ENTERED = 2;

    // ============================================================================
    // STORAGE ACCESS
    // ============================================================================

    /**
     * @notice Access RWY storage at dedicated slot
     */
    function rwyStorage() internal pure returns (RWYAppStorage storage rs) {
        bytes32 position = RWY_STORAGE_POSITION;
        assembly {
            rs.slot := position
        }
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * @notice Get an opportunity by ID
     */
    function getOpportunity(bytes32 opportunityId) internal view returns (Opportunity storage) {
        return rwyStorage().opportunities[opportunityId];
    }

    /**
     * @notice Get a user's stake in an opportunity
     */
    function getStake(bytes32 opportunityId, address staker) internal view returns (RWYStake storage) {
        return rwyStorage().stakes[opportunityId][staker];
    }

    /**
     * @notice Check if an opportunity exists
     */
    function opportunityExists(bytes32 opportunityId) internal view returns (bool) {
        return rwyStorage().opportunities[opportunityId].id != bytes32(0);
    }

    /**
     * @notice Check if collateral is ERC20 (tokenId == 0) or ERC1155 (tokenId > 0)
     */
    function isERC20Collateral(CollateralInfo storage collateral) internal view returns (bool) {
        return collateral.tokenId == 0;
    }
}
