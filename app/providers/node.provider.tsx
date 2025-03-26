'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getNodeOrders,
  getNodeStatus,
  getOwnedNodeAddressList,
  getNode,
} from '@/dapp-connectors/aurum-controller';
import { BytesLike, BigNumberish, AddressLike } from 'ethers';

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
  nodes: NodeData[];
  loadNodes: () => Promise<void>;
  selectNode: (nodeAddress: string) => void;
  currentNodeData: NodeData | null;
};

type NodeData = {
  address: string;
  status: BytesLike;
  location: {
    addressName: string;
    location: { lat: string; lng: string };
  };
  supportedAssets: BigNumberish[];
  capacity: BigNumberish[];
  assetPrices: BigNumberish[];
  validNode: BytesLike;
  owner: AddressLike;
};

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export const NodeProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [nodeStatus, setNodeStatus] = useState<string>('');
  const [isRegisteredNode, setIsRegisteredNode] = useState(false);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [currentNodeData, setCurrentNodeData] = useState<NodeData | null>(null);
  const router = useRouter();

  const loadNodes = useCallback(async () => {
    try {
      const addresses = await getOwnedNodeAddressList();
      const nodesData = await Promise.all(
        addresses.map(async (address) => {
          const data = await getNode(address);
          return {
            address,
            ...data,
          };
        }),
      );
      setNodes(nodesData);

      // Also update current node data if we have a selected node
      if (selectedNode) {
        const updatedNodeData = await getNode(selectedNode);
        setCurrentNodeData({
          ...updatedNodeData,
          address: selectedNode,
        });
      }

      // If we have nodes but none selected, select the first one
      if (nodesData.length > 0 && !selectedNode) {
        selectNode(nodesData[0].address);
      }
    } catch (error) {
      console.error('Error loading nodes:', error);
    }
  }, [selectedNode]);

  const selectNode = useCallback(
    async (nodeAddress: string) => {
      try {
        const nodeData = await getNode(nodeAddress);
        setSelectedNode(nodeAddress);
        setCurrentNodeData({
          ...nodeData,
          address: nodeAddress, // Add the address to match NodeData type
        });

        // Update orders for the selected node
        const nodeOrders = await getNodeOrders(nodeAddress);
        setOrders(
          nodeOrders.map((id) => ({
            id: id.toString(),
            customer: '-',
            asset: 'Asset #' + id,
            quantity: 0,
            value: '0',
            status: 'pending' as const,
          })),
        );

        // Update node status
        const status = await getNodeStatus(nodeAddress);
        setIsRegisteredNode(!!status);
        setNodeStatus(status);

        // Optionally update URL for deep linking
        const params = new URLSearchParams(window.location.search);
        params.set('node', nodeAddress);
        router.push(`${window.location.pathname}?${params.toString()}`);
      } catch (error) {
        console.error('Error selecting node:', error);
      }
    },
    [router],
  );

  const value = {
    orders,
    isRegisteredNode,
    nodeStatus,
    selectedNode,
    nodes,
    loadNodes,
    selectNode,
    currentNodeData,
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
