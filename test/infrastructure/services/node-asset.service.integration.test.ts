import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { AurumNodeManager, AuraGoat, AurumNode } from '@/typechain-types';
import {
  AurumNodeManager__factory,
  AuraGoat__factory,
  AurumNode__factory,
} from '@/typechain-types';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { NodeAssetService } from '@/infrastructure/services/node-asset.service';
import { BrowserProvider, AddressLike } from 'ethers';
import { Node } from '@/domain/node/node';

// Configure Chai
chai.use(chaiAsPromised);

// --- Test Suite: Integration Tests for NodeAssetService ---
describe('NodeAssetService [Integration]', () => {
  // --- Test Setup Variables ---
  let owner: HardhatEthersSigner;
  let otherAccount: HardhatEthersSigner;
  let aurumNodeManager: AurumNodeManager;
  let auraGoat: AuraGoat;
  let nodeRepository: any;
  let repositoryContext: RepositoryContext;
  let nodeAssetService: NodeAssetService;
  let testProvider: BrowserProvider;
  let registeredNodeAddress: string; // Address generated and returned by manager.registerNode
  let auraGoatAddress: string;

  beforeEach(async () => {
    // 1. Get Signers
    [owner, otherAccount] = await ethers.getSigners();
    if (!owner.provider) {
      throw new Error('Signer does not have a provider');
    }
    testProvider = owner.provider as unknown as BrowserProvider;

    // 2. Deploy AurumNodeManager
    const AurumNodeManagerFactory = (await ethers.getContractFactory(
      'AurumNodeManager',
    )) as unknown as AurumNodeManager__factory;
    aurumNodeManager = (await AurumNodeManagerFactory.deploy(
      ethers.ZeroAddress,
      owner.address,
    )) as unknown as AurumNodeManager;
    await aurumNodeManager.waitForDeployment();
    const managerAddress = await aurumNodeManager.getAddress();

    // 3. Deploy AuraGoat
    const AuraGoatFactory = (await ethers.getContractFactory(
      'AuraGoat',
    )) as unknown as AuraGoat__factory;
    auraGoat = (await AuraGoatFactory.deploy(
      owner.address,
      'test-uri/',
      managerAddress,
    )) as unknown as AuraGoat;
    await auraGoat.waitForDeployment();
    auraGoatAddress = await auraGoat.getAddress();

    // --- NEW: Set the AuraGoat token address in the Manager ---
    await expect(aurumNodeManager.connect(owner).addToken(auraGoatAddress)).to
      .not.be.reverted;
    console.log(`AuraGoat address set in AurumNodeManager.`);
    // --- End NEW ---

    // 5. Initialize RepositoryContext
    repositoryContext = RepositoryContext.getInstance();
    repositoryContext.initialize(
      ethers.ZeroAddress as any,
      aurumNodeManager,
      testProvider,
      owner,
    );

    // 6. Instantiate the Real NodeAssetService
    nodeAssetService = new NodeAssetService(repositoryContext);

    // 7. Register a node using the MANAGER (which deploys the actual node instance)
    nodeRepository = await repositoryContext.getNodeRepository();
    const nodeDataToRegister: Node = {
      address: ethers.ZeroAddress, // Address here is ignored by manager.registerNode
      location: {
        addressName: 'Integration Test Node',
        location: { lat: '1', lng: '1' },
      },
      validNode: '0x01',
      owner: owner.address,
      supportedAssets: [1, 2, 3, 4, 5],
      status: 'Active',
      capacity: [1000, 1000, 1000, 1000, 1000],
      assetPrices: [1, 1, 1, 1, 1],
    };
    try {
      // This address IS the address of the node contract deployed BY THE MANAGER
      registeredNodeAddress =
        await nodeRepository.registerNode(nodeDataToRegister);
      console.log(
        `Manager registered and deployed node at: ${registeredNodeAddress}`,
      );
    } catch (e) {
      console.error(
        'Error registering node in integration test beforeEach: ',
        e,
      );
      throw e;
    }
  });

  // --- Test Cases ---

  describe('mintAsset', () => {
    const assetId = 1;
    const amountToMint = 50;
    const expectedTokenId = BigInt(assetId * 10);

    // Test now calls the service with the address returned by the manager
    it('should successfully mint assets via the service for the registered node address', async () => {
      // Arrange: Check initial balance for the registered node address
      const initialBalance = await auraGoat.balanceOf(
        registeredNodeAddress,
        expectedTokenId,
      );
      expect(initialBalance).to.equal(0);

      // Act: Call the service method using the REGISTERED address
      await expect(
        nodeAssetService.mintAsset(
          registeredNodeAddress,
          assetId,
          amountToMint,
        ),
      ).to.not.be.reverted;

      // Assert: Check final balance on AuraGoat for the REGISTERED address
      const finalBalance = await auraGoat.balanceOf(
        registeredNodeAddress,
        expectedTokenId,
      );
      expect(finalBalance, `Balance for TokenID ${expectedTokenId}`).to.equal(
        BigInt(amountToMint),
      );

      // Check balance for a different asset ID is still 0
      const balanceToken20 = await auraGoat.balanceOf(
        registeredNodeAddress,
        BigInt(20),
      );
      expect(balanceToken20, `Balance for TokenID 20`).to.equal(0);
    });

    // No longer need the note about service implementation being wrong, it should now be correct
  });

  // --- Integration Tests for updateAssetCapacity ---
  describe('updateAssetCapacity', () => {
    const assetToUpdate = 2; // Asset ID 2 (second in the initial list)
    const newCapacity = BigInt(555); // Use BigInt for comparison clarity
    let initialNodeData: any; // To store data fetched in test

    beforeEach(async () => {
      // Fetch initial state for assertions
      initialNodeData = await aurumNodeManager.getNode(registeredNodeAddress);
      // Initial state based on registration:
      // supportedAssets: [1, 2, 3, 4, 5]
      // capacity: [1000, 1000, 1000, 1000, 1000]
      // assetPrices: [1, 1, 1, 1, 1]
    });

    it('should successfully update the capacity of a specific asset for the node', async () => {
      // Arrange: Prepare arguments for the service call based on initial state
      const supportedAssetsNumbers =
        initialNodeData.supportedAssets.map(Number);
      const capacitiesNumbers = initialNodeData.capacity.map(Number);
      const pricesNumbers = initialNodeData.assetPrices.map(Number);

      // Act: Call the service method
      await expect(
        nodeAssetService.updateAssetCapacity(
          registeredNodeAddress,
          assetToUpdate,
          Number(newCapacity), // Service expects number
          supportedAssetsNumbers,
          capacitiesNumbers,
          pricesNumbers,
        ),
      ).to.not.be.reverted;

      // Assert: Fetch the node data again and check the capacity array
      const updatedNodeData = await aurumNodeManager.getNode(
        registeredNodeAddress,
      );

      expect(updatedNodeData.capacity.length).to.equal(
        initialNodeData.capacity.length,
      );

      // Find the index of the updated asset
      const assetIndex = supportedAssetsNumbers.indexOf(assetToUpdate);
      expect(assetIndex).to.not.equal(-1); // Ensure asset was found

      // Check that the capacity at the specific index is updated
      expect(updatedNodeData.capacity[assetIndex]).to.equal(newCapacity);

      // Check that other capacities remain unchanged
      for (let i = 0; i < updatedNodeData.capacity.length; i++) {
        if (i !== assetIndex) {
          expect(
            updatedNodeData.capacity[i],
            `Capacity at index ${i}`,
          ).to.equal(initialNodeData.capacity[i]);
        }
      }
      // Also check that assets and prices didn't change unexpectedly
      expect(updatedNodeData.supportedAssets).to.deep.equal(
        initialNodeData.supportedAssets,
      );
      expect(updatedNodeData.assetPrices).to.deep.equal(
        initialNodeData.assetPrices,
      );
    });

    it('should revert if input array lengths mismatch (error wrapped by service)', async () => {
      // Arrange: Create mismatched arrays
      const initialNodeData = await aurumNodeManager.getNode(
        registeredNodeAddress,
      );
      const supportedAssetsNumbers =
        initialNodeData.supportedAssets.map(Number);
      const capacitiesNumbers = initialNodeData.capacity
        .map(Number)
        .slice(0, -1); // Shorter array
      const pricesNumbers = initialNodeData.assetPrices.map(Number);
      const assetToUpdate = supportedAssetsNumbers[0] || 1; // Get a valid asset ID
      const newCapacity = 555;

      // Act & Assert: Expect a generic Error, check message content
      await expect(
        nodeAssetService.updateAssetCapacity(
          registeredNodeAddress,
          assetToUpdate,
          newCapacity,
          supportedAssetsNumbers,
          capacitiesNumbers, // Mismatched length
          pricesNumbers,
        ),
      ).to.be.rejectedWith(Error, /Array lengths must match/); // Check message includes revert reason
    });
  });

  // --- Integration Tests for updateAssetPrice ---
  describe('updateAssetPrice', () => {
    const assetToUpdate = 3; // Asset ID 3
    const newPrice = BigInt(777); // Use BigInt for comparison clarity
    let initialNodeData: any;

    beforeEach(async () => {
      initialNodeData = await aurumNodeManager.getNode(registeredNodeAddress);
      // Initial state based on registration:
      // supportedAssets: [1, 2, 3, 4, 5]
      // capacity: [1000, 1000, 1000, 1000, 1000]
      // assetPrices: [1, 1, 1, 1, 1]
    });

    it('should successfully update the price of a specific asset for the node', async () => {
      // Arrange
      const supportedAssetsNumbers =
        initialNodeData.supportedAssets.map(Number);
      const pricesNumbers = initialNodeData.assetPrices.map(Number);

      // Act: Call the service method
      await expect(
        nodeAssetService.updateAssetPrice(
          registeredNodeAddress,
          assetToUpdate,
          Number(newPrice), // Service expects number
          supportedAssetsNumbers,
          pricesNumbers,
        ),
      ).to.not.be.reverted;

      // Assert: Fetch the node data again and check the assetPrices array
      const updatedNodeData = await aurumNodeManager.getNode(
        registeredNodeAddress,
      );
      expect(updatedNodeData.assetPrices.length).to.equal(
        initialNodeData.assetPrices.length,
      );

      const assetIndex = supportedAssetsNumbers.indexOf(assetToUpdate);
      expect(assetIndex).to.not.equal(-1);

      // Check that the price at the specific index is updated
      expect(updatedNodeData.assetPrices[assetIndex]).to.equal(newPrice);

      // Check that other prices remain unchanged
      for (let i = 0; i < updatedNodeData.assetPrices.length; i++) {
        if (i !== assetIndex) {
          expect(
            updatedNodeData.assetPrices[i],
            `Price at index ${i}`,
          ).to.equal(initialNodeData.assetPrices[i]);
        }
      }
      // Also check that assets and capacities didn't change unexpectedly
      expect(updatedNodeData.supportedAssets).to.deep.equal(
        initialNodeData.supportedAssets,
      );
      expect(updatedNodeData.capacity).to.deep.equal(initialNodeData.capacity);
    });

    it('should revert if assetId is not found in supportedAssets (checked by service)', async () => {
      // Arrange: Asset 99 is not in initialNodeData.supportedAssets
      const nonExistentAssetId = 99;
      const pricesNumbers = initialNodeData.assetPrices.map(Number);

      // Act & Assert: Expect specific error from the service layer check
      await expect(
        nodeAssetService.updateAssetPrice(
          registeredNodeAddress,
          nonExistentAssetId,
          Number(newPrice),
          initialNodeData.supportedAssets.map(Number),
          pricesNumbers,
        ),
      ).to.be.rejectedWith(Error, /Asset ID 99 not found/);
    });

    // Note: updateAssetPrice internally calls updateSupportedAssets in the manager
    // So, a failure in the underlying contract call would manifest as a revert there.
    it('should revert if underlying updateSupportedAssets call fails (e.g. wrong array lengths)', async () => {
      // Arrange: Create mismatched price array length
      const supportedAssetsNumbers =
        initialNodeData.supportedAssets.map(Number);
      const pricesNumbers = initialNodeData.assetPrices
        .map(Number)
        .slice(0, -1); // Shorter

      // Act & Assert: Expect error wrapped by handleContractError
      await expect(
        nodeAssetService.updateAssetPrice(
          registeredNodeAddress,
          assetToUpdate,
          Number(newPrice),
          supportedAssetsNumbers,
          pricesNumbers, // Mismatched length passed here
        ),
      ).to.be.rejectedWith(Error, /Array lengths must match/);
    });
  });

  // --- Integration Tests for updateSupportedAssets ---
  describe('updateSupportedAssets', () => {
    let initialNodeData: any;

    // Define updates, ensuring arrays maintain the original length (5)
    const updatedQuantities = [500, 1000, 1000, 1000, 600]; // Update idx 0 (asset 1) and idx 4 (asset 5)
    const updatedAssets = [1, 2, 3, 4, 5]; // Must match initial assets length
    const updatedPrices = [11, 1, 1, 1, 55]; // Update idx 0 (asset 1) and idx 4 (asset 5)

    beforeEach(async () => {
      initialNodeData = await aurumNodeManager.getNode(registeredNodeAddress);
    });

    it('should successfully update quantities and prices for the existing set of assets', async () => {
      // Updated description
      // Act: Call the service method with arrays matching the initial asset list length
      await expect(
        nodeAssetService.updateSupportedAssets(
          registeredNodeAddress,
          updatedQuantities,
          updatedAssets,
          updatedPrices,
        ),
      ).to.not.be.reverted;

      // Assert: Fetch the node data again and check all three arrays
      const finalNodeData = await aurumNodeManager.getNode(
        registeredNodeAddress,
      );

      expect(finalNodeData.capacity.map(Number)).to.deep.equal(
        updatedQuantities,
      );
      expect(finalNodeData.supportedAssets.map(Number)).to.deep.equal(
        updatedAssets,
      );
      expect(finalNodeData.assetPrices.map(Number)).to.deep.equal(
        updatedPrices,
      );
    });

    it('should revert if array lengths mismatch (checked by contract)', async () => {
      // Arrange: Create mismatched arrays
      const quantities = [500, 600];
      const assets = [1, 5];
      const prices = [11]; // Mismatched length

      // Act & Assert: Expect error wrapped by handleContractError
      await expect(
        nodeAssetService.updateSupportedAssets(
          registeredNodeAddress,
          quantities,
          assets,
          prices, // Mismatched length
        ),
      ).to.be.rejectedWith(Error, /Array lengths must match/);
    });

    it('should revert if the assets array length changes (checked by contract)', async () => {
      // Updated description
      // Arrange: Pass arrays with a different length than currently stored
      // The contract checks `assets.length == targetNode.supportedAssets.length`
      const quantities = [500];
      const assets = [1]; // Different length than initial 5
      const prices = [11];

      // Act & Assert: Expect specific error from the contract
      await expect(
        nodeAssetService.updateSupportedAssets(
          registeredNodeAddress,
          quantities,
          assets,
          prices,
        ),
      ).to.be.rejectedWith(Error, /Invalid assets length/);
    });
  });
});
