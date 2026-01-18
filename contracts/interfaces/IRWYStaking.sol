// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RWYStorage} from "../diamond/libraries/RWYStorage.sol";

/**
 * @title IRWYStaking
 * @notice Interface for the Real World Yield Staking facet
 * @dev Diamond facet for commodity staking with token-based collateral
 *
 * Key changes from IRWYVault:
 * - Collateral is now token-based (ERC20 or ERC1155) instead of ETH
 * - Operator management moved to separate IOperatorFacet
 * - Part of Diamond proxy pattern
 */
interface IRWYStaking {
    // ============ EVENTS ============

    event OpportunityCreated(
        bytes32 indexed id,
        address indexed operator,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        uint256 promisedYieldBps
    );

    event OpportunityFunded(bytes32 indexed id, uint256 totalStaked);

    event OpportunityCancelled(bytes32 indexed id, string reason);

    event CommodityStaked(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 amount,
        uint256 totalStaked
    );

    event CommodityUnstaked(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 amount
    );

    event DeliveryStarted(bytes32 indexed opportunityId, bytes32 journeyId);

    event DeliveryConfirmed(bytes32 indexed opportunityId, uint256 deliveredAmount);

    event ProcessingStarted(bytes32 indexed opportunityId);

    event ProcessingCompleted(
        bytes32 indexed opportunityId,
        uint256 outputAmount,
        uint256 outputTokenId
    );

    event SaleProceedsRecorded(bytes32 indexed opportunityId, uint256 proceeds);

    event ProfitDistributed(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 stakedAmount,
        uint256 profitShare
    );

    event OpportunityCompleted(bytes32 indexed opportunityId, uint256 totalProceeds);

    event CollateralReturned(
        bytes32 indexed opportunityId,
        address indexed operator,
        uint256 amount
    );

    event ConfigUpdated(string indexed param, uint256 oldValue, uint256 newValue);

    // ============ OPERATOR FUNCTIONS ============

    /**
     * @notice Create a new RWY opportunity with token-based collateral
     * @param name Name of the opportunity
     * @param description Description of the processing operation
     * @param inputToken AuraAsset contract address for input commodity
     * @param inputTokenId Token ID of input commodity
     * @param targetAmount Total amount of input commodity needed
     * @param outputToken AuraAsset contract for output
     * @param expectedOutputAmount Expected amount of processed output
     * @param promisedYieldBps Promised yield in basis points (1500 = 15%)
     * @param operatorFeeBps Operator's fee in basis points
     * @param minSalePrice Minimum acceptable sale price per unit
     * @param fundingDays Days until funding deadline
     * @param processingDays Days for processing after funding
     * @param collateralToken Collateral token address (ERC20 or ERC1155)
     * @param collateralTokenId Token ID for ERC1155 collateral (0 for ERC20)
     * @param collateralAmount Amount of collateral
     */
    function createOpportunity(
        string memory name,
        string memory description,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        address outputToken,
        uint256 expectedOutputAmount,
        uint256 promisedYieldBps,
        uint256 operatorFeeBps,
        uint256 minSalePrice,
        uint256 fundingDays,
        uint256 processingDays,
        address collateralToken,
        uint256 collateralTokenId,
        uint256 collateralAmount
    ) external returns (bytes32);

    /**
     * @notice Start delivery process - transitions to IN_TRANSIT
     * @param opportunityId The opportunity ID
     * @param journeyId The journey ID from the node network
     */
    function startDelivery(bytes32 opportunityId, bytes32 journeyId) external;

    /**
     * @notice Confirm delivery of commodities to operator facility
     * @param opportunityId The opportunity ID
     * @param deliveredAmount Amount actually delivered
     */
    function confirmDelivery(bytes32 opportunityId, uint256 deliveredAmount) external;

    /**
     * @notice Report processing completion
     * @param opportunityId The opportunity ID
     * @param outputTokenId Token ID of the processed commodity
     * @param actualOutputAmount Actual amount of processed output
     */
    function completeProcessing(
        bytes32 opportunityId,
        uint256 outputTokenId,
        uint256 actualOutputAmount
    ) external;

