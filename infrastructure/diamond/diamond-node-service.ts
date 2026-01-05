/**
 * Diamond Node Service - Handles node registration and management via Diamond
 *
 * This replaces the legacy NodeService with Diamond-based operations.
 * Node registration, status updates, etc. go through the Diamond's NodesFacet.
 */

import { ethers } from 'ethers';
import { Node } from '@/domain/node';
import { DiamondContext } from './diamond-context';
import { NEXT_PUBLIC_AURA_ASSET_ADDRESS } from '@/chain-constants';

export interface INodeService {
  registerNode(nodeData: Node): Promise<string>;
  updateNodeStatus(
    nodeHash: string,
    status: 'Active' | 'Inactive',
  ): Promise<void>;
  updateNodeLocation(
    nodeHash: string,
    addressName: string,
    lat: string,
    lng: string,
  ): Promise<void>;
}

/**
 * Diamond-based implementation of INodeService
 */
export class DiamondNodeService implements INodeService {
  private context: DiamondContext;

  constructor(context: DiamondContext) {
    this.context = context;
  }

  /**
   * Register a new node via Diamond's NodesFacet
   * Returns the bytes32 nodeHash
   */
  async registerNode(nodeData: Node): Promise<string> {
    const diamond = this.context.getDiamond();
    const signerAddress = await this.context.getSignerAddress();

    console.log('[DiamondNodeService] Registering node:', {
      owner: nodeData.owner,
      location: nodeData.location.addressName,
    });

    // Verify the signer is the owner
    if (signerAddress.toLowerCase() !== nodeData.owner.toLowerCase()) {
      throw new Error('Signer must be the node owner');
    }

    try {
      // Call registerNode on Diamond's NodesFacet
      // function registerNode(
      //   string memory _nodeType,
      //   uint256 _capacity,
      //   bytes32 _assetHash,
      //   string memory _addressName,
      //   string memory _lat,
      //   string memory _lng
      // ) external returns (bytes32 nodeHash)

      const nodeType = 'STANDARD'; // Default node type
      const capacity = 0; // Initial capacity
      const assetHash = ethers.ZeroHash; // No asset hash initially

      const tx = await diamond.registerNode(
        nodeType,
        capacity,
        assetHash,
        nodeData.location.addressName,
        nodeData.location.location.lat,
        nodeData.location.location.lng,
      );

      console.log('[DiamondNodeService] Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log(
        '[DiamondNodeService] Transaction confirmed, block:',
        receipt.blockNumber,
      );

      // Extract nodeHash from NodeRegistered event
      const nodeRegisteredEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = diamond.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return parsed?.name === 'NodeRegistered';
        } catch {
          return false;
        }
      });

      if (nodeRegisteredEvent) {
        const parsed = diamond.interface.parseLog({
          topics: nodeRegisteredEvent.topics,
          data: nodeRegisteredEvent.data,
        });
        const nodeHash = parsed?.args?.nodeHash;
        console.log(
          '[DiamondNodeService] Node registered with hash:',
          nodeHash,
        );
        return nodeHash;
      }

      throw new Error(
        'Could not extract nodeHash from registration transaction',
      );
    } catch (error) {
      console.error('[DiamondNodeService] Error registering node:', error);
      throw error;
    }
  }

  /**
   * Update node status via Diamond
   */
  async updateNodeStatus(
    nodeHash: string,
    status: 'Active' | 'Inactive',
  ): Promise<void> {
    const diamond = this.context.getDiamond();

    console.log('[DiamondNodeService] Updating node status:', {
      nodeHash,
      status,
    });

    try {
      const statusBytes = status === 'Active' ? '0x01' : '0x00';
      const tx = await diamond.updateNodeStatus(statusBytes, nodeHash);
      await tx.wait();
      console.log('[DiamondNodeService] Node status updated');
    } catch (error) {
      console.error('[DiamondNodeService] Error updating node status:', error);
      throw error;
    }
  }

  /**
   * Update node location via Diamond
   */
  async updateNodeLocation(
    nodeHash: string,
    addressName: string,
    lat: string,
    lng: string,
  ): Promise<void> {
    const diamond = this.context.getDiamond();

    console.log('[DiamondNodeService] Updating node location:', {
      nodeHash,
      addressName,
    });

    try {
      const tx = await diamond.updateNodeLocation(
        addressName,
        lat,
        lng,
        nodeHash,
      );
      await tx.wait();
      console.log('[DiamondNodeService] Node location updated');
    } catch (error) {
      console.error(
        '[DiamondNodeService] Error updating node location:',
        error,
      );
      throw error;
    }
  }
}
