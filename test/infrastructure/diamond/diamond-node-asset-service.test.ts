/**
 * DiamondNodeAssetService Tests
 *
 * Tests asset minting, capacity updates, and price updates.
 */
import { ethers } from 'ethers';
import { DiamondNodeAssetService } from '@/infrastructure/diamond/diamond-node-asset-service';

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0x1235E39477752713902bCE541Fc02ADeb6FF465b',
}));

const OWNER = '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF';
const NODE_HASH =
  '0x0000000000000000000000001234567890123456789012345678901234567890';
const DIAMOND_ADDR = '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';

function createMockContext(overrides: Record<string, any> = {}) {
  const mockTx = {
    hash: '0xtxhash',
    wait: vi.fn().mockResolvedValue({ hash: '0xtxhash', blockNumber: 100 }),
  };

  const diamond = {
    getNode: vi.fn().mockResolvedValue({
      owner: overrides.nodeOwner ?? OWNER,
    }),
    getNodeAssets: vi.fn().mockResolvedValue(overrides.nodeAssets ?? []),
    nodeMint: vi.fn().mockResolvedValue(mockTx),
    addSupportedAsset: vi.fn().mockResolvedValue(mockTx),
    updateSupportedAssets: vi.fn().mockResolvedValue(mockTx),
    ...overrides.diamond,
  };

  const auraAsset = {
    nodeMint: vi.fn().mockResolvedValue(mockTx),
    getAddress: vi
      .fn()
      .mockResolvedValue('0x1235E39477752713902bCE541Fc02ADeb6FF465b'),
    ...overrides.auraAsset,
  };

  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getAuraAsset: vi.fn().mockReturnValue(auraAsset),
    getDiamondAddress: vi.fn().mockReturnValue(DIAMOND_ADDR),
    getSignerAddress: vi.fn().mockResolvedValue(OWNER),
    _diamond: diamond,
    _auraAsset: auraAsset,
    _mockTx: mockTx,
  } as any;
}

