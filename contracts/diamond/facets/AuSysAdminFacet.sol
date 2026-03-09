// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract AuSysAdminFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    event TreasuryFeeClaimed(address indexed to, uint256 amount);
    event TreasuryFeeBpsUpdated(uint16 oldBps, uint16 newBps);
    event NodeFeeBpsUpdated(uint16 oldBps, uint16 newBps);
    event AuSysAdminSet(address indexed admin);
    event AuSysAdminRevoked(address indexed admin);
    event TokenDestinationSelected(bytes32 indexed orderId, address destination, bytes32 nodeId, bool burned);
    event AuSysOrderStatusUpdated(bytes32 indexed orderId, uint8 newStatus);
    event OrderQuantityCorrected(bytes32 indexed orderId, uint256 oldQuantity, uint256 newQuantity);

    error RecoveryTooEarly();
    error FeeBpsTooHigh();
    error NothingToClaim();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidCaller();
    error NoPendingDestination();
    error OfferNotFound();

    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
    bytes32 public constant DRIVER_ROLE = keccak256('DRIVER_ROLE');
    bytes32 public constant DISPATCHER_ROLE = keccak256('DISPATCHER_ROLE');

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier adminOnly() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (!s.ausysRoles[ADMIN_ROLE][msg.sender] && msg.sender != LibDiamond.contractOwner()) {
            revert InvalidCaller();
        }
        _;
    }

    function setPayToken(address _payToken) external onlyOwner {
        DiamondStorage.appStorage().payToken = _payToken;
    }

    function initAuSysFees() external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.treasuryFeeBps == 0 && s.nodeFeeBps == 0) {
            s.treasuryFeeBps = 10;
            s.nodeFeeBps = 10;
            emit TreasuryFeeBpsUpdated(0, 10);
            emit NodeFeeBpsUpdated(0, 10);
        }
    }

    function setTreasuryFeeBps(uint16 bps) external onlyOwner {
        if (bps > 500) revert FeeBpsTooHigh();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        emit TreasuryFeeBpsUpdated(s.treasuryFeeBps, bps);
        s.treasuryFeeBps = bps;
    }

    function setNodeFeeBps(uint16 bps) external onlyOwner {
        if (bps > 500) revert FeeBpsTooHigh();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        emit NodeFeeBpsUpdated(s.nodeFeeBps, bps);
        s.nodeFeeBps = bps;
    }

    function claimTreasuryFees(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 amount = s.treasuryAccrued;
        if (amount == 0) revert NothingToClaim();
        s.treasuryAccrued = 0;
        IERC20(s.payToken).safeTransfer(to, amount);
        emit TreasuryFeeClaimed(to, amount);
    }

    function getTreasuryAccrued() external view returns (uint256) {
        return DiamondStorage.appStorage().treasuryAccrued;
    }

    function setAuSysAdmin(address admin) external onlyOwner {
        DiamondStorage.appStorage().ausysRoles[ADMIN_ROLE][admin] = true;
        emit AuSysAdminSet(admin);
    }

    function revokeAuSysAdmin(address admin) external onlyOwner {
        DiamondStorage.appStorage().ausysRoles[ADMIN_ROLE][admin] = false;
        emit AuSysAdminRevoked(admin);
    }

    function setDriver(address driver, bool enable) external adminOnly {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bool wasEnabled = s.ausysRoles[DRIVER_ROLE][driver];
        if (wasEnabled == enable) {
            return;
        }

        s.ausysRoles[DRIVER_ROLE][driver] = enable;

        if (enable) {
            s.driverRoleMembers.push(driver);
            s.driverRoleIndex[driver] = s.driverRoleMembers.length;
            return;
        }

        uint256 indexPlusOne = s.driverRoleIndex[driver];
        if (indexPlusOne == 0) {
            return;
        }

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = s.driverRoleMembers.length - 1;

        if (index != lastIndex) {
            address movedDriver = s.driverRoleMembers[lastIndex];
            s.driverRoleMembers[index] = movedDriver;
            s.driverRoleIndex[movedDriver] = index + 1;
        }

        s.driverRoleMembers.pop();
        delete s.driverRoleIndex[driver];
    }

    function setDispatcher(address dispatcher, bool enable) external adminOnly {
        DiamondStorage.appStorage().ausysRoles[DISPATCHER_ROLE][dispatcher] = enable;
    }

    function setTrustedP2PSigner(address signer) external adminOnly {
        if (signer == address(0)) revert InvalidAddress();
        DiamondStorage.appStorage().trustedP2PSigner = signer;
    }

    function adminRecoverEscrow(bytes32 orderId, address to) external adminOnly nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];

        if (!s.pendingTokenDestination[orderId]) revert NoPendingDestination();
        if (block.timestamp <= s.ausysOrderSettledAt[orderId] + 30 days) revert RecoveryTooEarly();

        s.pendingTokenDestination[orderId] = false;
        delete s.pendingTokenBuyer[orderId];

        IERC1155(O.token).safeTransferFrom(address(this), to, O.tokenId, O.tokenQuantity, '');
        emit TokenDestinationSelected(orderId, to, bytes32(0), false);
    }

    function correctOrderTokenQuantity(bytes32 orderId, uint256 correctQuantity) external adminOnly {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
        if (O.id == bytes32(0)) revert OfferNotFound();
        if (correctQuantity == 0) revert InvalidAmount();

        uint256 oldQuantity = O.tokenQuantity;
        O.tokenQuantity = correctQuantity;

        emit AuSysOrderStatusUpdated(orderId, O.currentStatus);
        emit OrderQuantityCorrected(orderId, oldQuantity, correctQuantity);
    }
}
