'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  Node,
  TokenizedAsset,
  TokenizedAssetAttribute,
} from '@/domain/node/node';
import { Asset } from '@/domain/platform';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useMainProvider } from './main.provider';
import { useNodes } from './nodes.provider';

// Order type from the original provider
export type Order = {
  id: string;
  buyer: string;
  seller: string;
  asset: string;
  quantity: number;
  value: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
};

type SelectedNodeContextType = {
  // Current selection
  selectedNodeAddress: string | null;
  nodeData: Node | null;

  // Node-specific data
  orders: Order[];
  assets: TokenizedAsset[];

  // Loading states
  loading: boolean;
  ordersLoading: boolean;
  assetsLoading: boolean;
  error: Error | null;

  // Selection operations
  selectNode: (nodeAddress: string) => Promise<void>;
  clearSelection: () => void;

  // Data refresh operations
  refreshNodeData: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshAssets: () => Promise<void>;

  // Node operations (for selected node)
  updateNodeStatus: (status: 'Active' | 'Inactive') => Promise<void>;
  getNodeStatus: () => Promise<'Active' | 'Inactive'>;

  // Asset operations (for selected node)
  mintAsset: (asset: Asset, amount: number, priceWei: bigint) => Promise<void>;
  updateAssetCapacity: (
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ) => Promise<void>;
  updateAssetPrice: (
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ) => Promise<void>;
  getAssetAttributes: (fileHash: string) => Promise<TokenizedAssetAttribute[]>;
};

const SelectedNodeContext = createContext<SelectedNodeContextType | undefined>(
  undefined,
);

