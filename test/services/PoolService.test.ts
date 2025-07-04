import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PoolService } from '@/infrastructure/services/pool.service';
import { PoolCreationData, Address } from '@/domain/pool';
import { ethers } from 'ethers';

// Mock dependencies
vi.mock('ethers', () => ({
  ethers: {
    ZeroHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    ZeroAddress: '0x0000000000000000000000000000000000000000',
    isAddress: vi.fn((address: string) => address.startsWith('0x') && address.length === 42),
    Contract: vi.fn(),
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

describe('PoolService', () => {
  let poolService: PoolService;
  let mockProvider: any;
  let mockSigner: any;
  let mockContract: any;

  const mockPoolCreationData: PoolCreationData = {
    name: 'Test Pool',
    description: 'Test Description',
    assetName: 'Test Asset',
    tokenAddress: '0xtoken123' as Address,
    fundingGoal: '1000000000000000000000',
    durationDays: 30,
    rewardRate: 5,
    assetPrice: '1000000000000000000',
  };

  const mockCreatorAddress = '0xcreator123' as Address;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock provider
    mockProvider = {
      getNetwork: vi.fn(),
    };

    // Mock signer
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue(mockCreatorAddress),
    };

    // Mock contract
    mockContract = {
      createOperation: vi.fn(),
      getOperation: vi.fn(),
      stake: vi.fn(),
      claimReward: vi.fn(),
      unlockReward: vi.fn(),
      getAddress: vi.fn().mockResolvedValue('0xcontract123'),
      interface: {
        getEvent: vi.fn().mockReturnValue({
          topicHash: '0xevent123',
        }),
        parseLog: vi.fn(),
      },
    };

    // Mock contract factory
    require('@/typechain-types').AuStake__factory.connect.mockReturnValue(mockContract);

    // Create service instance
    poolService = new PoolService(mockProvider, mockSigner);
  });

  describe('createPool', () => {
    it('should create a pool successfully', async () => {
      const mockTxResponse = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash123',
          logs: [
            {
              topics: ['0xevent123'],
            },
          ],
        }),
      };

      const mockParsedLog = {
        args: {
          operationId: '0xpool123',
        },
      };

      mockContract.createOperation.mockResolvedValue(mockTxResponse);
      mockContract.interface.parseLog.mockReturnValue(mockParsedLog);

      const result = await poolService.createPool(mockPoolCreationData, mockCreatorAddress);

      expect(result).toEqual({
        poolId: '0xpool123',
        transactionHash: '0xtxhash123',
      });

      expect(mockContract.createOperation).toHaveBeenCalledWith(
        mockPoolCreationData.name,
        mockPoolCreationData.description,
        mockPoolCreationData.tokenAddress,
        mockCreatorAddress,
        expect.any(BigInt), // deadline
        BigInt(500), // reward in basis points
        mockPoolCreationData.assetName,
        BigInt(mockPoolCreationData.fundingGoal),
        BigInt(mockPoolCreationData.assetPrice),
      );
    });

    it('should validate pool creation data', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        name: '',
      };

      await expect(poolService.createPool(invalidData, mockCreatorAddress))
        .rejects
        .toThrow('Pool name is required');
    });

    it('should validate token address', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        tokenAddress: 'invalid-address' as Address,
      };

      (ethers.isAddress as any).mockReturnValue(false);

      await expect(poolService.createPool(invalidData, mockCreatorAddress))
        .rejects
        .toThrow('Valid token address is required');
    });

    it('should validate funding goal', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        fundingGoal: '0',
      };

      await expect(poolService.createPool(invalidData, mockCreatorAddress))
        .rejects
        .toThrow('Funding goal must be greater than 0');
    });

    it('should validate duration', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        durationDays: 0,
      };

      await expect(poolService.createPool(invalidData, mockCreatorAddress))
        .rejects
        .toThrow('Duration must be greater than 0 days');
    });

    it('should validate reward rate', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        rewardRate: -1,
      };

      await expect(poolService.createPool(invalidData, mockCreatorAddress))
        .rejects
        .toThrow('Reward rate cannot be negative');
    });

    it('should handle contract errors', async () => {
      mockContract.createOperation.mockRejectedValue(new Error('Contract error'));

      await expect(poolService.createPool(mockPoolCreationData, mockCreatorAddress))
        .rejects
        .toThrow('Failed to create pool');
    });

    it('should handle missing transaction receipt', async () => {
      const mockTxResponse = {
        wait: vi.fn().mockResolvedValue(null),
      };

      mockContract.createOperation.mockResolvedValue(mockTxResponse);

      await expect(poolService.createPool(mockPoolCreationData, mockCreatorAddress))
        .rejects
        .toThrow('Transaction receipt not found for pool creation');
    });
  });

  describe('closePool', () => {
    const poolId = '0xpool123';
    const providerAddress = '0xprovider123' as Address;

    it('should close a pool successfully', async () => {
      mockSigner.getAddress.mockResolvedValue(providerAddress);

      const mockTxResponse = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash123',
        }),
      };

      mockContract.unlockReward.mockResolvedValue(mockTxResponse);

      const result = await poolService.closePool(poolId, providerAddress);

      expect(result).toBe('0xtxhash123');
      expect(mockContract.unlockReward).toHaveBeenCalledWith(
        ethers.ZeroAddress,
        poolId,
      );
    });

    it('should validate provider address', async () => {
      mockSigner.getAddress.mockResolvedValue('0xother123');

      await expect(poolService.closePool(poolId, providerAddress))
        .rejects
        .toThrow('Only the pool provider can close the pool');
    });

    it('should handle contract errors', async () => {
      mockSigner.getAddress.mockResolvedValue(providerAddress);
      mockContract.unlockReward.mockRejectedValue(new Error('Contract error'));

      await expect(poolService.closePool(poolId, providerAddress))
        .rejects
        .toThrow('Failed to close pool');
    });
  });

  describe('stake', () => {
    const poolId = '0xpool123';
    const amount = '1000000000000000000000';
    const investorAddress = '0xinvestor123' as Address;

    beforeEach(() => {
      mockSigner.getAddress.mockResolvedValue(investorAddress);
    });

    it('should stake successfully', async () => {
      const mockOperation = {
        id: poolId,
        token: '0xtoken123',
      };

      const mockTxResponse = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash123',
        }),
      };

      const mockTokenContract = {
        allowance: vi.fn().mockResolvedValue('0'),
        approve: vi.fn().mockResolvedValue({
          wait: vi.fn().mockResolvedValue({}),
        }),
      };

      mockContract.getOperation.mockResolvedValue(mockOperation);
      mockContract.stake.mockResolvedValue(mockTxResponse);
      (ethers.Contract as any).mockReturnValue(mockTokenContract);

      const result = await poolService.stake(poolId, amount, investorAddress);

      expect(result).toBe('0xtxhash123');
      expect(mockContract.stake).toHaveBeenCalledWith(
        '0xtoken123',
        poolId,
        BigInt(amount),
      );
    });

    it('should validate stake amount', async () => {
      await expect(poolService.stake(poolId, '0', investorAddress))
        .rejects
        .toThrow('Invalid stake amount');
    });

    it('should validate investor address', async () => {
      mockSigner.getAddress.mockResolvedValue('0xother123');

      await expect(poolService.stake(poolId, amount, investorAddress))
        .rejects
        .toThrow('Signer must match investor address');
    });

    it('should validate pool exists', async () => {
      mockContract.getOperation.mockResolvedValue({
        id: ethers.ZeroHash,
      });

      await expect(poolService.stake(poolId, amount, investorAddress))
        .rejects
        .toThrow('Pool not found');
    });

    it('should handle contract errors', async () => {
      mockContract.getOperation.mockRejectedValue(new Error('Contract error'));

      await expect(poolService.stake(poolId, amount, investorAddress))
        .rejects
        .toThrow('Failed to stake');
    });
  });

  describe('claimReward', () => {
    const poolId = '0xpool123';
    const claimantAddress = '0xclaimant123' as Address;

    beforeEach(() => {
      mockSigner.getAddress.mockResolvedValue(claimantAddress);
    });

    it('should claim reward successfully', async () => {
      const mockOperation = {
        id: poolId,
        token: '0xtoken123',
      };

      const mockTxResponse = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash123',
        }),
      };

      mockContract.getOperation.mockResolvedValue(mockOperation);
      mockContract.claimReward.mockResolvedValue(mockTxResponse);

      const result = await poolService.claimReward(poolId, claimantAddress);

      expect(result).toBe('0xtxhash123');
      expect(mockContract.claimReward).toHaveBeenCalledWith(
        '0xtoken123',
        poolId,
        claimantAddress,
      );
    });

    it('should validate claimant address', async () => {
      mockSigner.getAddress.mockResolvedValue('0xother123');

      await expect(poolService.claimReward(poolId, claimantAddress))
        .rejects
        .toThrow('Signer must match claimant address');
    });

    it('should validate pool exists', async () => {
      mockContract.getOperation.mockResolvedValue({
        id: ethers.ZeroHash,
      });

      await expect(poolService.claimReward(poolId, claimantAddress))
        .rejects
        .toThrow('Pool not found');
    });

    it('should handle contract errors', async () => {
      mockContract.getOperation.mockRejectedValue(new Error('Contract error'));

      await expect(poolService.claimReward(poolId, claimantAddress))
        .rejects
        .toThrow('Failed to claim reward');
    });
  });

  describe('unlockReward', () => {
    const poolId = '0xpool123';
    const providerAddress = '0xprovider123' as Address;

    beforeEach(() => {
      mockSigner.getAddress.mockResolvedValue(providerAddress);
    });

    it('should unlock reward successfully', async () => {
      const mockOperation = {
        id: poolId,
        token: '0xtoken123',
      };

      const mockTxResponse = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash123',
        }),
      };

      mockContract.getOperation.mockResolvedValue(mockOperation);
      mockContract.unlockReward.mockResolvedValue(mockTxResponse);

      const result = await poolService.unlockReward(poolId, providerAddress);

      expect(result).toBe('0xtxhash123');
      expect(mockContract.unlockReward).toHaveBeenCalledWith(
        '0xtoken123',
        poolId,
      );
    });

    it('should validate provider address', async () => {
      mockSigner.getAddress.mockResolvedValue('0xother123');

      await expect(poolService.unlockReward(poolId, providerAddress))
        .rejects
        .toThrow('Only the pool provider can unlock rewards');
    });

    it('should validate pool exists', async () => {
      mockContract.getOperation.mockResolvedValue({
        id: ethers.ZeroHash,
      });

      await expect(poolService.unlockReward(poolId, providerAddress))
        .rejects
        .toThrow('Pool not found');
    });

    it('should handle contract errors', async () => {
      mockContract.getOperation.mockRejectedValue(new Error('Contract error'));

      await expect(poolService.unlockReward(poolId, providerAddress))
        .rejects
        .toThrow('Failed to unlock reward');
    });
  });

  describe('constructor', () => {
    it('should throw error when contract address is undefined', () => {
      expect(() => new PoolService(mockProvider, mockSigner, ''))
        .toThrow('[PoolService] Pool contract address is undefined');
    });

    it('should use default contract address when not provided', () => {
      const service = new PoolService(mockProvider, mockSigner);
      expect(require('@/typechain-types').AuStake__factory.connect)
        .toHaveBeenCalledWith('0x1234567890123456789012345678901234567890', mockSigner);
    });
  });

  describe('validatePoolCreationData', () => {
    it('should validate all required fields', async () => {
      const testCases = [
        { field: 'name', value: '', error: 'Pool name is required' },
        { field: 'description', value: '', error: 'Pool description is required' },
        { field: 'assetName', value: '', error: 'Asset name is required' },
        { field: 'fundingGoal', value: '0', error: 'Funding goal must be greater than 0' },
        { field: 'assetPrice', value: '0', error: 'Asset price must be greater than 0' },
        { field: 'durationDays', value: 0, error: 'Duration must be greater than 0 days' },
        { field: 'rewardRate', value: -1, error: 'Reward rate cannot be negative' },
      ];

      for (const testCase of testCases) {
        const invalidData = {
          ...mockPoolCreationData,
          [testCase.field]: testCase.value,
        };

        await expect(poolService.createPool(invalidData, mockCreatorAddress))
          .rejects
          .toThrow(testCase.error);
      }
    });
  });
});