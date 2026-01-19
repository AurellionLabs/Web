// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title AuSysFacet
 * @notice Logistics and delivery management system mirroring AuSys.sol
 * @dev Handles orders, journeys, driver management, and package signatures
 */
contract AuSysFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================================
    // EVENTS (from AuSys.sol)
    // ============================================================================

    event AuSysAdminSet(address indexed admin);
    event AuSysAdminRevoked(address indexed admin);
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
        address[] nodes
    );

    // ============================================================================
    // ERRORS (from AuSys.sol)
    // ============================================================================

    error NotJourneyParticipant();
    error JourneyNotInProgress();
    error JourneyNotPending();
    error JourneyIncomplete();
    error AlreadySettled();
    error DriverNotSigned();
    error SenderNotSigned();
    error ReceiverNotSigned();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidETA();
    error QuantityExceedsRequested();
    error InvalidNode();
    error RewardAlreadyPaid();
    error DriverMaxAssignment();
    error InvalidCaller();
    error PayTokenNotSet();

    // ============================================================================
    // CONSTANTS (RBAC roles from AuSys.sol)
    // ============================================================================

    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
    bytes32 public constant DRIVER_ROLE = keccak256('DRIVER_ROLE');
    bytes32 public constant DISPATCHER_ROLE = keccak256('DISPATCHER_ROLE');

    // ============================================================================
    // MODIFIERS
    // ============================================================================

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

    modifier customerDriverCheck(bytes32 id) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];
        if (!(msg.sender == J.sender || msg.sender == J.driver || msg.sender == J.receiver)) {
            revert NotJourneyParticipant();
        }
        _;
    }

    modifier isInProgress(bytes32 id) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.ausysJourneys[id].currentStatus != 1) revert JourneyNotInProgress(); // 1 = InTransit
        _;
    }

    modifier isPending(bytes32 id) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.ausysJourneys[id].currentStatus != 0) revert JourneyNotPending(); // 0 = Pending
        _;
    }

    modifier isCompleted(bytes32 id) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.ausysJourneys[id].currentStatus != 2) revert JourneyIncomplete(); // 2 = Delivered
        _;
    }

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    /**
     * @notice Set the payment token for bounties and settlements
     */
    function setPayToken(address _payToken) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.payToken = _payToken;
    }

    /**
     * @notice Get the payment token address
     */
    function getPayToken() external view returns (address) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.payToken;
    }

    // ============================================================================
    // RBAC (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Set an admin (from AuSys.setAdmin)
     */
    function setAuSysAdmin(address admin) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.ausysRoles[ADMIN_ROLE][admin] = true;
        emit AuSysAdminSet(admin);
    }

    /**
     * @notice Revoke an admin (from AuSys.revokeAdmin)
     */
    function revokeAuSysAdmin(address admin) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.ausysRoles[ADMIN_ROLE][admin] = false;
        emit AuSysAdminRevoked(admin);
    }

    /**
     * @notice Enable/disable a driver (from AuSys.setDriver)
     */
    function setDriver(address driver, bool enable) external adminOnly {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.ausysRoles[DRIVER_ROLE][driver] = enable;
    }

    /**
     * @notice Enable/disable a dispatcher (from AuSys.setDispatcher)
     */
    function setDispatcher(address dispatcher, bool enable) external adminOnly {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.ausysRoles[DISPATCHER_ROLE][dispatcher] = enable;
    }

    /**
     * @notice Check if an address has a role (from AuSys.hasRole)
     */
    function hasAuSysRole(bytes32 role, address account) external view returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ausysRoles[role][account];
    }

    // ============================================================================
    // ORDER MANAGEMENT (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Create an order (from AuSys.orderCreation)
     */
    function createAuSysOrder(
        DiamondStorage.AuSysOrder memory order
    ) external nonReentrant returns (bytes32) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (order.buyer == address(0) || order.seller == address(0) || order.token == address(0)) {
            revert InvalidAddress();
        }
        if (order.price == 0) revert InvalidAmount();
        if (order.buyer == order.seller) revert InvalidAddress();
        if (order.tokenQuantity == 0) revert InvalidAmount();
        if (s.payToken == address(0)) revert PayTokenNotSet();

        bytes32 id = _getHashedOrderId(s);
        
        // Calculate tx fee (2% from AuSys.sol)
        uint256 txFee = (order.price * 2) / 100;

        // Store order
        DiamondStorage.AuSysOrder storage newOrder = s.ausysOrders[id];
        newOrder.id = id;
        newOrder.token = order.token;
        newOrder.tokenId = order.tokenId;
        newOrder.tokenQuantity = order.tokenQuantity;
        newOrder.price = order.price;
        newOrder.txFee = txFee;
        newOrder.buyer = order.buyer;
        newOrder.seller = order.seller;
        newOrder.locationData = order.locationData;
        newOrder.currentStatus = 0; // Created
        newOrder.contractualAgreement = order.contractualAgreement;
        
        // Copy nodes array
        for (uint256 i = 0; i < order.nodes.length; i++) {
            newOrder.nodes.push(order.nodes[i]);
        }

        s.ausysOrderIds.push(id);

        // Escrow payment from buyer
        IERC20(s.payToken).safeTransferFrom(order.buyer, address(this), order.price + txFee);
        emit FundsEscrowed(order.buyer, order.price + txFee);

        emit AuSysOrderCreated(
            id,
            order.buyer,
            order.seller,
            order.token,
            order.tokenId,
            order.tokenQuantity,
            order.price,
            txFee,
            0,
            order.nodes
        );

        return id;
    }

    /**
     * @notice Get an order by ID (from AuSys.getOrder)
     */
    function getAuSysOrder(bytes32 id) external view returns (DiamondStorage.AuSysOrder memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ausysOrders[id];
    }

    // ============================================================================
    // JOURNEY MANAGEMENT (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Create a standalone journey (from AuSys.journeyCreation)
     */
    function createJourney(
        address sender,
        address receiver,
        DiamondStorage.ParcelData memory _data,
        uint256 bounty,
        uint256 ETA
    ) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (msg.sender != receiver && !s.ausysRoles[ADMIN_ROLE][msg.sender]) {
            revert InvalidCaller();
        }
        if (sender == address(0) || receiver == address(0)) revert InvalidAddress();
        if (bounty == 0) revert InvalidAmount();
        if (ETA <= block.timestamp) revert InvalidETA();
        if (s.payToken == address(0)) revert PayTokenNotSet();

        bytes32 journeyId = _getHashedJourneyId(s);

        DiamondStorage.AuSysJourney storage journey = s.ausysJourneys[journeyId];
        journey.parcelData = _data;
        journey.journeyId = journeyId;
        journey.currentStatus = 0; // Pending
        journey.sender = sender;
        journey.receiver = receiver;
        journey.driver = address(0);
        journey.journeyStart = 0;
        journey.journeyEnd = 0;
        journey.bounty = bounty;
        journey.ETA = ETA;

        // Escrow bounty from receiver
        IERC20(s.payToken).safeTransferFrom(receiver, address(this), bounty);
        emit FundsEscrowed(receiver, bounty);
        emit JourneyCreated(journeyId, sender, receiver);
    }

    /**
     * @notice Create a journey linked to an order (from AuSys.orderJourneyCreation)
     */
    function createOrderJourney(
        bytes32 orderId,
        address sender,
        address receiver,
        DiamondStorage.ParcelData memory _data,
        uint256 bounty,
        uint256 ETA,
        uint256 tokenQuantity,
        uint256 assetId
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];

        // Validate receiver is valid node or buyer
        bool isValidNode = _isValidNode(s, receiver);
        bool isBuyer = receiver == O.buyer;
        if (!isValidNode && !isBuyer) revert InvalidNode();

        if (msg.sender != O.buyer && !s.ausysRoles[ADMIN_ROLE][msg.sender]) {
            revert InvalidCaller();
        }
        if (ETA <= block.timestamp) revert InvalidETA();
        if (tokenQuantity == 0) revert InvalidAmount();
        if (s.payToken == address(0)) revert PayTokenNotSet();

        bytes32 journeyId = _getHashedJourneyId(s);

        DiamondStorage.AuSysJourney storage journey = s.ausysJourneys[journeyId];
        journey.parcelData = _data;
        journey.journeyId = journeyId;
        journey.currentStatus = 0; // Pending
        journey.sender = sender;
        journey.receiver = receiver;
        journey.driver = address(0);
        journey.journeyStart = 0;
        journey.journeyEnd = 0;
        journey.bounty = bounty;
        journey.ETA = ETA;

        // Escrow bounty from buyer
        IERC20(s.payToken).safeTransferFrom(O.buyer, address(this), bounty);
        emit FundsEscrowed(O.buyer, bounty);

        // Link journey to order
        O.journeyIds.push(journeyId);
        s.journeyToAusysOrderId[journeyId] = orderId;

        // Update order token quantity
        O.tokenQuantity += tokenQuantity;

        emit JourneyCreated(journeyId, sender, receiver);
    }

    /**
     * @notice Get a journey by ID (from AuSys.getjourney)
     */
    function getJourney(bytes32 id) external view returns (DiamondStorage.AuSysJourney memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ausysJourneys[id];
    }

    // ============================================================================
    // DRIVER ASSIGNMENT (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Assign a driver to a journey (from AuSys.assignDriverToJourneyId)
     */
    function assignDriverToJourney(address driver, bytes32 journeyId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        // Require driver to be registered
        if (!s.ausysRoles[DRIVER_ROLE][driver]) revert InvalidCaller();

        // Only driver, dispatcher, or journey sender can assign
        bool callerAuthorized = (
            msg.sender == driver ||
            s.ausysRoles[DISPATCHER_ROLE][msg.sender] ||
            msg.sender == s.ausysJourneys[journeyId].sender
        );
        if (!callerAuthorized) revert InvalidCaller();

        // Check driver max assignments (10 from AuSys.sol)
        if (s.driverToJourneyIds[driver].length >= 10) revert DriverMaxAssignment();

        s.driverToJourneyIds[driver].push(journeyId);
        s.ausysJourneys[journeyId].driver = driver;

        emit DriverAssigned(driver, journeyId);
    }

    // ============================================================================
    // SIGNATURE SYSTEM (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Sign for package pickup/delivery (from AuSys.packageSign)
     */
    function packageSign(bytes32 id) external customerDriverCheck(id) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];

        if (msg.sender == J.sender) {
            s.customerHandOff[J.sender][id] = true;
            emit EmitSig(J.sender, id);
        } else if (msg.sender == J.receiver) {
            s.customerHandOff[J.receiver][id] = true;
            emit EmitSig(J.receiver, id);
        } else if (msg.sender == J.driver) {
            // Driver signs for current phase based on journey status
            if (J.currentStatus == 0) { // Pending
                s.driverPickupSigned[J.driver][id] = true;
            } else if (J.currentStatus == 1) { // InTransit
                s.driverDeliverySigned[J.driver][id] = true;
            }
            emit EmitSig(J.driver, id);
        }
    }

    /**
     * @notice Hand on - pickup confirmation (from AuSys.handOn)
     * @dev Requires driver and sender signatures. Transitions to InTransit.
     */
    function handOn(bytes32 id) external customerDriverCheck(id) isPending(id) nonReentrant returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];

        if (!s.driverPickupSigned[J.driver][id]) revert DriverNotSigned();
        if (!s.customerHandOff[J.sender][id]) revert SenderNotSigned();

        J.journeyStart = block.timestamp;
        // Reset sender signature after pickup
        s.customerHandOff[J.sender][id] = false;
        J.currentStatus = 1; // InTransit

        emit AuSysJourneyStatusUpdated(id, 1);

        // Update linked order status if exists
        bytes32 orderId = s.journeyToAusysOrderId[id];
        if (orderId != bytes32(0)) {
            DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
            if (O.currentStatus == 0) { // Created
                O.currentStatus = 1; // Processing
                emit AuSysOrderStatusUpdated(orderId, 1);
            }

            // Transfer tokens from seller to escrow if this is first journey
            if (J.sender == O.seller) {
                IERC1155(O.token).safeTransferFrom(
                    O.seller,
                    address(this),
                    O.tokenId,
                    O.tokenQuantity,
                    ''
                );
            }
        }

        return true;
    }

    /**
     * @notice Hand off - delivery confirmation (from AuSys.handOff)
     * @dev Requires driver delivery signature and receiver signature. 
     *      Pays driver bounty and settles order if final delivery.
     */
    function handOff(bytes32 id) external isInProgress(id) customerDriverCheck(id) nonReentrant returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];
        bytes32 orderId = s.journeyToAusysOrderId[id];

        if (orderId != bytes32(0)) {
            DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
            if (O.currentStatus == 2) revert AlreadySettled(); // Settled
        }

        if (!s.driverDeliverySigned[J.driver][id]) revert DriverNotSigned();
        if (!s.customerHandOff[J.receiver][id]) revert ReceiverNotSigned();

        J.currentStatus = 2; // Delivered
        J.journeyEnd = block.timestamp;
        emit AuSysJourneyStatusUpdated(id, 2);

        // Pay driver bounty
        _generateReward(s, id);

        // Settle order if this is final delivery to buyer
        if (orderId != bytes32(0)) {
            DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
            if (J.receiver == O.buyer) {
                _settleOrder(s, orderId, O);
            }
        }

        return true;
    }

    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================

    function _getHashedJourneyId(DiamondStorage.AppStorage storage s) internal returns (bytes32) {
        return keccak256(abi.encode(++s.ausysJourneyIdCounter));
    }

    function _getHashedOrderId(DiamondStorage.AppStorage storage s) internal returns (bytes32) {
        return keccak256(abi.encode(++s.ausysOrderIdCounter));
    }

    function _isValidNode(DiamondStorage.AppStorage storage s, address nodeOwner) internal view returns (bool) {
        bytes32[] storage ownerNodes = s.ownerNodes[nodeOwner];
        for (uint256 i = 0; i < ownerNodes.length; i++) {
            if (s.nodes[ownerNodes[i]].active && s.nodes[ownerNodes[i]].validNode) {
                return true;
            }
        }
        return false;
    }

    function _generateReward(DiamondStorage.AppStorage storage s, bytes32 id) internal {
        if (s.journeyRewardPaid[id]) revert RewardAlreadyPaid();
        s.journeyRewardPaid[id] = true;

        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];
        IERC20(s.payToken).safeTransfer(J.driver, J.bounty);
    }

    function _settleOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        DiamondStorage.AuSysOrder storage O
    ) internal {
        O.currentStatus = 2; // Settled
        emit AuSysOrderStatusUpdated(orderId, 2);

        // Transfer tokens to buyer
        IERC1155(O.token).safeTransferFrom(
            address(this),
            O.buyer,
            O.tokenId,
            O.tokenQuantity,
            ''
        );

        // Pay seller
        IERC20(s.payToken).safeTransfer(O.seller, O.price);
        emit SellerPaid(O.seller, O.price);

        // Distribute tx fees to nodes
        if (O.nodes.length > 0) {
            uint256 nodeCount = O.nodes.length;
            uint256 nodeReward = O.txFee / nodeCount;
            uint256 remainder = O.txFee - (nodeReward * nodeCount);

            for (uint256 i = 0; i < nodeCount; i++) {
                uint256 amount = nodeReward + (i == 0 ? remainder : 0);
                IERC20(s.payToken).safeTransfer(O.nodes[i], amount);
                emit NodeFeeDistributed(O.nodes[i], amount);
            }
        }

        emit AuSysOrderSettled(orderId);
    }

    // ============================================================================
    // ERC1155 RECEIVER (required for holding tokens)
    // ============================================================================

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
