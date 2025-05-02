'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { Node, TokenizedAsset } from '@/domain/node';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

// Update types to match blockchain data
export type Order = {
  id: string;
  customer: string;
  asset: string;
  quantity: number;
  value: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
};

type NodeContextType = {
  // State
  orders: Order[];
  isRegisteredNode: boolean;
  nodeStatus: string;
  selectedNode: string | null;
  nodes: Node[];
  loading: boolean;
  error: Error | null;
  currentNodeData: Node | null;

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
  selectNode: (nodeAddress: string) => void;
  refreshOrders: () => Promise<void>;

  // Asset operations
  getNodeAssets: (nodeAddress: string) => Promise<TokenizedAsset[]>;
  getAllNodeAssets: () => Promise<TokenizedAsset[]>;

  // Utility
  refreshNodes: () => Promise<void>;
};

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export const NodeProvider = ({ children }: { children: ReactNode }) => {
  console.log('[NodeProvider] Provider rendering...');
  const [orders, setOrders] = useState<Order[]>([]);
  const [nodeStatus, setNodeStatus] = useState<string>('');
  const [isRegisteredNode, setIsRegisteredNode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [currentNodeData, setCurrentNodeData] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentWalletAddress, setCurrentWalletAddress] = useState<
    string | null
  >(null);

  const router = useRouter();
  const { address } = useWallet();
  console.log(`[NodeProvider] Address from useWallet on render: ${address}`);

  const nodeRepository = RepositoryContext.getInstance().getNodeRepository();
  const orderRepository = RepositoryContext.getInstance().getOrderRepository();

  // Load all nodes for a wallet address
  const loadNodes = useCallback(
    async (walletAddress: string) => {
      console.log(
        `[NodeProvider] loadNodes called with walletAddress: ${walletAddress}`,
      );
      setLoading(true);
      setError(null);
      setCurrentWalletAddress(walletAddress);

      try {
        console.log('[NodeProvider] Calling nodeRepository.getOwnedNodes...');
        const nodeAddresses = await nodeRepository.getOwnedNodes(walletAddress);
        console.log('[NodeProvider] Received nodeAddresses:', nodeAddresses);

        if (!nodeAddresses || nodeAddresses.length === 0) {
          console.log(
            '[NodeProvider] No node addresses found, setting nodes to empty array.',
          );
          setNodes([]);
        } else {
          console.log(
            '[NodeProvider] Fetching full node data for each address...',
          );
          const nodePromises = nodeAddresses.map((address) =>
            nodeRepository.getNode(address),
          );
          const loadedNodes = await Promise.all(nodePromises);
          console.log('[NodeProvider] Fetched full node data:', loadedNodes);
          setNodes(loadedNodes);
        }
      } catch (err) {
        console.error('[NodeProvider] Error in loadNodes:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to load nodes'),
        );
        setNodes([]);
      } finally {
        console.log(
          '[NodeProvider] loadNodes finished, setting loading to false.',
        );
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
        const contractOrders = await orderRepository.getNodeOrders(nodeAddress);
        return contractOrders.map((order) => ({
          id: order.id.toString(),
          customer: order.customer.toString(),
          asset: order.tokenId.toString(),
          quantity: Number(order.tokenQuantity),
          value: order.price.toString(),
          status: Number(order.currentStatus) === 0 ? 'pending' : 'active',
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to get node orders'),
        );
        return [];
      }
    },
    [orderRepository],
  );

  const selectNode = useCallback(
    async (nodeAddress: string) => {
      try {
        const node = await getNode(nodeAddress);
        if (!node) return;

        setSelectedNode(nodeAddress);
        setCurrentNodeData(node);

        // Update orders for the selected node
        const nodeOrders = await getNodeOrders(nodeAddress);
        setOrders(nodeOrders);

        // Update node status
        const status = await getNodeStatus(nodeAddress);
        setIsRegisteredNode(!!status);
        setNodeStatus(status);

        // Update URL for deep linking
        const params = new URLSearchParams(window.location.search);
        params.set('node', nodeAddress);
        router.push(`${window.location.pathname}?${params.toString()}`);
      } catch (error) {
        console.error('Error selecting node:', error);
      }
    },
    [router, getNode, getNodeOrders, getNodeStatus],
  );

  const refreshOrders = useCallback(async () => {
    if (selectedNode) {
      try {
        const nodeOrders = await getNodeOrders(selectedNode);
        setOrders(nodeOrders);
      } catch (error) {
        console.error('Error refreshing orders:', error);
      }
    }
  }, [selectedNode, getNodeOrders]);

  // Effect to load nodes when the address becomes available
  useEffect(() => {
    console.log(
      `[NodeProvider] Address Effect Triggered. Current address from useWallet: ${address}`,
    );
    if (address) {
      console.log(
        '[NodeProvider] Address Effect - Address is valid, calling loadNodes().',
      );
      loadNodes(address);
    } else {
      console.log('[NodeProvider] Address Effect - Address is null/undefined.');
    }
  }, [address, loadNodes]);

  const value = {
    // State
    orders,
    isRegisteredNode,
    nodeStatus,
    selectedNode,
    nodes,
    loading,
    error,
    currentNodeData,

    // Node operations
    loadNodes,
    getNode,
    registerNode,
    updateNodeStatus,
    getNodeStatus,
    getNodeOrders,
    selectNode,
    refreshOrders,

    // Asset operations
    getNodeAssets,
    getAllNodeAssets,

    // Utility
    refreshNodes,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
};

// Hook for using the node context
export function useNode() {
  const context = useContext(NodeContext);
  if (context === undefined) {
    throw new Error('useNode must be used within a NodeProvider');
  }
  return context;
}
