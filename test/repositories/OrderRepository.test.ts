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
import chai, { expect as chaiExpect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, { SinonStubbedInstance } from 'sinon';

// Configure Chai
chai.use(chaiAsPromised);

describe('OrderRepository', () => {
  // --- Constants moved to top level for shared access ---
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
    owner: '', // Will be set later
    supportedAssets: [1, 2], // GOAT, SHEEP
    status: 'Active',
    capacity: [100, 200],
    assetPrices: [10, 20],
  };
  // --- End Constants ---

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

  // --- Unit Test Setup ---
  let mockLocationContract: SinonStubbedInstance<LocationContract>;
  let mockProvider: SinonStubbedInstance<BrowserProvider>;
  let mockSigner: SinonStubbedInstance<HardhatEthersSigner>;
  let unitTestOrderRepository: OrderRepository;
  let getNodeOrderIdByIndexStub: sinon.SinonStub;
  let getOrderStub: sinon.SinonStub;

  const testNodeAddress = '0xNodeAddress1234567890123456789012345';
  const testOrderId1 = ethers.id('order1');
  const testOrderId2 = ethers.id('order2');
  const zeroHash = ethers.ZeroHash;

  // Sample valid order data for mocking getOrder
  const mockOrder1: LocationContract.OrderStructOutput = {
    id: testOrderId1,
    token: '0xTokenAddress1',
    tokenId: BigInt(1),
    tokenQuantity: BigInt(10),
    requestedTokenQuantity: BigInt(10),
    price: ethers.parseEther('1'),
    txFee: BigInt(100),
    customer: '0xCustomerAddress1',
    journeyIds: [ethers.id('journey1')],
    nodes: [testNodeAddress],
    locationData: {
      // Add required nested structure
      startLocation: { lat: '0', lng: '0' },
      endLocation: { lat: '1', lng: '1' },
      startName: 'Start',
      endName: 'End',
    },
    currentStatus: 0, // Pending
    contracatualAgreement: ethers.ZeroHash,
    // Ensure all fields expected by OrderStructOutput are present
    // Add dummy values or ensure type compatibility for any missing fields
  } as unknown as LocationContract.OrderStructOutput; // Cast if necessary

  // --- Helper Functions (Moved to be accessible by Integration Tests) ---
  // NOTE: These rely on variables defined in the INTEGRATION beforeEach (e.g., owner, locationContract, auraToken)
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
    // This assumes auraToken and locationContract are initialized in the integration test scope
    await auraToken
      .connect(sender)
      .approve(await locationContract.getAddress(), bountyWei);
    const tx = await locationContract.connect(sender).journeyCreation(
      sender.address,
      receiver.address,
      sampleParcelData, // Uses constant
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

  async function createTestOrder(
    customer: HardhatEthersSigner,
    nodeAddress: AddressLike,
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
      txFee: BigInt(0),
      customer: customer.address,
      journeyIds: [],
      nodes: [nodeAddress],
      locationData: sampleParcelData, // Uses constant
      currentStatus: 0,
      contracatualAgreement: ethers.ZeroHash,
    };
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
    // This assumes 'owner' is the signer who can call orderJourneyCreation
    const nodeOwnerSigner = owner;
    const tx = await locationContract
      .connect(nodeOwnerSigner)
      .orderJourneyCreation(
        orderId,
        senderNodeAddress,
        receiverAddress,
        sampleParcelData, // Uses constant
        bountyWei,
        BigInt(etaTimestamp),
        BigInt(tokenQuantity),
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
        'Could not find JourneyCreated event in transaction logs for orderJourney creation.',
      );
    }
    return { journeyId, receipt };
  }
  // --- End Helper Functions ---

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

    // Set owner for sampleNode1Data used in integration tests
    sampleNode1Data.owner = nodeSigner1.address;

    // Register Node 1 owned by nodeSigner1
    registeredNode1Address = await nodeRepository.registerNode(sampleNode1Data);
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

    // --- Added Test Case for Isolation ---
    it('should allow direct fetching of order ID from nodeToOrderIds mapping after linking', async () => {
      // 1. Create an order request
      const { orderId: createdOrderId } = await createTestOrder(
        customer1,
        registeredNode1Address,
        auraGoatAddress,
        1, // GOAT
        15, // quantity
      );
      expect(createdOrderId).to.not.equal(ethers.ZeroHash);

      // 2. Create the journey linking the order to the node
      const { journeyId } = await createOrderJourney(
        createdOrderId,
        registeredNode1Address, // Sender node
        customer1.address, // Receiver
        '0.01', // Bounty
        3600, // ETA offset
        15, // Token quantity for journey
      );
      expect(journeyId).to.not.equal(ethers.ZeroHash);

      // 3. Directly access the contract mapping VIA EXPLICIT GETTER
      let fetchedOrderId: BytesLike = ethers.ZeroHash;
      await expect(
        (async () => {
          // Use the new explicit getter function
          fetchedOrderId = await locationContract.getNodeOrderIdByIndex(
            registeredNode1Address,
            0, // Expecting the first order linked to this node
          );
        })(),
      ).to.not.be.reverted; // Expect the getter call itself not to revert

      // 4. Assert the fetched ID matches the created order ID
      expect(fetchedOrderId).to.equal(createdOrderId);

      // 5. Check that accessing an index beyond the linked orders returns ZeroHash VIA EXPLICIT GETTER
      let outOfBoundsOrderId: BytesLike = ethers.ZeroHash;
      await expect(
        (async () => {
          // Use the new explicit getter function
          outOfBoundsOrderId = await locationContract.getNodeOrderIdByIndex(
            registeredNode1Address,
            1, // Index 1 should not exist yet
          );
        })(),
      ).to.not.be.reverted; // The getter handles bounds check now
      expect(outOfBoundsOrderId).to.equal(ethers.ZeroHash);
    });
    // --- End Added Test Case ---
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

  describe('getNodeOrders [Unit Tests]', () => {
    beforeEach('Unit Test Setup', () => {
      // --- Mock specific methods needed, not the whole contract instance ---
      getNodeOrderIdByIndexStub = sinon.stub();
      getOrderStub = sinon.stub();
      const mockLocationContractObj = {
        getNodeOrderIdByIndex: getNodeOrderIdByIndexStub,
        getOrder: getOrderStub,
        // Add dummy getAddress if needed by constructor/other methods
        getAddress: sinon.stub().resolves(ethers.ZeroAddress),
      };

      // --- Keep stubs for Provider/Signer if used ---
      mockProvider = sinon.createStubInstance(BrowserProvider);
      mockSigner = sinon.createStubInstance(HardhatEthersSigner);

      // Default provider/signer address if needed by repo constructor/methods
      // mockSigner.getAddress.resolves('0xDefaultSignerAddress');

      unitTestOrderRepository = new OrderRepository(
        mockLocationContractObj as unknown as LocationContract, // Cast the mock object
        mockProvider, // Use stubbed provider
        mockSigner as unknown as Signer, // Use stubbed signer
      );
    });

    afterEach('Unit Test Teardown', () => {
      // --- ADDED Unit Test Teardown ---
      sinon.restore();
    });

    it('should return orders when getNodeOrderIdByIndex and getOrder succeed', async () => {
      getNodeOrderIdByIndexStub
        .withArgs(testNodeAddress, 0)
        .resolves(testOrderId1);
      getNodeOrderIdByIndexStub.withArgs(testNodeAddress, 1).resolves(zeroHash);
      getOrderStub.withArgs(testOrderId1).resolves(mockOrder1);

      const orders =
        await unitTestOrderRepository.getNodeOrders(testNodeAddress);

      expect(orders).to.be.an('array').with.lengthOf(1);
      expect(orders[0].id).to.equal(testOrderId1);
      expect(getNodeOrderIdByIndexStub.calledTwice).to.be.true;
      expect(getOrderStub.calledOnceWithExactly(testOrderId1)).to.be.true;
    });

    it('should return an empty array if getNodeOrderIdByIndex returns ZeroHash immediately', async () => {
      getNodeOrderIdByIndexStub.withArgs(testNodeAddress, 0).resolves(zeroHash);

      const orders =
        await unitTestOrderRepository.getNodeOrders(testNodeAddress);

      expect(orders).to.be.an('array').that.is.empty;
      expect(
        getNodeOrderIdByIndexStub.calledOnceWithExactly(testNodeAddress, 0),
      ).to.be.true;
      expect(getOrderStub.called).to.be.false;
    });

    it('should skip an order if getOrder returns an invalid order (id is ZeroHash)', async () => {
      const invalidOrder = { ...mockOrder1, id: zeroHash };
      getNodeOrderIdByIndexStub
        .withArgs(testNodeAddress, 0)
        .resolves(testOrderId1);
      getNodeOrderIdByIndexStub.withArgs(testNodeAddress, 1).resolves(zeroHash);
      getOrderStub.withArgs(testOrderId1).resolves(invalidOrder as any);

      // Act
      const orders =
        await unitTestOrderRepository.getNodeOrders(testNodeAddress);

      // Assert
      expect(orders).to.be.an('array').that.is.empty; // Should be skipped
      expect(getOrderStub.calledOnceWithExactly(testOrderId1)).to.be.true;
    });

    it('should handle errors during getOrder call and continue if possible (or break based on impl.)', async () => {
      // Arrange: First ID valid, second ID causes getOrder error, third ID is end
      getNodeOrderIdByIndexStub
        .withArgs(testNodeAddress, 0)
        .resolves(testOrderId1);
      getNodeOrderIdByIndexStub
        .withArgs(testNodeAddress, 1)
        .resolves(testOrderId2); // Add a second ID
      getNodeOrderIdByIndexStub.withArgs(testNodeAddress, 2).resolves(zeroHash); // End of list

      getOrderStub.withArgs(testOrderId1).resolves(mockOrder1); // First order is valid
      getOrderStub
        .withArgs(testOrderId2)
        .rejects(new Error('Failed to fetch order')); // Second order fails

      // Act
      const orders =
        await unitTestOrderRepository.getNodeOrders(testNodeAddress);

      // Assert: Current implementation logs error and continues, so expects 1 order
      expect(orders).to.be.an('array').with.lengthOf(1);
      expect(orders[0].id).to.equal(testOrderId1);
      expect(getOrderStub.calledTwice).to.be.true; // Called for order1 and order2
      expect(getOrderStub.getCall(0).args[0]).to.equal(testOrderId1);
      expect(getOrderStub.getCall(1).args[0]).to.equal(testOrderId2);
    });

    it('should break loop if getNodeOrderIdByIndex throws an error', async () => {
      // Arrange
      getNodeOrderIdByIndexStub
        .withArgs(testNodeAddress, 0)
        .rejects(new Error('Contract Read Error'));

      // Act
      const orders =
        await unitTestOrderRepository.getNodeOrders(testNodeAddress);

      // Assert: Current implementation catches, logs, and breaks, returning empty
      expect(orders).to.be.an('array').that.is.empty;
      expect(getNodeOrderIdByIndexStub.calledOnce).to.be.true;
      expect(getOrderStub.called).to.be.false;
    });

    it('should handle MAX_NODE_ORDERS limit', async () => {
      // Arrange: Simulate reaching the limit
      const MAX_NODE_ORDERS = 100; // Match the constant in the repo
      for (let i = 0; i < MAX_NODE_ORDERS; i++) {
        const loopOrderId = ethers.id(`orderLoop${i}`);
        getNodeOrderIdByIndexStub
          .withArgs(testNodeAddress, i)
          .resolves(loopOrderId);
        // Mock getOrder to return a basic valid order for each ID
        getOrderStub
          .withArgs(loopOrderId)
          .resolves({ ...mockOrder1, id: loopOrderId } as any);
      }
      // Mock the call *after* the limit to return ZeroHash (though loop should break before)
      getNodeOrderIdByIndexStub
        .withArgs(testNodeAddress, MAX_NODE_ORDERS)
        .resolves(zeroHash);

      // Act
      const orders =
        await unitTestOrderRepository.getNodeOrders(testNodeAddress);

      // Assert
      expect(orders).to.be.an('array').with.lengthOf(MAX_NODE_ORDERS);
      expect(getNodeOrderIdByIndexStub.callCount).to.equal(MAX_NODE_ORDERS); // Loop should run exactly MAX times
      expect(getOrderStub.callCount).to.equal(MAX_NODE_ORDERS);
    });
  });
});
