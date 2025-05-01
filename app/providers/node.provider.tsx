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
import { Node } from '@/domain/node';
import { useNodes } from '@/hooks/useNodes';
import { useWallet } from '@/hooks/useWallet';

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
  orders: Order[];
  isRegisteredNode: boolean;
  nodeStatus: string;
  selectedNode: string | null;
  nodes: Node[];
  loadNodes: () => Promise<void>;
  selectNode: (nodeAddress: string) => void;
  currentNodeData: Node | null;
  refreshOrders: () => Promise<void>;
  loading: boolean;
  error: Error | null;
};

const NodeContext = createContext<NodeContextType | undefined>(undefined);

// Original provider code
export const NodeProvider = ({ children }: { children: ReactNode }) => {
  console.log('[NodeProvider] Provider rendering...');
  const [orders, setOrders] = useState<Order[]>([]);
  const [nodeStatus, setNodeStatus] = useState<string>('');
  const [isRegisteredNode, setIsRegisteredNode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [currentNodeData, setCurrentNodeData] = useState<Node | null>(null);
  const router = useRouter();
  const { address } = useWallet();
  console.log(`[NodeProvider] Address from useWallet on render: ${address}`);
  const {
    nodes,
    loading,
    error,
    loadNodes: loadNodesFromHook,
    getNode,
    getNodeStatus,
    getNodeOrders,
  } = useNodes();

  // Define loadNodes function first
  const loadNodes = useCallback(async () => {
    console.log('[NodeProvider] loadNodes function START');
    if (!address) {
      console.log('[NodeProvider] loadNodes - No address available, exiting.');
      return;
    }
    console.log(
      `[NodeProvider] loadNodes - Address: ${address}. Calling loadNodesFromHook...`,
    );
    console.log('[NodeProvider] loadNodes - Nodes state BEFORE call:', nodes);
    try {
      await loadNodesFromHook(address);
      console.log(
        '[NodeProvider] loadNodes - loadNodesFromHook finished successfully.',
      );
    } catch (err) {
      console.error(
        '[NodeProvider] loadNodes - Error calling loadNodesFromHook:',
        err,
      );
    }
    console.log(
      '[NodeProvider] loadNodes - Nodes state AFTER call (might not be updated yet):',
      nodes,
    );
  }, [address, loadNodesFromHook, nodes]);

  // Effect to load nodes when the address becomes available
  useEffect(() => {
    // Explicitly log the address value whenever this effect runs
    console.log(
      `[NodeProvider] Address Effect Triggered. Current address from useWallet: ${address}`,
    );
    if (address) {
      console.log(
        '[NodeProvider] Address Effect - Address is valid, calling loadNodes().',
      );
      loadNodes(); // Now calls the function defined above
    } else {
      console.log('[NodeProvider] Address Effect - Address is null/undefined.');
      // Optionally clear nodes state if address becomes null (user disconnects)
      // setNodes([]); // Uncomment if you want to clear nodes on disconnect
    }
    // ONLY depend on address. This effect should run *only* when the address itself changes.
  }, [address]); // <--- REMOVED loadNodes from dependencies

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

  const value = {
    orders,
    isRegisteredNode,
    nodeStatus,
    selectedNode,
    nodes, // This is the nodes state from useNodes hook
    loadNodes,
    selectNode,
    currentNodeData,
    refreshOrders,
    loading,
    error,
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
