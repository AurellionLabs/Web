// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC4626} from '@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {Math} from '@openzeppelin/contracts/utils/math/Math.sol';

import {INodeVault} from '../../interfaces/INodeVault.sol';

interface INodeVaultDataSource {
    struct AssetWithBalance {
        address token;
        uint256 tokenId;
        uint256 price;
        uint256 capacity;
        uint256 balance;
        uint256 createdAt;
        bool active;
    }

    function getNodeInventoryWithMetadata(
        bytes32 nodeHash
    ) external view returns (AssetWithBalance[] memory assets);
}

contract NodeVault is ERC4626, ReentrancyGuard, INodeVault {
    using Math for uint256;
    using SafeERC20 for IERC20;

    uint8 internal constant REQUEST_STATUS_NONE = 0;
    uint8 internal constant REQUEST_STATUS_PENDING = 1;
    uint8 internal constant REQUEST_STATUS_CLAIMABLE = 2;
    uint8 internal constant REQUEST_STATUS_CLAIMED = 3;

    address public immutable diamond;
    bytes32 public immutable nodeHash;

    uint256 public nextRedemptionRequestId = 1;
    uint256 public pendingRedemptionHead = 1;
    uint256 public totalQueuedShares;
    uint256 public totalQueuedAssets;
    uint256 public totalClaimableAssets;

    mapping(uint256 => RedemptionRequest) private _redemptionRequests;

    error InvalidReceiver();
    error InvalidShares();
    error InvalidRequest();
    error NotRequestOwner();
    error RequestNotClaimable();

    event RedemptionRequested(
        uint256 indexed requestId,
        address indexed owner,
        address indexed receiver,
        uint256 sharesLocked,
        uint256 assetsOwed
    );
    event RedemptionQueuedClaimable(
        uint256 indexed requestId,
        uint256 assetsReserved
    );
    event RedemptionClaimed(
        uint256 indexed requestId,
        address indexed receiver,
        uint256 assetsPaid
    );

    constructor(
        address diamond_,
        bytes32 nodeHash_,
        IERC20 asset_,
        address initialShareOwner_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC4626(asset_) {
        diamond = diamond_;
        nodeHash = nodeHash_;

        uint256 initialInventoryValue = _nodeInventoryValue();
        if (initialInventoryValue > 0) {
            _mint(initialShareOwner_, initialInventoryValue);
        }
    }

    function grossManagedAssets() public view returns (uint256) {
        return _liquidAssets() + _nodeInventoryValue();
    }

    function totalAssets() public view override returns (uint256) {
        uint256 grossAssets = grossManagedAssets();
        if (grossAssets <= totalQueuedAssets) {
            return 0;
        }

        return grossAssets - totalQueuedAssets;
    }

    function liquidAssets() public view returns (uint256) {
        return _liquidAssets();
    }

    function availableLiquidAssets() public view returns (uint256) {
        uint256 liquidAssets_ = _liquidAssets();
        if (liquidAssets_ <= totalQueuedAssets) {
            return 0;
        }

        return liquidAssets_ - totalQueuedAssets;
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return Math.min(
            _convertToAssets(balanceOf(owner), Math.Rounding.Floor),
            availableLiquidAssets()
        );
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        uint256 liquidAssets_ = availableLiquidAssets();
        if (liquidAssets_ == 0) {
            return 0;
        }

        return Math.min(
            balanceOf(owner),
            _convertToShares(liquidAssets_, Math.Rounding.Floor)
        );
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public override nonReentrant returns (uint256) {
        return super.deposit(assets, receiver);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override nonReentrant returns (uint256) {
        return super.mint(shares, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256) {
        return super.withdraw(assets, receiver, owner);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256) {
        return super.redeem(shares, receiver, owner);
    }

    function requestRedeem(
        uint256 shares,
        address receiver
    ) external nonReentrant returns (uint256 requestId, uint256 assetsOwed) {
        if (receiver == address(0)) revert InvalidReceiver();
        if (shares == 0) revert InvalidShares();

        assetsOwed = _convertToAssets(shares, Math.Rounding.Floor);

        _transfer(msg.sender, address(this), shares);

        totalQueuedShares += shares;
        totalQueuedAssets += assetsOwed;

        requestId = nextRedemptionRequestId++;
        _redemptionRequests[requestId] = RedemptionRequest({
            owner: msg.sender,
            receiver: receiver,
            shares: shares,
            assetsOwed: assetsOwed,
            status: REQUEST_STATUS_PENDING
        });

        emit RedemptionRequested(
            requestId,
            msg.sender,
            receiver,
            shares,
            assetsOwed
        );
    }

    function processRedemptionQueue(uint256 maxRequests) external nonReentrant {
        uint256 requestId = pendingRedemptionHead;
        uint256 remaining = maxRequests;

        while (remaining > 0 && requestId < nextRedemptionRequestId) {
            RedemptionRequest storage request = _redemptionRequests[requestId];

            if (request.status != REQUEST_STATUS_PENDING) {
                requestId++;
                continue;
            }

            if (
                _liquidAssets() < totalClaimableAssets + request.assetsOwed
            ) {
                break;
            }

            request.status = REQUEST_STATUS_CLAIMABLE;
            totalClaimableAssets += request.assetsOwed;

            emit RedemptionQueuedClaimable(requestId, request.assetsOwed);

            requestId++;
            remaining--;
        }

        pendingRedemptionHead = requestId;
    }

    function claimQueuedRedemption(
        uint256 requestId,
        address receiver
    ) external nonReentrant returns (uint256 assetsClaimed) {
        RedemptionRequest storage request = _redemptionRequests[requestId];
        if (request.owner == address(0)) revert InvalidRequest();
        if (request.status != REQUEST_STATUS_CLAIMABLE) {
            revert RequestNotClaimable();
        }
        if (msg.sender != request.owner) revert NotRequestOwner();

        address payoutReceiver = receiver == address(0)
            ? request.receiver
            : receiver;
        if (payoutReceiver == address(0)) revert InvalidReceiver();

        assetsClaimed = request.assetsOwed;

        request.status = REQUEST_STATUS_CLAIMED;
        totalQueuedShares -= request.shares;
        totalQueuedAssets -= assetsClaimed;
        totalClaimableAssets -= assetsClaimed;

        _burn(address(this), request.shares);
        IERC20(asset()).safeTransfer(payoutReceiver, assetsClaimed);

        emit Withdraw(
            msg.sender,
            payoutReceiver,
            request.owner,
            assetsClaimed,
            request.shares
        );
        emit RedemptionClaimed(requestId, payoutReceiver, assetsClaimed);
    }

    function getRedemptionRequest(
        uint256 requestId
    ) external view returns (RedemptionRequest memory) {
        return _redemptionRequests[requestId];
    }

    function getNextPendingRedemptionRequest()
        external
        view
        returns (uint256)
    {
        uint256 requestId = pendingRedemptionHead;

        while (requestId < nextRedemptionRequestId) {
            if (
                _redemptionRequests[requestId].status == REQUEST_STATUS_PENDING
            ) {
                return requestId;
            }
            requestId++;
        }

        return 0;
    }

    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view override returns (uint256) {
        return assets.mulDiv(
            _activeSupply() + 10 ** _decimalsOffset(),
            totalAssets() + 1,
            rounding
        );
    }

    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view override returns (uint256) {
        return shares.mulDiv(
            totalAssets() + 1,
            _activeSupply() + 10 ** _decimalsOffset(),
            rounding
        );
    }

    function _activeSupply() internal view returns (uint256) {
        return totalSupply() - totalQueuedShares;
    }

    function _liquidAssets() internal view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function _nodeInventoryValue() internal view returns (uint256 totalValue) {
        INodeVaultDataSource.AssetWithBalance[] memory assets =
            INodeVaultDataSource(diamond).getNodeInventoryWithMetadata(nodeHash);

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].active && assets[i].balance > 0) {
                totalValue += assets[i].price * assets[i].balance;
            }
        }
    }
}