describe('DiamondNodeAssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mintAsset', () => {
    it('should mint tokens to node owner and add supported asset', async () => {
      const context = createMockContext();
      const service = new DiamondNodeAssetService(context);

      await service.mintAsset(
        NODE_HASH,
        {
          name: 'AUGOAT',
          assetClass: 'GOAT',
          attributes: [
            { name: 'weight', values: ['S', 'M', 'L'], description: 'Weight' },
          ],
        },
        100,
      );

      // Should call nodeMint on AuraAsset
      expect(context._diamond.nodeMint).toHaveBeenCalledTimes(1);
      const mintArgs = context._diamond.nodeMint.mock.calls[0];
      expect(mintArgs[0]).toBe(OWNER); // Minted to node owner
      expect(mintArgs[1].name).toBe('AUGOAT');
      expect(mintArgs[1].assetClass).toBe('GOAT');
      expect(mintArgs[2]).toBe(100); // Amount
      expect(mintArgs[3]).toBe('GOAT'); // Asset class
      expect(mintArgs[4]).toBe('0x'); // Extra data

      // Should call addSupportedAsset on Diamond
      expect(context._diamond.addSupportedAsset).toHaveBeenCalledTimes(1);
    });

    it('should throw if node is not registered (ZeroAddress owner)', async () => {
      const context = createMockContext({
        nodeOwner: ethers.ZeroAddress,
        diamond: {
          getNode: vi.fn().mockResolvedValue({ owner: ethers.ZeroAddress }),
        },
      });
      const service = new DiamondNodeAssetService(context);

      await expect(
        service.mintAsset(
          NODE_HASH,
          {
            name: 'AUGOAT',
            assetClass: 'GOAT',
            attributes: [],
          },
          100,
        ),
      ).rejects.toThrow('not registered');
    });

    it('should convert address to bytes32 for short addresses', async () => {
      const context = createMockContext();
      const service = new DiamondNodeAssetService(context);

      // Pass a 20-byte address instead of bytes32
      const shortAddr = '0x1234567890123456789012345678901234567890';

      await service.mintAsset(
        shortAddr,
        {
          name: 'Test',
          assetClass: 'TEST',
          attributes: [],
        },
        10,
      );

      // Should have called getNode with the zero-padded version
      const getNodeArg = context._diamond.getNode.mock.calls[0][0];
      expect(getNodeArg.length).toBe(66); // 0x + 64 hex chars
    });

    it('should pass through bytes32 hashes unchanged', async () => {
      const context = createMockContext();
      const service = new DiamondNodeAssetService(context);

      await service.mintAsset(
        NODE_HASH,
        {
          name: 'Test',
          assetClass: 'TEST',
          attributes: [],
        },
        10,
      );

      const getNodeArg = context._diamond.getNode.mock.calls[0][0];
      expect(getNodeArg).toBe(NODE_HASH);
    });

    it('should provide helpful error for NodeManager misconfiguration', async () => {
      const context = createMockContext({
        diamond: {
          nodeMint: vi.fn().mockRejectedValue({
            message: 'missing revert data',
            code: 'CALL_EXCEPTION',
          }),
        },
      });
      const service = new DiamondNodeAssetService(context);

      await expect(
        service.mintAsset(
          NODE_HASH,
          {
            name: 'AUGOAT',
            assetClass: 'GOAT',
            attributes: [],
          },
          100,
        ),
      ).rejects.toThrow('Tokenization failed');
    });
  });

  describe('updateAssetCapacity', () => {
    it('should update only the matching asset capacity', async () => {
      const context = createMockContext({
        nodeAssets: [
          {
            token: '0xA',
            tokenId: BigInt(1),
            price: BigInt(100),
            capacity: 50,
          },
          {
            token: '0xB',
            tokenId: BigInt(2),
            price: BigInt(200),
            capacity: 75,
          },
        ],
      });
      const service = new DiamondNodeAssetService(context);

      await service.updateAssetCapacity(NODE_HASH, '0xA', '1', 999);

      const args = context._diamond.updateSupportedAssets.mock.calls[0];
      const capacities = args[4]; // 5th arg = capacities array
      expect(capacities[0]).toBe(BigInt(999)); // Updated
      expect(capacities[1]).toBe(BigInt(75)); // Unchanged
    });
  });

  describe('updateAssetPrice', () => {
    it('should update only the matching asset price', async () => {
      const context = createMockContext({
        nodeAssets: [
          {
            token: '0xA',
            tokenId: BigInt(1),
            price: BigInt(100),
            capacity: 50,
          },
          {
            token: '0xB',
            tokenId: BigInt(2),
            price: BigInt(200),
            capacity: 75,
          },
        ],
      });
      const service = new DiamondNodeAssetService(context);

      await service.updateAssetPrice(NODE_HASH, '0xA', '1', BigInt(5000));

      const args = context._diamond.updateSupportedAssets.mock.calls[0];
      const prices = args[3]; // 4th arg = prices array
      expect(prices[0]).toBe(BigInt(5000)); // Updated
      expect(prices[1]).toBe(BigInt(200)); // Unchanged
    });
  });

  describe('updateSupportedAssets', () => {
    it('should pass all asset arrays to contract', async () => {
      const context = createMockContext();
      const service = new DiamondNodeAssetService(context);

      const assets = [
        { token: '0xA', tokenId: '1', price: BigInt(100), capacity: 50 },
        { token: '0xB', tokenId: '2', price: BigInt(200), capacity: 75 },
      ];

      await service.updateSupportedAssets(NODE_HASH, assets);

      expect(context._diamond.updateSupportedAssets).toHaveBeenCalledTimes(1);
      const args = context._diamond.updateSupportedAssets.mock.calls[0];
      expect(args[1]).toEqual(['0xA', '0xB']); // tokens
      expect(args[2]).toEqual([BigInt(1), BigInt(2)]); // tokenIds
    });
  });
});
