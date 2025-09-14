import type {
  Node,
  NodeRepository,
  TokenizedAsset,
  AggregateAssetAmount,
  NodeLocation,
} from '@/domain/node';
import { BrowserProvider, ethers } from 'ethers';
import {
  AurumNode,
  AurumNode__factory,
  AurumNodeManager,
  AurumNodeManager__factory,
  AuraAsset__factory,
  AuraAsset,
} from '@/typechain-types';
import { handleContractError } from '@/utils/error-handler';
import { PinataSDK } from 'pinata';
import { hashToAssets, tokenIdToAssets } from './shared/ipfs';
import { AssetIpfsRecord } from '@/domain/platform';
import { GraphQLClient } from 'graphql-request';
import {
  calculateCurrentBalances,
  GET_NODE_ASSETS_COMPLETE,
  NodeAssetsGraphResponse,
} from './shared/graph-queries';
import { graphqlRequest } from './shared/graph';
import { bigint } from 'zod';

/**
 * Infrastructure implementation of the NodeRepository interface
 * This implementation directly interacts with the Aurum blockchain contracts
 */
export class BlockchainNodeRepository implements NodeRepository {
  private aurumContract: AurumNodeManager;
  private provider: BrowserProvider;
  private signer: ethers.Signer;
  private auraAsset: string;
  private auraAssetContractInstance: AuraAsset | null = null;
  private graphQLEndpoint =
    'https://api.studio.thegraph.com/query/112596/aura-asset-base-sepolia/version/latest';
  pinata: PinataSDK;
  constructor(
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
    auraAsset: string,
    _pinata: PinataSDK,
    graphQlClietn: GraphQLClient,
  ) {
    this.aurumContract = aurumContract;
    this.provider = provider;
    this.signer = signer;
    this.auraAsset = auraAsset;
    this.pinata = _pinata;
  }

  private async getAuraAssetContract(): Promise<AuraAsset> {
    if (this.auraAssetContractInstance) {
      return this.auraAssetContractInstance;
    }

    const contract = AuraAsset__factory.connect(this.auraAsset, this.signer);

    this.auraAssetContractInstance = contract;
    return contract;
  }

  private async getAurumNodeContract(address: string): Promise<AurumNode> {
    return AurumNode__factory.connect(address, this.signer);
  }

  async getNode(nodeAddress: string): Promise<Node | null> {
    try {
      const nodeData = await this.aurumContract.getNode(nodeAddress);

      if (nodeData.owner === ethers.ZeroAddress) {
        throw new Error('Node not found');
      }

      const location: NodeLocation = {
        addressName: nodeData.location.addressName,
        location: {
          lat: nodeData.location.location.lat,
          lng: nodeData.location.location.lng,
        },
      };

      return {
        address: nodeAddress,
        location,
        validNode: nodeData.validNode,
        owner: nodeData.owner,
        supportedAssets: nodeData.supportedAssets.map((n) => n.toString()),
        status: this.convertContractStatusToDomain(nodeData.status),
        capacity: nodeData.capacity.map((n) => Number(n)),
        assetPrices: nodeData.assetPrices.map((n) => Number(n)),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Node not found') {
        throw error;
      }
      handleContractError(error, 'get node');
      throw error;
    }
  }

  async getOwnedNodes(ownerAddress: string): Promise<string[]> {
    console.log(
      `[NodeRepository] getOwnedNodes called for owner: ${ownerAddress}`,
    );
    try {
      const contract = await this.aurumContract;
      const nodeCount = await contract.nodeIdCounter();
      console.log(`[NodeRepository] Node count from contract: ${nodeCount}`);
      const ownedNodes: string[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const nodeAddress = await contract.nodeList(BigInt(i));
        const node = await contract.getNode(nodeAddress);
        console.log(
          `[NodeRepository] Checking node index ${i}: address=${nodeAddress}, owner=${node.owner}`,
        );
        if (node.owner.toLowerCase() === ownerAddress.toLowerCase()) {
          console.log(
            `[NodeRepository] Match found! Adding node: ${nodeAddress}`,
          );
          ownedNodes.push(nodeAddress);
        }
      }

      console.log(`[NodeRepository] Returning owned nodes:`, ownedNodes);
      return ownedNodes;
    } catch (error) {
      handleContractError(error, 'get owned nodes');
      throw error;
    }
  }