export function SelectedNodeProvider({ children }: { children: ReactNode }) {
  // Selection state
  const [selectedNodeAddress, setSelectedNodeAddress] = useState<string | null>(
    null,
  );
  const [nodeData, setNodeData] = useState<Node | null>(null);

  // Node-specific data
  const [orders, setOrders] = useState<Order[]>([]);
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { address } = useWallet();
  const { connected } = useMainProvider();
  const { getNode, refreshNodes } = useNodes();

  // Initialize contexts
  const [repositoryContext, setRepositoryContext] =
    useState<RepositoryContext | null>(null);
  const [serviceContext, setServiceContext] = useState<ServiceContext | null>(
    null,
  );

  useEffect(() => {
    if (connected && address) {
      const repoContext = RepositoryContext.getInstance();
      const servContext = ServiceContext.getInstance();
      setRepositoryContext(repoContext);
      setServiceContext(servContext);
    }
  }, [connected, address]);

  // Load orders for selected node
  const loadOrders = useCallback(
    async (nodeAddress: string) => {
      if (!repositoryContext) return;

      setOrdersLoading(true);
      try {
        const orderRepository = repositoryContext.getOrderRepository();
        const nodeOrders = await orderRepository.getNodeOrders(nodeAddress);

        // Convert to frontend Order format
        const formattedOrders = nodeOrders.map((order) => ({
          id: order.id,
          buyer: order.buyer,
          seller: order.seller,
          asset: order.tokenId,
          quantity: Number(order.tokenQuantity),
          value: order.price.toString(),
          status:
            order.currentStatus === '0'
              ? 'pending'
              : order.currentStatus === '1'
                ? 'active'
                : order.currentStatus === '2'
                  ? 'completed'
                  : 'cancelled',
        })) as Order[];

        setOrders(formattedOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    },
    [repositoryContext],
  );

  // Load assets for selected node
  const loadAssets = useCallback(
    async (nodeAddress: string) => {
      if (!repositoryContext) return;

      setAssetsLoading(true);
      try {
        const nodeRepository = repositoryContext.getNodeRepository();
        const nodeAssets = await nodeRepository.getNodeAssets(nodeAddress);
        setAssets(nodeAssets);
      } catch (err) {
        console.error('Error loading assets:', err);
        setAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    },
    [repositoryContext],
  );

  // Select node and load all its data
  const selectNode = useCallback(
    async (nodeAddress: string) => {
      if (selectedNodeAddress === nodeAddress) return; // Already selected

      setLoading(true);
      setError(null);
      setSelectedNodeAddress(nodeAddress);

      try {
        // Load node data
        const node = await getNode(nodeAddress);
        setNodeData(node);

        // Load node-specific data in parallel
        await Promise.all([loadOrders(nodeAddress), loadAssets(nodeAddress)]);
      } catch (err) {
        console.error('Error selecting node:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [selectedNodeAddress, getNode, loadOrders, loadAssets],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedNodeAddress(null);
    setNodeData(null);
    setOrders([]);
    setAssets([]);
    setError(null);
  }, []);

  // Refresh node data
  const refreshNodeData = useCallback(async () => {
    if (!selectedNodeAddress) return;

    try {
      const node = await getNode(selectedNodeAddress);
      setNodeData(node);
    } catch (err) {
      console.error('Error refreshing node data:', err);
    }
  }, [selectedNodeAddress, getNode]);

  // Refresh orders
  const refreshOrders = useCallback(async () => {
    if (!selectedNodeAddress) return;
    await loadOrders(selectedNodeAddress);
  }, [selectedNodeAddress, loadOrders]);

  // Refresh assets
  const refreshAssets = useCallback(async () => {
    if (!selectedNodeAddress) return;
    await loadAssets(selectedNodeAddress);
  }, [selectedNodeAddress, loadAssets]);

  // Update node status
  const updateNodeStatus = useCallback(
    async (status: 'Active' | 'Inactive') => {
      if (!serviceContext || !selectedNodeAddress) {
        throw new Error('Service context not initialized or no node selected');
      }

      try {
        const nodeService = serviceContext.getNodeService();
        await nodeService.updateNodeStatus(selectedNodeAddress, status);

        // Update local node data
        if (nodeData) {
          setNodeData({ ...nodeData, status });
        }

        // Refresh the nodes collection
        await refreshNodes();
      } catch (err) {
        console.error('Error updating node status:', err);
        throw err;
      }
    },
    [serviceContext, selectedNodeAddress, nodeData, refreshNodes],
  );

  // Get node status
  const getNodeStatus = useCallback(async (): Promise<
    'Active' | 'Inactive'
  > => {
    if (!repositoryContext || !selectedNodeAddress) return 'Inactive';

    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      return await nodeRepository.getNodeStatus(selectedNodeAddress);
    } catch (err) {
      console.error('Error getting node status:', err);
      return 'Inactive';
    }
  }, [repositoryContext, selectedNodeAddress]);

  // Mint asset for selected node
  const mintAsset = useCallback(
    async (asset: Asset, amount: number, priceWei: bigint) => {
      if (!serviceContext || !selectedNodeAddress) {
        throw new Error('Service context not initialized or no node selected');
      }

      try {
        const nodeAssetService = serviceContext.getNodeAssetService();
        await nodeAssetService.mintAsset(
          selectedNodeAddress,
          asset,
          amount,
          priceWei,
        );

        // Refresh assets and nodes
        await Promise.all([refreshAssets(), refreshNodes()]);
      } catch (err) {
        console.error('Error minting asset:', err);
        throw err;
      }
    },
    [serviceContext, selectedNodeAddress, refreshAssets, refreshNodes],
  );

  // Update asset capacity
  const updateAssetCapacity = useCallback(
    async (assetToken: string, assetTokenId: string, newCapacity: number) => {
      if (!serviceContext || !selectedNodeAddress) {
        throw new Error('Service context not initialized or no node selected');
      }

      try {
        const nodeAssetService = serviceContext.getNodeAssetService();
        await nodeAssetService.updateAssetCapacity(
          selectedNodeAddress,
          assetToken,
          assetTokenId,
          newCapacity,
        );

        // Refresh assets and nodes
        await Promise.all([refreshAssets(), refreshNodes()]);
      } catch (err) {
        console.error('Error updating asset capacity:', err);
        throw err;
      }
    },
    [serviceContext, selectedNodeAddress, refreshAssets, refreshNodes],
  );

  // Update asset price
  const updateAssetPrice = useCallback(
    async (assetToken: string, assetTokenId: string, newPrice: bigint) => {
      if (!serviceContext || !selectedNodeAddress) {
        throw new Error('Service context not initialized or no node selected');
      }

      try {
        const nodeAssetService = serviceContext.getNodeAssetService();
        await nodeAssetService.updateAssetPrice(
          selectedNodeAddress,
          assetToken,
          assetTokenId,
          newPrice,
        );

        // Refresh assets and nodes
        await Promise.all([refreshAssets(), refreshNodes()]);
      } catch (err) {
        console.error('Error updating asset price:', err);
        throw err;
      }
    },
    [serviceContext, selectedNodeAddress, refreshAssets, refreshNodes],
  );

  // Get asset attributes
  const getAssetAttributes = useCallback(
    async (fileHash: string): Promise<TokenizedAssetAttribute[]> => {
      if (!repositoryContext) return [];

      try {
        const nodeRepository = repositoryContext.getNodeRepository();
        return await nodeRepository.getAssetAttributes(fileHash);
      } catch (err) {
        console.error('Error getting asset attributes:', err);
        return [];
      }
    },
    [repositoryContext],
  );

  const value: SelectedNodeContextType = {
    // Current selection
    selectedNodeAddress,
    nodeData,

    // Node-specific data
    orders,
    assets,

    // Loading states
    loading,
    ordersLoading,
    assetsLoading,
    error,

    // Selection operations
    selectNode,
    clearSelection,

    // Data refresh operations
    refreshNodeData,
    refreshOrders,
    refreshAssets,

    // Node operations
    updateNodeStatus,
    getNodeStatus,

    // Asset operations
    mintAsset,
    updateAssetCapacity,
    updateAssetPrice,
    getAssetAttributes,
  };

  return (
    <SelectedNodeContext.Provider value={value}>
      {children}
    </SelectedNodeContext.Provider>
  );
}

export function useSelectedNode() {
  const context = useContext(SelectedNodeContext);
  if (context === undefined) {
    throw new Error(
      'useSelectedNode must be used within a SelectedNodeProvider',
    );
  }
  return context;
}
