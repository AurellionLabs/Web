// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { OrderStatus } from '../libraries/OrderStatus.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

/**
 * @title AuSysFacet
 * @notice Logistics and delivery management system mirroring AuSys.sol
 * @dev Handles orders, journeys, driver management, and package signatures
 */
contract AuSysFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    uint256 public constant MAX_ORDERS = 10000;
    uint256 public constant MAX_JOURNEYS_PER_ORDER = 10;
    uint256 public constant MAX_NODES_PER_ORDER = 20;
    uint256 public constant MAX_DRIVER_JOURNEYS = 10;

    error ArrayLimitExceeded();

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
     * @dev Supports P2P: if isSellerInitiated=true, seller escrows tokens; else buyer escrows payment
     *      For P2P offers, set buyer/seller to msg.sender and counterparty to address(0) or target
     */
    function createAuSysOrder(
        DiamondStorage.AuSysOrder memory order
    ) external nonReentrant returns (bytes32) {
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
            IERC1155(order.token).safeTransferFrom(
                order.seller,
                address(this),
                order.tokenId,
                order.tokenQuantity,
                ''
            );
            // Track as open P2P offer
            if (isP2POffer) {
                s.openP2POfferIds.push(id);
                s.userP2POffers[order.seller].push(id);
            }
        } else {
            // Buyer-initiated: escrow payment from buyer (original behavior)
            if (order.buyer == address(0)) revert InvalidAddress();
            IERC20(s.payToken).safeTransferFrom(order.buyer, address(this), order.price + txFee);
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

    /**
     * @notice Get an order by ID (from AuSys.getOrder)
     */
    function getAuSysOrder(bytes32 id) external view returns (DiamondStorage.AuSysOrder memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ausysOrders[id];
    }

    // ============================================================================
    // P2P OFFER MANAGEMENT
    // ============================================================================

    /**
     * @notice Accept a P2P offer
     * @dev FIX 2+3: EIP-712 ECDSA signature verification with nonce replay protection.
     *      CEI pattern: all checks first, nonce consumed before external calls.
     *      Counterparty escrows their side and order moves to Processing.
     * @param orderId   The order/offer to accept
     * @param nonce     Unique per-caller nonce (must not have been used before)
     * @param deadline  Unix timestamp after which the signature is invalid
     * @param signature Off-chain EIP-712 signature from trustedP2PSigner
     */
    function acceptP2POffer(
        bytes32 orderId,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
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

        // ── SIGNATURE VERIFICATION (after all business checks) ────────────
        if (s.trustedP2PSigner == address(0)) revert TrustedSignerNotSet();

        bytes32 structHash = keccak256(abi.encode(
            keccak256("AcceptOffer(bytes32 orderId,address acceptor,uint256 nonce,uint256 deadline)"),
            orderId,
            msg.sender,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        address recovered = ECDSA.recover(digest, signature);

        if (recovered != s.trustedP2PSigner) revert InvalidSignature();
        if (s.ausysUsedNonces[msg.sender][nonce]) revert NonceAlreadyUsed();
        if (block.timestamp > deadline) revert SignatureExpired();

        // ── EFFECTS ──────────────────────────────────────────────────────────
        // Consume nonce before any external calls (CEI)
        s.ausysUsedNonces[msg.sender][nonce] = true;

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
    function cancelP2POffer(bytes32 orderId) external nonReentrant {
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
     * @notice Set the trusted off-chain signer for P2P offer acceptance (admin only)
     * @param signer The address whose EIP-712 signatures are accepted in acceptP2POffer
     */
    function setTrustedP2PSigner(address signer) external adminOnly {
        if (signer == address(0)) revert InvalidAddress();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.trustedP2PSigner = signer;
    }

    /**
     * @notice Return the EIP-712 domain separator for this contract
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator();
    }

    /// @dev EIP-712 domain separator bound to chainId + address(this)
    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("Aurellion"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    /**
     * @notice Get all open P2P offers
     * @return Array of order IDs that are open P2P offers
     */
    function getOpenP2POffers() external view returns (bytes32[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.openP2POfferIds;
    }

    /**
     * @notice Get P2P offers created by a specific user
     * @param user The user address
     * @return Array of order IDs created by the user
     */
    function getUserP2POffers(address user) external view returns (bytes32[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.userP2POffers[user];
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
        journey.currentStatus = OrderStatus.JOURNEY_PENDING;
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
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.AuSysOrder storage O = s.ausysOrders[orderId];

        // Validate receiver is valid node or buyer
        bool isValidNode = _isValidNode(s, receiver);
        bool isBuyer = receiver == O.buyer;
        if (!isValidNode && !isBuyer) revert InvalidNode();

        if (msg.sender != O.buyer && msg.sender != O.seller && !s.ausysRoles[ADMIN_ROLE][msg.sender]) {
            revert InvalidCaller();
        }
        if (ETA <= block.timestamp) revert InvalidETA();
        if (tokenQuantity == 0) revert InvalidAmount();
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
        IERC20(s.payToken).safeTransferFrom(O.buyer, address(this), bounty);
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

        if (s.driverToJourneyIds[driver].length >= MAX_DRIVER_JOURNEYS) revert DriverMaxAssignment();

        s.driverToJourneyIds[driver].push(journeyId);
        s.ausysJourneys[journeyId].driver = driver;

        DiamondStorage.AuSysJourney storage J = s.ausysJourneys[journeyId];
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
            if (J.currentStatus == OrderStatus.JOURNEY_PENDING) {
                s.driverPickupSigned[J.driver][id] = true;
            } else if (J.currentStatus == OrderStatus.JOURNEY_IN_TRANSIT) {
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
            if (J.sender == O.seller && !O.isSellerInitiated) {
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
        if (O.currentStatus == OrderStatus.AUSYS_SETTLED) revert AlreadySettled();
        }

        if (!s.driverDeliverySigned[J.driver][id]) revert DriverNotSigned();
        if (!s.customerHandOff[J.receiver][id]) revert ReceiverNotSigned();

        J.currentStatus = OrderStatus.JOURNEY_DELIVERED;
        J.journeyEnd = block.timestamp;
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
    ) external nonReentrant {
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
        require(block.timestamp > s.ausysOrderSettledAt[orderId] + 30 days, "Too early: 30-day lock active");

        s.pendingTokenDestination[orderId] = false;
        delete s.pendingTokenBuyer[orderId];

        IERC1155(O.token).safeTransferFrom(address(this), to, O.tokenId, O.tokenQuantity, '');
        emit TokenDestinationSelected(orderId, to, bytes32(0), false);
    }

    /**
     * @notice Get all pending token destination orders for a buyer
     * @param buyer The buyer address to query
     * @return Array of order IDs awaiting destination selection
     * @dev Optimized: uses single-pass with count-first approach, caching storage reads
     */
    function getPendingTokenDestinations(address buyer) external view returns (bytes32[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 totalOrders = s.ausysOrderIds.length;

        // Single pass: build result directly without counting first
        // Use temporary storage for matches to avoid stack too deep
        bytes32[] memory tempResults = new bytes32[](totalOrders);
        uint256 resultCount = 0;

        for (uint256 i = 0; i < totalOrders; i++) {
            bytes32 oid = s.ausysOrderIds[i];
            // Cache storage reads to avoid repeated SLOADs (saves ~2000 gas per iteration)
            if (s.pendingTokenDestination[oid] && s.pendingTokenBuyer[oid] == buyer) {
                tempResults[resultCount++] = oid;
            }
        }

        // Resize result to exact size
        bytes32[] memory result = new bytes32[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = tempResults[i];
        }
        return result;
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