  async registerNode(nodeData: Node): Promise<string> {
    try {
      const contract = await this.aurumContract;
      const nodeStruct: AurumNodeManager.NodeStruct = {
        location: {
          addressName: nodeData.location.addressName,
          location: {
            lat: nodeData.location.location.lat,
            lng: nodeData.location.location.lng,
          },
        },
        validNode: nodeData.validNode as ethers.BytesLike,
        owner: nodeData.owner,
        supportedAssets: [],
        status: (nodeData.status === 'Active'
          ? '0x01'
          : '0x00') as ethers.BytesLike,
        capacity: [],
        assetPrices: [],
      };

      console.log('Calling contract.registerNode with struct:', nodeStruct);

      const tx = await contract.registerNode(nodeStruct);
      console.log('Transaction sent, waiting for receipt...');
      const receipt = await tx.wait();
      console.log('Transaction receipt received');

      if (!receipt) {
        throw new Error('Transaction failed: No receipt received.');
      }
      if (receipt.status === 0) {
        console.error('Transaction reverted. Receipt:', receipt);
        throw new Error(
          `Node registration transaction failed (reverted). Hash: ${receipt.hash}`,
        );
      }

      const eventFragment = contract.interface.getEvent('NodeRegistered');
      if (!eventFragment) {
        throw new Error(
          'NodeRegistered event fragment not found in contract ABI.',
        );
      }

      let newNodeAddress: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(
            log as unknown as { topics: string[]; data: string },
          );
          if (parsedLog && parsedLog.name === 'NodeRegistered') {
            newNodeAddress = parsedLog.args.nodeAddress;
            console.log(
              `NodeRegistered event found. New node address: ${newNodeAddress}`,
            );
            break;
          }
        } catch (e) {
          // Ignore logs that don't match the NodeRegistered signature
        }
      }

      if (!newNodeAddress) {
        console.error('RECEIPT LOGS:', JSON.stringify(receipt.logs, null, 2));
        throw new Error(
          "NodeRegistered event not found or couldn't be parsed in transaction logs.",
        );
      }

