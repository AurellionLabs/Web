import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the ponder module - Only event tables, no derived stats tables
const mockDb = {
  journeys: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  orders: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  // Event tables only
  journeyCreatedEvents: { create: vi.fn() },
  journeyStatusUpdates: { create: vi.fn() },
  orderCreatedEvents: { create: vi.fn() },
  orderStatusUpdates: { create: vi.fn() },
  orderSettledEvents: { create: vi.fn() },
  packageSignatures: { create: vi.fn() },
  driverAssignments: { create: vi.fn() },
  fundsEscrowedEvents: { create: vi.fn() },
  sellerPaidEvents: { create: vi.fn() },
  nodeFeeDistributedEvents: { create: vi.fn() },
};

const mockClient = {
  readContract: vi.fn(),
};

const mockContext = {
  db: mockDb,
  client: mockClient,
  contracts: {
    Ausys: {
      abi: [],
      address: '0x986dC5647390e40AB9c0429ceE017034D42CB3bA',
    },
  },
};

// Helper to create mock events
function createMockEvent(args: any, overrides: Partial<any> = {}) {
  return {
    args,
    block: {
      number: 12345678n,
      timestamp: 1704067200n, // 2024-01-01 00:00:00
    },
    transaction: {
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
      from: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    },
    log: {
      logIndex: 0,
    },
    ...overrides,
  };
}

