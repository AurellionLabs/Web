/**
 * Diamond Node Asset Service - Handles asset minting and management via Diamond
 *
 * This replaces the legacy NodeAssetService with Diamond-based operations.
 * Asset minting goes through AuraAsset, inventory tracking through Diamond's NodesFacet.
 */

import { ethers } from 'ethers';
import { INodeAssetService, NodeAsset } from '@/domain/node';
import { Asset } from '@/domain/shared';
import { DiamondContext } from './diamond-context';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_CLOB_ADDRESS,
} from '@/chain-constants';

/**
 * Diamond-based implementation of INodeAssetService
 */
export class DiamondNodeAssetService implements INodeAssetService {
  private context: DiamondContext;

  constructor(context: DiamondContext) {
    this.context = context;
  }

  /**
   * Mint new assets for a node
   *
   * Flow:
   * 1. Call AuraAsset.nodeMint() to mint ERC1155 tokens to Diamond
   * 2. Call Diamond.creditNodeTokens() to track inventory
   * 3. Call Diamond.addSupportedAsset() to register asset with price/capacity
   */
  async mintAsset(
    nodeHash: string,
    asset: Omit<Asset, 'tokenID'>,
    amount: number,
    priceWei: bigint,
  ): Promise<void> {
    const diamond = this.context.getDiamond();
    const auraAsset = this.context.getAuraAsset();
    const signerAddress = await this.context.getSignerAddress();

    console.log('[DiamondNodeAssetService] Minting asset:', {
      nodeHash,
      assetName: asset.name,
      assetClass: asset.assetClass,
      amount,
      priceWei: priceWei.toString(),
    });

    try {
      // Build contract asset struct for AuraAsset
      const contractAsset = {
        name: asset.name || '',
        assetClass: asset.assetClass || '',
        attributes: (asset.attributes || []).map((attr) => ({
          name: attr.name || '',
          values: attr.values || [],
          description: attr.description || '',
        })),
      };

      // Compute tokenId locally (same as contract does)
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedAsset = abiCoder.encode(
        [
          'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
        ],
        [contractAsset],
      );
      const tokenId = BigInt(ethers.keccak256(encodedAsset));

      console.log(
        '[DiamondNodeAssetService] Computed tokenId:',
        tokenId.toString(),
      );

      // Step 1: Mint tokens via AuraAsset.nodeMint()
      // The Diamond address should be a valid node in AuraAsset's NodeManager
      console.log('[DiamondNodeAssetService] Calling nodeMint...');
      const mintTx = await auraAsset.nodeMint(
        signerAddress, // Mint to signer's wallet first
        contractAsset,
        amount,
        asset.assetClass,
        '0x',
      );
      const mintReceipt = await mintTx.wait();
      console.log(
        '[DiamondNodeAssetService] Tokens minted, tx:',
        mintReceipt.hash,
      );

      // Step 2: Deposit tokens to node's inventory in Diamond
      // First approve Diamond to transfer tokens
      const diamondAddress = await diamond.getAddress();
      const isApproved = await auraAsset.isApprovedForAll(
        signerAddress,
        diamondAddress,
      );
      if (!isApproved) {
        console.log(
          '[DiamondNodeAssetService] Approving Diamond for token transfers...',
        );
        const approveTx = await auraAsset.setApprovalForAll(
          diamondAddress,
          true,
        );
        await approveTx.wait();
      }

      // Deposit tokens to node
      console.log('[DiamondNodeAssetService] Depositing tokens to node...');
      const depositTx = await diamond.depositTokensToNode(
        nodeHash,
        tokenId,
        amount,
      );
      await depositTx.wait();
      console.log('[DiamondNodeAssetService] Tokens deposited to node');

      // Step 3: Add/update supported asset with price and capacity
      console.log('[DiamondNodeAssetService] Adding supported asset...');
      const addAssetTx = await diamond.addSupportedAsset(
        nodeHash,
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        tokenId,
        priceWei,
        amount,
      );
      await addAssetTx.wait();
      console.log('[DiamondNodeAssetService] Supported asset added');

      // Step 4: Ensure CLOB is approved for trading
      await this.ensureClobApproval(nodeHash);

      console.log('[DiamondNodeAssetService] Asset minting complete');
    } catch (error) {
      console.error('[DiamondNodeAssetService] Error minting asset:', error);
      throw error;
    }
  }

