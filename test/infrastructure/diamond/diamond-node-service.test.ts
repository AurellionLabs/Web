/**
 * DiamondNodeService Tests
 *
 * Tests node registration and management operations.
 */
import { ethers } from 'ethers';
import { DiamondNodeService } from '@/infrastructure/diamond/diamond-node-service';

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0x1235E39477752713902bCE541Fc02ADeb6FF465b',
}));

const OWNER = '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF';
const NODE_HASH =
  '0x0000000000000000000000001234567890123456789012345678901234567890';

function createMockContext(overrides: Record<string, any> = {}) {
  const mockReceipt = {
    hash: '0xtxhash',
    blockNumber: 100,
    logs: overrides.logs ?? [],
  };
  const mockTx = {
    hash: '0xtxhash',
    wait: vi.fn().mockResolvedValue(mockReceipt),
  };

  const mockInterface = {
    parseLog: vi.fn().mockReturnValue(
      overrides.parsedLog ?? {
        name: 'NodeRegistered',
        args: { nodeHash: NODE_HASH },
      },
    ),
  };

  const diamond = {
    registerNode: vi.fn().mockResolvedValue(mockTx),
    updateNodeStatus: vi.fn().mockResolvedValue(mockTx),
    updateNodeLocation: vi.fn().mockResolvedValue(mockTx),
    addSupportingDocument: vi.fn().mockResolvedValue(mockTx),
    removeSupportingDocument: vi.fn().mockResolvedValue(mockTx),
    interface: mockInterface,
    ...overrides.diamond,
  };

  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getSignerAddress: vi.fn().mockResolvedValue(OWNER),
    _diamond: diamond,
    _mockTx: mockTx,
    _mockReceipt: mockReceipt,
  } as any;
}

describe('DiamondNodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerNode', () => {
    it('should call registerNode with correct params', async () => {
      const context = createMockContext({
        logs: [{ topics: ['0x'], data: '0x' }],
      });
      const service = new DiamondNodeService(context);

      const node = {
        address: '',
        owner: OWNER,
        location: {
          addressName: 'Test Farm',
          location: { lat: '10.5', lng: '20.3' },
        },
        validNode: true,
        assets: [],
        status: 'Active' as const,
      };

      await service.registerNode(node);

      expect(context._diamond.registerNode).toHaveBeenCalledWith(
        'STANDARD',
        0,
        ethers.ZeroHash,
        'Test Farm',
        '10.5',
        '20.3',
      );
    });

    it('should reject if signer is not the owner', async () => {
      const context = createMockContext();
      context.getSignerAddress.mockResolvedValue('0xDIFFERENT');
      const service = new DiamondNodeService(context);

      const node = {
        address: '',
        owner: OWNER,
        location: {
          addressName: 'Farm',
          location: { lat: '0', lng: '0' },
        },
        validNode: true,
        assets: [],
        status: 'Active' as const,
      };

      await expect(service.registerNode(node)).rejects.toThrow(
        'Signer must be the node owner',
      );
    });

    it('should extract nodeHash from event logs', async () => {
      const context = createMockContext({
        logs: [{ topics: ['0xevent'], data: '0x' }],
      });
      const service = new DiamondNodeService(context);

      const node = {
        address: '',
        owner: OWNER,
        location: {
          addressName: 'Farm',
          location: { lat: '0', lng: '0' },
        },
        validNode: true,
        assets: [],
        status: 'Active' as const,
      };

      const result = await service.registerNode(node);
      expect(result).toBe(NODE_HASH);
    });
  });

  describe('updateNodeStatus', () => {
    it('should convert Active to 0x01', async () => {
      const context = createMockContext();
      const service = new DiamondNodeService(context);

      await service.updateNodeStatus(NODE_HASH, 'Active');

      expect(context._diamond.updateNodeStatus).toHaveBeenCalledWith(
        '0x01',
        NODE_HASH,
      );
    });

    it('should convert Inactive to 0x00', async () => {
      const context = createMockContext();
      const service = new DiamondNodeService(context);

      await service.updateNodeStatus(NODE_HASH, 'Inactive');

      expect(context._diamond.updateNodeStatus).toHaveBeenCalledWith(
        '0x00',
        NODE_HASH,
      );
    });

    it('should propagate contract errors', async () => {
      const context = createMockContext({
        diamond: {
          updateNodeStatus: vi
            .fn()
            .mockRejectedValue(new Error('Not node owner')),
        },
      });
      const service = new DiamondNodeService(context);

      await expect(
        service.updateNodeStatus(NODE_HASH, 'Active'),
      ).rejects.toThrow('Not node owner');
    });
  });

  describe('updateNodeLocation', () => {
    it('should pass correct arguments', async () => {
      const context = createMockContext();
      const service = new DiamondNodeService(context);

      await service.updateNodeLocation(NODE_HASH, 'New Farm', '15.5', '25.3');

      expect(context._diamond.updateNodeLocation).toHaveBeenCalledWith(
        'New Farm',
        '15.5',
        '25.3',
        NODE_HASH,
      );
    });
  });

  describe('addSupportingDocument', () => {
    it('should call contract with document details', async () => {
      const context = createMockContext({
        logs: [{ topics: ['0x'], data: '0x' }],
        parsedLog: {
          name: 'SupportingDocumentAdded',
          args: { isFrozen: true },
        },
      });
      const service = new DiamondNodeService(context);

      const result = await service.addSupportingDocument(
        NODE_HASH,
        'https://example.com/cert.pdf',
        'Farm Certification',
        'Annual audit certification',
        'certification',
      );

      expect(context._diamond.addSupportingDocument).toHaveBeenCalledWith(
        NODE_HASH,
        'https://example.com/cert.pdf',
        'Farm Certification',
        'Annual audit certification',
        'certification',
      );
      expect(result).toBe(true); // isFrozen = true
    });

    it('should return false when no event found', async () => {
      const context = createMockContext({ logs: [] });
      const service = new DiamondNodeService(context);

      const result = await service.addSupportingDocument(
        NODE_HASH,
        'url',
        'title',
        'desc',
        'type',
      );
      expect(result).toBe(false);
    });
  });

  describe('removeSupportingDocument', () => {
    it('should call contract with correct params', async () => {
      const context = createMockContext();
      const service = new DiamondNodeService(context);

      await service.removeSupportingDocument(
        NODE_HASH,
        'https://example.com/cert.pdf',
      );

      expect(context._diamond.removeSupportingDocument).toHaveBeenCalledWith(
        NODE_HASH,
        'https://example.com/cert.pdf',
      );
    });
  });
});
