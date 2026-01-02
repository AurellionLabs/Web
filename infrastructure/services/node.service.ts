import type { Node } from '@/domain/node';
import { NodeAssetConverters } from '@/domain/node';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import type { AurumNodeManager } from '@/typechain-types';
import { ethers } from 'ethers';
import { handleContractError } from '@/utils/error-handler';
import { sendContractTxAndWaitForIndexer } from '@/infrastructure/shared/tx-with-indexer-wait';

export interface INodeService {
  registerNode(nodeData: Node): Promise<string>;
  updateNodeStatus(
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ): Promise<void>;
}

export class NodeService implements INodeService {
  private context: RepositoryContext;

  constructor(context: RepositoryContext) {
    this.context = context;
  }

  private getAurumContractOrThrow(): AurumNodeManager {
    const contract = this.context.getAurumContract();
    if (!contract) throw new Error('AurumNodeManager contract not initialized');
    return contract;
  }

  async registerNode(nodeData: Node): Promise<string> {
    try {
      const aurum = this.getAurumContractOrThrow();

      // Normalize assets: support new Node.assets or legacy arrays
      const hasNewAssets = Array.isArray((nodeData as any).assets);
      const legacyIds = (nodeData as any).supportedAssets as
        | number[]
        | undefined;
      const legacyCaps = (nodeData as any).capacity as number[] | undefined;
      const legacyPrices = (nodeData as any).assetPrices as
        | number[]
        | undefined;

      let assetIds: bigint[] = [];
      let capacities: bigint[] = [];
      let prices: bigint[] = [];

      if (hasNewAssets && (nodeData.assets?.length ?? 0) > 0) {
        assetIds = nodeData.assets!.map((a) => BigInt(a.tokenId));
        capacities = nodeData.assets!.map((a) => BigInt(a.capacity));
        prices = nodeData.assets!.map((a) => a.price);
      } else if (
        Array.isArray(legacyIds) &&
        Array.isArray(legacyCaps) &&
        Array.isArray(legacyPrices) &&
        legacyIds.length === legacyCaps.length &&
        legacyIds.length === legacyPrices.length
      ) {
        assetIds = legacyIds.map((id) => BigInt(id));
        capacities = legacyCaps.map((c) => BigInt(c));
        prices = legacyPrices.map((p) => BigInt(p));
      }

      const contractNodeStruct = {
        location: {
          addressName: nodeData.location.addressName,
          location: {
            lat: nodeData.location.location.lat,
            lng: nodeData.location.location.lng,
          },
        },
        // validNode set internally to 1 in contract after registration
        validNode: '0x00',
        owner: nodeData.owner,
        supportedAssets: assetIds,
        status: NodeAssetConverters.statusToBytes1(nodeData.status),
        capacity: capacities,
        assetPrices: prices,
      } as unknown as Parameters<AurumNodeManager['registerNode']>[0];

      const { result: nodeAddress } = await sendContractTxAndWaitForIndexer<string>(
        aurum as unknown as ethers.Contract,
        'registerNode',
        [contractNodeStruct],
        'AurumNodeManager.registerNode',
        {
          from: nodeData.owner,
          gasHeadroomRatio: 1.2,
        },
      );

      if (!nodeAddress) {
        throw new Error('Failed to get node address from registration transaction');
      }

      return nodeAddress;
    } catch (error) {
      handleContractError(error, `register node for owner ${nodeData.owner}`);
      throw error;
    }
  }

  async updateNodeStatus(
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ): Promise<void> {
    try {
      const aurum = this.getAurumContractOrThrow();
      const statusBytes = NodeAssetConverters.statusToBytes1(status);
      
      await sendContractTxAndWaitForIndexer(
        aurum as unknown as ethers.Contract,
        'updateStatus',
        [statusBytes, nodeAddress],
        'AurumNodeManager.updateStatus',
      );
    } catch (error) {
      handleContractError(error, `update node status for ${nodeAddress}`);
      throw error;
    }
  }
}
