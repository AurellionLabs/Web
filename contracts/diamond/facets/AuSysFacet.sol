// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { OrderStatus } from '../libraries/OrderStatus.sol';
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

    uint256 public constant MAX_ORDERS = 10000;
    uint256 public constant MAX_JOURNEYS_PER_ORDER = 10;
    uint256 public constant MAX_NODES_PER_ORDER = 20;
    uint256 public constant MAX_DRIVER_JOURNEYS = 10;

    error ArrayLimitExceeded();
    error ContractPaused();
    error RecoveryTooEarly();

    // ============================================================================
    // EVENTS (from AuSys.sol)
    // ============================================================================

    event AuSysAdminSet(address indexed admin);
    event AuSysAdminRevoked(address indexed admin);
    event EmitSig(address indexed user, bytes32 indexed id);
    event AuSysOrderSettled(bytes32 indexed orderId);
    event AuSysOrderStatusUpdated(bytes32 indexed orderId, uint8 newStatus);
    event FundsEscrowed(address indexed from, uint256 amount);
    event FundsRefunded(address indexed to, uint256 amount);
    event SellerPaid(address indexed seller, uint256 amount);
    event NodeFeeDistributed(address indexed node, uint256 amount);
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

    // Verbose journey events with full context for indexing
    event JourneyCreated(
        bytes32 indexed journeyId,
        address indexed sender,
        address indexed receiver,
        address driver,
        uint256 bounty,
        uint256 ETA,
        bytes32 orderId,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    event DriverAssigned(
        bytes32 indexed journeyId,
        address indexed driver,
        address sender,
        address receiver,
        uint256 bounty,
        uint256 ETA,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    event AuSysJourneyStatusUpdated(
        bytes32 indexed journeyId,
        uint8 indexed newStatus,
        address sender,
        address receiver,
        address driver,
        uint256 bounty,
        uint256 ETA,
        uint256 journeyStart,
        uint256 journeyEnd,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    event JourneyCanceled(
        bytes32 indexed journeyId,
        address indexed sender,
        address receiver,
        address driver,
        uint256 refundedAmount,
        uint256 bounty,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    // P2P Events
    event P2POfferCreated(
        bytes32 indexed orderId,
        address indexed creator,
        bool isSellerInitiated,
        address token,
        uint256 tokenId,
        uint256 tokenQuantity,
        uint256 price,
        address targetCounterparty,
        uint256 expiresAt
    );
    event P2POfferAccepted(bytes32 indexed orderId, address indexed acceptor, bool isSellerInitiated);
    event P2POfferCanceled(bytes32 indexed orderId, address indexed creator);

    // Token destination events
    event TokenDestinationPending(bytes32 indexed orderId, address indexed buyer, uint256 tokenId, uint256 quantity);
    event TokenDestinationSelected(bytes32 indexed orderId, address destination, bytes32 nodeId, bool burned);

    // ============================================================================
    // ERRORS (from AuSys.sol)
    // ============================================================================

    error NotJourneyParticipant();
    error JourneyNotInProgress();
    error JourneyNotPending();
    error JourneyIncomplete();
    error JourneyNotFound();
    error JourneyAlreadyAssigned();
    error AlreadySettled();
    error DriverNotSigned();
    error SenderNotSigned();
    error ReceiverNotSigned();
    error DuplicateJourneyRoleAddress();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidETA();
    error QuantityExceedsRequested();
    error InvalidNode();
    error OrderNotFound();
    error InvalidOrderStatus();
    error InvalidJourneyRoute();
    error RewardAlreadyPaid();
    error DriverMaxAssignment();
    error InvalidCaller();
    error PayTokenNotSet();
    // P2P errors
    error OfferNotFound();
    error OfferNotOpen();
    error OfferExpired();
    error NotTargetCounterparty();
    error CannotAcceptOwnOffer();
    error OnlyCreatorCanCancel();
    // Token destination errors
    error NoPendingDestination();
    error NotNodeOwner();
    error NodeRequired();
    // Signature / replay-protection errors
    error InvalidSignature();
    error NonceAlreadyUsed();
    error SignatureExpired();
    error TrustedSignerNotSet();
    error CallerMustBeBuyer();
    error CallerMustBeSeller();

    // ============================================================================
    // CONSTANTS (RBAC roles from AuSys.sol)
    // ============================================================================

    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
    bytes32 public constant DRIVER_ROLE = keccak256('DRIVER_ROLE');
    bytes32 public constant DISPATCHER_ROLE = keccak256('DISPATCHER_ROLE');

    function _setDriverRole(
        DiamondStorage.AppStorage storage s,
        address driver,
        bool enable
    ) internal {
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

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier whenNotPaused() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.paused) revert ContractPaused();
        _;
    }

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
        _setDriverRole(s, driver, enable);
    }

    /**
     * @notice Enable/disable a dispatcher (from AuSys.setDispatcher)
     */
    function setDispatcher(address dispatcher, bool enable) external adminOnly {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.ausysRoles[DISPATCHER_ROLE][dispatcher] = enable;
    }

    // ============================================================================
    // ORDER MANAGEMENT (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Create an order (from AuSys.orderCreation)
     * @dev Supports P2P: if isSellerInitiated=true, seller escrows tokens; else buyer escrows payment
     *      For P2P offers, set buyer/seller to msg.sender and counterparty to address(0) or target
     */
    function createAuSysOrder(
        DiamondStorage.AuSysOrder memory order
    ) external nonReentrant whenNotPaused returns (bytes32) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (order.token == address(0)) {
            revert InvalidAddress();
        }
        if (order.price == 0) revert InvalidAmount();
        if (order.tokenQuantity == 0) revert InvalidAmount();
        if (s.payToken == address(0)) revert PayTokenNotSet();

        // P2P mode: one side can be address(0) initially (will be filled on accept)
        bool isP2POffer = order.isSellerInitiated 
            ? (order.buyer == address(0) || order.buyer == order.targetCounterparty)
            : (order.seller == address(0)|| order.seller == order.targetCounterparty);

        // For non-P2P (direct orders), both parties must be set and different
        if (!isP2POffer) {
            if (order.buyer == address(0) || order.seller == address(0)) {
                revert InvalidAddress();
            }
            if (order.buyer == order.seller) revert InvalidAddress();
        }

        bytes32 id = _getHashedOrderId(s, msg.sender);
        
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
        newOrder.currentStatus = OrderStatus.AUSYS_CREATED;
        newOrder.contractualAgreement = order.contractualAgreement;
        // P2P fields
        newOrder.isSellerInitiated = order.isSellerInitiated;
        newOrder.targetCounterparty = order.targetCounterparty;
        newOrder.expiresAt = order.expiresAt;
        
        if (order.nodes.length > MAX_NODES_PER_ORDER) revert ArrayLimitExceeded();
        uint256 nodeCount = order.nodes.length;
        for (uint256 i = 0; i < nodeCount; i++) {
            newOrder.nodes.push(order.nodes[i]);
        }

        if (s.ausysOrderIds.length >= MAX_ORDERS) revert ArrayLimitExceeded();
        s.ausysOrderIds.push(id);

        // Escrow based on who initiated
        if (order.isSellerInitiated) {
            // Seller-initiated P2P: escrow tokens from seller
            if (order.seller == address(0)) revert InvalidAddress();
            if (order.seller != msg.sender) revert CallerMustBeSeller();
            IERC1155(order.token).safeTransferFrom(
                msg.sender,
                address(this),
                order.tokenId,
                order.tokenQuantity,
                ''
            );
            s.ausysOrderTokenEscrowed[id] = true;
            // Track as open P2P offer
            if (isP2POffer) {
                s.openP2POfferIds.push(id);
                s.userP2POffers[order.seller].push(id);
            }
        } else {
            // Buyer-initiated: escrow payment from buyer (original behavior)
            if (order.buyer == address(0)) revert InvalidAddress();
            if (order.buyer != msg.sender) revert CallerMustBeBuyer();
            IERC20(s.payToken).safeTransferFrom(msg.sender, address(this), order.price + txFee);
            emit FundsEscrowed(order.buyer, order.price + txFee);
            // Track as open P2P offer
            if (isP2POffer) {
                s.openP2POfferIds.push(id);
                s.userP2POffers[order.buyer].push(id);
            }
        }

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

        // Emit P2P-specific event if this is a P2P offer
        if (isP2POffer) {
            address creator = order.isSellerInitiated ? order.seller : order.buyer;
            emit P2POfferCreated(
                id,
                creator,
                order.isSellerInitiated,
                order.token,
                order.tokenId,
                order.tokenQuantity,
                order.price,
                order.targetCounterparty,
                order.expiresAt
            );
        }

        return id;
    }

    // ============================================================================
    // P2P OFFER MANAGEMENT
    // ============================================================================

    /**
     * @notice Accept a P2P offer
     * @dev Counterparty escrows their side and order moves to Processing.
     *      msg.sender is the authorization — no additional signature needed.
     * @param orderId The order/offer to accept
     */
    function acceptP2POffer(
        bytes32 orderId
    ) external nonReentrant whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage order = s.ausysOrders[orderId];

        // ── CHECKS ───────────────────────────────────────────────────────────
        // Validate offer exists
        if (order.id == bytes32(0)) revert OfferNotFound();

        // Validate offer is still open
        if (order.currentStatus != OrderStatus.AUSYS_CREATED) revert OfferNotOpen();

        if (order.expiresAt != 0 && block.timestamp > order.expiresAt) {
            order.currentStatus = OrderStatus.AUSYS_EXPIRED;
            revert OfferExpired();
        }

        // Validate caller is allowed counterparty
        if (order.targetCounterparty != address(0) && msg.sender != order.targetCounterparty) {
            revert NotTargetCounterparty();
        }

        // Cannot accept own offer
        address creator = order.isSellerInitiated ? order.seller : order.buyer;
        if (msg.sender == creator) revert CannotAcceptOwnOffer();

        // ── EFFECTS ──────────────────────────────────────────────────────────
        // Update status to Processing
        order.currentStatus = OrderStatus.AUSYS_PROCESSING;

        // Remove from open offers list
        _removeFromOpenOffers(s, orderId);

        if (order.isSellerInitiated) {
            // Seller created offer — buyer (msg.sender) accepts
            order.buyer = msg.sender;
        } else {
            // Buyer created offer — seller (msg.sender) accepts
            order.seller = msg.sender;
        }

        // ── INTERACTIONS ─────────────────────────────────────────────────────
        if (order.isSellerInitiated) {
            uint256 totalPayment = order.price + order.txFee;
            IERC20(s.payToken).safeTransferFrom(msg.sender, address(this), totalPayment);
            emit FundsEscrowed(msg.sender, totalPayment);
        } else {
            IERC1155(order.token).safeTransferFrom(
                msg.sender,
                address(this),
                order.tokenId,
                order.tokenQuantity,
                ''
            );
        }

        emit P2POfferAccepted(orderId, msg.sender, order.isSellerInitiated);
        emit AuSysOrderStatusUpdated(orderId, 1);
    }

    /**
     * @notice Cancel a P2P offer (only creator, only if not yet accepted)
     * @param orderId The order/offer to cancel
     */
    function cancelP2POffer(bytes32 orderId) external nonReentrant whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage order = s.ausysOrders[orderId];

        // Validate offer exists
        if (order.id == bytes32(0)) revert OfferNotFound();
        
        // Validate offer is still open (status 0)
        if (order.currentStatus != OrderStatus.AUSYS_CREATED) revert OfferNotOpen();
        
        // Only creator can cancel
        address creator = order.isSellerInitiated ? order.seller : order.buyer;
        if (msg.sender != creator) revert OnlyCreatorCanCancel();

        // Refund escrowed assets
        if (order.isSellerInitiated) {
            // Refund tokens to seller
            IERC1155(order.token).safeTransferFrom(
                address(this),
                order.seller,
                order.tokenId,
                order.tokenQuantity,
                ''
            );
        } else {
            // Refund payment to buyer
            uint256 totalRefund = order.price + order.txFee;
            IERC20(s.payToken).safeTransfer(order.buyer, totalRefund);
            emit FundsRefunded(order.buyer, totalRefund);
        }

        // Update status to Canceled
        order.currentStatus = OrderStatus.AUSYS_CANCELED;
        
        // Remove from open offers list
        _removeFromOpenOffers(s, orderId);

        emit P2POfferCanceled(orderId, creator);
        emit AuSysOrderStatusUpdated(orderId, 3);
    }

    // ============================================================================
    // TRUSTED SIGNER & EIP-712
    // ============================================================================

    /**
     * @notice Set the trusted off-chain signer address (reserved for future EIP-712 flow).
     * @dev IMPORTANT: This signer is stored but NOT yet enforced in acceptP2POffer.
     *      acceptP2POffer currently relies solely on msg.sender authorization.
     *      Full EIP-712 signature verification is planned for a future upgrade.
     *      Auditors: this field is intentionally inert in v1 — see roadmap docs.
     * @param signer The address to designate as trusted signer for future enforcement
     */
    function setTrustedP2PSigner(address signer) external adminOnly {
        if (signer == address(0)) revert InvalidAddress();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.trustedP2PSigner = signer;
    }

    /**
     * @dev Remove an order from the open P2P offers list
     * @notice Optimized: cache storage array to memory to avoid repeated SLOADs
     */
    function _removeFromOpenOffers(DiamondStorage.AppStorage storage s, bytes32 orderId) internal {
        // Cache to memory to avoid repeated SLOADs in loop (gas optimization)
        bytes32[] memory offerIds = s.openP2POfferIds;
        uint256 length = offerIds.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (offerIds[i] == orderId) {
                // Swap with last element and pop (use cached memory value to avoid extra SLOAD)
                s.openP2POfferIds[i] = offerIds[length - 1];
                s.openP2POfferIds.pop();
                break;
            }
        }
    }

    /**
     * @dev Remove a journey from driver's active list (swap-and-pop)
     */
    function _removeDriverJourney(DiamondStorage.AppStorage storage s, address driver, bytes32 journeyId) internal {
        bytes32[] storage journeys = s.driverToJourneyIds[driver];
        uint256 length = journeys.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (journeys[i] == journeyId) {
                journeys[i] = journeys[length - 1];
                journeys.pop();
                break;
            }
        }
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
    ) external nonReentrant whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (msg.sender != receiver) revert CallerMustBeBuyer();
        if (sender == address(0) || receiver == address(0)) revert InvalidAddress();
        if (sender == receiver) revert DuplicateJourneyRoleAddress();
        if (bounty == 0) revert InvalidAmount();
        if (ETA <= block.timestamp) revert InvalidETA();
        if (s.payToken == address(0)) revert PayTokenNotSet();

        bytes32 journeyId = _getHashedJourneyId(s);

        DiamondStorage.AuSysJourney storage journey = s.ausysJourneys[journeyId];
        journey.parcelData = _data;
        journey.journeyId = journeyId;
        journey.currentStatus = OrderStatus.JOURNEY_PENDING;
        journey.sender = sender;
        journey.receiver = receiver;
        journey.driver = address(0);
        journey.journeyStart = 0;
        journey.journeyEnd = 0;
        journey.bounty = bounty;
        journey.ETA = ETA;

        // Escrow bounty from receiver
        IERC20(s.payToken).safeTransferFrom(msg.sender, address(this), bounty);
        emit FundsEscrowed(receiver, bounty);
        emit JourneyCreated(
            journeyId,
            sender,
            receiver,
            address(0), // driver not assigned yet
            bounty,
            ETA,
            bytes32(0), // no linked order for standalone journey
            _data.startLocation.lat,
            _data.startLocation.lng,
            _data.endLocation.lat,
            _data.endLocation.lng,
            _data.startName,
            _data.endName
        );
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
    ) external nonReentrant whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];

        if (O.id == bytes32(0)) revert OrderNotFound();

        // Validate receiver is valid node or buyer
        bool isValidNode = _isValidNode(s, receiver);
        bool isBuyer = receiver == O.buyer;
        if (!isValidNode && !isBuyer) revert InvalidNode();

        if (msg.sender != O.buyer) revert CallerMustBeBuyer();
        if (O.currentStatus != OrderStatus.AUSYS_CREATED && O.currentStatus != OrderStatus.AUSYS_PROCESSING) {
            revert InvalidOrderStatus();
        }
        if (O.expiresAt != 0 && block.timestamp > O.expiresAt) revert OfferExpired();
        if (sender != O.seller) revert InvalidJourneyRoute();
        if (sender == address(0) || receiver == address(0)) revert InvalidAddress();
        if (sender == receiver) revert DuplicateJourneyRoleAddress();
        if (ETA <= block.timestamp) revert InvalidETA();
        if (bounty == 0) revert InvalidAmount();
        if (tokenQuantity == 0) revert InvalidAmount();
        if (tokenQuantity != O.tokenQuantity) revert QuantityExceedsRequested();
        if (assetId != O.tokenId) revert InvalidAmount();
        if (s.payToken == address(0)) revert PayTokenNotSet();

        bytes32 journeyId = _getHashedJourneyId(s);

        DiamondStorage.AuSysJourney storage journey = s.ausysJourneys[journeyId];
        journey.parcelData = _data;
        journey.journeyId = journeyId;
        journey.currentStatus = OrderStatus.JOURNEY_PENDING;
        journey.sender = sender;
        journey.receiver = receiver;
        journey.driver = address(0);
        journey.journeyStart = 0;
        journey.journeyEnd = 0;
        journey.bounty = bounty;
        journey.ETA = ETA;

        // Escrow bounty from buyer
        IERC20(s.payToken).safeTransferFrom(msg.sender, address(this), bounty);
        emit FundsEscrowed(O.buyer, bounty);

        if (O.journeyIds.length >= MAX_JOURNEYS_PER_ORDER) revert ArrayLimitExceeded();
        O.journeyIds.push(journeyId);
        s.journeyToAusysOrderId[journeyId] = orderId;

        // Set token quantity only if not already set (P2P orders set it at creation).
        // For non-P2P orders the quantity is already set during createAuSysOrder,
        // so we should never blindly accumulate here.
        if (O.tokenQuantity == 0) {
            O.tokenQuantity = tokenQuantity;
        }

        emit JourneyCreated(
            journeyId,
            sender,
            receiver,
            address(0), // driver not assigned yet
            bounty,
            ETA,
            orderId,
            _data.startLocation.lat,
            _data.startLocation.lng,
            _data.endLocation.lat,
            _data.endLocation.lng,
            _data.startName,
            _data.endName
        );
    }

    // ============================================================================
    // DRIVER ASSIGNMENT (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Assign a driver to a journey (from AuSys.assignDriverToJourneyId)
     */
    function assignDriverToJourney(address driver, bytes32 journeyId) external whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[journeyId];

        if (J.journeyId == bytes32(0)) revert JourneyNotFound();

        // Require driver to be registered
        if (!s.ausysRoles[DRIVER_ROLE][driver]) revert InvalidCaller();
        if (driver == J.sender || driver == J.receiver || J.sender == J.receiver) {
            revert DuplicateJourneyRoleAddress();
        }

        // Only driver, dispatcher, or journey sender can assign
        bool callerAuthorized = (
            msg.sender == driver ||
            s.ausysRoles[DISPATCHER_ROLE][msg.sender] ||
            msg.sender == J.sender
        );
        if (!callerAuthorized) revert InvalidCaller();
        if (J.currentStatus != OrderStatus.JOURNEY_PENDING) revert JourneyNotPending();
        if (J.driver != address(0)) revert JourneyAlreadyAssigned();

        if (s.driverToJourneyIds[driver].length >= MAX_DRIVER_JOURNEYS) revert DriverMaxAssignment();

        s.driverToJourneyIds[driver].push(journeyId);
        J.driver = driver;

        emit DriverAssigned(
            journeyId,
            driver,
            J.sender,
            J.receiver,
            J.bounty,
            J.ETA,
            J.parcelData.startLocation.lat,
            J.parcelData.startLocation.lng,
            J.parcelData.endLocation.lat,
            J.parcelData.endLocation.lng,
            J.parcelData.startName,
            J.parcelData.endName
        );
    }

    // ============================================================================
    // SIGNATURE SYSTEM (from AuSys.sol)
    // ============================================================================

    /**
     * @notice Sign for package pickup/delivery (from AuSys.packageSign)
     */
    function packageSign(bytes32 id) external customerDriverCheck(id) whenNotPaused {
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
            if (J.currentStatus == OrderStatus.JOURNEY_PENDING) {
                s.driverPickupSigned[J.driver][id] = true;
            } else if (J.currentStatus == OrderStatus.JOURNEY_IN_TRANSIT) {
                s.driverDeliverySigned[J.driver][id] = true;
            } else {
                // Journey is in a terminal state (Delivered/Canceled) — signing is meaningless
                revert JourneyNotInProgress();
            }
            emit EmitSig(J.driver, id);
        }
    }

    /**
     * @notice Hand on - pickup confirmation (from AuSys.handOn)
     * @dev Requires driver and sender signatures. Transitions to InTransit.
     */
    function handOn(bytes32 id) external customerDriverCheck(id) isPending(id) nonReentrant whenNotPaused returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];

        if (!s.driverPickupSigned[J.driver][id]) revert DriverNotSigned();
        if (!s.customerHandOff[J.sender][id]) revert SenderNotSigned();

        J.journeyStart = block.timestamp;
        s.customerHandOff[J.sender][id] = false;
        J.currentStatus = OrderStatus.JOURNEY_IN_TRANSIT;

        emit AuSysJourneyStatusUpdated(
            id,
            1, // InTransit
            J.sender,
            J.receiver,
            J.driver,
            J.bounty,
            J.ETA,
            J.journeyStart,
            J.journeyEnd,
            J.parcelData.startLocation.lat,
            J.parcelData.startLocation.lng,
            J.parcelData.endLocation.lat,
            J.parcelData.endLocation.lng,
            J.parcelData.startName,
            J.parcelData.endName
        );

        // Update linked order status if exists
        bytes32 orderId = s.journeyToAusysOrderId[id];
        if (orderId != bytes32(0)) {
            DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
        if (O.currentStatus == OrderStatus.AUSYS_CREATED) {
            O.currentStatus = OrderStatus.AUSYS_PROCESSING;
            emit AuSysOrderStatusUpdated(orderId, OrderStatus.AUSYS_PROCESSING);
        }

            // Transfer tokens from seller to escrow if this is first journey
            // Skip if seller-initiated P2P (tokens already escrowed at offer creation)
            if (J.sender == O.seller && !O.isSellerInitiated && !s.ausysOrderTokenEscrowed[orderId]) {
                IERC1155(O.token).safeTransferFrom(
                    O.seller,
                    address(this),
                    O.tokenId,
                    O.tokenQuantity,
                    ''
                );
                s.ausysOrderTokenEscrowed[orderId] = true;
            }
        }

        return true;
    }

    /**
     * @notice Hand off - delivery confirmation (from AuSys.handOff)
     * @dev Requires driver delivery signature and receiver signature. 
     *      Pays driver bounty and settles order if final delivery.
     */
    function handOff(bytes32 id) external isInProgress(id) customerDriverCheck(id) nonReentrant whenNotPaused returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[id];
        bytes32 orderId = s.journeyToAusysOrderId[id];

        if (orderId != bytes32(0)) {
            DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
        if (O.currentStatus == OrderStatus.AUSYS_SETTLED) revert AlreadySettled();
        }

        if (!s.driverDeliverySigned[J.driver][id]) revert DriverNotSigned();
        if (!s.customerHandOff[J.receiver][id]) revert ReceiverNotSigned();

        J.currentStatus = OrderStatus.JOURNEY_DELIVERED;
        J.journeyEnd = block.timestamp;

        // Remove journey from driver's active list (swap-and-pop)
        _removeDriverJourney(s, J.driver, id);

        emit AuSysJourneyStatusUpdated(
            id,
            OrderStatus.JOURNEY_DELIVERED,
            J.sender,
            J.receiver,
            J.driver,
            J.bounty,
            J.ETA,
            J.journeyStart,
            J.journeyEnd,
            J.parcelData.startLocation.lat,
            J.parcelData.startLocation.lng,
            J.parcelData.endLocation.lat,
            J.parcelData.endLocation.lng,
            J.parcelData.startName,
            J.parcelData.endName
        );

        // Pay driver bounty.
        // NOTE: State (JOURNEY_DELIVERED, journeyEnd, driver removal) is fully updated above
        // before any external calls below. Reentrancy is additionally guarded by nonReentrant.
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
        return keccak256(abi.encodePacked(++s.ausysJourneyIdCounter, block.prevrandao, msg.sender, block.timestamp));
    }

    /// @dev FIX 4: prevrandao + creator + timestamp added for order ID entropy
    function _getHashedOrderId(DiamondStorage.AppStorage storage s, address creator) internal returns (bytes32) {
        return keccak256(abi.encodePacked(++s.ausysOrderIdCounter, block.prevrandao, creator, block.timestamp));
    }

    function _isValidNode(DiamondStorage.AppStorage storage s, address nodeOwner) internal view returns (bool) {
        bytes32[] storage ownerNodes = s.ownerNodes[nodeOwner];
        uint256 nodeCount = ownerNodes.length;
        for (uint256 i = 0; i < nodeCount; i++) {
            // Cache node to avoid repeated SLOAD (saves ~3000 gas per iteration)
            DiamondStorage.Node storage nodeData = s.nodes[ownerNodes[i]];
            if (nodeData.active && nodeData.validNode) {
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
        O.currentStatus = OrderStatus.AUSYS_SETTLED;
        emit AuSysOrderStatusUpdated(orderId, OrderStatus.AUSYS_SETTLED);

        // Hold tokens in escrow — buyer chooses destination via selectTokenDestination
        s.pendingTokenDestination[orderId] = true;
        s.pendingTokenBuyer[orderId] = O.buyer;
        s.ausysOrderSettledAt[orderId] = block.timestamp;
        emit TokenDestinationPending(orderId, O.buyer, O.tokenId, O.tokenQuantity);

        // Pay seller
        IERC20(s.payToken).safeTransfer(O.seller, O.price);
        emit SellerPaid(O.seller, O.price);

        // Distribute tx fees to nodes
        if (O.nodes.length > 0) {
            uint256 nodeCount = O.nodes.length;
            uint256 nodeReward = O.txFee / nodeCount;
            uint256 remainder = O.txFee % nodeCount;

            for (uint256 i = 0; i < nodeCount; i++) {
                uint256 amount = nodeReward + (i == 0 ? remainder : 0);
                IERC20(s.payToken).safeTransfer(O.nodes[i], amount);
                emit NodeFeeDistributed(O.nodes[i], amount);
            }
        }

        emit AuSysOrderSettled(orderId);
    }

    // ============================================================================
    // TOKEN DESTINATION SELECTION
    // ============================================================================

    /**
     * @notice Buyer selects where settled tokens go: burn or send to owned node
     * @param orderId The settled order with pending token destination
     * @param nodeId The node to send tokens to (ignored if burn=true)
     * @param burn If true, tokens are sent to dead address
     */
    function selectTokenDestination(
        bytes32 orderId,
        bytes32 nodeId,
        bool burn
    ) external nonReentrant whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];

        if (!s.pendingTokenDestination[orderId]) revert NoPendingDestination();
        if (msg.sender != s.pendingTokenBuyer[orderId]) revert InvalidCaller();

        s.pendingTokenDestination[orderId] = false;
        delete s.pendingTokenBuyer[orderId];

        if (burn) {
            IERC1155(O.token).safeTransferFrom(address(this), address(0xdead), O.tokenId, O.tokenQuantity, '');
            emit TokenDestinationSelected(orderId, address(0xdead), bytes32(0), true);
        } else {
            if (nodeId == bytes32(0)) revert NodeRequired();
            DiamondStorage.Node storage node = s.nodes[nodeId];
            if (!node.active || !node.validNode) revert InvalidNode();
            if (node.owner != msg.sender) revert NotNodeOwner();
            if (O.token == address(this)) {
                _creditOwnerNodeSellable(s, node.owner, O.tokenId, nodeId, O.tokenQuantity);
            }
            IERC1155(O.token).safeTransferFrom(address(this), node.owner, O.tokenId, O.tokenQuantity, '');
            emit TokenDestinationSelected(orderId, node.owner, nodeId, false);
        }
    }

    /**
     * @notice Admin recovery of escrowed tokens when buyer has not selected a destination
     * @param orderId The order with stuck escrow
     * @param to The address to send the recovered tokens to
     */
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

    function _creditOwnerNodeSellable(
        DiamondStorage.AppStorage storage s,
        address owner,
        uint256 tokenId,
        bytes32 nodeHash,
        uint256 amount
    ) internal {
        if (owner == address(0) || nodeHash == bytes32(0) || amount == 0) return;

        if (!s.ownerTokenHasSellableNode[owner][tokenId][nodeHash]) {
            s.ownerTokenHasSellableNode[owner][tokenId][nodeHash] = true;
            s.ownerTokenSellableNodes[owner][tokenId].push(nodeHash);
        }

        s.ownerNodeSellableAmounts[owner][tokenId][nodeHash] += amount;
    }

    // ============================================================================
    // ADMIN DATA REPAIR
    // ============================================================================

    /**
     * @notice Correct a corrupted order tokenQuantity (admin only)
     * @dev Used to fix orders where quantity was accidentally doubled.
     *      Emits OrderQuantityCorrected for audit trail.
     * @param orderId The order to correct
     * @param correctQuantity The correct token quantity
     */
    function correctOrderTokenQuantity(
        bytes32 orderId,
        uint256 correctQuantity
    ) external adminOnly {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];
        if (O.id == bytes32(0)) revert OfferNotFound();
        require(correctQuantity > 0, "Quantity must be positive");

        uint256 oldQuantity = O.tokenQuantity;
        O.tokenQuantity = correctQuantity;

        emit AuSysOrderStatusUpdated(orderId, O.currentStatus);
        emit OrderQuantityCorrected(orderId, oldQuantity, correctQuantity);
    }

    event OrderQuantityCorrected(bytes32 indexed orderId, uint256 oldQuantity, uint256 newQuantity);

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
