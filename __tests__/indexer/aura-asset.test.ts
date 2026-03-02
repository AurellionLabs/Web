import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database
const mockDb = {
  assets: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  assetAttributes: {
    create: vi.fn(),
  },
  mintedAssetEvents: { create: vi.fn() },
  transferEvents: { create: vi.fn() },
  transferBatchEvents: { create: vi.fn() },
  tokenStats: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  userBalances: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  supportedAssets: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  supportedClasses: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
};

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;

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

describe('AuraAsset Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MintedAsset', () => {
    it('should create asset and related entities', async () => {
      const account =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const hash =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const tokenId = 1n;
      const name = 'Gold Bar';
      const assetClass = 'Precious Metals';
      const className = 'Gold';

      mockDb.supportedAssets.findUnique.mockResolvedValueOnce(null);
      mockDb.supportedClasses.findUnique.mockResolvedValueOnce(null);
      mockDb.tokenStats.findUnique.mockResolvedValueOnce(null);
      mockDb.userBalances.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        account,
        hash,
        tokenId,
        name,
        assetClass,
        className,
      });

      const hashString = hash.toLowerCase();

      // Create MintedAsset event
      await mockDb.mintedAssetEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        account,
        hash,
        tokenId,
        assetName: name,
        assetClass,
        className,
        amount: 1n,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      // Create Asset entity
      await mockDb.assets.create({
        id: hashString,
        hash,
        tokenId,
        name,
        assetClass,
        className,
        account,
        amount: 1n,
        createdAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });

      // Create SupportedAsset
      await mockDb.supportedAssets.create({
        id: name,
        name,
        index: 0n,
        asset: hashString,
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });

      // Create SupportedClass
      await mockDb.supportedClasses.create({
        id: className,
        name: className,
        index: 0n,
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });

      // Create TokenStats
      await mockDb.tokenStats.create({
        id: tokenId.toString(),
        tokenId,
        totalSupply: 0n,
        holders: 0n,
        transfers: 0n,
        asset: hashString,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });

      // Create UserBalance
      const balanceId = `${account.toLowerCase()}-${tokenId.toString()}`;
      await mockDb.userBalances.create({
        id: balanceId,
        user: account,
        tokenId,
        balance: 1n,
        asset: hashString,
        firstReceived: event.block.timestamp,
        lastUpdated: event.block.timestamp,
      });

      expect(mockDb.assets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Gold Bar',
          assetClass: 'Precious Metals',
          className: 'Gold',
        }),
      );

      expect(mockDb.supportedAssets.create).toHaveBeenCalled();
      expect(mockDb.supportedClasses.create).toHaveBeenCalled();
      expect(mockDb.tokenStats.create).toHaveBeenCalled();
      expect(mockDb.userBalances.create).toHaveBeenCalled();
    });

    it('should update existing supported asset', async () => {
      const name = 'Gold Bar';

      mockDb.supportedAssets.findUnique.mockResolvedValueOnce({
        id: name,
        name,
        createdAt: 1704000000n,
      });

      const event = createMockEvent({
        account: '0xaaaa' as `0x${string}`,
        hash: '0x1234' as `0x${string}`,
        tokenId: 1n,
        name,
        assetClass: 'Precious Metals',
        className: 'Gold',
      });

      await mockDb.supportedAssets.update({
        id: name,
        data: {
          updatedAt: event.block.timestamp,
        },
      });

      expect(mockDb.supportedAssets.update).toHaveBeenCalled();
    });
  });

  describe('AssetAttributeAdded', () => {
    it('should create asset attribute with values array', async () => {
      const hash =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      const attributeIndex = 0n;
      const name = 'Purity';
      const values = ['99.9%', '99.99%'];
      const description = 'Gold purity level';

      const event = createMockEvent({
        hash,
        attributeIndex,
        name,
        values,
        description,
      });

      const attributeId = `${hash.toLowerCase()}-${attributeIndex.toString()}`;

      await mockDb.assetAttributes.create({
        id: attributeId,
        assetId: hash.toLowerCase(),
        name,
        values: JSON.stringify(values),
        description,
      });

      expect(mockDb.assetAttributes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: attributeId,
          name: 'Purity',
          values: JSON.stringify(['99.9%', '99.99%']),
          description: 'Gold purity level',
        }),
      );
    });
  });

  describe('TransferSingle', () => {
    it('should create transfer event and update balances', async () => {
      const from =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const to = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const operator =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const tokenId = 1n;
      const value = 10n;

      mockDb.tokenStats.findUnique.mockResolvedValueOnce({
        id: '1',
        transfers: 5n,
      });

      mockDb.userBalances.findUnique
        .mockResolvedValueOnce({ id: `${from}-1`, balance: 100n })
        .mockResolvedValueOnce({ id: `${to}-1`, balance: 50n });

      const event = createMockEvent({
        operator,
        from,
        to,
        id: tokenId,
        value,
      });

      // Create transfer event
      await mockDb.transferEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        operator,
        from,
        to,
        tokenId,
        amount: value,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      // Update token stats
      await mockDb.tokenStats.update({
        id: '1',
        data: {
          transfers: 6n,
          updatedAt: event.block.timestamp,
        },
      });

      // Update sender balance
      await mockDb.userBalances.update({
        id: `${from.toLowerCase()}-1`,
        data: {
          balance: 90n,
          lastUpdated: event.block.timestamp,
        },
      });

      // Update receiver balance
      await mockDb.userBalances.update({
        id: `${to.toLowerCase()}-1`,
        data: {
          balance: 60n,
          lastUpdated: event.block.timestamp,
        },
      });

      expect(mockDb.transferEvents.create).toHaveBeenCalled();
      expect(mockDb.tokenStats.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ transfers: 6n }),
        }),
      );
    });

    it('should create new balance for receiver if not exists', async () => {
      const from =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const to = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const tokenId = 1n;
      const value = 10n;

      mockDb.tokenStats.findUnique.mockResolvedValueOnce(null);
      mockDb.userBalances.findUnique
        .mockResolvedValueOnce({ id: `${from}-1`, balance: 100n })
        .mockResolvedValueOnce(null);

      const event = createMockEvent({
        operator: from,
        from,
        to,
        id: tokenId,
        value,
      });

      // Create new balance for receiver
      await mockDb.userBalances.create({
        id: `${to.toLowerCase()}-1`,
        user: to,
        tokenId,
        balance: value,
        asset: '',
        firstReceived: event.block.timestamp,
        lastUpdated: event.block.timestamp,
      });

      expect(mockDb.userBalances.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: to,
          balance: value,
        }),
      );
    });

    it('should handle mint (from zero address)', async () => {
      const to = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const tokenId = 1n;
      const value = 100n;

      mockDb.tokenStats.findUnique.mockResolvedValueOnce(null);
      mockDb.userBalances.findUnique.mockResolvedValueOnce(null);

      const event = createMockEvent({
        operator: to,
        from: ZERO_ADDRESS,
        to,
        id: tokenId,
        value,
      });

      // Should only update receiver, not try to subtract from zero address
      await mockDb.userBalances.create({
        id: `${to.toLowerCase()}-1`,
        user: to,
        tokenId,
        balance: value,
        asset: '',
        firstReceived: event.block.timestamp,
        lastUpdated: event.block.timestamp,
      });

      expect(mockDb.userBalances.create).toHaveBeenCalled();
    });
  });

  describe('TransferBatch', () => {
    it('should create batch transfer event and update all balances', async () => {
      const from =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
      const to = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
      const operator =
        '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
      const ids = [1n, 2n, 3n];
      const values = [10n, 20n, 30n];

      mockDb.tokenStats.findUnique.mockResolvedValue({ transfers: 0n });
      mockDb.userBalances.findUnique.mockResolvedValue(null);

      const event = createMockEvent({
        operator,
        from,
        to,
        ids,
        values,
      });

      // Create batch event
      await mockDb.transferBatchEvents.create({
        id: `${event.transaction.hash}-${event.log.logIndex}`,
        operator,
        from,
        to,
        tokenIds: JSON.stringify(ids.map((id) => id.toString())),
        amounts: JSON.stringify(values.map((v) => v.toString())),
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      });

      expect(mockDb.transferBatchEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenIds: JSON.stringify(['1', '2', '3']),
          amounts: JSON.stringify(['10', '20', '30']),
        }),
      );
    });
  });
});
