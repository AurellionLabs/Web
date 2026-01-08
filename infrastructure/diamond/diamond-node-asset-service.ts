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
import { NEXT_PUBLIC_AURA_ASSET_ADDRESS } from '@/chain-constants';
// NEXT_PUBLIC_CLOB_ADDRESS no longer needed - CLOB is internal to Diamond

/**
 * Diamond-based implementation of INodeAssetService
 */
export class DiamondNodeAssetService implements INodeAssetService {
  private context: DiamondContext;

  constructor(context: DiamondContext) {
    this.context = context;
  }

  /**
   * Convert node address/hash to bytes32 format
   * Diamond uses bytes32 node hashes, but frontend may pass addresses
   */
  private toBytes32NodeHash(nodeHashOrAddress: string): string {
    // If already bytes32 (66 chars with 0x prefix), return as-is
    if (nodeHashOrAddress.startsWith('0x') && nodeHashOrAddress.length === 66) {
      return nodeHashOrAddress;
    }
    // Convert address (20 bytes) to bytes32 by zero-padding
    return ethers.zeroPadValue(nodeHashOrAddress, 32);
  }

  /**
   * Check if a node exists in Diamond
   * Nodes from the old Aurum system need to be registered in Diamond first
   */
  private async ensureNodeExistsInDiamond(nodeHash: string): Promise<string> {
    const diamond = this.context.getDiamond();

    try {
      // Try to get the node from Diamond
      const nodeData = await diamond.getNode(nodeHash);

      // Check if node exists (owner is not zero address)
      if (nodeData && nodeData.owner !== ethers.ZeroAddress) {
        console.log(
          '[DiamondNodeAssetService] Node exists in Diamond:',
          nodeHash,
        );
        return nodeHash;
      }
    } catch (error) {
      console.log('[DiamondNodeAssetService] Node not found in Diamond', error);
    }

    // Node doesn't exist in Diamond - user needs to register it properly
    console.error(
      '[DiamondNodeAssetService] Node not registered in Diamond:',
      nodeHash,
    );
    throw new Error(
      'This node is not registered in the new Diamond system. ' +
        'Please register a new node via the Node Overview page before tokenizing assets. ' +
        'Note: Nodes from the old system cannot be automatically migrated and must be re-registered.',
    );
  }

