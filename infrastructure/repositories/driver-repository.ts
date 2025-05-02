import type {
  Node,
  NodeRepository,
  TokenizedAsset,
  AggregateAssetAmount,
  NodeLocation,
  AssetType,
} from '@/domain/node';
import { Order } from '@/domain/orders';
import { BrowserProvider, ethers } from 'ethers';
import {
  AurumNode,
  AurumNode__factory,
  AurumNodeManager,
  AurumNodeManager__factory,
  AuraGoat__factory,
} from '@/typechain-types';
import { handleContractError } from '@/utils/error-handler';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';
import { IDriverRepository } from '@/domain/driver/driver';

/**
 * Infrastructure implementation of the NodeRepository interface
 * This implementation directly interacts with the Aurum blockchain contracts
 */
export class driverRepository implements IDriverRepository {
  private aurumContract: AurumNodeManager;
  private auraGoatContract: any | null = null;
  private provider: BrowserProvider;
  private signer: ethers.Signer;

  constructor(
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
  ) {
    this.aurumContract = aurumContract;
    this.provider = provider;
    this.signer = signer;
  }

  private async getAuraGoatContract(): Promise<any> {
    if (this.auraGoatContract) {
      return this.auraGoatContract;
    }

    const contract = AuraGoat__factory.connect(
      NEXT_PUBLIC_AURA_GOAT_ADDRESS,
      this.signer,
    );

    this.auraGoatContract = contract;
    return contract;
  }

  private async getAurumNodeContract(address: string): Promise<AurumNode> {
    return AurumNode__factory.connect(address, this.signer);
  }

  async getNode(nodeAddress: string): Promise<Node> {
    try {
      const nodeData = await this.aurumContract.getNode(nodeAddress);

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

  async registerNode(nodeData: Node): Promise<void> {
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
        validNode: ethers.toUtf8Bytes(nodeData.validNode),
        owner: nodeData.owner,
        supportedAssets: nodeData.supportedAssets.map((n) => BigInt(n)),
        status: ethers.toUtf8Bytes(nodeData.status === 'Active' ? '1' : '0'),
        capacity: nodeData.capacity.map((n) => BigInt(n)),
        assetPrices: nodeData.assetPrices.map((n) => BigInt(n)),
      };

      await contract.registerNode(nodeStruct);
    } catch (error) {
      handleContractError(error, 'register node');
      throw error;
    }
  }

  async updateNodeStatus(
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ): Promise<void> {
    try {
      const contract = await this.aurumContract;
      const statusBytes = ethers.toUtf8Bytes(status === 'Active' ? '1' : '0');
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
      const contract = await this.aurumContract;
      const node = await contract.getNode(address);

      return node.supportedAssets.map((assetId, index) => ({
        id: Number(assetId),
        amount: node.capacity[index].toString(),
        name: this.getAssetName(Number(assetId)),
        status: 'Active',
        nodeAddress: address,
        nodeLocation: node.location,
        price: node.assetPrices[index].toString(),
        capacity: node.capacity[index].toString(),
      }));
    } catch (error) {
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
        const nodeAddress = await contract.nodeList(BigInt(i));
        const nodeAssets = await this.getNodeAssets(nodeAddress);
        allAssets.push(...nodeAssets);
      }

      return allAssets;
    } catch (error) {
      handleContractError(error, 'get all node assets');
      throw error;
    }
  }

  async getNodeOrders(address: string): Promise<Order[]> {
    try {
      const contract = await this.aurumContract;
      const node = await contract.getNode(address);
      return [];
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
