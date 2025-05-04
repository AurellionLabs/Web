// File: test/repositories/OrderRepository.test.ts

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  BrowserProvider,
  ContractTransactionReceipt,
  AddressLike,
  BytesLike,
} from 'ethers';
import {
  LocationContract,
  LocationContract__factory,
  Aura,
  Aura__factory,
  AurumNodeManager,
  AurumNodeManager__factory,
  AuraGoat, // Assuming needed if orders involve specific tokens
  AuraGoat__factory, // Assuming needed
} from '../../typechain-types'; // Adjust path as necessary
import { IOrderRepository } from '../../domain/orders/order'; // Adjust path
import { Node } from '../../domain/node'; // Import Node domain type
import { BlockchainNodeRepository } from '../../infrastructure/repositories/node-repository';
import { OrderRepository } from '@/infrastructure/repositories/orders-repository';

describe('OrderRepository', () => {
  // --- Test Setup ---
  let owner: HardhatEthersSigner;
  let customer1: HardhatEthersSigner;
  let customer2: HardhatEthersSigner;
  let nodeSigner1: HardhatEthersSigner; // Renamed node1 -> nodeSigner1 for clarity
  let nodeSigner2: HardhatEthersSigner;
  let driver1: HardhatEthersSigner;

  let locationContract: LocationContract; // Instance of deployed AuSys.sol
  let auraToken: Aura;
  let nodeManager: AurumNodeManager;
  let auraGoat: AuraGoat; // If needed for tests
  let auraGoatAddress: string;

  let orderRepository: IOrderRepository; // Instance of the class we are testing
  let nodeRepository: BlockchainNodeRepository; // For registering nodes
  let testProvider: BrowserProvider;

  let registeredNode1Address: string; // Actual address of node1 after registration

  // --- Sample Data Structures ---
  const sampleParcelData: LocationContract.ParcelDataStruct = {
    startLocation: { lat: '1.0', lng: '1.1' },
    endLocation: { lat: '2.0', lng: '2.1' },
    startName: 'Start Location A',
    endName: 'End Location B',
  };

  const sampleNode1Data: Node = {
    address: '', // Will be set after deployment/registration
    location: {
      addressName: 'Test Node 1 Location',
      location: { lat: '10.0', lng: '10.1' },
    },
    validNode: '0x01',
    owner: '', // Will be set to nodeSigner1.address
    supportedAssets: [1, 2], // GOAT, SHEEP
    status: 'Active',
    capacity: [100, 200],
    assetPrices: [10, 20],
  };

  // --- Helper Function to Create a Journey ---
  async function createTestJourney(
    sender: HardhatEthersSigner,
    receiver: HardhatEthersSigner,
    bountyEther: string = '0.1',
    etaOffsetSeconds: number = 3600, // 1 hour from now
  ): Promise<{
    journeyId: BytesLike;
    receipt: ContractTransactionReceipt | null;
  }> {
    const bountyWei = ethers.parseEther(bountyEther);
    const etaTimestamp = Math.floor(Date.now() / 1000) + etaOffsetSeconds;

    await auraToken
      .connect(sender)
      .approve(await locationContract.getAddress(), bountyWei);
    const tx = await locationContract
      .connect(sender)
      .journeyCreation(
        sender.address,
        receiver.address,
        sampleParcelData,
        bountyWei,
        BigInt(etaTimestamp),
      );
    const receipt = await tx.wait();
    let journeyId: BytesLike = ethers.ZeroHash;
    const eventFragment = locationContract.interface.getEvent('JourneyCreated');
    if (receipt?.logs && eventFragment) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = locationContract.interface.parseLog(
            log as unknown as { topics: string[]; data: string },
          );
          if (parsedLog && parsedLog.name === 'JourneyCreated') {
            journeyId = parsedLog.args.journeyId;
            break;
          }
        } catch (e) {
          /* ignore other logs */
        }
      }
    }
    if (journeyId === ethers.ZeroHash) {
      console.warn(
        'Could not find JourneyCreated event in transaction logs for journey creation.',
      );
    }
    return { journeyId, receipt };
  }

  // --- Helper Function to Create an Order ---
  // Returns the order ID captured from the transactio n
  async function createTestOrder(
    customer: HardhatEthersSigner,
    nodeAddress: AddressLike, // The *registered* node address
    tokenAddress: AddressLike,
    tokenId: number,
    tokenQuantity: number,
    priceEther: string = '1.0',
  ): Promise<{
    orderId: BytesLike;
    receipt: ContractTransactionReceipt | null;
  }> {
    const orderData: LocationContract.OrderStruct = {
      id: ethers.ZeroHash,
      token: tokenAddress,
      tokenId: BigInt(tokenId),
      requestedTokenQuantity: BigInt(tokenQuantity),
      tokenQuantity: BigInt(0),
      price: ethers.parseEther(priceEther),
      txFee: BigInt(0), // Contract calculates this
      customer: customer.address,
      journeyIds: [],
      nodes: [nodeAddress],
      locationData: sampleParcelData,
      currentStatus: 0, // Pending
      contracatualAgreement: ethers.ZeroHash,
    };

    // Call orderCreation - it returns the created order ID (bytes32)
    const orderId = await locationContract
      .connect(customer)
      .orderCreation.staticCall(orderData);
    const creationTx = await locationContract
      .connect(customer)
      .orderCreation(orderData);
    const creationReceipt = await creationTx.wait();

    if (!orderId || orderId === ethers.ZeroHash) {
      console.warn(
        'orderCreation static call did not return a valid ID, or tx failed',
      );
      return { orderId: ethers.ZeroHash, receipt: creationReceipt };
    }

    return { orderId, receipt: creationReceipt };
  }

  // --- Helper to create the order's journey (links order to node) ---
  async function createOrderJourney(
    orderId: BytesLike,
    senderNodeAddress: AddressLike,
    receiverAddress: AddressLike,
    bountyEther: string = '0.01',
    etaOffsetSeconds: number = 3600,
    tokenQuantity: number,
  ): Promise<{
    journeyId: BytesLike;
    receipt: ContractTransactionReceipt | null;
  }> {
    const bountyWei = ethers.parseEther(bountyEther);
    const etaTimestamp = Math.floor(Date.now() / 1000) + etaOffsetSeconds;

    // Simulate node owner calling this (adjust if needed)
    const nodeOwnerSigner = owner; // Assuming owner deployed node manager

    // Approve contract to spend bounty (if applicable, maybe node pays? Check contract logic)
    // await auraToken.connect(nodeOwnerSigner).approve(await locationContract.getAddress(), bountyWei); // Might not be needed

    const tx = await locationContract
      .connect(nodeOwnerSigner)
      .orderJourneyCreation(
        orderId,
        senderNodeAddress,
        receiverAddress,
        sampleParcelData,
        bountyWei,
        BigInt(etaTimestamp),
        BigInt(tokenQuantity),
      );
    const receipt = await tx.wait();

    // Parse JourneyCreated event to get the journeyId
    let journeyId: BytesLike = ethers.ZeroHash;
    const eventFragment = locationContract.interface.getEvent('JourneyCreated');
    if (receipt?.logs && eventFragment) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = locationContract.interface.parseLog(
            log as unknown as { topics: string[]; data: string },
          );
          if (parsedLog && parsedLog.name === 'JourneyCreated') {
            journeyId = parsedLog.args.journeyId;
            break;
          }
        } catch (e) {
          /* ignore other logs */
        }
      }
    }
    if (journeyId === ethers.ZeroHash) {
      console.warn(
        'Could not find JourneyCreated event in transaction logs for orderJourney creation.',
      );
    }

    return { journeyId, receipt };
  }

  beforeEach(async () => {
    // Get signers
    [owner, customer1, customer2, nodeSigner1, nodeSigner2, driver1] =
      await ethers.getSigners();

    // Deploy Aura Token
    const AuraFactory = (await ethers.getContractFactory(
      'Aura',
    )) as Aura__factory;
    auraToken = await AuraFactory.deploy();
    await auraToken.waitForDeployment();
    const auraTokenAddress = await auraToken.getAddress();

    // Manually mint initial supply to owner (deployer)
    const initialMintAmount = ethers.parseUnits('100000', 18); // Mint 100,000 AUR
    await auraToken
      .connect(owner)
      .mintTokenToTreasury(ethers.parseUnits('100000', 0)); // Function expects amount without decimals
    const ownerBalanceCheck = await auraToken.balanceOf(owner.address);
    console.log(
      `Aura manually minted. Owner balance: ${ethers.formatEther(ownerBalanceCheck)} AUR`,
    );
    expect(ownerBalanceCheck).to.be.gte(initialMintAmount); // Verify minting worked

    // --- Deploy Dependencies ---
    const NodeManagerFactory = (await ethers.getContractFactory(
      'AurumNodeManager',
    )) as AurumNodeManager__factory;
    // Deploy with constructor args (_ausys, _admin) and explicit empty overrides object
    nodeManager = await NodeManagerFactory.deploy(
      ethers.ZeroAddress,
      owner.address,
      {},
    );
    await nodeManager.waitForDeployment();
    const nodeManagerAddress = await nodeManager.getAddress();

    const GoatFactory = (await ethers.getContractFactory(
      'AuraGoat',
    )) as AuraGoat__factory;
    auraGoat = await GoatFactory.deploy(
      owner.address,
      'test-uri/',
      nodeManagerAddress,
    );
    await auraGoat.waitForDeployment();
    auraGoatAddress = await auraGoat.getAddress();

    // Deploy LocationContract (AuSys)
    const LocationContractFactory = (await ethers.getContractFactory(
      'locationContract',
    )) as LocationContract__factory;
    locationContract = await LocationContractFactory.deploy(auraTokenAddress);
    await locationContract.waitForDeployment();
    const locationContractAddress = await locationContract.getAddress();

    // Post-deployment setup: Link contracts
    await locationContract.setNodeManager(nodeManagerAddress);

    // Setup provider and signer
    if (!owner.provider) {
      throw new Error('Signer does not have a provider');
    }
    testProvider = owner.provider as unknown as BrowserProvider;

    // Instantiate NodeRepository for setup
    nodeRepository = new BlockchainNodeRepository(
      nodeManager,
      testProvider,
      owner, // Use owner to register nodes
      auraGoatAddress,
    );

    // Register Node 1 owned by nodeSigner1
    const node1SetupData = { ...sampleNode1Data, owner: nodeSigner1.address };
    registeredNode1Address = await nodeRepository.registerNode(node1SetupData);
    console.log(`Registered Node 1 at address: ${registeredNode1Address}`);

    // Instantiate OrderRepository
    orderRepository = new OrderRepository(
      locationContract,
      testProvider,
      owner,
    ); // Default signer

    // Distribute Aura tokens
    await auraToken
      .connect(owner)
      .transfer(customer1.address, ethers.parseEther('1000'));
    await auraToken
      .connect(owner)
      .transfer(customer2.address, ethers.parseEther('1000'));

    // --- Pre-populate standard journeys ---
    await createTestJourney(customer1, customer2);
    await createTestJourney(customer2, customer1, '0.5');
  });

  // --- Test Cases ---

  describe('getNodeOrders', () => {
    it('should return orders associated with a specific node after orderJourneyCreation', async () => {
      // 1. Create an order request
      const { orderId } = await createTestOrder(
        customer1,
        registeredNode1Address,
        auraGoatAddress,
        1,
        10,
      ); // Request 10 GOAT
      expect(orderId).to.not.equal(ethers.ZeroHash);

      // 2. Create the journey linking the order to the node
      await createOrderJourney(
        orderId,
        registeredNode1Address,
        customer1.address,
        '0.01',
        3600,
        10,
      );

      // 3. Fetch orders for the node
      const orders = await orderRepository.getNodeOrders(
        registeredNode1Address,
      );
      expect(orders).to.be.an('array').with.lengthOf(1);
      expect(orders[0].id).to.equal(orderId);
      expect(orders[0].customer).to.equal(customer1.address);
      expect(orders[0].nodes[0]).to.equal(registeredNode1Address);
    });

    it('should return an empty array if node has no linked orders', async () => {
      // Node 1 exists but no order journey created for it yet
      const orders = await orderRepository.getNodeOrders(
        registeredNode1Address,
      );
      expect(orders).to.be.an('array').that.is.empty;
    });
  });

  describe('getCustomerJourneys', () => {
    it('should return journeys created by a specific customer address', async () => {
      const journeys = await orderRepository.getCustomerJourneys(
        customer1.address,
      );
      expect(journeys).to.be.an('array').with.lengthOf(1);
      // Add more checks if needed
    });
    it('should return journeys for the default signer if address is omitted', async () => {
      orderRepository = new OrderRepository(
        locationContract,
        testProvider,
        customer1,
      );
      const journeys = await orderRepository.getCustomerJourneys();
      expect(journeys).to.be.an('array').with.lengthOf(1);
      expect(journeys[0].sender).to.equal(customer1.address);
    });
    it('should return an empty array if the customer has no journeys', async () => {
      const journeys = await orderRepository.getCustomerJourneys(
        driver1.address,
      );
      expect(journeys).to.be.an('array').that.is.empty;
    });
  });

  describe('getReceiverJourneys', () => {
    it('should return journeys where a specific address is the receiver', async () => {
      const journeys = await orderRepository.getReceiverJourneys(
        customer1.address,
      );
      expect(journeys).to.be.an('array').with.lengthOf(1);
      // Add more checks
    });
    it('should return journeys for the default signer if address is omitted', async () => {
      orderRepository = new OrderRepository(
        locationContract,
        testProvider,
        customer2,
      );
      const journeys = await orderRepository.getReceiverJourneys();
      expect(journeys).to.be.an('array').with.lengthOf(1);
      expect(journeys[0].receiver).to.equal(customer2.address);
    });
    it('should return an empty array if the address has not received journeys', async () => {
      const journeys = await orderRepository.getReceiverJourneys(
        driver1.address,
      );
      expect(journeys).to.be.an('array').that.is.empty;
    });
  });

  describe('fetchAllJourneys', () => {
    it('should return all created journeys', async () => {
      await createTestJourney(customer1, driver1);
      const journeys = await orderRepository.fetchAllJourneys();
      expect(journeys).to.be.an('array').with.lengthOf(3);
    });
    it('should return an empty array if no journeys exist', async () => {
      // Setup fresh contracts
      const AuraFactory = (await ethers.getContractFactory(
        'Aura',
      )) as Aura__factory;
      const freshAura = await AuraFactory.deploy();
      await freshAura.waitForDeployment();

      // Manually mint for fresh deployment too
      const freshMintAmount = ethers.parseUnits('100000', 18);
      await freshAura
        .connect(owner)
        .mintTokenToTreasury(ethers.parseUnits('100000', 0));
      const freshBalanceCheck = await freshAura.balanceOf(owner.address);
      console.log(
        `Fresh Aura manually minted. Owner balance: ${ethers.formatEther(freshBalanceCheck)} AUR`,
      );
      expect(freshBalanceCheck).to.be.gte(freshMintAmount);

      const NodeManagerFactory = (await ethers.getContractFactory(
        'AurumNodeManager',
      )) as AurumNodeManager__factory;
      // Deploy with _ausys, _admin, and explicit empty overrides
      const freshNodeManager = await NodeManagerFactory.deploy(
        ethers.ZeroAddress,
        owner.address,
        {},
      );
      await freshNodeManager.waitForDeployment();
      const LocationContractFactory = (await ethers.getContractFactory(
        'locationContract',
      )) as LocationContract__factory;
      const freshLocationContract = await LocationContractFactory.deploy(
        await freshAura.getAddress(),
      );
      await freshLocationContract.waitForDeployment();
      await freshLocationContract.setNodeManager(
        await freshNodeManager.getAddress(),
      );
      const freshRepo = new OrderRepository(
        freshLocationContract,
        testProvider,
        owner,
      );
      const journeys = await freshRepo.fetchAllJourneys();
      expect(journeys).to.be.an('array').that.is.empty;
    });
  });

  describe('getJourneyById', () => {
    it('should return the correct journey for a valid ID', async () => {
      const { journeyId } = await createTestJourney(
        customer1,
        customer2,
        '0.2',
      );
      expect(journeyId).to.not.equal(ethers.ZeroHash);
      const journey = await orderRepository.getJourneyById(journeyId);
      expect(journey).to.not.be.null;
      expect(journey.journeyId).to.equal(journeyId);
    });
    it('should throw an error for an invalid or non-existent journey ID', async () => {
      const invalidId = ethers.id('nonExistentJourney');
      await expect(
        orderRepository.getJourneyById(invalidId),
      ).to.be.rejectedWith(/Journey with ID .* not found/);
    });
  });

  describe('getOrderIdByJourneyId', () => {
    it('should return the correct Order ID for a journey created via orderJourneyCreation', async () => {
      // 1. Create order
      const { orderId } = await createTestOrder(
        customer1,
        registeredNode1Address,
        auraGoatAddress,
        1,
        5,
      ); // Request 5 GOAT
      expect(orderId).to.not.equal(ethers.ZeroHash);
      // 2. Create the order's journey
      const { journeyId } = await createOrderJourney(
        orderId,
        registeredNode1Address,
        customer1.address,
        '0.01',
        3600,
        5,
      );
      expect(journeyId).to.not.equal(ethers.ZeroHash);

      // 3. Assert
      const retrievedOrderId =
        await orderRepository.getOrderIdByJourneyId(journeyId);
      expect(retrievedOrderId).to.equal(orderId);
    });

    it('should return zero hash for a standalone journey ID', async () => {
      const { journeyId } = await createTestJourney(customer1, customer2); // Standalone journey
      const orderId = await orderRepository.getOrderIdByJourneyId(journeyId);
      expect(orderId).to.equal(ethers.ZeroHash);
    });
  });

  describe('getCustomerOrders', () => {
    it('should return orders created by a specific customer address', async () => {
      const { orderId: orderId1 } = await createTestOrder(
        customer1,
        registeredNode1Address,
        auraGoatAddress,
        1,
        10,
      );
      const { orderId: orderId2 } = await createTestOrder(
        customer1,
        registeredNode1Address,
        auraGoatAddress,
        2,
        20,
      ); // Another order
      await createTestOrder(
        customer2,
        registeredNode1Address,
        auraGoatAddress,
        1,
        5,
      ); // Order for different customer

      const orders = await orderRepository.getCustomerOrders(customer1.address);
      expect(orders).to.be.an('array').with.lengthOf(2);
      expect(orders.map((o) => o.id)).to.include.members([orderId1, orderId2]);
      expect(orders[0].customer).to.equal(customer1.address);
      expect(orders[1].customer).to.equal(customer1.address);
    });

    it('should return orders for the default signer if address is omitted', async () => {
      const { orderId } = await createTestOrder(
        owner,
        registeredNode1Address,
        auraGoatAddress,
        1,
        7,
      );
      orderRepository = new OrderRepository(
        locationContract,
        testProvider,
        owner,
      ); // Ensure repo signer is owner

      const orders = await orderRepository.getCustomerOrders();
      expect(orders).to.be.an('array').with.lengthOf(1);
      expect(orders[0].id).to.equal(orderId);
      expect(orders[0].customer).to.equal(owner.address);
    });

    it('should return an empty array if the customer has no orders', async () => {
      const orders = await orderRepository.getCustomerOrders(driver1.address);
      expect(orders).to.be.an('array').that.is.empty;
    });
  });

  describe('getOrderById', () => {
    it('should return the correct order for a valid ID', async () => {
      const { orderId } = await createTestOrder(
        customer1,
        registeredNode1Address,
        auraGoatAddress,
        1,
        15,
      );
      expect(orderId).to.not.equal(ethers.ZeroHash);

      const order = await orderRepository.getOrderById(orderId);
      expect(order).to.not.be.null;
      expect(order.id).to.equal(orderId);
      expect(order.customer).to.equal(customer1.address);
      expect(order.requestedTokenQuantity).to.equal(BigInt(15));
    });

    it('should throw an error for an invalid or non-existent order ID', async () => {
      const invalidId = ethers.id('nonExistentOrder');
      await expect(orderRepository.getOrderById(invalidId)).to.be.rejectedWith(
        /Order with ID .* not found/,
      );
    });
  });
});
