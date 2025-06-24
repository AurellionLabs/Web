import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, { SinonStubbedInstance } from 'sinon';
import { ethers } from 'ethers';

// Domain imports
import { 
  IPoolRepository, 
  Pool, 
  StakeEvent, 
  PoolStatus, 
  Address, 
  BigNumberString 
} from '@/domain/pool';

// Infrastructure imports
import { PoolRepository } from '@/infrastructure/repositories/pool-repository';
import { AuStake as AuStakeContract } from '@/typechain-types';

// Configure Chai
chai.use(chaiAsPromised);

describe('PoolRepository', () => {
  // --- Mock Context ---
  let mockContract: SinonStubbedInstance<AuStakeContract>;
  let mockProvider: any;
  let mockSigner: any;

  // --- Repository Instance ---
  let repository: IPoolRepository;

  // --- Test Constants ---
  const testContractAddress = '0x1234567890123456789012345678901234567890';
  const testPoolId = 'test-pool-1';
  const testOperationId = ethers.id(testPoolId);
  const testStakerAddress: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
  const testProviderAddress: Address = '0x1111111111111111111111111111111111111111';
  const testTokenAddress: Address = '0x2222222222222222222222222222222222222222';

  // Mock operation data
  const mockOperation: AuStakeContract.OperationStructOutput = {
    id: testOperationId,
    name: 'Test Pool',
    description: 'A test staking pool',
    token: testTokenAddress,
    provider: testProviderAddress,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
    reward: BigInt(500), // 5%
    rwaName: 'Test Asset',
    fundingGoal: ethers.parseEther('1000'),
    totalStaked: ethers.parseEther('100'),
    status: BigInt(1), // ACTIVE
  } as any;

  beforeEach(() => {
    // Create mock contract
    mockContract = sinon.createStubInstance({} as any);
    mockProvider = {
      getNetwork: sinon.stub().resolves({ chainId: 1 }),
    };
    mockSigner = {
      getAddress: sinon.stub().resolves('0x0000000000000000000000000000000000000000'),
    };

    // Stub contract methods
    mockContract.getOperation = sinon.stub();
    mockContract.filters = {
      Staked: sinon.stub(),
      OperationCreated: sinon.stub(),
    };
    mockContract.queryFilter = sinon.stub();

    // Instantiate repository with mocks
    repository = new PoolRepository(mockProvider, mockSigner, testContractAddress);
    
    // Replace the private contract instance with our mock
    (repository as any).contract = mockContract;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getPoolById', () => {
    it('should return a pool when operation exists', async () => {
      // Arrange
      mockContract.getOperation.withArgs(testOperationId).resolves(mockOperation);

      // Act
      const result = await repository.getPoolById(testPoolId);

      // Assert
      expect(result).to.not.be.null;
      expect(result!.id).to.equal(testPoolId);
      expect(result!.name).to.equal('Test Pool');
      expect(result!.description).to.equal('A test staking pool');
      expect(result!.assetName).to.equal('Test Asset');
      expect(result!.tokenAddress).to.equal(testTokenAddress);
      expect(result!.providerAddress).to.equal(testProviderAddress);
      expect(result!.status).to.equal(PoolStatus.ACTIVE);
    });

    it('should return null when operation does not exist', async () => {
      // Arrange
      const emptyOperation = {
        id: ethers.ZeroHash,
        token: ethers.ZeroAddress,
      } as any;
      mockContract.getOperation.withArgs(testOperationId).resolves(emptyOperation);

      // Act
      const result = await repository.getPoolById(testPoolId);

      // Assert
      expect(result).to.be.null;
    });

    it('should return null when contract call fails', async () => {
      // Arrange
      mockContract.getOperation.withArgs(testOperationId).rejects(new Error('Contract error'));

      // Act
      const result = await repository.getPoolById(testPoolId);

      // Assert
      expect(result).to.be.null;
    });
  });

  describe('getPoolStakeHistory', () => {
    it('should return stake events for a pool', async () => {
      // Arrange
      const mockEvents = [
        {
          args: {
            user: testStakerAddress,
            operationId: testOperationId,
            amount: ethers.parseEther('50'),
          },
          transactionHash: '0xabc123',
        },
        {
          args: {
            user: testStakerAddress,
            operationId: testOperationId,
            amount: ethers.parseEther('25'),
          },
          transactionHash: '0xdef456',
        },
      ];

      const mockFilter = {};
      mockContract.filters.Staked.withArgs(null, testOperationId).returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).resolves(mockEvents);

      // Act
      const result = await repository.getPoolStakeHistory(testPoolId);

      // Assert
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0].poolId).to.equal(testPoolId);
      expect(result[0].stakerAddress).to.equal(testStakerAddress);
      expect(result[0].amount).to.equal(ethers.parseEther('50').toString());
      expect(result[0].transactionHash).to.equal('0xabc123');
    });

    it('should return empty array when no events found', async () => {
      // Arrange
      const mockFilter = {};
      mockContract.filters.Staked.withArgs(null, testOperationId).returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).resolves([]);

      // Act
      const result = await repository.getPoolStakeHistory(testPoolId);

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle query filter errors gracefully', async () => {
      // Arrange
      const mockFilter = {};
      mockContract.filters.Staked.withArgs(null, testOperationId).returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).rejects(new Error('Query error'));

      // Act
      const result = await repository.getPoolStakeHistory(testPoolId);

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('findPoolsByStaker', () => {
    it('should return pools where user has staked', async () => {
      // Arrange
      const mockEvents = [
        {
          args: {
            user: testStakerAddress,
            operationId: testOperationId,
            amount: ethers.parseEther('50'),
          },
        },
      ];

      const mockFilter = {};
      mockContract.filters.Staked.withArgs(testStakerAddress).returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).resolves(mockEvents);
      mockContract.getOperation.withArgs(testOperationId).resolves(mockOperation);

      // Act
      const result = await repository.findPoolsByStaker(testStakerAddress);

      // Assert
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].id).to.equal(ethers.hexlify(testOperationId));
      expect(result[0].name).to.equal('Test Pool');
    });

    it('should return empty array when user has not staked', async () => {
      // Arrange
      const mockFilter = {};
      mockContract.filters.Staked.withArgs(testStakerAddress).returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).resolves([]);

      // Act
      const result = await repository.findPoolsByStaker(testStakerAddress);

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('findPoolsByProvider', () => {
    it('should return pools managed by provider', async () => {
      // Arrange
      const mockEvents = [
        {
          args: {
            operationId: testOperationId,
          },
        },
      ];

      const mockFilter = {};
      mockContract.filters.OperationCreated.returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).resolves(mockEvents);
      mockContract.getOperation.withArgs(testOperationId).resolves(mockOperation);

      // Act
      const result = await repository.findPoolsByProvider(testProviderAddress);

      // Assert
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].providerAddress.toLowerCase()).to.equal(testProviderAddress.toLowerCase());
    });

    it('should return empty array when provider has no pools', async () => {
      // Arrange
      const mockFilter = {};
      mockContract.filters.OperationCreated.returns(mockFilter);
      mockContract.queryFilter.withArgs(mockFilter).resolves([]);

      // Act
      const result = await repository.findPoolsByProvider(testProviderAddress);

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('getTokenDecimals', () => {
    it('should return token decimals', async () => {
      // Arrange - mock the ERC20 contract call
      const mockTokenContract = {
        decimals: sinon.stub().resolves(18),
      };
      
      // Mock the ethers.Contract constructor
      const contractStub = sinon.stub(ethers, 'Contract').returns(mockTokenContract as any);

      // Act
      const result = await repository.getTokenDecimals(testTokenAddress);

      // Assert
      expect(result).to.equal(18);
      expect(contractStub.calledOnce).to.be.true;
      
      // Cleanup
      contractStub.restore();
    });

    it('should return default decimals when contract call fails', async () => {
      // Arrange
      const mockTokenContract = {
        decimals: sinon.stub().rejects(new Error('Contract error')),
      };
      
      const contractStub = sinon.stub(ethers, 'Contract').returns(mockTokenContract as any);

      // Act
      const result = await repository.getTokenDecimals(testTokenAddress);

      // Assert
      expect(result).to.equal(18); // Default value
      
      // Cleanup
      contractStub.restore();
    });
  });

  describe('getAllPoolIds', () => {
    it('should warn about missing implementation', async () => {
      // Arrange
      const consoleWarnSpy = sinon.spy(console, 'warn');

      // Act
      const result = await repository.getAllPoolIds();

      // Assert
      expect(result).to.be.an('array').that.is.empty;
      expect(consoleWarnSpy.calledOnce).to.be.true;
      expect(consoleWarnSpy.getCall(0).args[0]).to.include('getAllPoolIds needs contract implementation');
      
      // Cleanup
      consoleWarnSpy.restore();
    });
  });

  describe('getAllPools', () => {
    it('should return empty array when no pool IDs exist', async () => {
      // Act
      const result = await repository.getAllPools();

      // Assert
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('private mapping methods', () => {
    it('should correctly map contract status to pool status', () => {
      // Test the mapping through getPoolById
      const testCases = [
        { contractStatus: 0, expectedStatus: PoolStatus.PENDING },
        { contractStatus: 1, expectedStatus: PoolStatus.ACTIVE },
        { contractStatus: 2, expectedStatus: PoolStatus.COMPLETE },
        { contractStatus: 3, expectedStatus: PoolStatus.PAID },
        { contractStatus: 999, expectedStatus: PoolStatus.PENDING }, // Default case
      ];

      testCases.forEach(async (testCase) => {
        // Arrange
        const operation = {
          ...mockOperation,
          status: BigInt(testCase.contractStatus),
        };
        mockContract.getOperation.withArgs(testOperationId).resolves(operation);

        // Act
        const result = await repository.getPoolById(testPoolId);

        // Assert
        expect(result!.status).to.equal(testCase.expectedStatus);
      });
    });
  });
});