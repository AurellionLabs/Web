// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IOperatorFacet
 * @notice Interface for operator management in RWY staking
 * @dev Handles operator approval, reputation, and slashing
 */
interface IOperatorFacet {
    // ============ EVENTS ============

    event OperatorApproved(address indexed operator);
    event OperatorRevoked(address indexed operator);
    event OperatorSlashed(
        bytes32 indexed opportunityId,
        address indexed operator,
        address collateralToken,
        uint256 collateralTokenId,
        uint256 amount
    );
    event OperatorReputationUpdated(
        address indexed operator,
        uint256 oldReputation,
        uint256 newReputation
    );
    event OperatorStatsUpdated(
        address indexed operator,
        uint256 successfulOps,
        uint256 totalValueProcessed
    );

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Approve an operator to create RWY opportunities
     * @param operator Address to approve
     */
    function approveOperator(address operator) external;

    /**
     * @notice Revoke operator approval
     * @param operator Address to revoke
     */
    function revokeOperator(address operator) external;

    /**
     * @notice Slash operator collateral for failing obligations
     * @param opportunityId The opportunity ID
     * @param amount Amount to slash
     */
    function slashOperator(bytes32 opportunityId, uint256 amount) external;

    /**
     * @notice Manually adjust operator reputation
     * @param operator The operator address
     * @param newReputation New reputation value
     */
    function setOperatorReputation(address operator, uint256 newReputation) external;

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if an address is an approved operator
     * @param operator The address to check
     * @return True if the address is an approved operator
     */
    function isApprovedOperator(address operator) external view returns (bool);

    /**
     * @notice Get comprehensive operator statistics
     * @param operator The operator address
     * @return approved Whether the operator is approved
     * @return reputation Operator's reputation score
     * @return successfulOps Number of successfully completed opportunities
     * @return totalValueProcessed Total value processed across all opportunities
     */
    function getOperatorStats(address operator)
        external
        view
        returns (
            bool approved,
            uint256 reputation,
            uint256 successfulOps,
            uint256 totalValueProcessed
        );

    /**
     * @notice Get operator reputation
     * @param operator The operator address
     * @return Reputation score
     */
    function getOperatorReputation(address operator) external view returns (uint256);

    /**
     * @notice Get number of successful operations by operator
     * @param operator The operator address
     * @return Number of successful operations
     */
    function getOperatorSuccessfulOps(address operator) external view returns (uint256);

    /**
     * @notice Get total value processed by operator
     * @param operator The operator address
     * @return Total value processed
     */
    function getOperatorTotalValueProcessed(address operator) external view returns (uint256);
}
