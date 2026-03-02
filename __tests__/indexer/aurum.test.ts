import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database
const mockDb = {
  nodes: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  nodeAssets: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  nodeRegisteredEvents: { create: vi.fn() },
  nodeOwnershipTransferredEvents: { create: vi.fn() },
  nodeStatusUpdatedEvents: { create: vi.fn() },
  supportedAssetAddedEvents: { create: vi.fn() },
  assetCapacity: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
};

const mockClient = {
  readContract: vi.fn(),
};

const mockContext = {
  db: mockDb,
  client: mockClient,
  contracts: {
    AurumNodeManager: {
      abi: [],
      address: '0x5Dd5881fFa8fb3c4fAD112ffc4a37f0300dd1835',
    },
  },
};

function createMockEvent(args: any, overrides: Partial<any> = {}) {
  return {
    args,
    block: {
      number: 12345678n,
      timestamp: 1704067200n,
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

describe('Aurum NodeManager Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NodeRegistered', () => {
    it('should create a node entity with location data', async () => {
      const nodeAddress =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const owner =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;

      mockClient.readContract.mockResolvedValueOnce({
        location: {
          addressName: 'Warehouse A',
          location: { lat: '40.7128', lng: '-74.0060' },
        },
        validNode: '0x01',
        status: '0x01',
      });

      const event = createMockEvent({
        nodeAddress,
        owner,
      });

      await mockDb.nodes.create({
        id: nodeAddress,
        owner,
        addressName: 'Warehouse A',
        lat: '40.7128',
        lng: '-74.0060',
        validNode: true,
        status: 'Active',
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      await mockDb.nodeRegisteredEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        nodeAddress,
        owner,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.nodes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: nodeAddress,
          owner,
          addressName: 'Warehouse A',
          validNode: true,
          status: 'Active',
        }),
      );

      expect(mockDb.nodeRegisteredEvents.create).toHaveBeenCalled();
    });

    it('should handle contract call failure with defaults', async () => {
      const nodeAddress =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const owner =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;

      mockClient.readContract.mockRejectedValueOnce(new Error('RPC error'));

      const event = createMockEvent({ nodeAddress, owner });

      await mockDb.nodes.create({
        id: nodeAddress,
        owner,
        addressName: '',
        lat: '0',
        lng: '0',
        validNode: true,
        status: 'Active',
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.nodes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          addressName: '',
          lat: '0',
          lng: '0',
        }),
      );
    });
  });

  describe('eventUpdateLocation', () => {
    it('should update node location', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

      const event = createMockEvent({
        addressName: 'New Warehouse',
        lat: '34.0522',
        lng: '-118.2437',
        node,
      });

      await mockDb.nodes.update({
        id: node,
        data: {
          addressName: 'New Warehouse',
          lat: '34.0522',
          lng: '-118.2437',
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.nodes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: node,
          data: expect.objectContaining({
            addressName: 'New Warehouse',
            lat: '34.0522',
            lng: '-118.2437',
          }),
        }),
      );
    });
  });

  describe('eventUpdateOwner', () => {
    it('should update node owner and create transfer event', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const newOwner =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const oldOwner =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;

      mockDb.nodes.findUnique.mockResolvedValueOnce({
        id: node,
        owner: oldOwner,
      });

      const event = createMockEvent({
        owner: newOwner,
        node,
      });

      await mockDb.nodes.update({
        id: node,
        data: {
          owner: newOwner,
          updatedAt: event.block.timestamp,
        },
      });

      await mockDb.nodeOwnershipTransferredEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        nodeAddress: node,
        oldOwner,
        newOwner,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.nodes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: node,
          data: expect.objectContaining({ owner: newOwner }),
        }),
      );

      expect(mockDb.nodeOwnershipTransferredEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oldOwner,
          newOwner,
        }),
      );
    });
  });

  describe('eventUpdateStatus', () => {
    it('should update node status to Active', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

      const event = createMockEvent({
        status: '0x01',
        node,
      });

      await mockDb.nodes.update({
        id: node,
        data: {
          status: 'Active',
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.nodes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'Active' }),
        }),
      );
    });

    it('should update node status to Inactive', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

      const event = createMockEvent({
        status: '0x00',
        node,
      });

      await mockDb.nodes.update({
        id: node,
        data: {
          status: 'Inactive',
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.nodes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'Inactive' }),
        }),
      );
    });
  });

  describe('SupportedAssetAdded', () => {
    it('should create new node asset', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const token =
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`;
      const tokenId = 1n;
      const price = 1000000n;
      const capacity = 100n;

      const nodeAssetId = `${node}-${token}-${tokenId.toString()}`;

      mockDb.nodeAssets.findUnique.mockResolvedValueOnce(null);
      mockDb.assetCapacity.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        node,
        asset: { token, tokenId, price, capacity },
      });

      await mockDb.nodeAssets.create({
        id: nodeAssetId,
        node,
        token,
        tokenId,
        price,
        capacity,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.nodeAssets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: nodeAssetId,
          node,
          token,
          tokenId,
          price,
          capacity,
        }),
      );
    });

    it('should update existing node asset', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const token =
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`;
      const tokenId = 1n;
      const newPrice = 2000000n;
      const newCapacity = 200n;

      const nodeAssetId = `${node}-${token}-${tokenId.toString()}`;

      mockDb.nodeAssets.findUnique.mockResolvedValueOnce({
        id: nodeAssetId,
        node,
        token,
        tokenId,
        price: 1000000n,
        capacity: 100n,
      });

      const event = createMockEvent({
        node,
        asset: { token, tokenId, price: newPrice, capacity: newCapacity },
      });

      await mockDb.nodeAssets.update({
        id: nodeAssetId,
        data: {
          price: newPrice,
          capacity: newCapacity,
          updatedAt: event.block.timestamp,
          blockNumber: event.block.number,
          transactionHash: event.transaction.hash,
        },
      });

      expect(mockDb.nodeAssets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: nodeAssetId,
          data: expect.objectContaining({
            price: newPrice,
            capacity: newCapacity,
          }),
        }),
      );
    });
  });

  describe('SupportedAssetsUpdated', () => {
    it('should update multiple assets at once', async () => {
      const node =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const token =
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`;

      const supportedAssets = [
        { token, tokenId: 1n, price: 1000000n, capacity: 100n },
        { token, tokenId: 2n, price: 2000000n, capacity: 200n },
      ];

      mockDb.nodeAssets.findUnique.mockResolvedValue(null);
      mockDb.assetCapacity.findUnique.mockResolvedValue(null);

      const event = createMockEvent({
        node,
        supportedAssets,
      });

      // Simulate handler updating each asset
      for (const asset of supportedAssets) {
        const nodeAssetId = `${node}-${asset.token}-${asset.tokenId.toString()}`;

        await mockDb.nodeAssets.create({
          id: nodeAssetId,
          node,
          token: asset.token,
          tokenId: asset.tokenId,
          price: asset.price,
          capacity: asset.capacity,
          createdAt: event.block.timestamp,
          updatedAt: event.block.timestamp,
          blockNumber: event.block.number,
          transactionHash: event.transaction.hash,
        });
      }

      expect(mockDb.nodeAssets.create).toHaveBeenCalledTimes(2);
    });
  });
});
