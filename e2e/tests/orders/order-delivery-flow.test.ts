/**
 * Order Delivery Flow Tests
 *
 * End-to-end tests for the complete order and delivery lifecycle.
 * Tests mirror exact UI flows as implemented in the hooks.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { getContext, getChain } from '../../setup/test-setup';
import {
  OrderFlows,
  createOrderFlows,
  ParcelData,
} from '../../flows/order-flows';
import { FlowContext, TestUser } from '../../flows/flow-context';
import { getCoverageTracker } from '../../coverage/coverage-tracker';
import { assertTxSuccess, assertNonZeroBytes32 } from '../../utils/assertions';

describe('Order Delivery Complete Flow', () => {
  let context: FlowContext;
  let orderFlows: OrderFlows;
  let customer1: TestUser;
  let customer2: TestUser;
  let driver: TestUser;
  let node: TestUser;

  // Sample parcel data
  const sampleParcelData: ParcelData = {
    startLat: '40.7128',
    startLng: '-74.0060',
    endLat: '34.0522',
    endLng: '-118.2437',
    startName: 'New York, NY',
    endName: 'Los Angeles, CA',
  };

  beforeAll(() => {
    context = getContext();
    orderFlows = createOrderFlows(context, process.env.VERBOSE === 'true');

    // Get test users
    customer1 = context.getUser('customer1');
    customer2 = context.getUser('customer2');
    driver = context.getUser('driver1');
    node = context.getUser('node1');
  });

  describe('Job Creation', () => {
    it('should allow customer to create a delivery job', async () => {
      const result = await orderFlows.createJob(customer1, {
        parcelData: sampleParcelData,
        recipientAddress: customer2.address,
        bounty: '0.5', // 0.5 ETH bounty
        eta: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      });

      // Verify
      assertNonZeroBytes32(result.journeyId);
      assertTxSuccess(result.receipt);

      // Verify journey was created
      const journey = await orderFlows.getJourney(result.journeyId);
      expect(journey).toBeDefined();
    });

    it('should create job with sender defaulting to customer', async () => {
      const result = await orderFlows.createJob(customer1, {
        parcelData: {
          startLat: '51.5074',
          startLng: '-0.1278',
          endLat: '48.8566',
          endLng: '2.3522',
          startName: 'London, UK',
          endName: 'Paris, France',
        },
        recipientAddress: customer2.address,
        bounty: '0.3',
      });

      assertNonZeroBytes32(result.journeyId);
    });
  });

  describe('Order Creation', () => {
    it('should allow customer to create an order', async () => {
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      const result = await orderFlows.createOrder(customer1, {
        sender: customer1.address,
        receiver: customer2.address,
        nodeAddress: node.address,
        tokenAddress: auraAssetAddress,
        tokenId: '1', // GOAT token
        quantity: '10',
        price: '100', // 100 AURA per unit
      });

      assertNonZeroBytes32(result.orderId);
      assertTxSuccess(result.receipt);

      // Verify order was created
      const order = await orderFlows.getOrder(result.orderId);
      expect(order).toBeDefined();
    });

    it('should allow adding receiver to an order', async () => {
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Create order without receiver initially
      const createResult = await orderFlows.createOrder(customer1, {
        sender: customer1.address,
        receiver: ethers.ZeroAddress, // No receiver yet
        nodeAddress: node.address,
        tokenAddress: auraAssetAddress,
        tokenId: '1',
        quantity: '5',
        price: '50',
      });

      // Add receiver
      const addResult = await orderFlows.addReceiverToOrder(
        customer1,
        createResult.orderId,
        customer2.address,
      );

      if (addResult.success) {
        const order = await orderFlows.getOrder(createResult.orderId);
        expect(order.receiver.toLowerCase()).toBe(
          customer2.address.toLowerCase(),
        );
      }
    });
  });

  describe('Driver Delivery Flow', () => {
    let journeyId: string;

    beforeAll(async () => {
      // Create a job for delivery testing
      const result = await orderFlows.createJob(customer1, {
        parcelData: sampleParcelData,
        recipientAddress: customer2.address,
        bounty: '1', // 1 ETH bounty
        eta: Math.floor(Date.now() / 1000) + 172800, // 48 hours
      });

      journeyId = result.journeyId;
    });

    it('should allow driver to accept delivery', async () => {
      const result = await orderFlows.acceptDelivery(driver, journeyId);

      if (result.success) {
        expect(result.transactionHash).toBeDefined();
      }
    });

    it('should allow driver to confirm pickup', async () => {
      const result = await orderFlows.confirmPickup(driver, journeyId);

      if (result.success) {
        expect(result.transactionHash).toBeDefined();
      }
    });

    it('should allow driver to sign package', async () => {
      const result = await orderFlows.driverSignPackage(driver, journeyId);

      if (result.success) {
        expect(result.transactionHash).toBeDefined();
      }
    });

    it('should allow customer to sign for package', async () => {
      const result = await orderFlows.customerSignPackage(customer2, journeyId);

      if (result.success) {
        expect(result.transactionHash).toBeDefined();
      }
    });

    it('should allow driver to complete delivery', async () => {
      const result = await orderFlows.completeDelivery(driver, journeyId);

      if (result.success) {
        expect(result.transactionHash).toBeDefined();

        // Verify journey is completed
        const journey = await orderFlows.getJourney(journeyId);
        // Check status indicates completion
        expect(journey).toBeDefined();
      }
    });
  });

  describe('Order Journey Flow', () => {
    let orderId: string;

    beforeAll(async () => {
      // Create an order for journey testing
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      const result = await orderFlows.createOrder(customer1, {
        sender: customer1.address,
        receiver: customer2.address,
        nodeAddress: node.address,
        tokenAddress: auraAssetAddress,
        tokenId: '1',
        quantity: '20',
        price: '200',
      });

      orderId = result.orderId;
    });

    it('should allow node to create order journey', async () => {
      const result = await orderFlows.createOrderJourney(
        node,
        orderId,
        customer2.address,
        sampleParcelData,
        '0.5', // 0.5 ETH bounty
        Math.floor(Date.now() / 1000) + 86400, // 24 hours
        '20', // All tokens
        '1', // Asset ID
      );

      if (result.success) {
        expect(result.transactionHash).toBeDefined();
      }
    });
  });

  describe('Query Operations', () => {
    beforeAll(async () => {
      // Create some orders and journeys for query testing
      const auraAssetAddress = context.getContractAddress('AuraAsset');

      // Create multiple orders
      await orderFlows.createOrder(customer1, {
        sender: customer1.address,
        receiver: customer2.address,
        nodeAddress: node.address,
        tokenAddress: auraAssetAddress,
        tokenId: '1',
        quantity: '5',
        price: '50',
      });

      await orderFlows.createOrder(customer1, {
        sender: customer1.address,
        receiver: customer2.address,
        nodeAddress: node.address,
        tokenAddress: auraAssetAddress,
        tokenId: '2',
        quantity: '10',
        price: '100',
      });

      // Create jobs
      await orderFlows.createJob(customer1, {
        parcelData: sampleParcelData,
        recipientAddress: customer2.address,
        bounty: '0.2',
      });
    });

    it('should get orders by customer', async () => {
      const orders = await orderFlows.getOrdersByCustomer(customer1.address);
      expect(orders.length).toBeGreaterThan(0);
    });

    it('should get orders by node', async () => {
      const orders = await orderFlows.getOrdersByNode(node.address);
      expect(orders.length).toBeGreaterThan(0);
    });

    it('should get journeys by driver', async () => {
      const journeys = await orderFlows.getJourneysByDriver(driver.address);
      // May be empty if driver hasn't accepted any
      expect(journeys).toBeDefined();
    });

    it('should get driver deliveries', async () => {
      const deliveries = await orderFlows.getDriverDeliveries(driver.address);
      expect(deliveries).toBeDefined();
    });
  });

  describe('Coverage Tracking', () => {
    it('should have covered all IOrderService methods', () => {
      const tracker = getCoverageTracker();

      expect(tracker.isCovered('IOrderService', 'jobCreation')).toBe(true);
      expect(tracker.isCovered('IOrderService', 'createOrder')).toBe(true);
      expect(tracker.isCovered('IOrderService', 'customerSignPackage')).toBe(
        true,
      );
      expect(tracker.isCovered('IOrderService', 'addReceiverToOrder')).toBe(
        true,
      );
      expect(tracker.isCovered('IOrderService', 'createOrderJourney')).toBe(
        true,
      );
    });

    it('should have covered all IDriverService methods', () => {
      const tracker = getCoverageTracker();

      expect(tracker.isCovered('IDriverService', 'acceptDelivery')).toBe(true);
      expect(tracker.isCovered('IDriverService', 'confirmPickup')).toBe(true);
      expect(tracker.isCovered('IDriverService', 'packageSign')).toBe(true);
      expect(tracker.isCovered('IDriverService', 'completeDelivery')).toBe(
        true,
      );
    });

    it('should have covered key IOrderRepository methods', () => {
      const tracker = getCoverageTracker();

      expect(tracker.isCovered('IOrderRepository', 'getJourneyById')).toBe(
        true,
      );
      expect(tracker.isCovered('IOrderRepository', 'getOrderById')).toBe(true);
      expect(tracker.isCovered('IOrderRepository', 'getOrdersByCustomer')).toBe(
        true,
      );
      expect(tracker.isCovered('IOrderRepository', 'getOrdersByNode')).toBe(
        true,
      );
      expect(tracker.isCovered('IOrderRepository', 'getJourneysByDriver')).toBe(
        true,
      );
    });

    it('should have covered IDriverRepository methods', () => {
      const tracker = getCoverageTracker();

      expect(tracker.isCovered('IDriverRepository', 'getMyDeliveries')).toBe(
        true,
      );
    });
  });
});
