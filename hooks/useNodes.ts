import { useState, useEffect, useCallback } from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { Node, TokenizedAsset } from '@/domain/node';
import { Order } from '@/domain/orders/order';
import { useWallets } from '@privy-io/react-auth';

interface UseNodesResult {
  // State
  nodes: Node[];
  loading: boolean;
  error: Error | null;

  // Node operations
  loadNodes: (walletAddress: string) => Promise<void>;
  getNode: (nodeAddress: string) => Promise<Node | null>;
  registerNode: (nodeData: Node) => Promise<void>;
  updateNodeStatus: (
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ) => Promise<void>;
  getNodeStatus: (nodeAddress: string) => Promise<'Active' | 'Inactive'>;
  getNodeOrders: (nodeAddress: string) => Promise<Order[]>;

  // Asset operations
  getNodeAssets: (nodeAddress: string) => Promise<TokenizedAsset[]>;
  getAllNodeAssets: () => Promise<TokenizedAsset[]>;

  // Utility
  refreshNodes: () => Promise<void>;
}

export function useNodes(): UseNodesResult {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentWalletAddress, setCurrentWalletAddress] = useState<
    string | null
  >(null);
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const provider = wallet.getEthereumProvider();

  const nodeRepository = RepositoryContext.getInstance().getNodeRepository();
  const orderRepository = RepositoryContext.getInstance().getOrderRepository();

  // Load all nodes for a wallet address
  const loadNodes = useCallback(
    async (walletAddress: string) => {
      console.log(
        `[useNodes] loadNodes called with walletAddress: ${walletAddress}`,
      );
      setLoading(true);
      setError(null);
      setCurrentWalletAddress(walletAddress);

      try {
        console.log('[useNodes] Calling nodeRepository.getOwnedNodes...');
        const nodeAddresses = await nodeRepository.getOwnedNodes(walletAddress);
        console.log('[useNodes] Received nodeAddresses:', nodeAddresses);

        if (!nodeAddresses || nodeAddresses.length === 0) {
          console.log(
            '[useNodes] No node addresses found, setting nodes to empty array.',
          );
          setNodes([]);
        } else {
          console.log('[useNodes] Fetching full node data for each address...');
          const nodePromises = nodeAddresses.map((address) =>
            nodeRepository.getNode(address),
          );
          const loadedNodes = await Promise.all(nodePromises);
          console.log('[useNodes] Fetched full node data:', loadedNodes);
          setNodes(loadedNodes);
        }
      } catch (err) {
        console.error('[useNodes] Error in loadNodes:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to load nodes'),
        );
        setNodes([]);
      } finally {
        console.log('[useNodes] loadNodes finished, setting loading to false.');
        setLoading(false);
      }
    },
    [nodeRepository],
  );

  // Get a single node by address
  const getNode = useCallback(
    async (nodeAddress: string): Promise<Node | null> => {
      try {
        return await nodeRepository.getNode(nodeAddress);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get node'));
        return null;
      }
    },
    [nodeRepository],
  );

  // Register a new node
  const registerNode = useCallback(
    async (nodeData: Node): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await nodeRepository.registerNode(nodeData);
        // Refresh the nodes list if we're currently viewing the owner's nodes
        if (currentWalletAddress === nodeData.owner) {
          await loadNodes(currentWalletAddress);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to register node'),
        );
      } finally {
        setLoading(false);
      }
    },
    [nodeRepository, currentWalletAddress, loadNodes],
  );

  // Update node status
  const updateNodeStatus = useCallback(
    async (
      nodeAddress: string,
      status: 'Active' | 'Inactive',
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await nodeRepository.updateNodeStatus(nodeAddress, status);
        // Update the node in our local state
        setNodes((currentNodes) =>
          currentNodes.map((node) =>
            node.address === nodeAddress ? { ...node, status } : node,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to update node status'),
        );
      } finally {
        setLoading(false);
      }
    },
    [nodeRepository],
  );

  // Get assets for a specific node
  const getNodeAssets = useCallback(
    async (nodeAddress: string): Promise<TokenizedAsset[]> => {
      try {
        return await nodeRepository.getNodeAssets(nodeAddress);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to get node assets'),
        );
        return [];
      }
    },
    [nodeRepository],
  );

  // Get all assets across all nodes
  const getAllNodeAssets = useCallback(async (): Promise<TokenizedAsset[]> => {
    try {
      return await nodeRepository.getAllNodeAssets();
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to get all node assets'),
      );
      return [];
    }
  }, [nodeRepository]);

  // Refresh the current nodes list
  const refreshNodes = useCallback(async (): Promise<void> => {
    if (currentWalletAddress) {
      await loadNodes(currentWalletAddress);
    }
  }, [currentWalletAddress, loadNodes]);

  // Get node status
  const getNodeStatus = useCallback(
    async (nodeAddress: string): Promise<'Active' | 'Inactive'> => {
      try {
        return await nodeRepository.getNodeStatus(nodeAddress);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to get node status'),
        );
        return 'Inactive';
      }
    },
    [nodeRepository],
  );

  // Get node orders
  const getNodeOrders = useCallback(
    async (nodeAddress: string): Promise<Order[]> => {
      try {
        const _orders = await orderRepository.getNodeOrders(nodeAddress);
        _orders[0];
        return orders;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to get node orders'),
        );
        return [];
      }
    },
    [nodeRepository],
  );

  return {
    // State
    nodes,
    loading,
    error,

    // Node operations
    loadNodes,
    getNode,
    registerNode,
    updateNodeStatus,
    getNodeStatus,
    getNodeOrders,

    // Asset operations
    getNodeAssets,
    getAllNodeAssets,

    // Utility
    refreshNodes,
  };
}
