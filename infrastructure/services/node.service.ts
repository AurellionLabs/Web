import type { Node } from '@/domain/node';
import { NodeAssetConverters } from '@/domain/node';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import type { AurumNodeManager } from '@/typechain-types';
import { ethers } from 'ethers';
import { sendContractTxWithReadEstimation } from '@/infrastructure/shared/tx-helper';
import { handleContractError } from '@/utils/error-handler';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';

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

      // Contract expects Asset[] structs, not separate arrays
      let supportedAssets: AurumNodeManager.AssetStruct[] = [];

      if (hasNewAssets && (nodeData.assets?.length ?? 0) > 0) {
        // Use new assets format - already in correct structure
        if (!NEXT_PUBLIC_AURA_GOAT_ADDRESS) {
          throw new Error('AuraAsset contract address not configured');
        }
        supportedAssets = nodeData.assets!.map((a) => ({
          token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
          tokenId: BigInt(a.tokenId),
          price: a.price,
          capacity: BigInt(a.capacity),
        }));
      } else if (
        Array.isArray(legacyIds) &&
        Array.isArray(legacyCaps) &&
        Array.isArray(legacyPrices) &&
        legacyIds.length === legacyCaps.length &&
        legacyIds.length === legacyPrices.length &&
        legacyIds.length > 0
      ) {
        // Legacy format with separate arrays - convert to Asset structs
        if (!NEXT_PUBLIC_AURA_GOAT_ADDRESS) {
          throw new Error('AuraAsset contract address not configured');
        }
        supportedAssets = legacyIds.map((id, index) => {
          let tokenId: bigint;
          if (typeof id === 'string') {
            // String class names - cannot register with class names directly
            // Must use empty array and add assets later via updateSupportedAssets
            console.warn(
              `[NodeService] Class name "${id}" provided. Cannot register with class names. Use empty assets array and add assets after registration.`,
            );
            throw new Error(
              'Cannot register node with asset class names. Please register with empty assets and add assets after registration.',
            );
          }
          tokenId = BigInt(id);
          return {
            token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
            tokenId,
            price: BigInt(legacyPrices[index]),
            capacity: BigInt(legacyCaps[index]),
          };
        });
      } else {
        // Allow empty arrays for initial registration
        console.log(
          '[NodeService] No assets provided for initial registration. Node can be registered and assets added later.',
        );
      }

      const contractNodeStruct: AurumNodeManager.NodeStruct = {
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
        supportedAssets,
        status: NodeAssetConverters.statusToBytes1(nodeData.status),
      };

      console.log('[NodeService] Registering node with data:', {
        owner: nodeData.owner,
        location: nodeData.location.addressName,
        assetCount: supportedAssets.length,
        supportedAssets: supportedAssets.map(a => ({
          token: a.token,
          tokenId: a.tokenId.toString(),
          price: a.price.toString(),
          capacity: a.capacity.toString(),
        })),
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
