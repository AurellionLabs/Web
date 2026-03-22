/**
 * Diamond Node Asset Service - Handles asset minting and management via Diamond
 *
 * This replaces the legacy NodeAssetService with Diamond-based operations.
 * Asset minting and inventory tracking both go through Diamond facets.
 */

import { ethers } from 'ethers';
import { INodeAssetService, NodeAsset } from '@/domain/node';
import { Asset } from '@/domain/shared';
import { DiamondContext } from './diamond-context';
import { PinataSDK } from 'pinata';
import { parseTokenAmount } from '@/lib/formatters';
import {
  getIpfsGroupId,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
} from '@/chain-constants';

const ERC20_METADATA_INTERFACE = new ethers.Interface([
  'function decimals() view returns (uint8)',
]);

/**
 * Diamond-based implementation of INodeAssetService
 */
export class DiamondNodeAssetService implements INodeAssetService {
  private context: DiamondContext;
  private pinata: PinataSDK | null = null;

  constructor(context: DiamondContext, pinata?: PinataSDK) {
    this.context = context;
    this.pinata = pinata || null;
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
        return nodeHash;
      }
    } catch (error) {}

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

  private async getQuoteTokenMetadata(): Promise<{
    address: string;
    decimals: number;
  }> {
    const fallback = {
      address: NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
      decimals: NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
    };

    try {
      const diamond = this.context.getDiamond();
      const provider = this.context.getProvider();
      const payToken = await diamond.getPayToken();

      if (!payToken || payToken === ethers.ZeroAddress) {
        return fallback;
      }

      const result = await provider.call({
        to: payToken,
        data: ERC20_METADATA_INTERFACE.encodeFunctionData('decimals'),
      });
      const [decimalsRaw] = ERC20_METADATA_INTERFACE.decodeFunctionResult(
        'decimals',
        result,
      );
      const decimals = Number(decimalsRaw);

      return {
        address: payToken,
        decimals:
          Number.isFinite(decimals) && decimals >= 0
            ? Math.floor(decimals)
            : fallback.decimals,
      };
    } catch (error) {
      console.warn(
        '[DiamondNodeAssetService] Failed to resolve quote token decimals; using fallback constants.',
        error,
      );
      return fallback;
    }
  }

  private scaleTokenizationPrice(
    priceInput: string,
    quoteTokenDecimals: number,
  ): bigint {
    const normalizedPrice = priceInput.trim();
    if (!/^\d+(\.\d+)?$/.test(normalizedPrice)) {
      throw new Error(
        'Tokenization failed: price must be entered as a non-negative decimal value.',
      );
    }

    return parseTokenAmount(normalizedPrice, quoteTokenDecimals);
  }

  /**
   * Mint new assets for a node
   *
   * Flow:
   * 1. Call Diamond AssetsFacet.nodeMint() to mint ERC1155 tokens to node owner's wallet
   *    - Node owner's wallet is validated via getNodeStatus (checks ownerNodes mapping)
   *    - Node owner becomes the custodian for these tokens
   *    - Custody is tracked in Diamond AssetsFacet custody mappings
   * 2. Call Diamond.addSupportedAsset() to register asset with capacity
   *
   * CUSTODY MODEL:
   * - Tokens are minted to node owner's wallet (they are the custodian)
   * - Node owner must approve Diamond for CLOB trading (setApprovalForAll)
   * - Custody is tracked in AssetsFacet.tokenCustodianAmounts[tokenId][custodian]
   * - Only when a user calls redeem() is custody released and tokens burned
   * - This ensures the physical asset backing is always tracked to a responsible node
   */
  async mintAsset(
    nodeHashOrAddress: string,
    asset: Omit<Asset, 'tokenID'>,
    amount: number,
    priceInput: string,
  ): Promise<void> {
    const diamond = this.context.getDiamond();

    // Convert to bytes32 format for Diamond operations
    const initialNodeHash = this.toBytes32NodeHash(nodeHashOrAddress);

    // Ensure node exists in Diamond (will register if needed)
    const nodeHash = await this.ensureNodeExistsInDiamond(initialNodeHash);

    // Get the node owner's wallet address - tokens will be minted to their wallet
    const nodeData = await diamond.getNode(nodeHash);
    const nodeOwnerWallet = nodeData.owner;
    const signerAddress = await this.context.getSignerAddress();

    // AssetsFacet.nodeMint requires msg.sender to be a valid active node owner.
    // Prevent a confusing unknown custom error by validating wallet ownership up front.
    if (signerAddress.toLowerCase() !== nodeOwnerWallet.toLowerCase()) {
      throw new Error(
        `Tokenization failed: connected wallet ${signerAddress} does not own the selected node (owner: ${nodeOwnerWallet}). Switch to the node owner's wallet and retry.`,
      );
    }

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
      const { decimals: quoteTokenDecimals } =
        await this.getQuoteTokenMetadata();
      const scaledPrice = this.scaleTokenizationPrice(
        priceInput,
        quoteTokenDecimals,
      );

      // Use the unified node minting path so the contract updates node inventory
      // and supported-asset metadata through a single accounting flow.
      const mintTx = await diamond.addNodeItem(
        nodeHash,
        nodeOwnerWallet,
        amount,
        contractAsset,
        asset.assetClass,
        '0x',
      );
      await mintTx.wait();

      // Register (or update capacity for) the tokenId in the node's asset metadata
      // registry so the node dashboard can display it. The nodeAssets mapping is
      // populated by NodesFacet.addSupportedAsset; addNodeItem does not call it.
      try {
        const diamondAddress = await diamond.getAddress();
        const existingAssets = await diamond.getNodeAssets(nodeHash);
        const alreadyRegistered = existingAssets.some(
          (a: any) => a.tokenId.toString() === tokenId.toString(),
        );

        if (!alreadyRegistered) {
          // First mint of this tokenId for this node — register it
          const registerTx = await diamond.addSupportedAsset(
            nodeHash,
            diamondAddress,
            tokenId,
            scaledPrice,
            BigInt(amount),
          );
          await registerTx.wait();
        } else {
          // TokenId already registered — increment the stored capacity and
          // replace its price with the latest submitted tokenization price.
          const updatedTokens: string[] = [];
          const updatedTokenIds: bigint[] = [];
          const updatedPrices: bigint[] = [];
          const updatedCapacities: bigint[] = [];

          for (const a of existingAssets) {
            updatedTokens.push(a.token);
            updatedTokenIds.push(BigInt(a.tokenId));
            updatedPrices.push(
              a.tokenId.toString() === tokenId.toString()
                ? scaledPrice
                : BigInt(a.price),
            );
            updatedCapacities.push(
              a.tokenId.toString() === tokenId.toString()
                ? BigInt(a.capacity) + BigInt(amount)
                : BigInt(a.capacity),
            );
          }

          const updateTx = await diamond.updateSupportedAssets(
            nodeHash,
            updatedTokens,
            updatedTokenIds,
            updatedPrices,
            updatedCapacities,
          );
          await updateTx.wait();
        }
      } catch (registryErr) {
        // Non-fatal: tokens are minted and custody is correct.
        // Dashboard may not reflect the new asset until manually registered.
        console.warn(
          '[DiamondNodeAssetService] Asset registry update failed (non-fatal):',
          registryErr,
        );
      }

      // Upload metadata to IPFS/Pinata so node dashboard can resolve it.
      // Mirrors the old uploadMetadataToIPFS() from node-asset.service.ts
      if (this.pinata) {
        try {
          const assetHash = ethers.keccak256(encodedAsset);
          const chainId = this.context.getChainId();
          const groupId = getIpfsGroupId(chainId);
          const metadataJson = {
            tokenId: tokenId.toString(),
            hash: assetHash,
            asset: contractAsset,
            className: asset.assetClass,
          };

          await this.pinata.upload.public
            .json(metadataJson)
            .group(groupId)
            .name(`${tokenId}.json`)
            .keyvalues({
              tokenId: tokenId.toString(),
              className: asset.assetClass || '',
              hash: assetHash,
            });
        } catch (ipfsErr) {
          // Non-fatal — on-chain data is the source of truth
          console.warn(
            '[DiamondNodeAssetService] IPFS metadata upload failed (non-fatal):',
            ipfsErr,
          );
        }
      }

      // Ensure CLOB is approved for trading
      await this.ensureClobApproval(nodeHash);
    } catch (error: any) {
      console.error('[DiamondNodeAssetService] Error minting asset:', error);

      // Extract revert reason if available
      const errorMessage = error?.message || '';
      const errorData = (error?.data ||
        error?.info?.error?.data ||
        '') as string;
      const revertReason = error?.revert?.args?.[0] || '';

      // Decode known custom errors from AssetsFacet
      if (typeof errorData === 'string' && errorData.startsWith('0x30812d42')) {
        throw new Error(
          'Tokenization failed: Invalid node wallet. Connect with an active node owner wallet.',
        );
      }

      // Only suggest NodeManager misconfiguration for errors that genuinely
      // indicate missing revert data (no reason string), not for all CALL_EXCEPTIONs
      if (errorMessage.includes('missing revert data') && !revertReason) {
        const enhancedError = new Error(
          'Tokenization failed: transaction reverted without a reason string. ' +
            'Verify the connected wallet owns an active node and the asset class is active in Diamond.',
        );
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }

      // Re-throw with the original revert reason if available
      if (revertReason) {
        throw new Error(`Tokenization failed: ${revertReason}`);
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
  }
}