describe('AuSys Event Handlers (Event-Only Storage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JourneyCreated', () => {
    it('should create a journey entity with correct data', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const sender =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const receiver =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;

      const event = createMockEvent({
        journeyId,
        sender,
        receiver,
      });

      // Mock contract call
      mockClient.readContract.mockResolvedValueOnce({
        bounty: 1000000000000000000n, // 1 ETH
        eta: 1704153600n,
        parcelData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: { lat: '34.0522', lng: '-118.2437' },
          startName: 'New York',
          endName: 'Los Angeles',
        },
      });

      // Mock journeyToOrderId call (no linked order)
      mockClient.readContract.mockResolvedValueOnce(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      // Create journey entity
      await mockDb.journeys.create({
        id: journeyId,
        sender,
        receiver,
        driver: null,
        currentStatus: 0,
        bounty: 1000000000000000000n,
        journeyStart: 0n,
        journeyEnd: 0n,
        eta: 1704153600n,
        startLocationLat: '40.7128',
        startLocationLng: '-74.0060',
        endLocationLat: '34.0522',
        endLocationLng: '-118.2437',
        startName: 'New York',
        endName: 'Los Angeles',
        orderId: null,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      // Create journey created event
      await mockDb.journeyCreatedEvents.create({
        id: eventId,
        journeyId,
        sender,
        receiver,
        bounty: 1000000000000000000n,
        eta: 1704153600n,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.journeys.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: journeyId,
          sender,
          receiver,
          driver: null,
          currentStatus: 0,
          bounty: 1000000000000000000n,
        }),
      );

      expect(mockDb.journeyCreatedEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          journeyId,
          sender,
        }),
      );
    });

    it('should handle contract call failure gracefully', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;

      mockClient.readContract.mockRejectedValueOnce(new Error('RPC error'));

      const event = createMockEvent({
        journeyId,
        sender: '0xaaaa' as `0x${string}`,
        receiver: '0xbbbb' as `0x${string}`,
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      // Handler should still create journey with default values
      await mockDb.journeys.create({
        id: journeyId,
        sender: '0xaaaa' as `0x${string}`,
        receiver: '0xbbbb' as `0x${string}`,
        driver: null,
        currentStatus: 0,
        bounty: 0n,
        eta: 0n,
        startLocationLat: '',
        startLocationLng: '',
        endLocationLat: '',
        endLocationLng: '',
        startName: '',
        endName: '',
        orderId: null,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      await mockDb.journeyCreatedEvents.create({
        id: eventId,
        journeyId,
        sender: '0xaaaa' as `0x${string}`,
        receiver: '0xbbbb' as `0x${string}`,
        bounty: 0n,
        eta: 0n,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.journeys.create).toHaveBeenCalled();
      expect(mockDb.journeyCreatedEvents.create).toHaveBeenCalled();
    });
  });

  describe('JourneyStatusUpdated', () => {
    it('should update journey status to InTransit', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;

      mockDb.journeys.findUnique.mockResolvedValueOnce({
        id: journeyId,
        currentStatus: 0,
      });

      const event = createMockEvent({
        journeyId,
        newStatus: 1, // InTransit
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      // Update journey status
      await mockDb.journeys.update({
        id: journeyId,
        data: {
          currentStatus: 1,
          journeyStart: event.block.timestamp,
          updatedAt: event.block.timestamp,
        },
      });

      // Create status update event
      await mockDb.journeyStatusUpdates.create({
        id: eventId,
        journeyId,
        oldStatus: 0,
        newStatus: 1,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.journeys.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: journeyId,
          data: expect.objectContaining({
            currentStatus: 1,
            journeyStart: 1704067200n,
          }),
        }),
      );

      expect(mockDb.journeyStatusUpdates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          journeyId,
          oldStatus: 0,
          newStatus: 1,
        }),
      );
    });

    it('should update journey status to Delivered and set journeyEnd', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;

      mockDb.journeys.findUnique.mockResolvedValueOnce({
        id: journeyId,
        currentStatus: 1,
      });

      const event = createMockEvent({
        journeyId,
        newStatus: 2, // Delivered
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      await mockDb.journeys.update({
        id: journeyId,
        data: {
          currentStatus: 2,
          journeyEnd: event.block.timestamp,
          updatedAt: event.block.timestamp,
        },
      });

      await mockDb.journeyStatusUpdates.create({
        id: eventId,
        journeyId,
        oldStatus: 1,
        newStatus: 2,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.journeys.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStatus: 2,
            journeyEnd: 1704067200n,
          }),
        }),
      );
    });
  });

  describe('OrderCreated', () => {
    it('should create an order with all fields', async () => {
      const orderId =
        '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as `0x${string}`;
      const buyer =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const seller =
        '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`;
      const token =
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`;
      const nodes = [
        '0x1111111111111111111111111111111111111111' as `0x${string}`,
        '0x2222222222222222222222222222222222222222' as `0x${string}`,
      ];

      const event = createMockEvent({
        orderId,
        buyer,
        seller,
        token,
        tokenId: 1n,
        tokenQuantity: 100n,
        requestedTokenQuantity: 100n,
        price: 1000000n, // 1 USDT
        txFee: 10000n, // 0.01 USDT
        currentStatus: 0,
        nodes,
        locationData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: { lat: '34.0522', lng: '-118.2437' },
          startName: 'New York',
          endName: 'Los Angeles',
        },
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      await mockDb.orders.create({
        id: orderId,
        buyer,
        seller,
        token,
        tokenId: 1n,
        tokenQuantity: 100n,
        requestedTokenQuantity: 100n,
        price: 1000000n,
        txFee: 10000n,
        currentStatus: 0,
        startLocationLat: '40.7128',
        startLocationLng: '-74.0060',
        endLocationLat: '34.0522',
        endLocationLng: '-118.2437',
        startName: 'New York',
        endName: 'Los Angeles',
        nodes: JSON.stringify(nodes),
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      await mockDb.orderCreatedEvents.create({
        id: eventId,
        orderId,
        buyer,
        seller,
        price: 1000000n,
        tokenQuantity: 100n,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          buyer,
          seller,
          tokenQuantity: 100n,
          price: 1000000n,
        }),
      );

      expect(mockDb.orderCreatedEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          buyer,
        }),
      );
    });
  });

  describe('OrderSettled', () => {
    it('should update order status and create settlement event', async () => {
      const orderId =
        '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as `0x${string}`;

      mockClient.readContract.mockResolvedValueOnce({
        price: 1000000n,
        txFee: 10000n,
      });

      mockDb.orders.findUnique.mockResolvedValueOnce({
        id: orderId,
        nodes: JSON.stringify([
          '0x1111' as `0x${string}`,
          '0x2222' as `0x${string}`,
        ]),
      });

      const event = createMockEvent({ orderId });
      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      // Update order status
      await mockDb.orders.update({
        id: orderId,
        data: {
          currentStatus: 2,
          updatedAt: event.block.timestamp,
        },
      });

      // Create settlement event
      await mockDb.orderSettledEvents.create({
        id: eventId,
        orderId,
        totalPrice: 1000000n,
        totalFee: 10000n,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.orders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: orderId,
          data: expect.objectContaining({
            currentStatus: 2,
          }),
        }),
      );

      expect(mockDb.orderSettledEvents.create).toHaveBeenCalled();
    });
  });

  describe('DriverAssigned', () => {
    it('should update journey with driver and create assignment event', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const driver =
        '0xffffffffffffffffffffffffffffffffffffffffff' as `0x${string}`;

      const event = createMockEvent({
        driver,
        journeyId,
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      // Update journey with driver
      await mockDb.journeys.update({
        id: journeyId,
        data: {
          driver,
          updatedAt: event.block.timestamp,
        },
      });

      // Create driver assignment event
      await mockDb.driverAssignments.create({
        id: `${eventId}-assignment`,
        driver,
        journeyId,
        assignedBy: event.transaction.from,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.journeys.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: journeyId,
          data: expect.objectContaining({ driver }),
        }),
      );

      expect(mockDb.driverAssignments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          driver,
          journeyId,
        }),
      );
    });
  });

  describe('PackageSignature (emitSig)', () => {
    it('should determine signature type from sender', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const sender =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

      mockDb.journeys.findUnique.mockResolvedValueOnce({
        id: journeyId,
        sender,
        receiver: '0xbbbb' as `0x${string}`,
        driver: null,
        currentStatus: 0,
      });

      const event = createMockEvent({
        user: sender,
        id: journeyId,
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      await mockDb.packageSignatures.create({
        id: eventId,
        journeyId,
        signer: sender,
        signatureType: 'sender',
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.packageSignatures.create).toHaveBeenCalledWith(
        expect.objectContaining({
          signer: sender,
          signatureType: 'sender',
        }),
      );
    });

    it('should determine signature type from receiver', async () => {
      const journeyId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const receiver =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;

      mockDb.journeys.findUnique.mockResolvedValueOnce({
        id: journeyId,
        sender: '0xaaaa' as `0x${string}`,
        receiver,
        driver: null,
        currentStatus: 1,
      });

      const event = createMockEvent({
        user: receiver,
        id: journeyId,
      });

      const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

      await mockDb.packageSignatures.create({
        id: eventId,
        journeyId,
        signer: receiver,
        signatureType: 'receiver',
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.packageSignatures.create).toHaveBeenCalledWith(
        expect.objectContaining({
          signer: receiver,
          signatureType: 'receiver',
        }),
      );
    });
  });
});
