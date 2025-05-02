import { INodeAssetService, NodeRepository } from '@/domain/node/node'; // Updated interface import
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { AurumNodeManager, AuraGoat } from '@/typechain-types';
import { handleContractError } from '@/utils/error-handler';
import { ethers, BigNumberish, BytesLike } from 'ethers';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants'; // Import needed constant

/**
 * Concrete implementation of the INodeAssetService interface.
 *
 * Handles business logic related to managing assets on nodes.
 */
export class NodeAssetService implements INodeAssetService {
  // Renamed class, updated implements
  private context: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private aurumContract: AurumNodeManager | null = null;
  // private auraGoatContract: AuraGoat | null = null;

  constructor(context: RepositoryContext) {
    this.context = context;
    this.aurumContract = this.context.getAurumContract();
    this.nodeRepository = this.context.getNodeRepository();
    // this.auraGoatContract = this.context.getAuraGoatContract(); // Example
  }

  // --- Add back the private getter methods ---
  private getAurumContractOrThrow(): AurumNodeManager {
    if (!this.aurumContract) {
      throw new Error(
        'AurumNodeManager contract is not initialized in RepositoryContext',
      );
    }
    return this.aurumContract;
  }

  private getNodeRepositoryOrThrow(): NodeRepository {
    if (!this.nodeRepository) {
      throw new Error('NodeRepository is not initialized in RepositoryContext');
    }
    return this.nodeRepository;
  }
  // --- End of added private methods ---

  // --- Implement INodeAssetService methods ---

