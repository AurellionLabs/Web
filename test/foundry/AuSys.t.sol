// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {locationContract} from "contracts/AuSys.sol";
import {Aura} from "contracts/Aura.sol";
import {AurumNodeManager} from "contracts/Aurum.sol";
import {AuraGoat} from "contracts/AuraGoat.sol"; // Assuming needed for node setup

contract AuSysTest is Test {
    // --- State Variables ---
    locationContract public ausysContract;
    Aura public auraToken;
    AurumNodeManager public nodeManager;
    AuraGoat public auraGoat;

    address public owner = address(0x1);
    address public customer1 = address(0x2);
    address public customer2 = address(0x3);
    address public nodeSigner1 = address(0x4);
    address public driver1 = address(0x5);

    // --- Constants ---
    uint256 constant STARTING_BALANCE = 1000 ether;

    // --- Setup ---
    function setUp() public {
        // Deploy Aura Token
        auraToken = new Aura();

        // Deploy AuSys (locationContract)
        ausysContract = new locationContract(auraToken);

        // Deploy NodeManager
        // Pass address(0) for ausys initially, will be set later if needed
        nodeManager = new AurumNodeManager(ausysContract, owner);

        // Deploy AuraGoat
        auraGoat = new AuraGoat(owner, "test-uri/", nodeManager);

        // Post-deployment setup - Uncomment if needed for specific tests
        // ausysContract.setNodeManager(address(nodeManager));
        // nodeManager.addToken(address(auraGoat));

        // Mint initial tokens to owner and distribute
        vm.startPrank(owner);
        auraToken.mintTokenToTreasury(1_000_000); // Mint 1M base units (adjust if needed)
        auraToken.transfer(customer1, STARTING_BALANCE);
        auraToken.transfer(customer2, STARTING_BALANCE);
        vm.stopPrank();

        console.log("Setup Complete");
        console.log("AuSys Address:", address(ausysContract));
        console.log("Aura Address:", address(auraToken));
        console.log("NodeManager Address:", address(nodeManager));
        console.log("Customer1 Aura Balance:", auraToken.balanceOf(customer1));
        console.log("Customer2 Aura Balance:", auraToken.balanceOf(customer2));
    }

    // --- Tests ---

    function test_OrderCreation_State() public {
        // Arrange: Prepare Order struct
        locationContract.Order memory orderInput;
        orderInput.token = address(auraGoat); // Example token
        orderInput.tokenId = 1;
        orderInput.requestedTokenQuantity = 10;
        orderInput.price = 0.5 ether;
        orderInput.customer = customer1;
        // orderInput.nodes = [registeredNode1]; // Keep nodes empty for now
        orderInput.locationData = locationContract.ParcelData({
            startLocation: locationContract.Location("0", "0"),
            endLocation: locationContract.Location("0", "0"),
            startName: "Start",
            endName: "End"
        });

        uint256 initialCounter = ausysContract.orderIdCounter();
        assertEq(initialCounter, 0, "Initial order counter should be 0");

        // Act: Customer1 creates the order
        vm.startPrank(customer1);
        bytes32 returnedOrderId = ausysContract.orderCreation(orderInput);
        vm.stopPrank();

        // Assert: Check counter
        uint256 finalCounter = ausysContract.orderIdCounter();
        assertEq(finalCounter, initialCounter + 1, "Order counter should increment");

        // Assert: Check returned ID is not zero
        assertNotEq(returnedOrderId, bytes32(0), "Returned order ID should not be zero");

        // Assert: Check public orderIds array
        bytes32 storedOrderId = ausysContract.orderIds(0);
        assertEq(storedOrderId, returnedOrderId, "Order ID in array mismatch");

        // Assert: Check idToOrder mapping
        locationContract.Order memory storedOrder = ausysContract.getOrder(returnedOrderId);
        assertEq(storedOrder.id, returnedOrderId, "Stored order ID mismatch"); // Contract sets ID internally
        assertEq(storedOrder.customer, customer1, "Stored customer mismatch");
        assertEq(storedOrder.token, address(auraGoat), "Stored token mismatch");
        assertEq(storedOrder.requestedTokenQuantity, 10, "Stored quantity mismatch");
        assertEq(uint8(storedOrder.currentStatus), uint8(locationContract.Status.Pending), "Stored status mismatch");
        assertTrue(storedOrder.txFee > 0, "txFee should be calculated"); // Check txFee calculation

        // Assert: Check customerToOrderIds mapping (expect revert if array empty)
        // Note: Foundry doesn't easily check array contents directly from mapping without index
        // We implicitly tested the push by checking the counter and the public array.
        // To be more robust, we could add a getter for customerToOrderIds length or specific index.
        // For now, assume if counter incremented and orderIds[0] is correct, the mapping push worked.
    }

    function test_MultipleOrderCreation_CustomerAssociation() public {
        // Arrange: Customer1 will create two orders
        locationContract.ParcelData memory parcelData = locationContract.ParcelData(
            locationContract.Location("0", "0"), // startLocation
            locationContract.Location("1", "1"), // endLocation
            "Start",                             // startName
            "End"                                // endName
        );

        locationContract.Order memory orderInput1;
        orderInput1.token = address(auraGoat);
        orderInput1.tokenId = 1;
        orderInput1.requestedTokenQuantity = 10;
        orderInput1.price = 0.5 ether;
        orderInput1.customer = customer1;
        orderInput1.locationData = parcelData;

        // Create orderInput2 separately to avoid memory aliasing issues
        locationContract.Order memory orderInput2;
        orderInput2.token = address(auraGoat);
        orderInput2.tokenId = 2; // Change something
        orderInput2.requestedTokenQuantity = 20;
        orderInput2.price = 0.7 ether;
        orderInput2.customer = customer1;
        orderInput2.locationData = parcelData; // Can reuse parcelData struct

        assertEq(ausysContract.orderIdCounter(), 0, "Initial order counter should be 0");

        // Act: Customer1 creates two orders
        vm.startPrank(customer1);
        bytes32 orderId1 = ausysContract.orderCreation(orderInput1);
        bytes32 orderId2 = ausysContract.orderCreation(orderInput2);
        vm.stopPrank();

        // Assert: Check counter and IDs
        assertEq(ausysContract.orderIdCounter(), 2, "Order counter should be 2 after two creations");
        assertNotEq(orderId1, bytes32(0), "Order ID 1 should not be zero");
        assertNotEq(orderId2, bytes32(0), "Order ID 2 should not be zero");
        assertNotEq(orderId1, orderId2, "Order IDs should be unique");

        // Assert: Check public orderIds array contents
        assertEq(ausysContract.orderIds(0), orderId1, "orderIds[0] mismatch");
        assertEq(ausysContract.orderIds(1), orderId2, "orderIds[1] mismatch");
        // Check array length (reverts if index out of bounds)
        vm.expectRevert(); // Expect revert when accessing index 2
        ausysContract.orderIds(2);

        // Assert: Check idToOrder mapping for both orders
        locationContract.Order memory storedOrder1 = ausysContract.getOrder(orderId1);
        assertEq(storedOrder1.customer, customer1, "Stored order 1 customer mismatch");
        assertEq(storedOrder1.requestedTokenQuantity, 10, "Stored order 1 quantity mismatch");

        locationContract.Order memory storedOrder2 = ausysContract.getOrder(orderId2);
        assertEq(storedOrder2.customer, customer1, "Stored order 2 customer mismatch");
        assertEq(storedOrder2.requestedTokenQuantity, 20, "Stored order 2 quantity mismatch");

        // Note: We still can't easily check the customerToOrderIds mapping directly.
        // We rely on the orderIds array and getOrder checks.
    }

    function test_MultipleJourneyCreation_FetchAll() public {
        // Arrange
        uint256 bounty1 = 0.1 ether;
        uint256 bounty2 = 0.2 ether;
        uint256 bounty3 = 0.3 ether;
        uint256 eta = block.timestamp + 1 hours;

        locationContract.ParcelData memory parcelData1 = locationContract.ParcelData(locationContract.Location("1", "1"), locationContract.Location("2", "2"), "C1->C2 (1)", "End1");
        locationContract.ParcelData memory parcelData2 = locationContract.ParcelData(locationContract.Location("3", "3"), locationContract.Location("4", "4"), "C1->C2 (2)", "End2");
        locationContract.ParcelData memory parcelData3 = locationContract.ParcelData(locationContract.Location("5", "5"), locationContract.Location("6", "6"), "C2->C1 (3)", "End3");

        uint256 initialJourneyCounter = ausysContract.journeyIdCounter();
        assertEq(initialJourneyCounter, 0, "Initial journey counter should be 0");

        // Act: Create 3 journeys
        // Journey 1: customer1 -> customer2
        vm.startPrank(customer1);
        auraToken.approve(address(ausysContract), bounty1);
        ausysContract.journeyCreation(customer1, customer2, parcelData1, bounty1, eta);
        vm.stopPrank();

        // Journey 2: customer1 -> customer2
        vm.startPrank(customer1);
        auraToken.approve(address(ausysContract), bounty2);
        ausysContract.journeyCreation(customer1, customer2, parcelData2, bounty2, eta + 1 minutes); // Vary ETA slightly
        vm.stopPrank();

        // Journey 3: customer2 -> customer1
        vm.startPrank(customer2);
        auraToken.approve(address(ausysContract), bounty3);
        ausysContract.journeyCreation(customer2, customer1, parcelData3, bounty3, eta + 2 minutes);
        vm.stopPrank();

        // Assert: Counter
        uint256 finalJourneyCounter = ausysContract.journeyIdCounter();
        assertEq(finalJourneyCounter, 3, "Journey counter should be 3");

        // Assert: Retrieve and check each journey via numberToJourneyID
        // Note: IDs are stored at index = final counter value
        bytes32 journeyId1 = ausysContract.numberToJourneyID(1); // First journey is at index 1
        bytes32 journeyId2 = ausysContract.numberToJourneyID(2);
        bytes32 journeyId3 = ausysContract.numberToJourneyID(3);

        assertNotEq(journeyId1, bytes32(0), "Journey ID 1 should not be zero");
        assertNotEq(journeyId2, bytes32(0), "Journey ID 2 should not be zero");
        assertNotEq(journeyId3, bytes32(0), "Journey ID 3 should not be zero");

        locationContract.Journey memory fetchedJourney1 = ausysContract.getjourney(journeyId1);
        assertEq(fetchedJourney1.sender, customer1, "Journey 1 sender mismatch");
        assertEq(fetchedJourney1.receiver, customer2, "Journey 1 receiver mismatch");
        assertEq(fetchedJourney1.parcelData.startName, "C1->C2 (1)", "Journey 1 name mismatch");

        locationContract.Journey memory fetchedJourney2 = ausysContract.getjourney(journeyId2);
        assertEq(fetchedJourney2.sender, customer1, "Journey 2 sender mismatch");
        assertEq(fetchedJourney2.receiver, customer2, "Journey 2 receiver mismatch");
        assertEq(fetchedJourney2.parcelData.startName, "C1->C2 (2)", "Journey 2 name mismatch");

        locationContract.Journey memory fetchedJourney3 = ausysContract.getjourney(journeyId3);
        assertEq(fetchedJourney3.sender, customer2, "Journey 3 sender mismatch");
        assertEq(fetchedJourney3.receiver, customer1, "Journey 3 receiver mismatch");
        assertEq(fetchedJourney3.parcelData.startName, "C2->C1 (3)", "Journey 3 name mismatch");

        // Check out-of-bounds access for numberToJourneyID returns zero value
        // vm.expectRevert(); // Accessing non-existent index doesn't revert
        // ausysContract.numberToJourneyID(finalJourneyCounter + 1);
        bytes32 nonExistentId = ausysContract.numberToJourneyID(finalJourneyCounter + 1);
        assertEq(nonExistentId, bytes32(0), "Accessing non-existent journey ID index should return zero");
    }

    function test_JourneyCreation_State() public {
        // Arrange
        uint256 bountyAmount = 0.1 ether;
        uint256 etaTimestamp = block.timestamp + 1 hours;
        locationContract.ParcelData memory parcelData = locationContract.ParcelData({
            startLocation: locationContract.Location("10.0", "10.1"),
            endLocation: locationContract.Location("20.0", "20.1"),
            startName: "Warehouse A",
            endName: "Customer B Home"
        });

        uint256 initialJourneyCounter = ausysContract.journeyIdCounter();
        uint256 initialCustomerJourneyCount = ausysContract.numberOfJourneysCreatedForCustomer(customer1);
        uint256 initialReceiverJourneyCount = ausysContract.numberOfJourneysCreatedForReceiver(customer2);
        uint256 initialContractBalance = auraToken.balanceOf(address(ausysContract));
        uint256 initialCustomerBalance = auraToken.balanceOf(customer1);

        // Act
        vm.startPrank(customer1);
        // 1. Approve bounty transfer
        auraToken.approve(address(ausysContract), bountyAmount);

        // 2. Expect event emission (check indexed fields: sender, receiver)
        // We don't know the journeyId beforehand, so we check the other args.
        vm.expectEmit(false, false, false, true, address(ausysContract));
        emit locationContract.JourneyCreated(bytes32(0), address(0), address(0));

        // 3. Call journeyCreation
        ausysContract.journeyCreation(
            customer1,
            customer2,
            parcelData,
            bountyAmount,
            etaTimestamp
        );
        vm.stopPrank();

        // Assert
        // Counters
        assertEq(ausysContract.journeyIdCounter(), initialJourneyCounter + 1, "Journey counter mismatch");
        assertEq(ausysContract.numberOfJourneysCreatedForCustomer(customer1), initialCustomerJourneyCount + 1, "Customer journey count mismatch");
        assertEq(ausysContract.numberOfJourneysCreatedForReceiver(customer2), initialReceiverJourneyCount + 1, "Receiver journey count mismatch");

        // Balances
        assertEq(auraToken.balanceOf(address(ausysContract)), initialContractBalance + bountyAmount, "Contract balance mismatch");
        assertEq(auraToken.balanceOf(customer1), initialCustomerBalance - bountyAmount, "Customer balance mismatch");
        // Note: customerToTokenAmount is internal, cannot check directly

        // Journey Details (Fetch by counter index)
        uint256 finalJourneyCounter = ausysContract.journeyIdCounter(); // Get counter *after* creation
        bytes32 createdJourneyId = ausysContract.numberToJourneyID(finalJourneyCounter); // Read ID using the final counter value
        assertNotEq(createdJourneyId, bytes32(0), "Created Journey ID should not be zero");

        locationContract.Journey memory createdJourney = ausysContract.getjourney(createdJourneyId);
        assertEq(createdJourney.sender, customer1, "Journey sender mismatch");
        assertEq(createdJourney.receiver, customer2, "Journey receiver mismatch");
        assertEq(createdJourney.bounty, bountyAmount, "Journey bounty mismatch");
        assertEq(createdJourney.ETA, etaTimestamp, "Journey ETA mismatch");
        assertEq(uint(createdJourney.currentStatus), uint(locationContract.Status.Pending), "Journey status mismatch");
        assertEq(createdJourney.parcelData.startName, "Warehouse A", "Parcel start name mismatch");
        assertEq(createdJourney.parcelData.endName, "Customer B Home", "Parcel end name mismatch");
    }

     // TODO: test_OrderCreation_Requires_Valid_Customer()
     // TODO: test_JourneyCreation_Requires_Bounty_Transfer()
} 