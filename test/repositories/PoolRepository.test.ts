import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PoolRepository } from '@/infrastructure/repositories/pool-repository';
import { Pool, PoolStatus, StakeEvent, Address, BigNumberString } from '@/domain/pool';
import { ethers } from 'ethers';

// Mock the ethers and contract dependencies
vi.mock('ethers', () => ({
  ethers: {
    ZeroHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    ZeroAddress: '0x0000000000000000000000000000000000000000',
    isAddress: vi.fn((address: string) => address.startsWith('0x') && address.length === 42),
    formatEther: vi.fn((value: string) => (Number(value) / 1e18).toString()),
  },
}));

vi.mock('@/typechain-types', () => ({
  AuStake__factory: {
    connect: vi.fn(),
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AUSTAKE_ADDRESS: '0x1234567890123456789012345678901234567890',
}));

describe('PoolRepository', () => {
  let poolRepository: PoolRepository;
  let mockProvider: any;
  let mockSigner: any;
  let mockContract: any;

  const mockPoolData = {
    id: '0xpool123',
    name: 'Test Pool',
    description: 'Test Description',
    rwaName: 'Test Asset',
    token: '0xtoken123' as Address,
    provider: '0xprovider123' as Address,
    fundingGoal: '1000000000000000000000', // 1000 tokens
    totalStaked: '500000000000000000000', // 500 tokens
    deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
    reward: 500, // 5% in basis points
  };

  const expectedPool: Pool = {
    id: mockPoolData.id,
    name: mockPoolData.name,
    description: mockPoolData.description,
    assetName: mockPoolData.rwaName,
    tokenAddress: mockPoolData.token,
    providerAddress: mockPoolData.provider,
    fundingGoal: mockPoolData.fundingGoal,
    totalValueLocked: mockPoolData.totalStaked,
    startDate: expect.any(Number),
    durationDays: expect.any(Number),
    rewardRate: 5,
    status: PoolStatus.ACTIVE,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock provider
    mockProvider = {
      getNetwork: vi.fn(),
    };

    // Mock signer
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0xsigner123'),
    };

    // Mock contract
    mockContract = {
      getOperation: vi.fn(),
      queryFilter: vi.fn(),
      filters: {
        Staked: vi.fn(),
        OperationCreated: vi.fn(),
      },
      getAddress: vi.fn().mockResolvedValue('0xcontract123'),
    };

    // Mock the contract factory
    require('@/typechain-types').AuStake__factory.connect.mockReturnValue(mockContract);

    // Create repository instance
    poolRepository = new PoolRepository(mockProvider, mockSigner);
  });

  describe('getPoolById', () => {
    it('should return a pool when found', async () => {
      mockContract.getOperation.mockResolvedValue(mockPoolData);

      const result = await poolRepository.getPoolById(mockPoolData.id);

      expect(result).toEqual(expectedPool);
      expect(mockContract.getOperation).toHaveBeenCalledWith(mockPoolData.id);
    });

    it('should throw error when pool not found', async () => {
      mockContract.getOperation.mockResolvedValue({
        id: ethers.ZeroHash,
        token: ethers.ZeroAddress,
      });

      await expect(poolRepository.getPoolById('nonexistent'))
        .rejects
        .toThrow('Pool with id nonexistent not found');
    });

    it('should throw error when contract call fails', async () => {
      mockContract.getOperation.mockRejectedValue(new Error('Contract error'));

      await expect(poolRepository.getPoolById(mockPoolData.id))
        .rejects
        .toThrow('Failed to fetch pool');
    });
  });

  describe('getPoolStakeHistory', () => {
    it('should return stake events for a pool', async () => {
      const mockEvents = [
        {
          args: {
            staker: '0xstaker1',
            amount: '100000000000000000000',
            timestamp: 1234567890,
          },
          transactionHash: '0xtx1',
        },
        {
          args: {
            staker: '0xstaker2',
            amount: '200000000000000000000',
            timestamp: 1234567891,
          },
          transactionHash: '0xtx2',
        },
      ];

      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await poolRepository.getPoolStakeHistory(mockPoolData.id);

      expect(result).toEqual([
        {
          poolId: mockPoolData.id,
          stakerAddress: '0xstaker1',
          amount: '100000000000000000000',
          timestamp: 1234567890,
          transactionHash: '0xtx1',
        },
        {
          poolId: mockPoolData.id,
          stakerAddress: '0xstaker2',
          amount: '200000000000000000000',
          timestamp: 1234567891,
          transactionHash: '0xtx2',
        },
      ]);
    });

    it('should handle events with missing args', async () => {
      const mockEvents = [
        {
          args: null,
          transactionHash: '0xtx1',
        },
      ];

      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await poolRepository.getPoolStakeHistory(mockPoolData.id);

      expect(result).toEqual([
        {
          poolId: mockPoolData.id,
          stakerAddress: undefined,
          amount: '0',
          timestamp: 0,
          transactionHash: '0xtx1',
        },
      ]);
    });
  });

  describe('findPoolsByInvestor', () => {
    it('should return pools for an investor', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: { operationId: 'pool2' } },
        { args: { operationId: 'pool1' } }, // duplicate
      ];

      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      // Mock getPoolById calls
      mockContract.getOperation
        .mockResolvedValueOnce({ ...mockPoolData, id: 'pool1' })
        .mockResolvedValueOnce({ ...mockPoolData, id: 'pool2' });

      const result = await poolRepository.findPoolsByInvestor('0xinvestor123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pool1');
      expect(result[1].id).toBe('pool2');
    });

    it('should filter out invalid pool IDs', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: null }, // no args
        { args: { operationId: null } }, // null operationId
      ];

      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);
      mockContract.getOperation.mockResolvedValue(mockPoolData);

      const result = await poolRepository.findPoolsByInvestor('0xinvestor123');

      expect(result).toHaveLength(1);
    });
  });

  describe('findPoolsByProvider', () => {
    it('should return pools for a provider', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: { operationId: 'pool2' } },
      ];

      mockContract.filters.OperationCreated.mockReturnValue('operation-created-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      // Mock getPoolById calls
      mockContract.getOperation
        .mockResolvedValueOnce({ ...mockPoolData, id: 'pool1' })
        .mockResolvedValueOnce({ ...mockPoolData, id: 'pool2' });

      const result = await poolRepository.findPoolsByProvider('0xprovider123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pool1');
      expect(result[1].id).toBe('pool2');
    });
  });

  describe('getAllPools', () => {
    it('should return all pools', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: { operationId: 'pool2' } },
      ];

      mockContract.filters.OperationCreated.mockReturnValue('operation-created-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      // Mock getPoolById calls
      mockContract.getOperation
        .mockResolvedValueOnce({ ...mockPoolData, id: 'pool1' })
        .mockResolvedValueOnce({ ...mockPoolData, id: 'pool2' });

      const result = await poolRepository.getAllPools();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pool1');
      expect(result[1].id).toBe('pool2');
    });
  });

  describe('getPoolWithDynamicData', () => {
    it('should return pool with dynamic data', async () => {
      mockContract.getOperation.mockResolvedValue(mockPoolData);
      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue([]);

      const result = await poolRepository.getPoolWithDynamicData(mockPoolData.id);

      expect(result).toMatchObject({
        ...expectedPool,
        progressPercentage: expect.any(Number),
        timeRemainingSeconds: expect.any(Number),
        volume24h: expect.any(String),
        apy: expect.any(Number),
        tvlFormatted: expect.any(String),
        fundingGoalFormatted: expect.any(String),
        rewardFormatted: expect.any(String),
      });
    });

    it('should return null when pool not found', async () => {
      mockContract.getOperation.mockResolvedValue({
        id: ethers.ZeroHash,
        token: ethers.ZeroAddress,
      });

      const result = await poolRepository.getPoolWithDynamicData('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getGroupedStakeHistory', () => {
    it('should group stakes by daily interval', async () => {
      const mockEvents = [
        {
          args: {
            staker: '0xstaker1',
            amount: '100000000000000000000',
            timestamp: 1672531200, // 2023-01-01
          },
          transactionHash: '0xtx1',
        },
        {
          args: {
            staker: '0xstaker2',
            amount: '200000000000000000000',
            timestamp: 1672617600, // 2023-01-02
          },
          transactionHash: '0xtx2',
        },
      ];

      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await poolRepository.getGroupedStakeHistory(mockPoolData.id, '1D');

      expect(result.daily).toBeDefined();
      expect(Object.keys(result.daily!)).toHaveLength(2);
      expect(result.daily!['2023-01-01']).toBe('100000000000000000000');
      expect(result.daily!['2023-01-02']).toBe('200000000000000000000');
    });

    it('should group stakes by hourly interval', async () => {
      const mockEvents = [
        {
          args: {
            staker: '0xstaker1',
            amount: '100000000000000000000',
            timestamp: 1672531200, // 2023-01-01 00:00:00
          },
          transactionHash: '0xtx1',
        },
        {
          args: {
            staker: '0xstaker2',
            amount: '200000000000000000000',
            timestamp: 1672534800, // 2023-01-01 01:00:00
          },
          transactionHash: '0xtx2',
        },
      ];

      mockContract.filters.Staked.mockReturnValue('staked-filter');
      mockContract.queryFilter.mockResolvedValue(mockEvents);

      const result = await poolRepository.getGroupedStakeHistory(mockPoolData.id, '1H');

      expect(result.hourly).toBeDefined();
      expect(Object.keys(result.hourly!)).toHaveLength(2);
    });
  });

  describe('calculatePoolDynamicData', () => {
    it('should calculate dynamic data correctly', async () => {
      const mockPool: Pool = {
        id: 'pool1',
        name: 'Test Pool',
        description: 'Test Description',
        assetName: 'Test Asset',
        tokenAddress: '0xtoken123',
        providerAddress: '0xprovider123',
        fundingGoal: '1000000000000000000000', // 1000 tokens
        totalValueLocked: '500000000000000000000', // 500 tokens
        startDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        durationDays: 30,
        rewardRate: 5,
        status: PoolStatus.ACTIVE,
      };

      const mockStakeHistory: StakeEvent[] = [
        {
          poolId: 'pool1',
          stakerAddress: '0xstaker1',
          amount: '100000000000000000000',
          timestamp: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago
        },
      ];

      const result = await poolRepository.calculatePoolDynamicData(mockPool, mockStakeHistory);

      expect(result).toMatchObject({
        progressPercentage: 50, // 500/1000 * 100
        timeRemainingSeconds: expect.any(Number),
        volume24h: '100000000000000000000',
        apy: 5,
        tvlFormatted: expect.any(String),
        fundingGoalFormatted: expect.any(String),
        rewardFormatted: '5%',
      });
    });

    it('should handle pools with no stake history', async () => {
      const mockPool: Pool = {
        id: 'pool1',
        name: 'Test Pool',
        description: 'Test Description',
        assetName: 'Test Asset',
        tokenAddress: '0xtoken123',
        providerAddress: '0xprovider123',
        fundingGoal: '1000000000000000000000',
        totalValueLocked: '0',
        startDate: Math.floor(Date.now() / 1000),
        durationDays: 30,
        rewardRate: 5,
        status: PoolStatus.ACTIVE,
      };

      const result = await poolRepository.calculatePoolDynamicData(mockPool, []);

      expect(result).toMatchObject({
        progressPercentage: 0,
        volume24h: '0',
        apy: 5,
        rewardFormatted: '5%',
      });
    });
  });

  describe('constructor', () => {
    it('should throw error when contract address is undefined', () => {
      expect(() => new PoolRepository(mockProvider, mockSigner, ''))
        .toThrow('[PoolRepository] Pool contract address is undefined');
    });

    it('should use default contract address when not provided', () => {
      const repo = new PoolRepository(mockProvider, mockSigner);
      expect(require('@/typechain-types').AuStake__factory.connect)
        .toHaveBeenCalledWith('0x1234567890123456789012345678901234567890', mockSigner);
    });
  });
});