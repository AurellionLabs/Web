import type { Node } from '@/domain/node';
import { NodeAssetConverters } from '@/domain/node';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import type { AurumNodeManager } from '@/typechain-types';
import { ethers } from 'ethers';
import { sendContractTxWithReadEstimation } from '@/infrastructure/shared/tx-helper';
import { handleContractError } from '@/utils/error-handler';

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
        | (number | string)[]
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
        // Handle both numeric IDs and string class names
        // For initial registration with class names, use placeholder IDs (0)
        // Assets can be added later via updateSupportedAssets
        assetIds = legacyIds.map((id) => {
          if (typeof id === 'string') {
            // String class names - use 0 as placeholder for initial registration
            // TODO: Convert class names to actual asset IDs if needed
            console.warn(`[NodeService] Class name "${id}" provided, using placeholder ID 0. Assets should be added after registration.`);
            return 0n;
          }
          return BigInt(id);
        });
        capacities = legacyCaps.map((c) => BigInt(c));
        prices = legacyPrices.map((p) => BigInt(p));
      } else {
        // Allow empty arrays for initial registration
        console.log('[NodeService] No assets provided for initial registration. Node can be registered and assets added later.');
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

      console.log('[NodeService] Registering node with data:', {
        owner: nodeData.owner,
        location: nodeData.location.addressName,
        assetCount: assetIds.length,
        assetIds: assetIds.map(id => id.toString()),
      });

      const { receipt } = await sendContractTxWithReadEstimation(
        aurum as unknown as ethers.Contract,
        'registerNode',
        [contractNodeStruct],
        { from: nodeData.owner, gasHeadroomRatio: 1.2 },
      );

      const nodeRegisteredEvent = receipt?.logs?.find(
        (log: any) =>
          log.topics[0] === ethers.id('NodeRegistered(address,address)'),
      );

      if (nodeRegisteredEvent) {
        return ethers.getAddress(
          `0x${nodeRegisteredEvent.topics[1].slice(26)}`,
        );
      }

      throw new Error(
        'Could not extract node address from registration transaction',
      );
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
      const tx = await aurum.updateStatus(statusBytes, nodeAddress);
      await tx.wait();
    } catch (error) {
      handleContractError(error, `update node status for ${nodeAddress}`);
      throw error;
    }
  }
}
