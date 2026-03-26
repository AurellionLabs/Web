/**
 * DiamondNodeAssetService Tests
 *
 * Tests asset minting, capacity updates, and price updates.
 */
import { ethers } from 'ethers';
import { DiamondNodeAssetService } from '@/infrastructure/diamond/diamond-node-asset-service';

const DECIMALS_INTERFACE = new ethers.Interface([
  'function decimals() view returns (uint8)',
]);

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  getIpfsGroupId: () => 'test-group-id',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0x1235E39477752713902bCE541Fc02ADeb6FF465b',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0x7777777777777777777777777777777777777777',
  NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS: 18,
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
  const quoteTokenDecimals = overrides.quoteTokenDecimals ?? 18;
  const provider = {
    call: vi
      .fn()
      .mockResolvedValue(
        DECIMALS_INTERFACE.encodeFunctionResult('decimals', [
          BigInt(quoteTokenDecimals),
        ]),
      ),
    ...overrides.provider,
  };

  const diamond = {
    getNode: vi.fn().mockResolvedValue({
      owner: overrides.nodeOwner ?? OWNER,
    }),
    getPayToken: vi
      .fn()
      .mockResolvedValue(
        overrides.payToken ?? '0x7777777777777777777777777777777777777777',
      ),
    getAddress: vi.fn().mockResolvedValue(DIAMOND_ADDR),
    getNodeAssets: vi.fn().mockResolvedValue(overrides.nodeAssets ?? []),
    addNodeItem: vi.fn().mockResolvedValue(mockTx),
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
    getProvider: vi.fn().mockReturnValue(provider),
    getAuraAsset: vi.fn().mockReturnValue(auraAsset),
    getDiamondAddress: vi.fn().mockReturnValue(DIAMOND_ADDR),
    getSignerAddress: vi.fn().mockResolvedValue(OWNER),
    _diamond: diamond,
    _provider: provider,
    _auraAsset: auraAsset,
    _mockTx: mockTx,
  } as any;
}

function computeTokenId(asset: {
  name: string;
  assetClass: string;
  attributes: { name: string; values: string[]; description: string }[];
}): bigint {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedAsset = abiCoder.encode(
    [
      'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
    ],
    [asset],
  );

  return BigInt(ethers.keccak256(encodedAsset));
}

describe('DiamondNodeAssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mintAsset', () => {
    it('should mint tokens through addNodeItem', async () => {
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
        '25.5',
      );

      expect(context._diamond.addNodeItem).toHaveBeenCalledTimes(1);
      const mintArgs = context._diamond.addNodeItem.mock.calls[0];
      expect(mintArgs[0]).toBe(NODE_HASH);
      expect(mintArgs[1]).toBe(OWNER);
      expect(mintArgs[2]).toBe(100);
      expect(mintArgs[3].name).toBe('AUGOAT');
      expect(mintArgs[3].assetClass).toBe('GOAT');
      expect(mintArgs[4]).toBe('GOAT');
      expect(mintArgs[5]).toBe('0x');

      expect(context._diamond.addSupportedAsset).toHaveBeenCalledTimes(1);
      const registerArgs = context._diamond.addSupportedAsset.mock.calls[0];
      expect(registerArgs[3]).toBe(255n * 10n ** 17n);
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
          '1',
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
        '3',
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
        '7',
      );

      const getNodeArg = context._diamond.getNode.mock.calls[0][0];
      expect(getNodeArg).toBe(NODE_HASH);
    });

    it('should provide helpful error for NodeManager misconfiguration', async () => {
      const context = createMockContext({
        diamond: {
          addNodeItem: vi.fn().mockRejectedValue({
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
          '4',
        ),
      ).rejects.toThrow('Tokenization failed');
    });

    it('should update matching asset price and capacity on repeat tokenization', async () => {
      const asset = {
        name: 'AUGOAT',
        assetClass: 'GOAT',
        attributes: [{ name: 'weight', values: ['M'], description: 'Weight' }],
      };
      const tokenId = computeTokenId(asset);
      const context = createMockContext({
        nodeAssets: [
          {
            token: DIAMOND_ADDR,
            tokenId,
            price: 3n * 10n ** 18n,
            capacity: 50,
          },
          {
            token: '0xB',
            tokenId: 2n,
            price: 9n * 10n ** 18n,
            capacity: 75,
          },
        ],
      });
      const service = new DiamondNodeAssetService(context);

      await service.mintAsset(NODE_HASH, asset, 10, '12.75');

      expect(context._diamond.addSupportedAsset).not.toHaveBeenCalled();
      const args = context._diamond.updateSupportedAssets.mock.calls[0];
      expect(args[3]).toEqual([1275n * 10n ** 16n, 9n * 10n ** 18n]);
      expect(args[4]).toEqual([60n, 75n]);
    });

    it('should reject invalid decimal prices before calling the contract', async () => {
      const context = createMockContext();
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
          '12.5.1',
        ),
      ).rejects.toThrow(
        'price must be entered as a non-negative decimal value',
      );

      expect(context._diamond.addNodeItem).not.toHaveBeenCalled();
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
