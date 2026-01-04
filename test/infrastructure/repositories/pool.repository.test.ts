// @ts-nocheck - Test file with outdated contract types
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PoolRepository } from '@/infrastructure/repositories/pool-repository';
import {
  Pool,
  PoolStatus,
  StakeEvent,
  Address,
  BigNumberString,
} from '@/domain/pool';
import { ethers } from 'ethers';

// Configure Chai
chai.use(chaiAsPromised);

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
    tokenTvl: '500000000000000000000', // 500 tokens
    deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
    reward: 500, // 5% in basis points
  };

  beforeEach(() => {
    // Mock provider
    mockProvider = {
      getNetwork: sinon.stub(),
    };

    // Mock signer
    mockSigner = {
      getAddress: sinon.stub().resolves('0xsigner123'),
    };

    // Mock contract
    mockContract = {
      getOperation: sinon.stub(),
      queryFilter: sinon.stub(),
      filters: {
        Staked: sinon.stub(),
        OperationCreated: sinon.stub(),
      },
      getAddress: sinon.stub().resolves('0xcontract123'),
    };

    // Mock ethers constants
    sinon
      .stub(ethers, 'ZeroHash')
      .value(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    sinon
      .stub(ethers, 'ZeroAddress')
      .value('0x0000000000000000000000000000000000000000');
    sinon
      .stub(ethers, 'formatEther')
      .callsFake((value: any) => (Number(value) / 1e18).toString());

    // Mock the contract factory - need to mock the entire module
    const mockAuStakeFactory = {
      connect: sinon.stub().returns(mockContract),
    };

    // This is a workaround for the module mocking
    poolRepository = new (class extends PoolRepository {
      constructor() {
        super(
          mockProvider,
          mockSigner,
          '0x1234567890123456789012345678901234567890',
        );
        // Override the contract with our mock
        (this as any).contract = mockContract;
      }
    })();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getPoolById', () => {
    it('should return a pool when found', async () => {
      mockContract.getOperation.resolves(mockPoolData);

      const result = await poolRepository.getPoolById(mockPoolData.id);

      expect(result.id).to.equal(mockPoolData.id);
      expect(result.name).to.equal(mockPoolData.name);
      expect(result.description).to.equal(mockPoolData.description);
      expect(result.assetName).to.equal(mockPoolData.rwaName);
      expect(result.tokenAddress).to.equal(mockPoolData.token);
      expect(result.providerAddress).to.equal(mockPoolData.provider);
      expect(result.fundingGoal).to.equal(mockPoolData.fundingGoal);
      expect(result.totalValueLocked).to.equal(mockPoolData.tokenTvl);
      expect(result.rewardRate).to.equal(5);
      expect(result.status).to.equal(PoolStatus.ACTIVE);
      expect(mockContract.getOperation.calledOnceWithExactly(mockPoolData.id))
        .to.be.true;
    });

    it('should throw error when pool not found', async () => {
      mockContract.getOperation.resolves({
        id: ethers.ZeroHash,
        token: ethers.ZeroAddress,
      });

      try {
        await poolRepository.getPoolById('nonexistent');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('Pool with id nonexistent not found');
      }
    });

    it('should throw error when contract call fails', async () => {
      mockContract.getOperation.rejects(new Error('Contract error'));

      try {
        await poolRepository.getPoolById(mockPoolData.id);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('Contract error');
      }
    });
  });

  describe('getPoolStakeHistory', () => {
    it('should return stake events for a pool', async () => {
      const mockEvents = [
        {
          args: {
            user: '0xstaker1',
            amount: { toString: () => '100000000000000000000' },
            time: 1234567890,
          },
          transactionHash: '0xtx1',
        },
        {
          args: {
            user: '0xstaker2',
            amount: { toString: () => '200000000000000000000' },
            time: 1234567891,
          },
          transactionHash: '0xtx2',
        },
      ];

      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves(mockEvents);

      const result = await poolRepository.getPoolStakeHistory(mockPoolData.id);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.include({
        poolId: mockPoolData.id,
        stakerAddress: '0xstaker1',
        amount: '100000000000000000000',
        timestamp: 1234567890,
        transactionHash: '0xtx1',
      });
      expect(result[1]).to.deep.include({
        poolId: mockPoolData.id,
        stakerAddress: '0xstaker2',
        amount: '200000000000000000000',
        timestamp: 1234567891,
        transactionHash: '0xtx2',
      });
    });

    it('should handle events with missing args', async () => {
      const mockEvents = [
        {
          args: null,
          transactionHash: '0xtx1',
        },
      ];

      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves(mockEvents);

      const result = await poolRepository.getPoolStakeHistory(mockPoolData.id);

      expect(result).to.have.length(1);
      expect(result[0]).to.deep.include({
        poolId: mockPoolData.id,
        stakerAddress: undefined,
        amount: '0',
        timestamp: 0,
        transactionHash: '0xtx1',
      });
    });
  });

  describe('findPoolsByInvestor', () => {
    it('should return pools for an investor', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: { operationId: 'pool2' } },
        { args: { operationId: 'pool1' } }, // duplicate
      ];

      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves(mockEvents);

      // Mock getPoolById calls
      mockContract.getOperation
        .onFirstCall()
        .resolves({ ...mockPoolData, id: 'pool1' })
        .onSecondCall()
        .resolves({ ...mockPoolData, id: 'pool2' });

      const result = await poolRepository.findPoolsByInvestor('0xinvestor123');

      expect(result).to.have.length(2);
      expect(result[0].id).to.equal('pool1');
      expect(result[1].id).to.equal('pool2');
    });

    it('should filter out invalid pool IDs', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: null }, // no args
        { args: { operationId: null } }, // null operationId
      ];

      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves(mockEvents);
      mockContract.getOperation.resolves(mockPoolData);

      const result = await poolRepository.findPoolsByInvestor('0xinvestor123');

      expect(result).to.have.length(1);
    });
  });

  describe('findPoolsByProvider', () => {
    it('should return pools for a provider', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: { operationId: 'pool2' } },
      ];

      mockContract.filters.OperationCreated.returns('operation-created-filter');
      mockContract.queryFilter.resolves(mockEvents);

      // Mock getPoolById calls
      mockContract.getOperation
        .onFirstCall()
        .resolves({ ...mockPoolData, id: 'pool1' })
        .onSecondCall()
        .resolves({ ...mockPoolData, id: 'pool2' });

      const result = await poolRepository.findPoolsByProvider('0xprovider123');

      expect(result).to.have.length(2);
      expect(result[0].id).to.equal('pool1');
      expect(result[1].id).to.equal('pool2');
    });
  });

  describe('getAllPools', () => {
    it('should return all pools', async () => {
      const mockEvents = [
        { args: { operationId: 'pool1' } },
        { args: { operationId: 'pool2' } },
      ];

      mockContract.filters.OperationCreated.returns('operation-created-filter');
      mockContract.queryFilter.resolves(mockEvents);

      // Mock getPoolById calls
      mockContract.getOperation
        .onFirstCall()
        .resolves({ ...mockPoolData, id: 'pool1' })
        .onSecondCall()
        .resolves({ ...mockPoolData, id: 'pool2' });

      const result = await poolRepository.getAllPools();

      expect(result).to.have.length(2);
      expect(result[0].id).to.equal('pool1');
      expect(result[1].id).to.equal('pool2');
    });
  });

  describe('getPoolWithDynamicData', () => {
    it('should return pool with dynamic data', async () => {
      mockContract.getOperation.resolves(mockPoolData);
      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves([]);

      const result = await poolRepository.getPoolWithDynamicData(
        mockPoolData.id,
      );

      expect(result).to.not.be.null;
      expect(result!.id).to.equal(mockPoolData.id);
      expect(result!.progressPercentage).to.be.a('number');
      expect(result!.timeRemainingSeconds).to.be.a('number');
      expect(result!.volume24h).to.be.a('string');
      expect(result!.apy).to.be.a('number');
      expect(result!.tvlFormatted).to.be.a('string');
      expect(result!.fundingGoalFormatted).to.be.a('string');
      expect(result!.rewardFormatted).to.be.a('string');
    });

    it('should return null when pool not found', async () => {
      mockContract.getOperation.resolves({
        id: ethers.ZeroHash,
        token: ethers.ZeroAddress,
      });

      const result = await poolRepository.getPoolWithDynamicData('nonexistent');

      expect(result).to.be.null;
    });
  });

  describe('getGroupedStakeHistory', () => {
    it('should group stakes by daily interval', async () => {
      const mockEvents = [
        {
          args: {
            user: '0xstaker1',
            amount: { toString: () => '100000000000000000000' },
            time: 1672531200, // 2023-01-01
          },
          transactionHash: '0xtx1',
        },
        {
          args: {
            user: '0xstaker2',
            amount: { toString: () => '200000000000000000000' },
            time: 1672617600, // 2023-01-02
          },
          transactionHash: '0xtx2',
        },
      ];

      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves(mockEvents);

      const result = await poolRepository.getGroupedStakeHistory(
        mockPoolData.id,
        '1D',
      );

      expect(result.daily).to.exist;
      expect(Object.keys(result.daily!)).to.have.length(2);
      expect(result.daily!['2023-01-01']).to.equal('100000000000000000000');
      expect(result.daily!['2023-01-02']).to.equal('200000000000000000000');
    });

    it('should group stakes by hourly interval', async () => {
      const mockEvents = [
        {
          args: {
            user: '0xstaker1',
            amount: { toString: () => '100000000000000000000' },
            time: 1672531200, // 2023-01-01 00:00:00
          },
          transactionHash: '0xtx1',
        },
        {
          args: {
            user: '0xstaker2',
            amount: { toString: () => '200000000000000000000' },
            time: 1672534800, // 2023-01-01 01:00:00
          },
          transactionHash: '0xtx2',
        },
      ];

      mockContract.filters.Staked.returns('staked-filter');
      mockContract.queryFilter.resolves(mockEvents);

      const result = await poolRepository.getGroupedStakeHistory(
        mockPoolData.id,
        '1H',
      );

      expect(result.hourly).to.exist;
      expect(Object.keys(result.hourly!)).to.have.length(2);
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
        assetPrice: '750000000000000000000', // $750 in wei (18 decimals)
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

      const result = await poolRepository.calculatePoolDynamicData(
        mockPool,
        mockStakeHistory,
      );

      expect(result.progressPercentage).to.equal(50); // 500/1000 * 100
      expect(result.timeRemainingSeconds).to.be.a('number');
      expect(result.volume24h).to.equal('100000000000000000000');
      expect(result.apy).to.equal(5);
      expect(result.tvlFormatted).to.be.a('string');
      expect(result.fundingGoalFormatted).to.be.a('string');
      expect(result.rewardFormatted).to.equal('5%');
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
        assetPrice: '750000000000000000000', // $750 in wei (18 decimals)
        status: PoolStatus.ACTIVE,
      };

      const result = await poolRepository.calculatePoolDynamicData(
        mockPool,
        [],
      );

      expect(result.progressPercentage).to.equal(0);
      expect(result.volume24h).to.equal('0');
      expect(result.apy).to.equal(5);
      expect(result.rewardFormatted).to.equal('5%');
    });
  });

  describe('constructor', () => {
    it('should throw error when contract address is undefined', () => {
      expect(() => new PoolRepository(mockProvider, mockSigner, '')).to.throw(
        '[PoolRepository] Pool contract address is undefined',
      );
    });
  });
});
