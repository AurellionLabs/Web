import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, { SinonStubbedInstance } from 'sinon';
import { ethers } from 'ethers'; // Use ethers from ethers directly for types/constants

// --- Mocks ---
// Mock interfaces/classes from domain and infrastructure
import { NodeRepository } from '@/domain/node/node';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { NodeAssetService } from '@/infrastructure/services/node-asset.service';
import { AurumNodeManager, AurumNode } from '@/typechain-types'; // Import contract types

// --- Configure Chai ---
chai.use(chaiAsPromised);

// --- Test Suite ---
describe('NodeAssetService', () => {
  // --- Mock Context ---
  let mockContext: SinonStubbedInstance<RepositoryContext>;

  // --- Mocks for Context Returns ---
  // We'll create simple stubs/mocks for what the context methods should return
  let mockNodeRepoMethods: Partial<NodeRepository>; // Use Partial for simplicity
  let mockManagerMethods: Partial<AurumNodeManager>;
  let mockNodeMethods: Partial<AurumNode>;
  let addItemStub: sinon.SinonStub;
  let updateSupportedAssetsStub: sinon.SinonStub;
  let getNodeStub: sinon.SinonStub;

  // --- Service Instance ---
  let service: NodeAssetService;

  // --- Test Constants ---
  const testNodeAddress = '0x1234567890123456789012345678901234567890';
  const testAssetId = 1;
  const testAmount = 100;
  // const testNextPublicAuraGoatAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // Not needed if we don't mock constant

  beforeEach(() => {
    // Create a stubbed instance of the RepositoryContext
    mockContext = sinon.createStubInstance(RepositoryContext);

    // Create stubs for the methods we expect to call on the returned objects
    addItemStub = sinon.stub();
    updateSupportedAssetsStub = sinon.stub();
    getNodeStub = sinon.stub();

    // Create simple partial mock objects containing these stubs
    // We cast to 'any' then to the target type to bypass strict type checking for mocks
    mockNodeMethods = { addItem: addItemStub } as any as AurumNode;
    mockManagerMethods = {
      updateSupportedAssets: updateSupportedAssetsStub,
    } as any as AurumNodeManager;
    mockNodeRepoMethods = { getNode: getNodeStub } as any as NodeRepository;

    // Configure the mock context to return these partial mocks/stubs
    mockContext.getAurumContract.returns(
      mockManagerMethods as AurumNodeManager,
    );
    mockContext.getNodeRepository.returns(
      mockNodeRepoMethods as NodeRepository,
    );
    mockContext.getAurumNodeContract
      .withArgs(testNodeAddress)
      .returns(mockNodeMethods as AurumNode);

    // Instantiate the service with the mock context
    service = new NodeAssetService(mockContext);

    // ... constant mocking note ...
  });

  afterEach(() => {
    sinon.restore();
  });

  // --- Test Cases ---

  describe('mintAsset', () => {
    it('should call addItem on the correct AurumNode contract mock with correct parameters', async () => {
      // Arrange
      const mockTxResponse = {
        wait: sinon.stub().resolves({ status: 1 }),
      } as any;
      addItemStub.resolves(mockTxResponse); // Configure the specific stub

      const expectedPaddedId = ethers.zeroPadValue(
        ethers.toBeHex(testAssetId),
        32,
      );
      const expectedBigIntAssetId = BigInt(testAssetId);
      const expectedBigIntAmount = BigInt(testAmount);

      // Act
      await service.mintAsset(testNodeAddress, testAssetId, testAmount);

      // Assert: Verify context provided the node contract mock
      expect(
        mockContext.getAurumNodeContract.calledOnceWithExactly(testNodeAddress),
      ).to.be.true;

      // Assert: Verify addItem was called correctly ON THE STUB
      expect(addItemStub.calledOnce).to.be.true;
      const addItemArgs = addItemStub.getCall(0).args;
      expect(addItemArgs[0], 'arg: itemOwner').to.equal(testNodeAddress);
      expect(addItemArgs[1], 'arg: id (padded)').to.equal(expectedPaddedId);
      expect(addItemArgs[2], 'arg: weight').to.equal(expectedBigIntAssetId);
      expect(addItemArgs[3], 'arg: amount').to.equal(expectedBigIntAmount);
      // We still can't easily verify NEXT_PUBLIC_AURA_GOAT_ADDRESS (arg 4) here without mocking the import
      expect(addItemArgs[5], 'arg: assetName').to.equal('GOAT'); // Use correct name for assetId 1
      expect(addItemArgs[6], 'arg: attributes').to.deep.equal([]); // Check attributes is empty array
      expect(addItemArgs[7], 'arg: data').to.equal('0x'); // Check data is 0x

      // Assert: Verify transaction wait was called
      expect(mockTxResponse.wait.calledOnce).to.be.true;
    });

    it('should throw if addItem call fails', async () => {
      // Arrange
      const contractError = new Error('Contract call failed');
      addItemStub.rejects(contractError);

      // Act & Assert: Use expect with await and eventually.rejectedWith
      await expect(
        service.mintAsset(testNodeAddress, testAssetId, testAmount),
      ).to.eventually.be.rejectedWith(Error, 'Contract call failed');
    });

    it('should throw if context fails to provide the node contract instance', async () => {
      // Arrange
      mockContext.getAurumNodeContract
        .withArgs(testNodeAddress)
        .returns(null as any);

      // Act & Assert: Expect a generic Error due to handleContractError wrapping
      await expect(
        service.mintAsset(testNodeAddress, testAssetId, testAmount),
      ).to.eventually.be.rejectedWith(Error);
      // Optionally, check the message content if needed for more robustness:
      // .to.eventually.be.rejectedWith(Error, /Cannot read properties of null/);
    });
  });

  // --- Tests for updateAssetCapacity ---
  describe('updateAssetCapacity', () => {
    const assetToUpdate = 2;
    const newCapacity = 500;
    const initialSupportedAssets = [1, 2, 3];
    const initialCapacities = [1000, 1000, 1000];
    const initialPrices = [10, 20, 30];

    const mockNodeData = {
      address: testNodeAddress,
      location: { addressName: 'Test', location: { lat: '0', lng: '0' } },
      validNode: '0x01',
      owner: '0xowneraddress',
      supportedAssets: initialSupportedAssets,
      status: 'Active',
      capacity: initialCapacities,
      assetPrices: initialPrices,
    };

    it('should update capacity by calling updateSupportedAssets with correct params', async () => {
      // Arrange
      const mockTxResponse = {
        wait: sinon.stub().resolves({ status: 1 }),
      } as any;
      updateSupportedAssetsStub.resolves(mockTxResponse); // Mock contract call success

      const expectedCapacitiesBigInt = [
        BigInt(1000),
        BigInt(newCapacity),
        BigInt(1000),
      ];
      const expectedAssetsBigInt = initialSupportedAssets.map(BigInt);
      const expectedPricesBigInt = initialPrices.map(BigInt);

      // Act
      await service.updateAssetCapacity(
        testNodeAddress,
        assetToUpdate,
        newCapacity,
        initialSupportedAssets,
        initialCapacities,
        initialPrices,
      );

      // Assert
      expect(mockContext.getAurumContract.calledOnce).to.be.true; // Context provided manager
      expect(updateSupportedAssetsStub.calledOnce).to.be.true; // Manager method called

      const callArgs = updateSupportedAssetsStub.getCall(0).args;
      expect(callArgs[0]).to.equal(testNodeAddress);
      expect(callArgs[1]).to.deep.equal(expectedCapacitiesBigInt); // Updated capacities
      expect(callArgs[2]).to.deep.equal(expectedAssetsBigInt); // Original assets
      expect(callArgs[3]).to.deep.equal(expectedPricesBigInt); // Original prices

      expect(mockTxResponse.wait.calledOnce).to.be.true; // Transaction waited
    });

    it('should throw if assetId is not found in supportedAssets', async () => {
      // Arrange
      const nonExistentAssetId = 99;
      await expect(
        service.updateAssetCapacity(
          testNodeAddress,
          nonExistentAssetId,
          newCapacity,
          initialSupportedAssets, // Asset 99 is not here
          initialCapacities,
          initialPrices,
        ),
      ).to.eventually.be.rejectedWith(Error, /Asset ID 99 not found/);
    });

    it('should throw if getAurumContract().updateSupportedAssets fails', async () => {
      // Arrange
      const updateError = new Error('Contract update failed');
      updateSupportedAssetsStub.rejects(updateError); // updateSupportedAssets fails

      // Act & Assert
      await expect(
        service.updateAssetCapacity(
          testNodeAddress,
          assetToUpdate,
          newCapacity,
          initialSupportedAssets,
          initialCapacities,
          initialPrices,
        ),
      ).to.eventually.be.rejectedWith(Error); // handleContractError likely wraps it
    });
  });

  // --- Tests for updateAssetPrice ---
  describe('updateAssetPrice', () => {
    const assetToUpdate = 3;
    const newPrice = 99;
    const initialSupportedAssets = [1, 2, 3];
    const initialCapacities = [1000, 1000, 1000];
    const initialPrices = [10, 20, 30];

    const mockNodeData = {
      address: testNodeAddress,
      location: { addressName: 'Test', location: { lat: '0', lng: '0' } },
      validNode: '0x01',
      owner: '0xowneraddress',
      supportedAssets: initialSupportedAssets,
      status: 'Active',
      capacity: initialCapacities, // Need capacity for the call
      assetPrices: initialPrices,
    };

    it('should update price by calling getNode and updateSupportedAssets with correct params', async () => {
      // Arrange
      getNodeStub.withArgs(testNodeAddress).resolves(mockNodeData); // Mock getNode response
      const mockTxResponse = {
        wait: sinon.stub().resolves({ status: 1 }),
      } as any;
      updateSupportedAssetsStub.resolves(mockTxResponse); // Mock contract call success

      const expectedCapacitiesBigInt = initialCapacities.map(BigInt);
      const expectedAssetsBigInt = initialSupportedAssets.map(BigInt);
      const expectedPricesBigInt = [BigInt(10), BigInt(20), BigInt(newPrice)]; // Updated price

      // Act
      await service.updateAssetPrice(
        testNodeAddress,
        assetToUpdate,
        newPrice,
        initialSupportedAssets,
        initialPrices,
      );

      // Assert
      expect(mockContext.getNodeRepository.calledOnce).to.be.true;
      expect(getNodeStub.calledOnceWithExactly(testNodeAddress)).to.be.true;
      expect(mockContext.getAurumContract.calledOnce).to.be.true;
      expect(updateSupportedAssetsStub.calledOnce).to.be.true;

      const callArgs = updateSupportedAssetsStub.getCall(0).args;
      expect(callArgs[0]).to.equal(testNodeAddress);
      expect(callArgs[1]).to.deep.equal(expectedCapacitiesBigInt); // Original capacities
      expect(callArgs[2]).to.deep.equal(expectedAssetsBigInt); // Original assets
      expect(callArgs[3]).to.deep.equal(expectedPricesBigInt); // Updated prices

      expect(mockTxResponse.wait.calledOnce).to.be.true;
    });

    it('should throw if assetId is not found in supportedAssets', async () => {
      // Arrange
      const nonExistentAssetId = 99;
      // Act & Assert
      await expect(
        service.updateAssetPrice(
          testNodeAddress,
          nonExistentAssetId,
          newPrice,
          initialSupportedAssets, // Asset 99 is not here
          initialPrices,
        ),
      ).to.eventually.be.rejectedWith(Error, /Asset ID 99 not found/);
    });

    it('should throw if getNodeRepository().getNode fails', async () => {
      // Arrange
      const getNodeError = new Error('Failed to fetch node');
      getNodeStub.withArgs(testNodeAddress).rejects(getNodeError);

      // Act & Assert
      await expect(
        service.updateAssetPrice(
          testNodeAddress,
          assetToUpdate,
          newPrice,
          initialSupportedAssets,
          initialPrices,
        ),
      ).to.eventually.be.rejectedWith(Error); // handleContractError wraps it
      // ).to.eventually.be.rejectedWith(getNodeError); // Check original if not wrapped
    });

    it('should throw if getAurumContract().updateSupportedAssets fails', async () => {
      // Arrange
      getNodeStub.withArgs(testNodeAddress).resolves(mockNodeData); // getNode succeeds
      const updateError = new Error('Contract update failed');
      updateSupportedAssetsStub.rejects(updateError); // updateSupportedAssets fails

      // Act & Assert
      await expect(
        service.updateAssetPrice(
          testNodeAddress,
          assetToUpdate,
          newPrice,
          initialSupportedAssets,
          initialPrices,
        ),
      ).to.eventually.be.rejectedWith(Error); // handleContractError wraps it
    });
  });

  // --- Tests for updateSupportedAssets ---
  describe('updateSupportedAssets', () => {
    const testQuantities = [500, 600, 700];
    const testAssets = [1, 3, 5];
    const testPrices = [11, 33, 55];

    it('should call updateSupportedAssets on the manager contract with correct params', async () => {
      // Arrange
      const mockTxResponse = {
        wait: sinon.stub().resolves({ status: 1 }),
      } as any;
      updateSupportedAssetsStub.resolves(mockTxResponse);

      const expectedQuantitiesBigInt = testQuantities.map(BigInt);
      const expectedAssetsBigInt = testAssets.map(BigInt);
      const expectedPricesBigInt = testPrices.map(BigInt);

      // Act
      await service.updateSupportedAssets(
        testNodeAddress,
        testQuantities,
        testAssets,
        testPrices,
      );

      // Assert
      expect(mockContext.getAurumContract.calledOnce).to.be.true; // Context provided manager
      expect(updateSupportedAssetsStub.calledOnce).to.be.true; // Manager method called

      const callArgs = updateSupportedAssetsStub.getCall(0).args;
      expect(callArgs[0]).to.equal(testNodeAddress);
      expect(callArgs[1]).to.deep.equal(expectedQuantitiesBigInt);
      expect(callArgs[2]).to.deep.equal(expectedAssetsBigInt);
      expect(callArgs[3]).to.deep.equal(expectedPricesBigInt);

      expect(mockTxResponse.wait.calledOnce).to.be.true; // Transaction waited
    });

    it('should throw if getAurumContract().updateSupportedAssets fails', async () => {
      // Arrange
      const updateError = new Error('Contract update failed');
      updateSupportedAssetsStub.rejects(updateError);

      // Act & Assert
      await expect(
        service.updateSupportedAssets(
          testNodeAddress,
          testQuantities,
          testAssets,
          testPrices,
        ),
      ).to.eventually.be.rejectedWith(Error); // handleContractError likely wraps it
    });
  });
});