    /**
     * @notice Cancel an opportunity (only during FUNDING phase)
     * @param opportunityId The opportunity ID
     * @param reason Reason for cancellation
     */
    function cancelOpportunity(bytes32 opportunityId, string memory reason) external;

    // ============ STAKER FUNCTIONS ============

    /**
     * @notice Stake commodities into an RWY opportunity
     * @param opportunityId The opportunity to stake into
     * @param amount Amount of commodity tokens to stake
     */
    function stake(bytes32 opportunityId, uint256 amount) external;

    /**
     * @notice Unstake commodities before funding is complete or after cancellation
     * @param opportunityId The opportunity to unstake from
     * @param amount Amount to unstake
     */
    function unstake(bytes32 opportunityId, uint256 amount) external;

    /**
     * @notice Claim profits after opportunity completion
     * @param opportunityId The opportunity to claim from
     */
    function claimProfits(bytes32 opportunityId) external;

    /**
     * @notice Emergency claim for cancelled opportunities (returns original tokens)
     * @param opportunityId The opportunity ID
     */
    function emergencyClaim(bytes32 opportunityId) external;

    // ============ INTERNAL CLOB INTEGRATION ============

    /**
     * @notice Record sale proceeds from CLOB (called internally by CLOBFacet)
     * @param opportunityId The opportunity ID
     * @param proceeds Total proceeds from the sale
     */
    function recordSaleProceeds(bytes32 opportunityId, uint256 proceeds) external;

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Initialize RWY staking configuration
     */
    function initializeRWYStaking() external;

    /**
     * @notice Set minimum operator collateral requirement
     * @param bps Basis points (2000 = 20%)
     */
    function setMinCollateralBps(uint256 bps) external;

    /**
     * @notice Set maximum allowed yield
     * @param bps Basis points (5000 = 50%)
     */
    function setMaxYieldBps(uint256 bps) external;

    /**
     * @notice Set protocol fee
     * @param bps Basis points (100 = 1%)
     */
    function setProtocolFeeBps(uint256 bps) external;

    /**
     * @notice Set default processing days
     * @param days_ Number of days
     */
    function setDefaultProcessingDays(uint256 days_) external;

    /**
     * @notice Force cancel an opportunity (emergency use)
     * @param opportunityId The opportunity ID
     * @param reason Reason for cancellation
     */
    function forceCancel(bytes32 opportunityId, string memory reason) external;

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get opportunity details
     * @param opportunityId The opportunity ID
     */
    function getOpportunity(bytes32 opportunityId) external view returns (RWYStorage.Opportunity memory);

    /**
     * @notice Get stake details for a user
     * @param opportunityId The opportunity ID
     * @param staker The staker address
     */
    function getRWYStake(bytes32 opportunityId, address staker) external view returns (RWYStorage.RWYStake memory);

    /**
     * @notice Get all stakers for an opportunity
     * @param opportunityId The opportunity ID
     */
    function getOpportunityStakers(bytes32 opportunityId) external view returns (address[] memory);

    /**
     * @notice Get total number of opportunities
     */
    function getOpportunityCount() external view returns (uint256);

    /**
     * @notice Get all opportunity IDs
     */
    function getAllOpportunities() external view returns (bytes32[] memory);

    /**
     * @notice Get sale proceeds for an opportunity
     * @param opportunityId The opportunity ID
     */
    function getSaleProceeds(bytes32 opportunityId) external view returns (uint256 proceeds, bool finalized);

    /**
     * @notice Get RWY configuration
     */
    function getRWYConfig()
        external
        view
        returns (
            uint256 minOperatorCollateralBps,
            uint256 maxYieldBps,
            uint256 protocolFeeBps,
            uint256 defaultProcessingDays
        );

    /**
     * @notice Calculate expected profit for a stake amount
     * @param opportunityId The opportunity ID
     * @param stakeAmount Amount to stake
     */
    function calculateExpectedProfit(
        bytes32 opportunityId,
        uint256 stakeAmount
    ) external view returns (uint256 expectedProfit, uint256 userShareBps);
}