  /**
   * Mint new assets for a node
   *
   * Flow:
   * 1. Call AuraAsset.nodeMint() to mint ERC1155 tokens to node owner's wallet
   *    - Node owner's wallet is validated via getNodeStatus (checks ownerNodes mapping)
   *    - Node owner becomes the custodian for these tokens
   *    - Custody is tracked in AuraAsset.tokenCustodian mapping
   * 2. Call Diamond.addSupportedAsset() to register asset with capacity
   *
   * Note: Price is NOT set during tokenization. Price is set when placing
   * sell orders on the CLOB.
   *
   * CUSTODY MODEL:
   * - Tokens are minted to node owner's wallet (they are the custodian)
   * - Node owner must approve Diamond for CLOB trading (setApprovalForAll)
   * - Custody is tracked in AuraAsset.tokenCustodian[tokenId]
   * - Only when a user calls redeem() is custody released and tokens burned
   * - This ensures the physical asset backing is always tracked to a responsible node
   */
  async mintAsset(
    nodeHashOrAddress: string,
    asset: Omit<Asset, 'tokenID'>,
    amount: number,
  ): Promise<void> {
    const diamond = this.context.getDiamond();
    const auraAsset = this.context.getAuraAsset();
    const diamondAddress = this.context.getDiamondAddress();

    // Convert to bytes32 format for Diamond operations
    const initialNodeHash = this.toBytes32NodeHash(nodeHashOrAddress);

    // Ensure node exists in Diamond (will register if needed)
    const nodeHash = await this.ensureNodeExistsInDiamond(initialNodeHash);

    // Get the node owner's wallet address - tokens will be minted to their wallet
    const nodeData = await diamond.getNode(nodeHash);
    const nodeOwnerWallet = nodeData.owner;

    console.log('[DiamondNodeAssetService] Minting asset:', {
      nodeHashOrAddress,
      nodeHash,
      nodeOwnerWallet,
      assetName: asset.name,
      assetClass: asset.assetClass,
      amount,
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

      // Step 1: Mint tokens to the node owner's wallet (they are the custodian)
      // The node owner holds the tokens directly and must approve Diamond for CLOB trading
      const auraAssetAddress = await auraAsset.getAddress();
      console.log(
        '[DiamondNodeAssetService] Calling nodeMint to node owner wallet...',
      );
      console.log(
        '[DiamondNodeAssetService] AuraAsset contract address:',
        auraAssetAddress,
      );
      console.log(
        '[DiamondNodeAssetService] Node owner wallet (recipient):',
        nodeOwnerWallet,
      );
      console.log(
        '[DiamondNodeAssetService] contractAsset:',
        JSON.stringify(contractAsset, null, 2),
      );
      const mintTx = await auraAsset.nodeMint(
        nodeOwnerWallet, // Mint to node owner's wallet - they are the custodian
        contractAsset,
        amount,
        asset.assetClass,
        '0x',
      );
      const mintReceipt = await mintTx.wait();
      console.log(
        '[DiamondNodeAssetService] Tokens minted to node owner wallet. tx:',
        mintReceipt.hash,
      );

      // Note: No need to call creditNodeTokens - tokens are in the owner's wallet
      // The node owner will need to approve Diamond for CLOB trading

      // Step 3: Add/update supported asset with capacity (price is 0, set via CLOB orders)
      console.log('[DiamondNodeAssetService] Adding supported asset...');
      const addAssetTx = await diamond.addSupportedAsset(
        nodeHash,
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        tokenId,
        0n, // Price is 0 - actual price set when placing sell orders on CLOB
        amount,
      );
      await addAssetTx.wait();
      console.log('[DiamondNodeAssetService] Supported asset added');

      // Step 4: Ensure CLOB is approved for trading
      await this.ensureClobApproval(nodeHash);

      console.log(
        '[DiamondNodeAssetService] Asset minting complete. Custodian:',
        diamondAddress,
      );
    } catch (error: any) {
      console.error('[DiamondNodeAssetService] Error minting asset:', error);

      // Check if this is a "missing revert data" error, which often indicates
      // that AuraAsset's NodeManager is not set to Diamond address
      const errorMessage = error?.message || '';
      const errorCode = error?.code || '';

      if (
        errorMessage.includes('missing revert data') ||
        errorMessage.includes('CALL_EXCEPTION') ||
        errorCode === 'CALL_EXCEPTION'
      ) {
        const enhancedError = new Error(
          'Tokenization failed: AuraAsset NodeManager may not be configured. ' +
            'The Diamond address must be set as the NodeManager in AuraAsset contract. ' +
            'Please run: npx hardhat run scripts/set-aura-asset-node-manager.ts --network <network>',
        );
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }

      throw error;
    }
  }

  /**
   * Update asset capacity for a node
   */
  async updateAssetCapacity(
    nodeHashOrAddress: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ): Promise<void> {
    const diamond = this.context.getDiamond();
    const nodeHash = this.toBytes32NodeHash(nodeHashOrAddress);

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
    nodeHashOrAddress: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ): Promise<void> {
    const diamond = this.context.getDiamond();
    const nodeHash = this.toBytes32NodeHash(nodeHashOrAddress);

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
    nodeHashOrAddress: string,
    assets: NodeAsset[],
  ): Promise<void> {
    const diamond = this.context.getDiamond();
    const nodeHash = this.toBytes32NodeHash(nodeHashOrAddress);

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
   * DEPRECATED: CLOB approval is no longer needed since CLOBFacet is internal to Diamond
   * Kept for backward compatibility - always succeeds immediately
   */
  private async ensureClobApproval(nodeHash: string): Promise<void> {
    // No-op: CLOB is now internal to Diamond via CLOBFacet
    // Tokens are held by Diamond and CLOBFacet can access them directly
    console.log(
      '[DiamondNodeAssetService] CLOB approval not needed - CLOBFacet is internal to Diamond',
    );
  }
}
