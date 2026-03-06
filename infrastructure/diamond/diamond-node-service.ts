/**
 * Diamond Node Service - Handles node registration and management via Diamond
 *
 * This replaces the legacy NodeService with Diamond-based operations.
 * Node registration, status updates, etc. go through the Diamond's NodesFacet.
 */

import { ethers } from 'ethers';
import { Node } from '@/domain/node';
import { DiamondContext } from './diamond-context';

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
  addSupportingDocument(
    nodeHash: string,
    url: string,
    title: string,
    description: string,
    documentType: string,
  ): Promise<boolean>; // Returns isFrozen
  removeSupportingDocument(nodeHash: string, url: string): Promise<void>;
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
    const registrarRole = await diamond.NODE_REGISTRAR_ROLE();
    const canRegisterNode = await diamond.hasNodeRole(
      registrarRole,
      signerAddress,
    );
    if (!canRegisterNode) {
      throw new Error('Connected wallet is not allowed to register nodes');
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

      const receipt = await tx.wait();

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
        return nodeHash;
      }

      throw new Error(
        'Could not extract nodeHash from registration transaction',
      );
    } catch (error) {
      console.error('[DiamondNodeService] Error registering node:', error);
      if (
        error instanceof Error &&
        error.message.includes('Not allowed node registrar')
      ) {
        throw new Error('Connected wallet is not allowed to register nodes');
      }
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

    try {
      const statusBytes = status === 'Active' ? '0x01' : '0x00';
      const tx = await diamond.updateNodeStatus(statusBytes, nodeHash);
      await tx.wait();
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

    try {
      const tx = await diamond.updateNodeLocation(
        addressName,
        lat,
        lng,
        nodeHash,
      );
      await tx.wait();
    } catch (error) {
      console.error(
        '[DiamondNodeService] Error updating node location:',
        error,
      );
      throw error;
    }
  }

  /**
   * Add a supporting document to a node
   * @param nodeHash The node hash
   * @param url The URL of the document
   * @param title The title of the document
   * @param description A description of the document
   * @param documentType The type of document (e.g., "certification", "audit", "license")
   * @returns Whether the document was detected as immutable (frozen)
   */
  async addSupportingDocument(
    nodeHash: string,
    url: string,
    title: string,
    description: string,
    documentType: string,
  ): Promise<boolean> {
    const diamond = this.context.getDiamond();

    try {
      const tx = await diamond.addSupportingDocument(
        nodeHash,
        url,
        title,
        description,
        documentType,
      );

      const receipt = await tx.wait();

      // Extract isFrozen from SupportingDocumentAdded event
      const docAddedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = diamond.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return parsed?.name === 'SupportingDocumentAdded';
        } catch {
          return false;
        }
      });

      if (docAddedEvent) {
        const parsed = diamond.interface.parseLog({
          topics: docAddedEvent.topics,
          data: docAddedEvent.data,
        });
        const isFrozen = parsed?.args?.isFrozen ?? false;
        return isFrozen;
      }

      // If we couldn't parse the event, return false
      return false;
    } catch (error) {
      console.error(
        '[DiamondNodeService] Error adding supporting document:',
        error,
      );
      throw error;
    }
  }

  /**
   * Remove a supporting document from a node (soft delete)
   * @param nodeHash The node hash
   * @param url The URL of the document to remove
   */
  async removeSupportingDocument(nodeHash: string, url: string): Promise<void> {
    const diamond = this.context.getDiamond();

    try {
      const tx = await diamond.removeSupportingDocument(nodeHash, url);
      await tx.wait();
    } catch (error) {
      console.error(
        '[DiamondNodeService] Error removing supporting document:',
        error,
      );
      throw error;
    }
  }
}
