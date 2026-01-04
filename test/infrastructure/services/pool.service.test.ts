// @ts-nocheck - Test file with vitest setup issues
import { expect, use } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { PoolService } from '@/infrastructure/services/pool.service';
import { PoolCreationData, Address } from '@/domain/pool';
import { ethers } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

// Use sinon-chai plugin
use(sinonChai);

describe('PoolService', () => {
  let poolService: PoolService;
  let mockProvider: any;
  let mockSigner: any;
  let mockContract: any;
  let mockRepositoryContext: any;
  let contractFactoryStub: sinon.SinonStub;
  let ethersStub: sinon.SinonStub;

  const mockPoolCreationData: PoolCreationData = {
    name: 'Test Pool',
    description: 'Test Description',
    assetName: 'Test Asset',
    tokenAddress: '0x1234567890123456789012345678901234567890' as Address,
    fundingGoal: '1000000000000000000000',
    durationDays: 30,
    rewardRate: 5,
    assetPrice: '1000000000000000000',
  };

  const mockCreatorAddress = '0xcreator123' as Address;

  beforeEach(() => {
    // Mock provider
    mockProvider = {
      getNetwork: sinon.stub(),
    };

    // Mock signer
    mockSigner = {
      getAddress: sinon.stub().resolves(mockCreatorAddress),
    };

    // Mock contract
    mockContract = {
      createOperation: sinon.stub(),
      getOperation: sinon.stub(),
      stake: sinon.stub(),
      claimReward: sinon.stub(),
      unlockReward: sinon.stub(),
      getAddress: sinon.stub().resolves('0xcontract123'),
      interface: {
        getEvent: sinon.stub().returns({
          topicHash: '0xevent123',
        }),
        parseLog: sinon.stub(),
      },
    };

    // Mock repository context
    mockRepositoryContext = {
      getPoolRepository: sinon.stub().returns({
        getPoolById: sinon.stub(),
        getPoolStakeHistory: sinon.stub().resolves([]),
      }),
    };

    // Mock ethers utilities
    ethersStub = sinon.stub(ethers, 'isAddress').returns(true);

    // Mock contract factory
    const AuStakeFactory = require('@/typechain-types');
    contractFactoryStub = sinon
      .stub(AuStakeFactory.AuStake__factory, 'connect')
      .returns(mockContract);

    // Create service instance
    poolService = new PoolService(
      mockProvider,
      mockSigner,
      mockRepositoryContext,
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createPool', () => {
    it('should create a pool successfully', async () => {
      const mockTxResponse = {
        wait: sinon.stub().resolves({
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

      mockContract.createOperation.resolves(mockTxResponse);
      mockContract.interface.parseLog.returns(mockParsedLog);

      const result = await poolService.createPool(
        mockPoolCreationData,
        mockCreatorAddress,
      );

      expect(result).to.deep.equal({
        poolId: '0xpool123',
        transactionHash: '0xtxhash123',
      });

      expect(mockContract.createOperation).to.have.been.calledWith(
        mockPoolCreationData.name,
        mockPoolCreationData.description,
        mockPoolCreationData.tokenAddress,
        mockCreatorAddress,
        sinon.match.any, // deadline
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

      try {
        await poolService.createPool(invalidData, mockCreatorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Pool name is required');
      }
    });

    it('should validate token address', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        tokenAddress: 'invalid-address' as Address,
      };

      ethersStub.returns(false);

      try {
        await poolService.createPool(invalidData, mockCreatorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Valid token address is required');
      }
    });

    it('should validate funding goal', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        fundingGoal: '0',
        tokenAddress: '0x1234567890123456789012345678901234567890' as Address, // valid address
      };

      try {
        await poolService.createPool(invalidData, mockCreatorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Funding goal must be greater than 0');
      }
    });

    it('should validate duration', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        durationDays: 0,
        tokenAddress: '0x1234567890123456789012345678901234567890' as Address, // valid address
      };

      try {
        await poolService.createPool(invalidData, mockCreatorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include(
          'Duration must be greater than 0 days',
        );
      }
    });

    it('should validate reward rate', async () => {
      const invalidData = {
        ...mockPoolCreationData,
        rewardRate: -1,
        tokenAddress: '0x1234567890123456789012345678901234567890' as Address, // valid address
      };

      try {
        await poolService.createPool(invalidData, mockCreatorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Reward rate cannot be negative');
      }
    });

    it('should handle contract errors', async () => {
      mockContract.createOperation.rejects(new Error('Contract error'));

      try {
        await poolService.createPool(mockPoolCreationData, mockCreatorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to create pool');
      }
    });
  });

  describe('stake', () => {
    const poolId = '0xpool123';
    const amount = '1000000000000000000';
    const investorAddress = '0xinvestor123' as Address;

    beforeEach(() => {
      mockSigner.getAddress.resolves(investorAddress);
    });

    it('should stake successfully', async () => {
      const mockOperation = {
        id: poolId,
        token: '0xtoken123',
      };

      const mockTxResponse = {
        wait: sinon.stub().resolves({
          hash: '0xtxhash123',
        }),
      };

      mockContract.getOperation.resolves(mockOperation);
      mockContract.stake.resolves(mockTxResponse);

      // Mock the handleTokenApproval method directly to avoid Contract constructor issues
      const handleTokenApprovalStub = sinon
        .stub(poolService as any, 'handleTokenApproval')
        .resolves();

      const result = await poolService.stake(poolId, amount, investorAddress);

      expect(result).to.equal('0xtxhash123');
      expect(mockContract.stake).to.have.been.calledWith(
        '0xtoken123',
        poolId,
        BigInt(amount),
      );
      expect(handleTokenApprovalStub).to.have.been.calledWith(
        '0xtoken123',
        amount,
      );

      handleTokenApprovalStub.restore();
    });

    it('should validate investor address', async () => {
      mockSigner.getAddress.resolves('0xother123');

      try {
        await poolService.stake(poolId, amount, investorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Signer must match investor address');
      }
    });

    it('should validate pool exists', async () => {
      mockContract.getOperation.resolves({
        id: ethers.ZeroHash,
      });

      try {
        await poolService.stake(poolId, amount, investorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Pool not found');
      }
    });

    it('should handle contract errors', async () => {
      mockContract.getOperation.rejects(new Error('Contract error'));

      try {
        await poolService.stake(poolId, amount, investorAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to stake');
      }
    });
  });

  describe('claimReward', () => {
    const poolId = '0xpool123';
    const claimantAddress = '0xclaimant123' as Address;

    beforeEach(() => {
      mockSigner.getAddress.resolves(claimantAddress);
    });

    it('should claim reward successfully', async () => {
      const mockOperation = {
        id: poolId,
        token: '0xtoken123',
      };

      const mockTxResponse = {
        wait: sinon.stub().resolves({
          hash: '0xtxhash123',
        }),
      };

      mockContract.getOperation.resolves(mockOperation);
      mockContract.claimReward.resolves(mockTxResponse);

      const result = await poolService.claimReward(poolId, claimantAddress);

      expect(result).to.equal('0xtxhash123');
      expect(mockContract.claimReward).to.have.been.calledWith(
        '0xtoken123',
        poolId,
        claimantAddress,
      );
    });

    it('should validate claimant address', async () => {
      mockSigner.getAddress.resolves('0xother123');

      try {
        await poolService.claimReward(poolId, claimantAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Signer must match claimant address');
      }
    });

    it('should validate pool exists', async () => {
      mockContract.getOperation.resolves({
        id: ethers.ZeroHash,
      });

      try {
        await poolService.claimReward(poolId, claimantAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Pool not found');
      }
    });

    it('should handle contract errors', async () => {
      mockContract.getOperation.rejects(new Error('Contract error'));

      try {
        await poolService.claimReward(poolId, claimantAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to claim reward');
      }
    });
  });

  describe('unlockReward', () => {
    const poolId = '0xpool123';
    const providerAddress = '0xprovider123' as Address;

    beforeEach(() => {
      mockSigner.getAddress.resolves(providerAddress);
    });

    it('should unlock reward successfully', async () => {
      const mockOperation = {
        id: poolId,
        token: '0xtoken123',
      };

      const mockTxResponse = {
        wait: sinon.stub().resolves({
          hash: '0xtxhash123',
        }),
      };

      mockContract.getOperation.resolves(mockOperation);
      mockContract.unlockReward.resolves(mockTxResponse);

      const result = await poolService.unlockReward(poolId, providerAddress);

      expect(result).to.equal('0xtxhash123');
      expect(mockContract.unlockReward).to.have.been.calledWith(
        '0xtoken123',
        poolId,
      );
    });

    it('should validate provider address', async () => {
      mockSigner.getAddress.resolves('0xother123');

      try {
        await poolService.unlockReward(poolId, providerAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include(
          'Only the pool provider can unlock rewards',
        );
      }
    });

    it('should validate pool exists', async () => {
      mockContract.getOperation.resolves({
        id: ethers.ZeroHash,
      });

      try {
        await poolService.unlockReward(poolId, providerAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Pool not found');
      }
    });

    it('should handle contract errors', async () => {
      mockContract.getOperation.rejects(new Error('Contract error'));

      try {
        await poolService.unlockReward(poolId, providerAddress);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to unlock reward');
      }
    });
  });

  describe('constructor', () => {
    it('should throw error when contract address is undefined', () => {
      // Mock the chain constants to return undefined
      const chainConstants = require('@/chain-constants');
      sinon
        .stub(chainConstants, 'NEXT_PUBLIC_AUSTAKE_ADDRESS')
        .value(undefined);

      expect(
        () =>
          new PoolService(mockProvider, mockSigner, mockRepositoryContext, ''),
      ).to.throw('[PoolService] Pool contract address is undefined');
    });

    it('should use default contract address when not provided', () => {
      expect(contractFactoryStub).to.have.been.called;
    });
  });

  describe('validatePoolCreationData', () => {
    it('should validate all required fields', async () => {
      const testCases = [
        {
          field: 'name',
          value: '',
          error: 'Pool name is required',
          validAddress: true,
        },
        {
          field: 'description',
          value: '',
          error: 'Pool description is required',
          validAddress: true,
        },
        {
          field: 'assetName',
          value: '',
          error: 'Asset name is required',
          validAddress: true,
        },
        {
          field: 'tokenAddress',
          value: 'invalid-address',
          error: 'Valid token address is required',
          validAddress: false,
        },
        {
          field: 'fundingGoal',
          value: '0',
          error: 'Funding goal must be greater than 0',
          validAddress: true,
        },
        {
          field: 'assetPrice',
          value: '0',
          error: 'Asset price must be greater than 0',
          validAddress: true,
        },
        {
          field: 'durationDays',
          value: 0,
          error: 'Duration must be greater than 0 days',
          validAddress: true,
        },
        {
          field: 'rewardRate',
          value: -1,
          error: 'Reward rate cannot be negative',
          validAddress: true,
        },
      ];

      for (const testCase of testCases) {
        // Reset ethers stub for each test case
        ethersStub.returns(testCase.validAddress);

        const invalidData = {
          ...mockPoolCreationData,
          [testCase.field]: testCase.value,
        };

        // For non-address validation, ensure we have a valid address
        if (testCase.validAddress) {
          invalidData.tokenAddress =
            '0x1234567890123456789012345678901234567890' as Address;
        }

        try {
          await poolService.createPool(invalidData, mockCreatorAddress);
          expect.fail(`Should have thrown an error for ${testCase.field}`);
        } catch (error: any) {
          expect(error.message).to.include(testCase.error);
        }
      }
    });
  });
});
