// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface INodeVault {
    struct RedemptionRequest {
        address owner;
        address receiver;
        uint256 shares;
        uint256 assetsOwed;
        uint8 status;
    }

    function grossManagedAssets() external view returns (uint256);

    function requestRedeem(
        uint256 shares,
        address receiver
    ) external returns (uint256 requestId, uint256 assetsOwed);

    function processRedemptionQueue(uint256 maxRequests) external;

    function claimQueuedRedemption(
        uint256 requestId,
        address receiver
    ) external returns (uint256 assetsClaimed);

    function getRedemptionRequest(
        uint256 requestId
    ) external view returns (RedemptionRequest memory);

    function getNextPendingRedemptionRequest() external view returns (uint256);
}