      return newNodeAddress;
    } catch (error) {
      console.error('Detailed error in registerNode:', error);
      if (
        !(error instanceof Error && error.message.startsWith('Contract error'))
      ) {
        handleContractError(error, 'register node');
      }
      throw error;
    }
  }

  async updateNodeStatus(
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ): Promise<void> {
    try {
      const contract = await this.aurumContract;
      const statusBytes = (
        status === 'Active' ? '0x01' : '0x00'
      ) as ethers.BytesLike;
      await contract.updateStatus(statusBytes, nodeAddress);
    } catch (error) {
      handleContractError(error, 'update node status');
      throw error;
    }
  }

  async checkIfNodeExists(address: string): Promise<boolean> {
    try {
      const contract = await this.aurumContract;
      const node = await contract.getNode(address);
      return node.owner !== ethers.ZeroAddress;
    } catch (error) {
      handleContractError(error, 'check if node exists');
      throw error;
    }
  }

  async getNodeStatus(address: string): Promise<'Active' | 'Inactive'> {
    try {
      const contract = await this.aurumContract;
      const node = await contract.getNode(address);
      return this.convertContractStatusToDomain(node.status);
    } catch (error) {
      handleContractError(error, 'get node status');
      throw error;
    }
  }
  async getNodeAssets(address: string): Promise<TokenizedAsset[]> {
    try {
      const node = await this.aurumContract.getNode(address);
      if (node.owner === ethers.ZeroAddress) {
        throw new Error('Node not found');
      }

      // Get asset data from subgraph
      const graphData = await graphqlRequest<NodeAssetsGraphResponse>(
        this.graphQLEndpoint,
        GET_NODE_ASSETS_COMPLETE,
        {
          nodeAddress: address,
        },
      );
      console.log('returned from graphData', graphData);

      // Calculate current balances from transfer events
      const currentBalances = calculateCurrentBalances(
        graphData.transfersIn,
        graphData.transfersOut,
        graphData.mintedAssets,
      );

      const nodeAssets: TokenizedAsset[] = [];

      // Process each token with positive balance
      for (const tokenBalance of currentBalances) {
        // Find the corresponding supported asset index
        const tokenId = tokenBalance.tokenId;
        const assetIndex = node.supportedAssets.findIndex(
          (asset) => asset.toString() === tokenId,
        );

        if (assetIndex === -1) continue; // Skip if not in supported assets

        nodeAssets.push({
          id: tokenBalance.tokenId,
          amount: tokenBalance.balance,
          name: tokenBalance.name || 'Unknown',
          class: tokenBalance.assetClass || 'Unknown',
          fileHash: tokenBalance.hash || '',
          status: this.convertContractStatusToDomain(node.status),
          nodeAddress: address,
          nodeLocation: node.location,
          price: node.assetPrices[assetIndex]?.toString() || '0',
          capacity: node.capacity[assetIndex]?.toString() || '0',
        });
      }
      console.log('returned from node assets', nodeAssets);

      return nodeAssets;
    } catch (error) {
      if (error instanceof Error && error.message === 'Node not found') {
        throw error;
      }
      console.error(`Error in getNodeAssets for address ${address}:`, error);
      handleContractError(error, 'get node assets');
      throw error;
    }
  }

  async getAllNodeAssets(): Promise<TokenizedAsset[]> {
    try {
      const contract = await this.aurumContract;
      const nodeCount = await contract.nodeIdCounter();
      const allAssets: TokenizedAsset[] = [];

      for (let i = 0; i < nodeCount; i++) {
        // Add a small delay to avoid hitting RPC rate limits
        await sleep(150); // Delay for 150 milliseconds (adjust as needed)

        const nodeAddress = await contract.nodeList(BigInt(i));
        // Wrap getNodeAssets in a try-catch to handle potential errors for a single node

        // without stopping the entire process, unless the error is critical.
        try {
          const nodeAssets = await this.getNodeAssets(nodeAddress);
          allAssets.push(...nodeAssets);
        } catch (error) {
          console.error(
            `Error in getAllNodeAssets for node ${nodeAddress}:`,
            error,
          );
          // If the error is not critical, continue with the next node
        }
      }

      return allAssets;
    } catch (error) {
      handleContractError(error, 'get all node assets');
      throw error;
    }
  }

  async loadAvailableAssets(): Promise<AggregateAssetAmount[]> {
    try {
      const contract = await this.aurumContract;
      const nodeCount = await contract.nodeIdCounter();
      const assetMap = new Map<number, number>();

      for (let i = 0; i < nodeCount; i++) {
        const nodeAddress = await contract.nodeList(BigInt(i));
        const node = await contract.getNode(nodeAddress);

        node.supportedAssets.forEach((assetId, index) => {
          const id = Number(assetId);
          const amount = Number(node.capacity[index]);
          assetMap.set(id, (assetMap.get(id) || 0) + amount);
        });
      }

      return Array.from(assetMap.entries()).map(([id, amount]) => ({
        id,
        amount,
      }));
    } catch (error) {
      handleContractError(error, 'load available assets');
      throw error;
    }
  }

  async getAssetBalance(
    ownerAddress: string,
    assetId: number,
    assetName: string,
    attributes: string[],
  ): Promise<number> {
    try {
      const auraAsset = await this.getAuraAssetContract();
      // Use lookupHash to match the contract's ID generation
      const tokenId = await auraAsset.lookupHash({
        name: assetName,
        class: this.getAssetName(assetId),
        attributes: [],
      } as any);

      // Call balanceOf with the correct tokenId
      const balance = await auraAsset.balanceOf(ownerAddress, tokenId);
      console.log(
        `[NodeRepository] Balance check for owner ${ownerAddress}, asset ${assetId} (tokenId ${tokenId}): ${balance}`,
      );
      return Number(balance);
    } catch (error: any) {
      if (
        error.code === 'BAD_DATA' ||
        (error.info?.error?.code === 'CALL_EXCEPTION' &&
          error.info?.error?.reason?.includes('ERC1155: invalid token ID')) ||
        (error.message &&
          error.message.includes('could not decode result data'))
      ) {
        console.warn(
          `[NodeRepository] Handled error fetching balance for owner ${ownerAddress}, asset ${assetId} (likely non-existent). Returning 0. Error: ${error.message}`,
        );
        return 0;
      }
      handleContractError(
        error,
        `get asset balance for ${ownerAddress}, asset ${assetId}`,
      );
      throw error;
    }
  }

  private convertContractStatusToDomain(status: string): 'Inactive' | 'Active' {
    console.log('status', status);
    return status === '0x01' ? 'Active' : 'Inactive';
  }

  private getAssetName(id: number): string {
    const assetNames: { [key: number]: string } = {
      1: 'GOAT',
      2: 'SHEEP',
      3: 'COW',
      4: 'CHICKEN',
      5: 'DUCK',
    };
    return assetNames[id] || 'UNKNOWN';
  }

  private getAssetIdByClassName(name: string): number | null {
    const normalized = (name || '').toUpperCase();
    const map: { [key: string]: number } = {
      GOAT: 1,
      SHEEP: 2,
      COW: 3,
      CHICKEN: 4,
      DUCK: 5,
    };
    return map[normalized] ?? null;
  }

  private async resolveAssetNameFromClass(className: string): Promise<string> {
    // Prefer a known mapping first; fall back to className if not found
    try {
      const repoContext = (
        await import('@/infrastructure/contexts/repository-context')
      ).RepositoryContext.getInstance();
      const platform = repoContext.getPlatformRepository();
      const assets = await platform.getClassAssets(className);
      if (assets && assets.length > 0) {
        // choose first defined asset name, e.g., 'AUGOAT'
        return assets[0].name || className;
      }
    } catch (e) {
      // ignore and fall back
    }
    return className;
  }
}

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
