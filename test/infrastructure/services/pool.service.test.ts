import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, { SinonStubbedInstance } from 'sinon';

// Domain imports
import { 
  IPoolService, 
  IPoolRepository,
  Pool, 
  PoolCreationData,
  PoolDynamicData,
  StakeEvent,
  PoolStatus, 
  Address, 
  BigNumberString 
} from '@/domain/pool';

// Infrastructure imports
import { PoolService } from '@/infrastructure/services/pool.service';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

// Configure Chai
chai.use(chaiAsPromised);

describe('PoolService', () => {
  // --- Mock Context ---
  let mockPoolRepository: SinonStubbedInstance<IPoolRepository>;
  let mockRepositoryContext: SinonStubbedInstance<RepositoryContext>;
  let mockAuStakeRepository: any;

  // --- Service Instance ---
  let service: IPoolService;

  // --- Test Constants ---
  const testPoolId = 'test-pool-1';
  const testStakerAddress: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
  const testProviderAddress: Address = '0x1111111111111111111111111111111111111111';
  const testTokenAddress: Address = '0x2222222222222222222222222222222222222222';

  // Mock pool data
  const mockPool: Pool = {
    id: testPoolId,
    name: 'Test Pool',
    description: 'A test staking pool',
    assetName: 'Test Asset',
    tokenAddress: testTokenAddress,
    providerAddress: testProviderAddress,
    fundingGoal: '1000000000000000000000' as BigNumberString, // 1000 tokens
    totalValueLocked: '100000000000000000000' as BigNumberString, // 100 tokens
    startDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    durationDays: 30,
    rewardRate: 500, // 5%
    status: PoolStatus.ACTIVE,
  };

  const mockPoolCreationData: PoolCreationData = {
    name: 'New Test Pool',
    description: 'A new test pool',
    assetName: 'New Asset',
    tokenAddress: testTokenAddress,
    fundingGoal: '2000000000000000000000' as BigNumberString,
    durationDays: 60,
    rewardRate: 750,
    assetPrice: '1000000000000000000' as BigNumberString,
  };

  const mockStakeEvents: StakeEvent[] = [
    {
      poolId: testPoolId,
      stakerAddress: testStakerAddress,
      amount: '50000000000000000000' as BigNumberString,
      timestamp: Math.floor(Date.now() / 1000) - 1800,
      transactionHash: '0xabc123',
    },
  ];

  beforeEach(() => {
    // Create mock repository
    mockPoolRepository = sinon.createStubInstance({} as any);
    mockPoolRepository.getPoolById = sinon.stub();
    mockPoolRepository.getAllPools = sinon.stub();
    mockPoolRepository.findPoolsByStaker = sinon.stub();
    mockPoolRepository.findPoolsByProvider = sinon.stub();
    mockPoolRepository.getPoolStakeHistory = sinon.stub();
    mockPoolRepository.getTokenDecimals = sinon.stub();

    // Create mock repository context
    mockRepositoryContext = sinon.createStubInstance(RepositoryContext);
    mockAuStakeRepository = {
      createOperation: sinon.stub(),
      addStake: sinon.stub(),
      claimReward: sinon.stub(),
      unlockRewards: sinon.stub(),
    };
    
    mockRepositoryContext.getAuStakeRepository.returns(mockAuStakeRepository);
    mockRepositoryContext.getSigner.returns({
      getAddress: sinon.stub().resolves(testStakerAddress),
    } as any);

    // Instantiate service
    service = new PoolService(mockPoolRepository as any, mockRepositoryContext as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getPoolWithDynamicData', () => {
    it('should return pool with dynamic data when pool exists', async () => {
      // Arrange
      mockPoolRepository.getPoolById.withArgs(testPoolId).resolves(mockPool);
      mockPoolRepository.getPoolStakeHistory.withArgs(testPoolId).resolves(mockStakeEvents);
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.getPoolWithDynamicData(testPoolId);

      // Assert
      expect(result).to.not.be.null;
      expect(result!.id).to.equal(testPoolId);
      expect(result!.name).to.equal('Test Pool');
      expect(result!).to.have.property('progressPercentage');
      expect(result!).to.have.property('timeRemainingSeconds');
      expect(result!).to.have.property('tvlFormatted');
      expect(result!).to.have.property('apy');
    });

    it('should return null when pool does not exist', async () => {
      // Arrange
      mockPoolRepository.getPoolById.withArgs(testPoolId).resolves(null);

      // Act
      const result = await service.getPoolWithDynamicData(testPoolId);

      // Assert
      expect(result).to.be.null;
    });
  });

  describe('getAllPoolsWithDynamicData', () => {
    it('should return all pools with dynamic data', async () => {
      // Arrange
      mockPoolRepository.getAllPools.resolves([mockPool]);
      mockPoolRepository.getPoolStakeHistory.withArgs(testPoolId).resolves(mockStakeEvents);
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.getAllPoolsWithDynamicData();

      // Assert
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].id).to.equal(testPoolId);
      expect(result[0]).to.have.property('progressPercentage');
    });

    it('should return empty array when no pools exist', async () => {
      // Arrange
      mockPoolRepository.getAllPools.resolves([]);

      // Act
      const result = await service.getAllPoolsWithDynamicData();

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserPoolsWithDynamicData', () => {
    it('should return user pools with dynamic data', async () => {
      // Arrange
      mockPoolRepository.findPoolsByStaker.withArgs(testStakerAddress).resolves([mockPool]);
      mockPoolRepository.getPoolStakeHistory.withArgs(testPoolId).resolves(mockStakeEvents);
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.getUserPoolsWithDynamicData(testStakerAddress);

      // Assert
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].id).to.equal(testPoolId);
    });
  });

  describe('getProviderPoolsWithDynamicData', () => {
    it('should return provider pools with dynamic data', async () => {
      // Arrange
      mockPoolRepository.findPoolsByProvider.withArgs(testProviderAddress).resolves([mockPool]);
      mockPoolRepository.getPoolStakeHistory.withArgs(testPoolId).resolves(mockStakeEvents);
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.getProviderPoolsWithDynamicData(testProviderAddress);

      // Assert
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].providerAddress).to.equal(testProviderAddress);
    });
  });

  describe('getGroupedStakeHistory', () => {
    it('should return grouped stake history by day', async () => {
      // Arrange
      mockPoolRepository.getPoolStakeHistory.withArgs(testPoolId).resolves(mockStakeEvents);

      // Act
      const result = await service.getGroupedStakeHistory(testPoolId, '1D');

      // Assert
      expect(result).to.be.an('object');
      expect(result).to.have.property('daily');
    });

    it('should return grouped stake history by hour', async () => {
      // Arrange
      mockPoolRepository.getPoolStakeHistory.withArgs(testPoolId).resolves(mockStakeEvents);

      // Act
      const result = await service.getGroupedStakeHistory(testPoolId, '1H');

      // Assert
      expect(result).to.be.an('object');
      expect(result).to.have.property('hourly');
    });
  });

  describe('calculatePoolDynamicData', () => {
    it('should calculate correct progress percentage', async () => {
      // Arrange
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.calculatePoolDynamicData(mockPool, mockStakeEvents);

      // Assert
      expect(result.progressPercentage).to.equal(10); // 100/1000 * 100 = 10%
    });

    it('should calculate time remaining correctly', async () => {
      // Arrange
      const poolWithFutureEnd = {
        ...mockPool,
        startDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        durationDays: 1, // 1 day duration
      };
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.calculatePoolDynamicData(poolWithFutureEnd, mockStakeEvents);

      // Assert
      expect(result.timeRemainingSeconds).to.be.greaterThan(0);
      expect(result.timeRemainingSeconds).to.be.lessThan(24 * 60 * 60); // Less than 24 hours
    });

    it('should format values correctly', async () => {
      // Arrange
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.calculatePoolDynamicData(mockPool, mockStakeEvents);

      // Assert
      expect(result.tvlFormatted).to.include('100.00');
      expect(result.fundingGoalFormatted).to.include('1000.00');
      expect(result.rewardFormatted).to.equal('5.00%');
    });

    it('should calculate APY correctly', async () => {
      // Arrange
      mockPoolRepository.getTokenDecimals.withArgs(testTokenAddress).resolves(18);

      // Act
      const result = await service.calculatePoolDynamicData(mockPool, mockStakeEvents);

      // Assert
      expect(result.apy).to.be.a('number');
      expect(result.apy).to.be.greaterThan(0);
    });
  });

  describe('createPool', () => {
    it('should throw error with placeholder message', async () => {
      // Act & Assert
      await expect(
        service.createPool(mockPoolCreationData, testProviderAddress)
      ).to.eventually.be.rejectedWith(Error, 'Pool creation not yet implemented');
    });
  });

  describe('stake', () => {
    it('should throw error with placeholder message', async () => {
      // Act & Assert
      await expect(
        service.stake(testPoolId, '100000000000000000000', testStakerAddress)
      ).to.eventually.be.rejectedWith(Error, 'Staking not yet implemented');
    });
  });

  describe('claimReward', () => {
    it('should throw error with placeholder message', async () => {
      // Act & Assert
      await expect(
        service.claimReward(testPoolId, testStakerAddress)
      ).to.eventually.be.rejectedWith(Error, 'Claim reward not yet implemented');
    });
  });

  describe('unlockReward', () => {
    it('should throw error with placeholder message', async () => {
      // Act & Assert
      await expect(
        service.unlockReward(testPoolId, testProviderAddress)
      ).to.eventually.be.rejectedWith(Error, 'Unlock reward not yet implemented');
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockPoolRepository.getPoolById.withArgs(testPoolId).rejects(new Error('Repository error'));

      // Act
      const result = await service.getPoolWithDynamicData(testPoolId);

      // Assert
      expect(result).to.be.null;
    });

    it('should return empty array on service error', async () => {
      // Arrange
      mockPoolRepository.getAllPools.rejects(new Error('Service error'));

      // Act
      const result = await service.getAllPoolsWithDynamicData();

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });
  });
});