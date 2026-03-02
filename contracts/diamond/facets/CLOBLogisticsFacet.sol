// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { OrderStatus } from '../libraries/OrderStatus.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import { MessageHashUtils } from '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

/**
 * @title CLOBLogisticsFacet
 * @notice Driver management and physical delivery logistics for CLOB
 * @dev Implements IAuraCLOB driver/logistics functions with signature verification
 */
contract CLOBLogisticsFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event DriverRegistered(address indexed driver);
    event DriverDeactivated(address indexed driver);
    event DriverAvailabilityUpdated(address indexed driver, bool isAvailable);
    event DriverLocationUpdated(address indexed driver, string lat, string lng);
    
    event LogisticsOrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed tradeId,
        address indexed buyer,
        address seller,
        uint256 quantity,
        uint256 driverBounty
    );
    
    event DeliveryAccepted(
        bytes32 indexed orderId,
        address indexed driver,
        uint256 estimatedPickupTime,
        uint256 estimatedDeliveryTime
    );
    
    event PickupConfirmed(
        bytes32 indexed orderId,
        address indexed driver,
        string lat,
        string lng
    );
    
    event DeliveryLocationUpdated(
        bytes32 indexed orderId,
        address indexed driver,
        string lat,
        string lng
    );
    
    event DeliveryConfirmed(
        bytes32 indexed orderId,
        address indexed driver,
        string lat,
        string lng
    );
    
    event LogisticsOrderSettled(bytes32 indexed orderId, uint256 driverPayout);
    event LogisticsOrderDisputed(bytes32 indexed orderId, string reason);
    event LogisticsOrderCancelled(bytes32 indexed orderId, string reason);

    // ============================================================================
    // ERRORS
    // ============================================================================

    error DriverAlreadyRegistered();
    error DriverNotRegistered();
    error DriverNotAvailable();
    error DriverNotAssigned();
    error OrderNotFound();
    error InvalidOrderStatus();
    error NotOrderParticipant();
    error NotAssignedDriver();
    error InvalidLocation();
    error AlreadySettled();
    error InvalidSignature();
    error SignatureExpired();

    bytes32 private constant PICKUP_TYPEHASH = keccak256(
        "PickupConfirmation(bytes32 orderId,address driver,string lat,string lng,uint256 nonce,uint256 deadline)"
    );
    bytes32 private constant DELIVERY_TYPEHASH = keccak256(
        "DeliveryConfirmation(bytes32 orderId,address driver,string lat,string lng,uint256 nonce,uint256 deadline)"
    );

    mapping(bytes32 => uint256) private pickupNonces;
    mapping(bytes32 => uint256) private deliveryNonces;

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("AuraCLOB"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier orderExists(bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.clobLogisticsOrders[orderId].orderId == bytes32(0)) revert OrderNotFound();
        _;
    }

    function _verifyPickupSignature(
        bytes32 orderId,
        address driver,
        string calldata lat,
        string calldata lng,
        uint256 deadline,
        bytes calldata signature
    ) internal view returns (address) {
        if (block.timestamp > deadline) revert SignatureExpired();
        
        uint256 nonce = pickupNonces[orderId];
        bytes32 structHash = keccak256(abi.encode(
            PICKUP_TYPEHASH,
            orderId,
            driver,
            keccak256(bytes(lat)),
            keccak256(bytes(lng)),
            nonce,
            deadline
        ));
        
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        return digest.recover(signature);
    }

    function _verifyDeliverySignature(
        bytes32 orderId,
        address driver,
        string calldata lat,
        string calldata lng,
        uint256 deadline,
        bytes calldata signature
    ) internal view returns (address) {
        if (block.timestamp > deadline) revert SignatureExpired();
        
        uint256 nonce = deliveryNonces[orderId];
        bytes32 structHash = keccak256(abi.encode(
            DELIVERY_TYPEHASH,
            orderId,
            driver,
            keccak256(bytes(lat)),
            keccak256(bytes(lng)),
            nonce,
            deadline
        ));
        
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        return digest.recover(signature);
    }

    // ============================================================================
    // DRIVER MANAGEMENT (from IAuraCLOB)
    // ============================================================================

    /**
     * @notice Register as a driver
     */
    function registerDriver() external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        if (s.clobDrivers[msg.sender].driver != address(0)) revert DriverAlreadyRegistered();

        s.clobDrivers[msg.sender] = DiamondStorage.DriverInfo({
            driver: msg.sender,
            isActive: true,
            isAvailable: true,
            currentLocation: DiamondStorage.Location({ lat: "", lng: "" }),
            totalDeliveries: 0,
            completedDeliveries: 0,
            totalEarnings: 0,
            rating: 500 // Start with 5.00 rating (scaled by 100)
        });

        s.clobDriverList.push(msg.sender);
        
        emit DriverRegistered(msg.sender);
    }

    /**
     * @notice Deactivate a driver (admin or self)
     */
    function deactivateDriver(address driver) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        if (msg.sender != driver && msg.sender != LibDiamond.contractOwner()) {
            revert NotOrderParticipant();
        }
        
        if (s.clobDrivers[driver].driver == address(0)) revert DriverNotRegistered();
        
        s.clobDrivers[driver].isActive = false;
        s.clobDrivers[driver].isAvailable = false;
        
        emit DriverDeactivated(driver);
    }

    /**
     * @notice Set driver availability
     */
    function setDriverAvailability(bool isAvailable) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        if (s.clobDrivers[msg.sender].driver == address(0)) revert DriverNotRegistered();
        if (!s.clobDrivers[msg.sender].isActive) revert DriverNotRegistered();
        
        s.clobDrivers[msg.sender].isAvailable = isAvailable;
        
        emit DriverAvailabilityUpdated(msg.sender, isAvailable);
    }

    /**
     * @notice Update driver's current location
     */
    function updateDriverLocation(DiamondStorage.Location calldata location) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        if (s.clobDrivers[msg.sender].driver == address(0)) revert DriverNotRegistered();
        
        s.clobDrivers[msg.sender].currentLocation = location;
        
        emit DriverLocationUpdated(msg.sender, location.lat, location.lng);
    }

    /**
     * @notice Get driver information
     */
    function getDriverInfo(address driver) external view returns (DiamondStorage.DriverInfo memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.clobDrivers[driver];
    }

    /**
     * @notice Get all registered drivers
     */
    function getAllDrivers() external view returns (address[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.clobDriverList;
    }

    /**
     * @notice Get available drivers
     */
    function getAvailableDrivers() external view returns (address[] memory drivers, uint256 count) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 total = s.clobDriverList.length;
        
        // Count available
        count = 0;
        for (uint256 i = 0; i < total; i++) {
            address d = s.clobDriverList[i];
            if (s.clobDrivers[d].isActive && s.clobDrivers[d].isAvailable) {
                count++;
            }
        }
        
        // Populate array
        drivers = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            address d = s.clobDriverList[i];
            if (s.clobDrivers[d].isActive && s.clobDrivers[d].isAvailable) {
                drivers[idx++] = d;
            }
        }
    }

    // ============================================================================
    // LOGISTICS ORDER MANAGEMENT
    // ============================================================================

    /**
     * @notice Create a logistics order from a CLOB trade
     * @dev Called internally after trade execution or by authorized contracts
     */
    function createLogisticsOrder(
        bytes32 tradeId,
        address buyer,
        address seller,
        address sellerNode,
        address token,
        uint256 tokenId,
        uint256 quantity,
        uint256 totalPrice,
        DiamondStorage.Location calldata pickupLocation,
        DiamondStorage.Location calldata deliveryLocation
    ) external returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        orderId = keccak256(abi.encodePacked(tradeId, buyer, seller, block.timestamp));

        uint256 driverBounty = (totalPrice * 200) / 10000;
        uint256 totalEscrow = totalPrice + driverBounty;

        address payToken = s.quoteTokenAddress;
        require(payToken != address(0), 'Quote token not set');
        IERC20(payToken).safeTransferFrom(buyer, address(this), totalEscrow);

        s.clobLogisticsOrders[orderId] = DiamondStorage.LogisticsOrder({
            orderId: orderId,
            tradeId: tradeId,
            buyer: buyer,
            seller: seller,
            sellerNode: sellerNode,
            token: token,
            tokenId: tokenId,
            quantity: quantity,
            totalPrice: totalPrice,
            escrowedAmount: totalEscrow,
            driverBounty: driverBounty,
            pickupLocation: pickupLocation,
            deliveryLocation: deliveryLocation,
            status: OrderStatus.LOGISTICS_CREATED,
            assignedDriver: address(0),
            createdAt: block.timestamp,
            deliveredAt: 0
        });

        s.clobLogisticsOrderIds.push(orderId);

        emit LogisticsOrderCreated(orderId, tradeId, buyer, seller, quantity, driverBounty);

        return orderId;
    }

    function acceptDelivery(
        bytes32 orderId,
        uint256 estimatedPickupTime,
        uint256 estimatedDeliveryTime
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != OrderStatus.LOGISTICS_CREATED) revert InvalidOrderStatus();
        if (s.clobDrivers[msg.sender].driver == address(0)) revert DriverNotRegistered();
        if (!s.clobDrivers[msg.sender].isActive) revert DriverNotRegistered();
        if (!s.clobDrivers[msg.sender].isAvailable) revert DriverNotAvailable();

        order.assignedDriver = msg.sender;
        order.status = OrderStatus.LOGISTICS_ASSIGNED;
        
        s.clobDrivers[msg.sender].totalDeliveries++;

        emit DeliveryAccepted(orderId, msg.sender, estimatedPickupTime, estimatedDeliveryTime);
    }

    function confirmPickup(
        bytes32 orderId,
        uint256 deadline,
        bytes calldata sellerSignature,
        DiamondStorage.Location calldata location
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != OrderStatus.LOGISTICS_ASSIGNED) revert InvalidOrderStatus();
        
        bool isOwner = msg.sender == LibDiamond.contractOwner();
        if (!isOwner && order.assignedDriver != msg.sender) revert NotAssignedDriver();

        if (!isOwner) {
            address signer = _verifyPickupSignature(
                orderId,
                msg.sender,
                location.lat,
                location.lng,
                deadline,
                sellerSignature
            );
            
            if (signer != order.seller && signer != order.sellerNode) {
                revert InvalidSignature();
            }
            pickupNonces[orderId]++;
        }

        order.status = OrderStatus.LOGISTICS_IN_TRANSIT;

        emit PickupConfirmed(orderId, msg.sender, location.lat, location.lng);
    }

    function updateDeliveryLocation(
        bytes32 orderId,
        DiamondStorage.Location calldata location
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != OrderStatus.LOGISTICS_IN_TRANSIT) revert InvalidOrderStatus();
        if (order.assignedDriver != msg.sender) revert NotAssignedDriver();

        s.clobDrivers[msg.sender].currentLocation = location;

        emit DeliveryLocationUpdated(orderId, msg.sender, location.lat, location.lng);
    }

    function confirmDelivery(
        bytes32 orderId,
        uint256 deadline,
        bytes calldata buyerSignature,
        DiamondStorage.Location calldata location
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != OrderStatus.LOGISTICS_IN_TRANSIT) revert InvalidOrderStatus();
        
        bool isOwner = msg.sender == LibDiamond.contractOwner();
        if (!isOwner && order.assignedDriver != msg.sender) revert NotAssignedDriver();

        if (!isOwner) {
            address signer = _verifyDeliverySignature(
                orderId,
                msg.sender,
                location.lat,
                location.lng,
                deadline,
                buyerSignature
            );
            
            if (signer != order.buyer) {
                revert InvalidSignature();
            }
            deliveryNonces[orderId]++;
        }

        order.status = OrderStatus.LOGISTICS_DELIVERED;
        order.deliveredAt = block.timestamp;

        emit DeliveryConfirmed(orderId, msg.sender, location.lat, location.lng);
    }

    function settleLogisticsOrder(bytes32 orderId) external orderExists(orderId) nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != OrderStatus.LOGISTICS_DELIVERED) revert InvalidOrderStatus();
        
        bool isParticipant = (
            msg.sender == order.buyer ||
            msg.sender == order.seller ||
            msg.sender == order.assignedDriver ||
            msg.sender == LibDiamond.contractOwner()
        );
        if (!isParticipant) revert NotOrderParticipant();

        order.status = OrderStatus.LOGISTICS_SETTLED;

        address payToken = s.quoteTokenAddress;
        if (payToken != address(0) && order.driverBounty > 0) {
            IERC20(payToken).safeTransfer(order.assignedDriver, order.driverBounty);
            s.clobDrivers[order.assignedDriver].totalEarnings += order.driverBounty;
            s.clobDrivers[order.assignedDriver].completedDeliveries++;
        }

        if (payToken != address(0) && order.totalPrice > 0) {
            IERC20(payToken).safeTransfer(order.seller, order.totalPrice);
        }

        emit LogisticsOrderSettled(orderId, order.driverBounty);
    }

    function disputeOrder(bytes32 orderId, string calldata reason) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status >= OrderStatus.LOGISTICS_SETTLED) revert AlreadySettled();
        
        bool isParticipant = (
            msg.sender == order.buyer ||
            msg.sender == order.seller ||
            msg.sender == order.assignedDriver
        );
        if (!isParticipant) revert NotOrderParticipant();

        order.status = OrderStatus.LOGISTICS_DISPUTED;

        emit LogisticsOrderDisputed(orderId, reason);
    }

    function cancelLogisticsOrder(bytes32 orderId, string calldata reason) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        bool canCancel = (
            msg.sender == LibDiamond.contractOwner() ||
            (msg.sender == order.buyer && order.status == OrderStatus.LOGISTICS_CREATED)
        );
        if (!canCancel) revert NotOrderParticipant();
        
        if (order.status >= OrderStatus.LOGISTICS_SETTLED) revert AlreadySettled();

        order.status = OrderStatus.LOGISTICS_CANCELLED;

        address payToken = s.quoteTokenAddress;
        if (payToken != address(0) && order.escrowedAmount > 0) {
            IERC20(payToken).safeTransfer(order.buyer, order.escrowedAmount);
        }

        emit LogisticsOrderCancelled(orderId, reason);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    /**
     * @notice Get logistics order details
     */
    function getLogisticsOrder(bytes32 orderId) external view returns (DiamondStorage.LogisticsOrder memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.clobLogisticsOrders[orderId];
    }

    /**
     * @notice Get all logistics order IDs
     */
    function getAllLogisticsOrders() external view returns (bytes32[] memory) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.clobLogisticsOrderIds;
    }

    /**
     * @notice Get node inventory (from IAuraCLOB)
     * @dev Returns available, reserved, and price for a node's token
     */
    function getNodeInventory(
        address node,
        address token,
        uint256 tokenId
    ) external view returns (uint256 available, uint256 reserved, uint256 price) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Find node hash from owner
        bytes32[] storage ownerNodes = s.ownerNodes[node];
        if (ownerNodes.length == 0) {
            return (0, 0, 0);
        }
        
        bytes32 nodeHash = ownerNodes[0]; // Use first node
        
        // Get balance from internal tracking
        available = s.nodeTokenBalances[nodeHash][tokenId];
        
        // Get price from node asset if configured
        uint256 assetId = uint256(keccak256(abi.encodePacked(token, tokenId)));
        if (s.nodeAssets[nodeHash][assetId].active) {
            price = s.nodeAssets[nodeHash][assetId].price;
        }
        
        // Reserved is 0 for now (could track pending orders)
        reserved = 0;
    }
}
