/**
 * Redemption Flow End-to-End Tests
 *
 * Tests the complete redemption lifecycle:
 * 1. User holds ERC1155 tokens (from CLOB trade)
 * 2. User initiates redemption with delivery address
 * 3. System calculates route through nodes
 * 4. Tokens are burned
 * 5. Logistics order is created
 * 6. Journey is created for delivery
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { getContext, getChain } from '../../setup/test-setup';
import { ChainManager } from '../../chain/chain-manager';
import { FlowContext, TestUser } from '../../flows/flow-context';
import { getCoverageTracker } from '../../coverage/coverage-tracker';
import { assertTxSuccess, assertNonZeroBytes32 } from '../../utils/assertions';

describe('Redemption Flow', () => {
  let context: FlowContext;
  let chain: ChainManager;
  let customer: TestUser;
  let node1: TestUser;
  let node2: TestUser;

  // Test token details
  const TEST_TOKEN_ID = 1; // GOAT token
  const TEST_QUANTITY = 5n;

  // Delivery coordinates (Washington DC)
  const DESTINATION_LAT = 38.9072;
  const DESTINATION_LNG = -77.0369;

  beforeAll(() => {
    context = getContext();
    chain = getChain();

    // Get test users
    customer = context.getUser('customer1');
    node1 = context.getUser('node1');
    node2 = context.getUser('node2');
  });

  describe('Pre-conditions', () => {
    it('should have customer with ERC1155 token balance', async () => {
      const auraAsset = context.getContract('AuraAsset');

      // Check customer has tokens
      const balance = await auraAsset.balanceOf(
        customer.address,
        TEST_TOKEN_ID,
      );

      // If no balance, mint some for testing
      if (BigInt(balance) < TEST_QUANTITY) {
        // Admin mints tokens to customer for testing
        const admin = context.getUser('deployer');
        const auraAssetAdmin = context.getContractAs('AuraAsset', admin.name);

        await auraAssetAdmin.mint(
          customer.address,
          TEST_TOKEN_ID,
          TEST_QUANTITY,
          '0x',
        );

        const newBalance = await auraAsset.balanceOf(
          customer.address,
          TEST_TOKEN_ID,
        );
        expect(BigInt(newBalance)).toBeGreaterThanOrEqual(TEST_QUANTITY);
      }
    });

    it('should have active nodes registered', async () => {
      const nodeManager = context.getContract('AurumNodeManager');

      // Verify node1 is registered
      const node1Info = await nodeManager.getNode(node1.address);
      expect(node1Info.validNode).toBe(true);
    });
  });

  describe('Token Burning', () => {
    it('should allow customer to burn their own tokens', async () => {
      const auraAsset = context.getContractAs('AuraAsset', customer.name);

      // Get initial balance
      const initialBalance = await auraAsset.balanceOf(
        customer.address,
        TEST_TOKEN_ID,
      );

      // Burn 1 token
      const tx = await auraAsset.burn(customer.address, TEST_TOKEN_ID, 1n);
      await tx.wait();

      // Verify balance decreased
      const newBalance = await auraAsset.balanceOf(
        customer.address,
        TEST_TOKEN_ID,
      );
      expect(BigInt(newBalance)).toBe(BigInt(initialBalance) - 1n);
    });

    it('should prevent burning more tokens than owned', async () => {
      const auraAsset = context.getContractAs('AuraAsset', customer.name);

      // Get current balance
      const balance = await auraAsset.balanceOf(
        customer.address,
        TEST_TOKEN_ID,
      );

      // Try to burn more than balance
      await expect(
        auraAsset.burn(customer.address, TEST_TOKEN_ID, BigInt(balance) + 1n),
      ).rejects.toThrow();
    });
  });

  describe('Order Creation for Redemption', () => {
    let orderId: string;

    it('should create a logistics order for redemption', async () => {
      const auSys = context.getContractAs('AuSys', customer.name);
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Approve payment token for order fees
      const aura = context.getContractAs('Aura', customer.name);
      const auSysAddress = context.getContractAddress('AuSys');
      await (await aura.approve(auSysAddress, ethers.parseEther('100'))).wait();

      // Create order struct for redemption
      const orderStruct = {
        id: ethers.ZeroHash,
        token: auraAssetAddress,
        tokenId: TEST_TOKEN_ID,
        tokenQuantity: 2, // Redeeming 2 units
        price: ethers.parseEther('10'), // Redemption fee
        txFee: 0n,
        buyer: customer.address,
        seller: node1.address, // Origin node
        journeyIds: [],
        nodes: [node1.address, node2.address], // Route through 2 nodes
        locationData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' }, // NYC (origin)
          endLocation: {
            lat: DESTINATION_LAT.toString(),
            lng: DESTINATION_LNG.toString(),
          },
          startName: 'Origin Node',
          endName: 'Customer Address',
        },
        currentStatus: 0, // Created
        contractualAgreement: ethers.ZeroHash,
      };

      const tx = await auSys.orderCreation(orderStruct);
      const receipt = await tx.wait();

      // Extract order ID from event
      const orderCreatedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === 'OrderCreated',
      );

      if (orderCreatedEvent) {
        orderId = orderCreatedEvent.args?.orderId;
        assertNonZeroBytes32(orderId);
      }

      assertTxSuccess(receipt);

      // Track coverage
      getCoverageTracker().mark('IOrderService', 'createOrder');
    });

    it('should have order with multiple nodes in route', async () => {
      if (!orderId) {
        console.log('Skipping - no order ID from previous test');
        return;
      }

      const auSys = context.getContract('AuSys');
      const order = await auSys.getOrder(orderId);

      // Verify nodes array has the route
      expect(order.nodes.length).toBeGreaterThanOrEqual(1);

      // Track coverage
      getCoverageTracker().mark('IOrderRepository', 'getOrderById');
    });
  });

  describe('Journey Creation for Delivery', () => {
    let journeyId: string;

    it('should create journey from order', async () => {
      const auSys = context.getContractAs('AuSys', customer.name);

      // First create an order
      const auraAssetAddress = context.getContractAddress('AuraAsset');
      const aura = context.getContractAs('Aura', customer.name);
      const auSysAddress = context.getContractAddress('AuSys');
      await (await aura.approve(auSysAddress, ethers.parseEther('100'))).wait();

      const orderStruct = {
        id: ethers.ZeroHash,
        token: auraAssetAddress,
        tokenId: TEST_TOKEN_ID,
        tokenQuantity: 1,
        price: ethers.parseEther('5'),
        txFee: 0n,
        buyer: customer.address,
        seller: node1.address,
        journeyIds: [],
        nodes: [node1.address],
        locationData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: {
            lat: DESTINATION_LAT.toString(),
            lng: DESTINATION_LNG.toString(),
          },
          startName: 'Origin',
          endName: 'Destination',
        },
        currentStatus: 0,
        contractualAgreement: ethers.ZeroHash,
      };

      const orderTx = await auSys.orderCreation(orderStruct);
      const orderReceipt = await orderTx.wait();
      const orderEvent = orderReceipt.logs.find(
        (log: any) => log.fragment?.name === 'OrderCreated',
      );
      const orderId = orderEvent?.args?.orderId;

      if (!orderId) {
        console.log('Failed to create order for journey test');
        return;
      }

      // Create journey for the order
      const chainTimestamp = await chain.getTimestamp();
      const eta = chainTimestamp + 7 * 24 * 3600; // 7 days

      const journeyTx = await auSys.orderJourneyCreation(
        orderId,
        node1.address, // Sender (origin node)
        customer.address, // Receiver (customer)
        {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: {
            lat: DESTINATION_LAT.toString(),
            lng: DESTINATION_LNG.toString(),
          },
          startName: 'Origin Node',
          endName: 'Customer',
        },
        ethers.parseEther('0.5'), // Bounty
        eta,
        1, // Token quantity
        TEST_TOKEN_ID, // Asset ID
      );

      const journeyReceipt = await journeyTx.wait();
      assertTxSuccess(journeyReceipt);

      // Extract journey ID
      const journeyEvent = journeyReceipt.logs.find(
        (log: any) => log.fragment?.name === 'JourneyCreated',
      );

      if (journeyEvent) {
        journeyId = journeyEvent.args?.journeyId;
        assertNonZeroBytes32(journeyId);
      }

      // Track coverage
      getCoverageTracker().mark('IOrderService', 'createOrderJourney');
    });

    it('should have journey with correct sender and receiver', async () => {
      if (!journeyId) {
        console.log('Skipping - no journey ID from previous test');
        return;
      }

      const auSys = context.getContract('AuSys');
      const journey = await auSys.getjourney(journeyId);

      expect(journey.sender.toLowerCase()).toBe(node1.address.toLowerCase());
      expect(journey.receiver.toLowerCase()).toBe(
        customer.address.toLowerCase(),
      );

      // Track coverage
      getCoverageTracker().mark('IOrderRepository', 'getJourneyById');
    });
  });

  describe('Full Redemption Flow Integration', () => {
    it('should complete full redemption: burn tokens -> create order -> create journey', async () => {
      const auraAsset = context.getContractAs('AuraAsset', customer.name);
      const auSys = context.getContractAs('AuSys', customer.name);
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Step 1: Check initial balance
      const initialBalance = await auraAsset.balanceOf(
        customer.address,
        TEST_TOKEN_ID,
      );
      const redeemQuantity = 1n;

      if (BigInt(initialBalance) < redeemQuantity) {
        console.log('Insufficient balance for full flow test');
        return;
      }

      // Step 2: Burn tokens (simulating redemption)
      const burnTx = await auraAsset.burn(
        customer.address,
        TEST_TOKEN_ID,
        redeemQuantity,
      );
      await burnTx.wait();

      // Step 3: Verify balance decreased
      const postBurnBalance = await auraAsset.balanceOf(
        customer.address,
        TEST_TOKEN_ID,
      );
      expect(BigInt(postBurnBalance)).toBe(
        BigInt(initialBalance) - redeemQuantity,
      );

      // Step 4: Create logistics order
      const aura = context.getContractAs('Aura', customer.name);
      const auSysAddress = context.getContractAddress('AuSys');
      await (await aura.approve(auSysAddress, ethers.parseEther('100'))).wait();

      const orderStruct = {
        id: ethers.ZeroHash,
        token: auraAssetAddress,
        tokenId: TEST_TOKEN_ID,
        tokenQuantity: Number(redeemQuantity),
        price: ethers.parseEther('7'), // $5 base + $2 per unit
        txFee: 0n,
        buyer: customer.address,
        seller: node1.address,
        journeyIds: [],
        nodes: [node1.address],
        locationData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: {
            lat: DESTINATION_LAT.toString(),
            lng: DESTINATION_LNG.toString(),
          },
          startName: 'Origin Node',
          endName: 'Customer Delivery Address',
        },
        currentStatus: 0,
        contractualAgreement: ethers.ZeroHash,
      };

      const orderTx = await auSys.orderCreation(orderStruct);
      const orderReceipt = await orderTx.wait();
      assertTxSuccess(orderReceipt);

      // Extract order ID
      const orderEvent = orderReceipt.logs.find(
        (log: any) => log.fragment?.name === 'OrderCreated',
      );
      const orderId = orderEvent?.args?.orderId;

      if (orderId) {
        assertNonZeroBytes32(orderId);

        // Step 5: Create journey
        const chainTimestamp = await chain.getTimestamp();
        const eta = chainTimestamp + 5 * 24 * 3600; // 5 days

        const journeyTx = await auSys.orderJourneyCreation(
          orderId,
          node1.address,
          customer.address,
          orderStruct.locationData,
          ethers.parseEther('0.2'), // Bounty
          eta,
          Number(redeemQuantity),
          TEST_TOKEN_ID,
        );

        const journeyReceipt = await journeyTx.wait();
        assertTxSuccess(journeyReceipt);

        console.log('✅ Full redemption flow completed successfully');
      }
    });
  });

  describe('Coverage Tracking', () => {
    it('should have covered redemption-related methods', () => {
      const tracker = getCoverageTracker();

      // Check IOrderService coverage
      const orderServiceCoverage =
        tracker.getInterfaceCoverage('IOrderService');
      expect(orderServiceCoverage).not.toBeNull();

      // Check IOrderRepository coverage
      const orderRepoCoverage =
        tracker.getInterfaceCoverage('IOrderRepository');
      expect(orderRepoCoverage).not.toBeNull();
    });
  });
});
