import {
  INodeAssetService,
  NodeRepository,
  NodeAsset,
  NodeAssetConverters,
} from '@/domain/node/node';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { AurumNodeManager } from '@/typechain-types';
import { handleContractError } from '@/utils/error-handler';
import { ethers } from 'ethers';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';
import { PinataSDK } from 'pinata';
import { Asset } from '@/domain/platform';
import type { AuraAsset as AuraAssetTypes } from '@/typechain-types/contracts/Aurum.sol/AurumNode';
import { sendContractTxAndWaitForIndexer } from '@/infrastructure/shared/tx-with-indexer-wait';

/**
 * Concrete implementation of the INodeAssetService interface - REFACTORED
 *
 * This version uses the correct contract function signatures:
 * - addSupportedAsset(address node, Asset memory supportedAsset)
 * - updateSupportedAssets(address node, Asset[] memory supportedAssets)
 */
export class NodeAssetService implements INodeAssetService {
  private context: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private aurumContract: AurumNodeManager | null = null;

  constructor(context: RepositoryContext) {
    this.context = context;
    this.aurumContract = this.context.getAurumContract();
    this.nodeRepository = this.context.getNodeRepository();
  }

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

  /**
   * REFACTORED: Uses correct addSupportedAsset signature with Asset struct
   */
  async mintAsset(
    nodeAddress: string,
    asset: Omit<Asset, 'tokenID'>,
    amount: number,
    priceWei: bigint,
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Minting asset "${asset.name}" (class: ${asset.assetClass}) amount ${amount} for node ${nodeAddress}`,
    );

    const nodeContract = this.context.getAurumNodeContract(nodeAddress);
    const aurumContract = this.getAurumContractOrThrow();

    try {
      const bigIntAmount = BigInt(amount);

      // Build contract AssetStruct from domain Asset
      const contractAsset: AuraAssetTypes.AssetStruct = {
        name: asset.name || '',
        assetClass: asset.assetClass || '',
        attributes: (asset.attributes || []).map((attr) => ({
          name: attr.name || '',
          values: attr.values || [],
          description: attr.description || '',
        })),
      } as any;

      // Compute tokenId and asset hash locally
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedAsset = abiCoder.encode(
        [
          'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
        ],
        [contractAsset],
      );
      const tokenIdLocal = BigInt(ethers.keccak256(encodedAsset));
      const encodedWithOwner = abiCoder.encode(
        [
          'address',
          'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
        ],
        [nodeAddress, contractAsset],
      );
      const assetHash = ethers.keccak256(encodedWithOwner);

      if (!asset.assetClass || asset.assetClass.trim() === '') {
        throw new Error('className is required to mint an asset');
      }

      // Call addItem on the node contract
      await sendContractTxAndWaitForIndexer(
        nodeContract as unknown as ethers.Contract,
        'addItem',
        [nodeAddress, bigIntAmount, contractAsset, asset.assetClass, '0x'],
        'AuraAsset.addItem',
        { from: await this.context.getSigner().getAddress() },
      );

      // FIXED: Use correct addSupportedAsset signature with Asset struct
      const assetStruct = {
        token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        tokenId: tokenIdLocal,
        price: priceWei,
        capacity: bigIntAmount,
      };

      // Diagnostic: Check node ownership before attempting to add asset
      try {
        const runner = aurumContract.runner;
        const signerAddress =
          runner && 'getAddress' in runner
            ? await (runner as any).getAddress()
            : 'unknown';
        const nodeData = await aurumContract.getNode(nodeAddress);
        console.log('[NodeAssetService] Diagnostic info:');
        console.log('  Signer address:', signerAddress);
        console.log('  Node address:', nodeAddress);
        console.log('  Node owner from contract:', nodeData.owner);
        if (typeof signerAddress === 'string' && signerAddress !== 'unknown') {
          console.log(
            '  Ownership match:',
            signerAddress.toLowerCase() === nodeData.owner.toLowerCase(),
          );
        }
      } catch (diagError) {
        console.error('[NodeAssetService] Diagnostic check failed:', diagError);
      }

      try {
        await sendContractTxAndWaitForIndexer(
          aurumContract as unknown as ethers.Contract,
          'addSupportedAsset',
          [nodeAddress, assetStruct],
          'AurumNodeManager.addSupportedAsset',
          { from: await this.context.getSigner().getAddress() },
        );
      } catch (e) {
        console.error(
          '[NodeAssetService] addSupportedAsset failed with error:',
          e,
        );
        console.error('[NodeAssetService] Node address:', nodeAddress);
        console.error('[NodeAssetService] Asset struct:', assetStruct);
        const runner = aurumContract.runner;
        const signerAddr =
          runner && 'getAddress' in runner
            ? await (runner as any).getAddress()
            : 'unknown';
        console.error('[NodeAssetService] Signer address:', signerAddr);

        // Fallback: Update existing asset capacity/price
        try {
          await this.updateExistingAsset(
            nodeAddress,
            assetStruct,
            bigIntAmount,
          );
        } catch (fallbackError) {
          console.error(
            '[NodeAssetService] Fallback updateExistingAsset also failed:',
            fallbackError,
          );
          throw fallbackError;
        }
      }

      console.log('[NodeAssetService] addItem and addSupportedAsset confirmed');

      // Upload metadata to IPFS
      await this.uploadMetadataToIPFS(
        tokenIdLocal,
        assetHash,
        contractAsset,
        asset.assetClass,
      );
    } catch (error) {
      handleContractError(error, `error in mint asset for node ${nodeAddress}`);
      throw error;
    }
  }

  /**
   * REFACTORED: Works with NodeAsset instead of separate arrays
   */
  async updateAssetCapacity(
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Updating capacity for asset ${assetTokenId} on node ${nodeAddress} to ${newCapacity}`,
    );

