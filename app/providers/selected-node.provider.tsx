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
import { Asset } from '@/domain/shared';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useMainProvider } from './main.provider';
import { useNodes } from './nodes.provider';
import { usePlatform } from './platform.provider';
import { OrderWithAsset } from '@/app/types/shared';

type SelectedNodeContextType = {
  // Current selection
  selectedNodeAddress: string | null;
  nodeData: Node | null;

  // Node-specific data
  orders: OrderWithAsset[];
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
  // Custody actions for node (sender)
  packageSign: (journeyId: string) => Promise<void>;
  startJourney: (journeyId: string) => Promise<void>;
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
  const [orders, setOrders] = useState<OrderWithAsset[]>([]);
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { address } = useWallet();
  const { connected } = useMainProvider();
  const { getNode, refreshNodes } = useNodes();
  const { getAssetByTokenId } = usePlatform();

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

        // Fetch asset details for each order
        const ordersWithAssets: OrderWithAsset[] = await Promise.all(
          nodeOrders.map(async (order) => {
            try {
              const asset = await getAssetByTokenId(order.tokenId);
              return {
                ...order,
                asset,
              } as OrderWithAsset;
            } catch (err) {
              console.warn(
                `Failed to fetch asset for tokenId ${order.tokenId}:`,
                err,
              );
              return {
                ...order,
                asset: null,
              } as OrderWithAsset;
            }
          }),
        );

        setOrders(ordersWithAssets);
      } catch (err) {
        console.error('Error loading orders:', err);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    },
    [repositoryContext, getAssetByTokenId],
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

      // Check if repository context is available
      if (!repositoryContext) {
        console.warn('Repository context not initialized, cannot select node');
        throw new Error(
          'Repository context not initialized. Please ensure wallet is connected.',
        );
      }

      setLoading(true);
      setError(null);
      setSelectedNodeAddress(nodeAddress);

      try {
        // Load node data
        const node = await getNode(nodeAddress);
        if (!node) {
          throw new Error(`Node with address ${nodeAddress} not found`);
        }
        setNodeData(node);

        // Load node-specific data in parallel
        await Promise.all([loadOrders(nodeAddress), loadAssets(nodeAddress)]);
      } catch (err) {
        console.error('Error selecting node:', err);
        setError(err as Error);
        // Clear the selection on error
        setSelectedNodeAddress(null);
        setNodeData(null);
        throw err; // Re-throw to allow calling code to handle
      } finally {
        setLoading(false);
      }
    },
    [selectedNodeAddress, getNode, loadOrders, loadAssets, repositoryContext],
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

  // Node custody actions: packageSign and handOn
  const packageSign = useCallback(
    async (journeyId: string) => {
      if (!repositoryContext)
        throw new Error('Repository context not initialized');
      if (!selectedNodeAddress) throw new Error('No node selected');

      // Call nodeSign on the node contract (not packageSign on Ausys directly)
      // This ensures the call comes FROM the node address, not the user's wallet
      const nodeRepository = repositoryContext.getNodeRepository();
      const nodeContract = await (nodeRepository as any).getNodeContract(
        selectedNodeAddress,
      );
      const tx = await nodeContract.nodeSign(journeyId as any);
      await tx.wait();
    },
    [repositoryContext, selectedNodeAddress],
  );

  const startJourney = useCallback(
    async (journeyId: string) => {
      if (!repositoryContext)
        throw new Error('Repository context not initialized');
      if (!selectedNodeAddress) throw new Error('No node selected');

      // Call nodeHandOn on the node contract (not handOn on Ausys directly)
      // This ensures the call comes FROM the node address
      const nodeRepository = repositoryContext.getNodeRepository();
      const nodeContract = await (nodeRepository as any).getNodeContract(
        selectedNodeAddress,
      );

      // First, ensure Ausys has approval to transfer this node's tokens
      // This is required for handOn to transfer tokens from node to Ausys
      try {
        console.log(
          '[startJourney] Approving Ausys to transfer node tokens...',
        );
        await (nodeRepository as any).approveAusysForTokens(
          selectedNodeAddress,
        );
        console.log('[startJourney] Approval granted');
      } catch (approvalError) {
        // If approval fails, it might already be approved, continue anyway
        console.warn(
          '[startJourney] Approval step failed (might already be approved):',
          approvalError,
        );
      }

      const tx = await nodeContract.nodeHandOn(journeyId as any);
      await tx.wait();
    },
    [repositoryContext, selectedNodeAddress],
  );

  // Removed getOrderJourneyIds - journeyIds now come from subgraph repository

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
    packageSign,
    startJourney,
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