  async mintAsset(
    nodeAddress: string,
    assetId: number,
    amount: number,
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Minting asset ${assetId} amount ${amount} for node ${nodeAddress}`,
    );
    // Get the specific AurumNode contract instance via the context
    const nodeContract = this.context.getAurumNodeContract(nodeAddress);

    try {
      // Replicate logic from aurum-controller nodeMintAsset
      // The controller used a padded ID, but addItem seems to just take the assetId directly as uint256?
      // Verify the actual addItem signature in AurumNode.sol
      // Assuming addItem takes: owner, itemId (assetId?), quantity, tokenContract, data
      // Let's use BigInt for amounts/ids going to contract
      const bigIntAssetId = BigInt(assetId);
      const bigIntAmount = BigInt(amount);

      console.log(
        `[NodeAssetService] Calling addItem on contract ${nodeAddress}`,
      );
      console.log(`   Owner: ${nodeAddress}`); // Assuming nodeAddress is the owner/recipient
      console.log(`   Asset ID (itemId?): ${bigIntAssetId}`);
      console.log(`   Amount (quantity): ${bigIntAmount}`);
      console.log(`   Token Contract: ${NEXT_PUBLIC_AURA_GOAT_ADDRESS}`);

      // Create the padded ID like in the controller
      const paddedId: BytesLike = ethers.zeroPadValue(
        ethers.toBeHex(assetId),
        32,
      );

      // Adjust parameters based on the actual AurumNode.addItem signature
      const tx = await nodeContract.addItem(
        nodeAddress, // itemOwner
        paddedId, // id (BytesLike)
        bigIntAssetId, // weight (using assetId as weight like controller)
        bigIntAmount, // amount
        NEXT_PUBLIC_AURA_GOAT_ADDRESS, // item (token contract)
        '0x', // data
        // Overrides (optional) can be added here if needed e.g. { gasLimit: ... }
      );

      console.log(`[NodeAssetService] addItem transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log(
        `[NodeAssetService] Asset minted successfully for node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(
        error,
        `mint asset ${assetId} for node ${nodeAddress}`,
      );
      throw error;
    }
  }

  async updateAssetCapacity(
    nodeAddress: string,
    assetId: number,
    newCapacity: number,
    supportedAssets: number[], // Assuming domain uses number[]
    capacities: number[], // Assuming domain uses number[]
    assetPrices: number[], // Assuming domain uses number[]
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Updating capacity for asset ${assetId} on node ${nodeAddress} to ${newCapacity}`,
    );
    const contract = this.getAurumContractOrThrow();

    try {
      // Find the index of the asset to update its capacity
      const assetIndex = supportedAssets.indexOf(assetId);
      if (assetIndex === -1) {
        throw new Error(
          `Asset ID ${assetId} not found in supported assets for node ${nodeAddress}`,
        );
      }

      // Create updated capacity array, converting to BigInt for contract
      const updatedCapacities: BigNumberish[] = capacities.map((cap, i) =>
        i === assetIndex ? BigInt(newCapacity) : BigInt(cap),
      );

      // Convert other arrays to BigInt
      const assetsBigInt: BigNumberish[] = supportedAssets.map(BigInt);
      const pricesBigInt: BigNumberish[] = assetPrices.map(BigInt);

      // Call the contract function (matches controller logic)
      const tx = await contract.updateSupportedAssets(
        nodeAddress,
        updatedCapacities,
        assetsBigInt,
        pricesBigInt,
      );
      await tx.wait();
      console.log(
        `[NodeAssetService] Capacity updated successfully for asset ${assetId} on node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(
        error,
        `update asset capacity for ${nodeAddress}, asset ${assetId}`,
      );
      throw error;
    }
  }

  async updateAssetPrice(
    nodeAddress: string,
    assetId: number,
    newPrice: number, // Assuming domain uses number
    supportedAssets: number[],
    assetPrices: number[],
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Updating price for asset ${assetId} on node ${nodeAddress} to ${newPrice}`,
    );
    const contract = this.getAurumContractOrThrow();
    const nodeRepo = this.getNodeRepositoryOrThrow();

    try {
      // Find the index of the asset to update its price
      const assetIndex = supportedAssets.indexOf(assetId);
      if (assetIndex === -1) {
        throw new Error(
          `Asset ID ${assetId} not found in supported assets for node ${nodeAddress}`,
        );
      }

      // Create updated price array, converting to BigInt for contract
      const updatedPrices: BigNumberish[] = assetPrices.map((price, i) =>
        i === assetIndex ? BigInt(newPrice) : BigInt(price),
      );

      // Fetch current node data to get capacities
      const node = await nodeRepo.getNode(nodeAddress);
      if (!node) {
        throw new Error(
          `Node ${nodeAddress} not found when trying to update asset price.`,
        );
      }
      // Convert needed arrays to BigInt
      const currentCapacities: BigNumberish[] = node.capacity.map(BigInt);
      const assetsBigInt: BigNumberish[] = supportedAssets.map(BigInt);

      // Call the contract function (matches controller logic, uses fetched capacities)
      const tx = await contract.updateSupportedAssets(
        nodeAddress,
        currentCapacities,
        assetsBigInt,
        updatedPrices,
      );
      await tx.wait();
      console.log(
        `[NodeAssetService] Price updated successfully for asset ${assetId} on node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(
        error,
        `update asset price for ${nodeAddress}, asset ${assetId}`,
      );
      throw error;
    }
  }

  async updateSupportedAssets(
    nodeAddress: string,
    quantities: number[], // Assuming domain uses number[]
    assets: number[], // Assuming domain uses number[]
    prices: number[], // Assuming domain uses number[]
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Updating all supported assets for node ${nodeAddress}`,
    );
    const contract = this.getAurumContractOrThrow();
    try {
      // Convert all arrays to BigInt for contract
      const quantitiesBigInt: BigNumberish[] = quantities.map(BigInt);
      const assetsBigInt: BigNumberish[] = assets.map(BigInt);
      const pricesBigInt: BigNumberish[] = prices.map(BigInt);

      // Directly call the contract function (matches controller logic)
      const tx = await contract.updateSupportedAssets(
        nodeAddress,
        quantitiesBigInt,
        assetsBigInt,
        pricesBigInt,
      );
      await tx.wait();
      console.log(
        `[NodeAssetService] Supported assets updated successfully for node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(error, `update supported assets for ${nodeAddress}`);
      throw error;
    }
  }
}