    try {
      const node = await this.getNodeRepositoryOrThrow().getNode(nodeAddress);
      if (!node) {
        throw new Error(`Node ${nodeAddress} not found`);
      }

      // Find and update the specific asset
      const updatedAssets = node.assets.map((asset) => {
        if (asset.token === assetToken && asset.tokenId === assetTokenId) {
          return { ...asset, capacity: newCapacity };
        }
        return asset;
      });

      // Update all assets using the new signature
      await this.updateSupportedAssets(nodeAddress, updatedAssets);

      console.log(
        `[NodeAssetService] Capacity updated successfully for asset ${assetTokenId} on node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(
        error,
        `update asset capacity for ${nodeAddress}, asset ${assetTokenId}`,
      );
      throw error;
    }
  }

  /**
   * REFACTORED: Works with NodeAsset instead of separate arrays
   */
  async updateAssetPrice(
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Updating price for asset ${assetTokenId} on node ${nodeAddress} to ${newPrice}`,
    );

    try {
      const node = await this.getNodeRepositoryOrThrow().getNode(nodeAddress);
      if (!node) {
        throw new Error(`Node ${nodeAddress} not found`);
      }

      // Find and update the specific asset
      const updatedAssets = node.assets.map((asset) => {
        if (asset.token === assetToken && asset.tokenId === assetTokenId) {
          return { ...asset, price: newPrice };
        }
        return asset;
      });

      // Update all assets using the new signature
      await this.updateSupportedAssets(nodeAddress, updatedAssets);

      console.log(
        `[NodeAssetService] Price updated successfully for asset ${assetTokenId} on node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(
        error,
        `update asset price for ${nodeAddress}, asset ${assetTokenId}`,
      );
      throw error;
    }
  }

  /**
   * REFACTORED: Uses correct updateSupportedAssets signature with Asset[] array
   */
  async updateSupportedAssets(
    nodeAddress: string,
    assets: NodeAsset[],
  ): Promise<void> {
    console.log(
      `[NodeAssetService] Updating all supported assets for node ${nodeAddress}`,
    );

    const contract = this.getAurumContractOrThrow();

    try {
      // Convert NodeAsset[] to contract Asset[] struct format
      const contractAssets = assets.map((asset) =>
        NodeAssetConverters.toContractStruct(asset),
      );

      // FIXED: Call with correct signature: updateSupportedAssets(node, Asset[] memory)
      await sendContractTxAndWaitForIndexer(
        contract as unknown as ethers.Contract,
        'updateSupportedAssets',
        [nodeAddress, contractAssets],
        'AurumNodeManager.updateSupportedAssets',
        { from: await this.context.getSigner().getAddress() },
      );

      console.log(
        `[NodeAssetService] Supported assets updated successfully for node ${nodeAddress}`,
      );
    } catch (error) {
      handleContractError(error, `update supported assets for ${nodeAddress}`);
      throw error;
    }
  }

  /**
   * Helper method to update existing asset when addSupportedAsset fails
   */
  private async updateExistingAsset(
    nodeAddress: string,
    newAssetStruct: any,
    additionalCapacity: bigint,
  ): Promise<void> {
    const node = await this.getNodeRepositoryOrThrow().getNode(nodeAddress);
    if (!node) {
      throw new Error(
        `Node ${nodeAddress} not found for asset update fallback`,
      );
    }

    // Find existing asset and update capacity
    const updatedAssets = node.assets.map((asset) => {
      if (
        asset.token === newAssetStruct.token &&
        asset.tokenId === newAssetStruct.tokenId.toString()
      ) {
        return {
          ...asset,
          capacity: asset.capacity + Number(additionalCapacity),
          price: newAssetStruct.price,
        };
      }
      return asset;
    });

    // If asset not found, add it
    if (
      !updatedAssets.some(
        (asset) =>
          asset.token === newAssetStruct.token &&
          asset.tokenId === newAssetStruct.tokenId.toString(),
      )
    ) {
      updatedAssets.push({
        token: newAssetStruct.token,
        tokenId: newAssetStruct.tokenId.toString(),
        price: newAssetStruct.price,
        capacity: Number(newAssetStruct.capacity),
      });
    }

    await this.updateSupportedAssets(nodeAddress, updatedAssets);
  }

  /**
   * Helper method to upload metadata to IPFS
   */
  private async uploadMetadataToIPFS(
    tokenId: bigint,
    hash: string,
    contractAsset: any,
    className: string,
  ): Promise<void> {
    const pinata = new PinataSDK({
      pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
      pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
    });

    const metadataJson = {
      tokenId: tokenId.toString(),
      hash: hash,
      asset: contractAsset,
      className: className,
    };

    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(JSON.stringify(metadataJson));
    // Browser-safe base64 (no Node Buffer)
    const metadataBase64 = btoa(String.fromCharCode(...jsonBytes));

    const upload = await pinata.upload.public
      .base64(metadataBase64)
      .name(`${tokenId}.json`)
      .keyvalues({
        tokenId: tokenId.toString(),
        className: className,
        hash: hash,
      });

    console.log('Metadata uploaded to IPFS:', upload);
  }
}
