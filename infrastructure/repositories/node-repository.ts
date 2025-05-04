import type {
  Node,
  NodeRepository,
  TokenizedAsset,
  AggregateAssetAmount,
  NodeLocation,
  AssetType,
} from '@/domain/node';
import { BrowserProvider, ethers } from 'ethers';
import {
  AurumNode,
  AurumNode__factory,
  AurumNodeManager,
  AurumNodeManager__factory,
  AuraGoat__factory,
  AuraGoat,
} from '@/typechain-types';
import { handleContractError } from '@/utils/error-handler';

/**
 * Infrastructure implementation of the NodeRepository interface
 * This implementation directly interacts with the Aurum blockchain contracts
 */
export class BlockchainNodeRepository implements NodeRepository {
  private aurumContract: AurumNodeManager;
  private provider: BrowserProvider;
  private signer: ethers.Signer;
  private auraGoatAddress: string;
  private auraGoatContractInstance: AuraGoat | null = null;

  constructor(
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
    auraGoatAddress: string,
  ) {
    this.aurumContract = aurumContract;
    this.provider = provider;
    this.signer = signer;
    this.auraGoatAddress = auraGoatAddress;
  }

  private async getAuraGoatContract(): Promise<AuraGoat> {
    if (this.auraGoatContractInstance) {
      return this.auraGoatContractInstance;
    }

    const contract = AuraGoat__factory.connect(
      this.auraGoatAddress,
      this.signer,
    );

    this.auraGoatContractInstance = contract;
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
        supportedAssets: nodeData.supportedAssets.map((n) => Number(n)),
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
        supportedAssets: nodeData.supportedAssets.map((n) => BigInt(n)),
        status: (nodeData.status === 'Active'
          ? '0x01'
          : '0x00') as ethers.BytesLike,
        capacity: nodeData.capacity.map((n) => BigInt(n)),
        assetPrices: nodeData.assetPrices.map((n) => BigInt(n)),
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
      const managerContract = await this.aurumContract;
      const goatContract = await this.getAuraGoatContract();
      const node = await managerContract.getNode(address); // Get node registration data

      if (node.owner === ethers.ZeroAddress) {
        throw new Error('Node not found');
      }

      // Create an array of promises for all balance checks
      const balancePromises = node.supportedAssets.map((assetId) => {
        const tokenId = BigInt(Number(assetId) * 10); // Calculate tokenId
        return goatContract
          .balanceOf(address, tokenId)
          .then((balance) => ({
            // Return object with id and balance
            id: Number(assetId),
            balance: balance,
          }))
          .catch((error) => {
            // Handle errors fetching individual balances gracefully
            console.warn(
              `Error fetching balance for node ${address}, asset ${assetId} (tokenId ${tokenId}): ${error.message}`,
            );
            return { id: Number(assetId), balance: BigInt(0) }; // Return 0 balance on error
          });
      });

      // Wait for all balance checks to complete
      const balances = await Promise.all(balancePromises);

      // Create a map for quick balance lookup
      const balanceMap = new Map<number, bigint>();
      balances.forEach((item) => balanceMap.set(item.id, item.balance));

      // Map node data and fetched balances to TokenizedAsset
      return node.supportedAssets.map((assetIdBigInt, index) => {
        const assetId = Number(assetIdBigInt);
        const currentBalance = balanceMap.get(assetId) ?? BigInt(0); // Get balance from map, default to 0

        return {
          id: assetId,
          amount: currentBalance.toString(), // Use actual balance
          name: this.getAssetName(assetId),
          // Consider using actual node status?
          status: this.convertContractStatusToDomain(node.status),
          nodeAddress: address,
          nodeLocation: node.location,
          price: node.assetPrices[index].toString(), // From registration data
          capacity: node.capacity[index].toString(), // Keep capacity from registration data
        };
      });
    } catch (error) {
      // If it's already the "Node not found" error, just rethrow it
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

  async getNodeOrders(address: string): Promise<any[]> {
    try {
      const contract = await this.aurumContract;
      const node = await contract.getNode(address);
      // TODO: Implement actual logic to fetch orders related to the node
      // This might involve interacting with AuSys contract or another mechanism
      return []; // Currently returns an empty array
    } catch (error) {
      handleContractError(error, 'get node orders');
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
  ): Promise<number> {
    try {
      const goatContract = await this.getAuraGoatContract();
      const tokenId = BigInt(assetId * 10);

      const balance = await goatContract.balanceOf(ownerAddress, tokenId);
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
}

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
