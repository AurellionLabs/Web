// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title CLOBLogisticsFacet
 * @notice Driver management and physical delivery logistics for CLOB
 * @dev Implements IAuraCLOB driver/logistics functions
 */
contract CLOBLogisticsFacet is ReentrancyGuard {
    using SafeERC20 for IERC20;

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

    // ============================================================================
    // LOGISTICS ORDER STATUS
    // ============================================================================
    
    // Status: 0=Created, 1=Assigned, 2=PickedUp, 3=InTransit, 4=Delivered, 5=Settled, 6=Cancelled, 7=Disputed
    uint8 constant STATUS_CREATED = 0;
    uint8 constant STATUS_ASSIGNED = 1;
    uint8 constant STATUS_PICKED_UP = 2;
    uint8 constant STATUS_IN_TRANSIT = 3;
    uint8 constant STATUS_DELIVERED = 4;
    uint8 constant STATUS_SETTLED = 5;
    uint8 constant STATUS_CANCELLED = 6;
    uint8 constant STATUS_DISPUTED = 7;

    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier orderExists(bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.clobLogisticsOrders[orderId].orderId == bytes32(0)) revert OrderNotFound();
        _;
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

        // Calculate driver bounty (2% of total price)
        uint256 driverBounty = (totalPrice * 200) / 10000;

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
            escrowedAmount: totalPrice + driverBounty,
            driverBounty: driverBounty,
            pickupLocation: pickupLocation,
            deliveryLocation: deliveryLocation,
            status: STATUS_CREATED,
            assignedDriver: address(0),
            createdAt: block.timestamp,
            deliveredAt: 0
        });

        s.clobLogisticsOrderIds.push(orderId);

        emit LogisticsOrderCreated(orderId, tradeId, buyer, seller, quantity, driverBounty);

        return orderId;
    }

    /**
     * @notice Accept a delivery as a driver
     */
    function acceptDelivery(
        bytes32 orderId,
        uint256 estimatedPickupTime,
        uint256 estimatedDeliveryTime
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != STATUS_CREATED) revert InvalidOrderStatus();
        if (s.clobDrivers[msg.sender].driver == address(0)) revert DriverNotRegistered();
        if (!s.clobDrivers[msg.sender].isActive) revert DriverNotRegistered();
        if (!s.clobDrivers[msg.sender].isAvailable) revert DriverNotAvailable();

        order.assignedDriver = msg.sender;
        order.status = STATUS_ASSIGNED;
        
        // Increment driver's total deliveries
        s.clobDrivers[msg.sender].totalDeliveries++;

        emit DeliveryAccepted(orderId, msg.sender, estimatedPickupTime, estimatedDeliveryTime);
    }

    /**
     * @notice Confirm pickup of package
     * @param orderId The logistics order ID
     * @param signature Seller's signature (for verification - currently unused)
     * @param location Current pickup location
     */
    function confirmPickup(
        bytes32 orderId,
        bytes calldata signature,
        DiamondStorage.Location calldata location
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != STATUS_ASSIGNED) revert InvalidOrderStatus();
        if (order.assignedDriver != msg.sender) revert NotAssignedDriver();

        // In production: verify signature from seller
        // For now, we just update status
        
        order.status = STATUS_PICKED_UP;

        emit PickupConfirmed(orderId, msg.sender, location.lat, location.lng);
        
        // Immediately transition to in-transit
        order.status = STATUS_IN_TRANSIT;
    }

    /**
     * @notice Update delivery location during transit
     */
    function updateDeliveryLocation(
        bytes32 orderId,
        DiamondStorage.Location calldata location
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != STATUS_IN_TRANSIT) revert InvalidOrderStatus();
        if (order.assignedDriver != msg.sender) revert NotAssignedDriver();

        // Update driver's location
        s.clobDrivers[msg.sender].currentLocation = location;

        emit DeliveryLocationUpdated(orderId, msg.sender, location.lat, location.lng);
    }

    /**
     * @notice Confirm delivery to buyer
     * @param orderId The logistics order ID
     * @param receiverSignature Buyer's signature (for verification - currently unused)
     * @param location Delivery location
     */
    function confirmDelivery(
        bytes32 orderId,
        bytes calldata receiverSignature,
        DiamondStorage.Location calldata location
    ) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != STATUS_IN_TRANSIT) revert InvalidOrderStatus();
        if (order.assignedDriver != msg.sender) revert NotAssignedDriver();

        // In production: verify signature from buyer
        
        order.status = STATUS_DELIVERED;
        order.deliveredAt = block.timestamp;

        emit DeliveryConfirmed(orderId, msg.sender, location.lat, location.lng);
    }

    /**
     * @notice Settle a delivered order - pay driver and seller
     * @dev Can be called by buyer, seller, driver, or admin after delivery
     */
    function settleLogisticsOrder(bytes32 orderId) external orderExists(orderId) nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status != STATUS_DELIVERED) revert InvalidOrderStatus();
        
        // Only participants can settle
        bool isParticipant = (
            msg.sender == order.buyer ||
            msg.sender == order.seller ||
            msg.sender == order.assignedDriver ||
            msg.sender == LibDiamond.contractOwner()
        );
        if (!isParticipant) revert NotOrderParticipant();

        order.status = STATUS_SETTLED;

        // Pay driver bounty
        address payToken = s.quoteTokenAddress;
        if (payToken != address(0) && order.driverBounty > 0) {
            IERC20(payToken).safeTransfer(order.assignedDriver, order.driverBounty);
            s.clobDrivers[order.assignedDriver].totalEarnings += order.driverBounty;
            s.clobDrivers[order.assignedDriver].completedDeliveries++;
        }

        // Pay seller (price minus any fees)
        if (payToken != address(0) && order.totalPrice > 0) {
            IERC20(payToken).safeTransfer(order.seller, order.totalPrice);
        }

        emit LogisticsOrderSettled(orderId, order.driverBounty);
    }

    /**
     * @notice Dispute an order
     * @dev Freezes the order for admin resolution
     */
    function disputeOrder(bytes32 orderId, string calldata reason) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        if (order.status >= STATUS_SETTLED) revert AlreadySettled();
        
        // Only participants can dispute
        bool isParticipant = (
            msg.sender == order.buyer ||
            msg.sender == order.seller ||
            msg.sender == order.assignedDriver
        );
        if (!isParticipant) revert NotOrderParticipant();

        order.status = STATUS_DISPUTED;

        emit LogisticsOrderDisputed(orderId, reason);
    }

    /**
     * @notice Cancel an order (admin only, or buyer before driver assigned)
     */
    function cancelLogisticsOrder(bytes32 orderId, string calldata reason) external orderExists(orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LogisticsOrder storage order = s.clobLogisticsOrders[orderId];

        bool canCancel = (
            msg.sender == LibDiamond.contractOwner() ||
            (msg.sender == order.buyer && order.status == STATUS_CREATED)
        );
        if (!canCancel) revert NotOrderParticipant();
        
        if (order.status >= STATUS_SETTLED) revert AlreadySettled();

        order.status = STATUS_CANCELLED;

        // Refund escrowed amount to buyer
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