  /**
   * Update asset capacity for a node
   */
  async updateAssetCapacity(
    nodeHash: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ): Promise<void> {
    const diamond = this.context.getDiamond();

    console.log('[DiamondNodeAssetService] Updating asset capacity:', {
      nodeHash,
      assetTokenId,
      newCapacity,
    });

    try {
      // Get current assets and update the specific one
      const currentAssets = await diamond.getNodeAssets(nodeHash);

      const tokens: string[] = [];
      const tokenIds: bigint[] = [];
      const prices: bigint[] = [];
      const capacities: bigint[] = [];

      for (const asset of currentAssets) {
        tokens.push(asset.token);
        tokenIds.push(BigInt(asset.tokenId));
        prices.push(BigInt(asset.price));

        // Update capacity for matching asset
        if (asset.tokenId.toString() === assetTokenId) {
          capacities.push(BigInt(newCapacity));
        } else {
          capacities.push(BigInt(asset.capacity));
        }
      }

      const tx = await diamond.updateSupportedAssets(
        nodeHash,
        tokens,
        tokenIds,
        prices,
        capacities,
      );
      await tx.wait();

      console.log('[DiamondNodeAssetService] Asset capacity updated');
    } catch (error) {
      console.error(
        '[DiamondNodeAssetService] Error updating capacity:',
        error,
      );
      throw error;
    }
  }

  /**
   * Update asset price for a node
   */
  async updateAssetPrice(
    nodeHash: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ): Promise<void> {
    const diamond = this.context.getDiamond();

    console.log('[DiamondNodeAssetService] Updating asset price:', {
      nodeHash,
      assetTokenId,
      newPrice: newPrice.toString(),
    });

    try {
      // Get current assets and update the specific one
      const currentAssets = await diamond.getNodeAssets(nodeHash);

      const tokens: string[] = [];
      const tokenIds: bigint[] = [];
      const prices: bigint[] = [];
      const capacities: bigint[] = [];

      for (const asset of currentAssets) {
        tokens.push(asset.token);
        tokenIds.push(BigInt(asset.tokenId));
        capacities.push(BigInt(asset.capacity));

        // Update price for matching asset
        if (asset.tokenId.toString() === assetTokenId) {
          prices.push(newPrice);
        } else {
          prices.push(BigInt(asset.price));
        }
      }

      const tx = await diamond.updateSupportedAssets(
        nodeHash,
        tokens,
        tokenIds,
        prices,
        capacities,
      );
      await tx.wait();

      console.log('[DiamondNodeAssetService] Asset price updated');
    } catch (error) {
      console.error('[DiamondNodeAssetService] Error updating price:', error);
      throw error;
    }
  }

  /**
   * Update all supported assets for a node
   */
  async updateSupportedAssets(
    nodeHash: string,
    assets: NodeAsset[],
  ): Promise<void> {
    const diamond = this.context.getDiamond();

    console.log('[DiamondNodeAssetService] Updating supported assets:', {
      nodeHash,
      assetCount: assets.length,
    });

    try {
      const tokens = assets.map((a) => a.token);
      const tokenIds = assets.map((a) => BigInt(a.tokenId));
      const prices = assets.map((a) => a.price);
      const capacities = assets.map((a) => BigInt(a.capacity));

      const tx = await diamond.updateSupportedAssets(
        nodeHash,
        tokens,
        tokenIds,
        prices,
        capacities,
      );
      await tx.wait();

      console.log('[DiamondNodeAssetService] Supported assets updated');
    } catch (error) {
      console.error('[DiamondNodeAssetService] Error updating assets:', error);
      throw error;
    }
  }

  /**
   * Ensure CLOB is approved to transfer node's tokens for trading
   */
  private async ensureClobApproval(nodeHash: string): Promise<void> {
    const diamond = this.context.getDiamond();

    try {
      const isApproved = await diamond.isClobApproved(NEXT_PUBLIC_CLOB_ADDRESS);
      if (!isApproved) {
        console.log(
          '[DiamondNodeAssetService] Approving CLOB for token transfers...',
        );
        const tx = await diamond.approveClobForTokens(
          nodeHash,
          NEXT_PUBLIC_CLOB_ADDRESS,
        );
        await tx.wait();
        console.log('[DiamondNodeAssetService] CLOB approved');
      }
    } catch (error) {
      console.warn(
        '[DiamondNodeAssetService] Could not verify/set CLOB approval:',
        error,
      );
    }
  }
}
