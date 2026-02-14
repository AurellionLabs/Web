'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  Node,
  TokenizedAsset,
  TokenizedAssetAttribute,
  SupportingDocument,
} from '@/domain/node/node';
import { Asset } from '@/domain/shared';
import { useWallet } from '@/hooks/useWallet';
import { useMainProvider } from './main.provider';
import { useNodes } from './nodes.provider';
import { usePlatform } from './platform.provider';
import { useDiamond } from './diamond.provider';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { OrderWithAsset } from '@/app/types/shared';

type SelectedNodeContextType = {
  // Current selection
  selectedNodeAddress: string | null;
  nodeData: Node | null;

  // Node-specific data
  orders: OrderWithAsset[];
  assets: TokenizedAsset[];
  supportingDocuments: SupportingDocument[];

  // Loading states
  loading: boolean;
  ordersLoading: boolean;
  assetsLoading: boolean;
  documentsLoading: boolean;
  error: Error | null;

  // Selection operations
  selectNode: (nodeAddress: string) => Promise<void>;
  clearSelection: () => void;

  // Data refresh operations
  refreshNodeData: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  refreshDocuments: () => Promise<void>;

  // Node operations (for selected node)
  updateNodeStatus: (status: 'Active' | 'Inactive') => Promise<void>;
  getNodeStatus: () => Promise<'Active' | 'Inactive'>;

  // Asset operations (for selected node) - price set via CLOB orders
  mintAsset: (asset: Asset, amount: number) => Promise<void>;
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

  // Supporting document operations
  addSupportingDocument: (
    url: string,
    title: string,
    description: string,
    documentType: string,
  ) => Promise<boolean>; // Returns isFrozen
  removeSupportingDocument: (url: string) => Promise<void>;

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
  const [supportingDocuments, setSupportingDocuments] = useState<
    SupportingDocument[]
  >([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { address } = useWallet();
  const { connected } = useMainProvider();
  const { getNode, refreshNodes } = useNodes();
  const { getAssetByTokenId } = usePlatform();

  // Use Diamond infrastructure
  const {
    initialized: diamondInitialized,
    nodeRepository,
    nodeService,
    nodeAssetService,
    getNodeAssets: getDiamondNodeAssets,
    getAssetAttributes: getDiamondAssetAttributes,
    updateNodeStatus: diamondUpdateNodeStatus,
    mintAsset: diamondMintAsset,
    updateAssetCapacity: diamondUpdateAssetCapacity,
    updateAssetPrice: diamondUpdateAssetPrice,
    getSupportingDocuments: getDiamondSupportingDocuments,
    addSupportingDocument: diamondAddSupportingDocument,
    removeSupportingDocument: diamondRemoveSupportingDocument,
  } = useDiamond();

  // Load orders for selected node (from GraphQL indexer via Diamond repository)
  const loadOrders = useCallback(
    async (nodeAddress: string) => {
      if (!nodeRepository) return;

      setOrdersLoading(true);
      try {
        // Pass both the node hash and the wallet address (owner)
        // so the repository can match orders by logistics node field AND by wallet
        console.log('[SelectedNodeProvider] loadOrders called', {
          nodeAddress,
          walletAddress: address,
        });
        const nodeOrders = await nodeRepository.getNodeOrders(
          nodeAddress,
          address || undefined,
        );
        console.log(
          `[SelectedNodeProvider] Loaded ${nodeOrders.length} orders for node`,
        );

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
    [nodeRepository, getAssetByTokenId, address],
  );

  // Load assets for selected node
  const loadAssets = useCallback(
    async (nodeAddress: string) => {
      if (!nodeRepository) return;

      setAssetsLoading(true);
      try {
        const nodeAssets = await getDiamondNodeAssets(nodeAddress);
        setAssets(nodeAssets);
      } catch (err) {
        console.error('Error loading assets:', err);
        setAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    },
    [nodeRepository, getDiamondNodeAssets],
  );

  // Load supporting documents for selected node
  const loadDocuments = useCallback(
    async (nodeAddress: string) => {
      if (!nodeRepository) return;

      setDocumentsLoading(true);
      try {
        const docs = await getDiamondSupportingDocuments(nodeAddress);
        setSupportingDocuments(docs);
      } catch (err) {
        console.error('Error loading supporting documents:', err);
        setSupportingDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    },
    [nodeRepository, getDiamondSupportingDocuments],
  );

  // Select node and load all its data
  const selectNode = useCallback(
    async (nodeAddress: string) => {
      if (selectedNodeAddress === nodeAddress) return; // Already selected

      // Check if Diamond is initialized
      if (!diamondInitialized) {
        console.warn('Diamond not initialized, cannot select node');
        throw new Error(
          'Diamond not initialized. Please ensure wallet is connected.',
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
        await Promise.all([
          loadOrders(nodeAddress),
          loadAssets(nodeAddress),
          loadDocuments(nodeAddress),
        ]);
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
    [
      selectedNodeAddress,
      getNode,
      loadOrders,
      loadAssets,
      loadDocuments,
      diamondInitialized,
    ],
  );

  // Clear selection
  // Re-load orders when wallet address becomes available for an already-selected node.
  // This handles the race condition where selectNode runs before the wallet connects,
  // causing P2P queries to use the node hash instead of the wallet address.
  const prevAddressRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (
      selectedNodeAddress &&
      address &&
      prevAddressRef.current !== address &&
      nodeRepository
    ) {
      console.log(
        '[SelectedNodeProvider] Wallet address changed, reloading orders',
        { selectedNodeAddress, address },
      );
      loadOrders(selectedNodeAddress);
    }
    prevAddressRef.current = address ?? null;
  }, [address, selectedNodeAddress, nodeRepository, loadOrders]);

  const clearSelection = useCallback(() => {
    setSelectedNodeAddress(null);
    setNodeData(null);
    setOrders([]);
    setAssets([]);
    setSupportingDocuments([]);
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

  // Refresh supporting documents
  const refreshDocuments = useCallback(async () => {
    if (!selectedNodeAddress) return;
    await loadDocuments(selectedNodeAddress);
  }, [selectedNodeAddress, loadDocuments]);

  // Update node status via Diamond
  const updateNodeStatus = useCallback(
    async (status: 'Active' | 'Inactive') => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        await diamondUpdateNodeStatus(selectedNodeAddress, status);

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
    [
      diamondInitialized,
      selectedNodeAddress,
      nodeData,
      refreshNodes,
      diamondUpdateNodeStatus,
    ],
  );

  // Node custody actions: packageSign and startJourney
  // Uses the AuSys contract on the Diamond for signing and journey management
  const packageSign = useCallback(
    async (journeyId: string) => {
      if (!diamondInitialized) throw new Error('Diamond not initialized');
      if (!selectedNodeAddress) throw new Error('No node selected');

      const repoContext = RepositoryContext.getInstance();
      const ausys = repoContext.getAusysContract();

      console.log('[NodeProvider] packageSign', {
        journeyId,
        nodeAddress: selectedNodeAddress,
      });

      const tx = await ausys.packageSign(journeyId as any);
      await tx.wait();

      // Refresh orders to reflect updated signing state
      if (selectedNodeAddress) {
        await loadOrders(selectedNodeAddress);
      }
    },
    [diamondInitialized, selectedNodeAddress, loadOrders],
  );

  const startJourney = useCallback(
    async (journeyId: string) => {
      if (!diamondInitialized) throw new Error('Diamond not initialized');
      if (!selectedNodeAddress) throw new Error('No node selected');

      const repoContext = RepositoryContext.getInstance();
      const ausys = repoContext.getAusysContract();

      const tx = await ausys.handOn(journeyId as any);
      await tx.wait();

      // Refresh orders to reflect journey status change
      await loadOrders(selectedNodeAddress);
    },
    [diamondInitialized, selectedNodeAddress, loadOrders],
  );

  // Get node status
  const getNodeStatus = useCallback(async (): Promise<
    'Active' | 'Inactive'
  > => {
    if (!nodeRepository || !selectedNodeAddress) return 'Inactive';

    try {
      return await nodeRepository.getNodeStatus(selectedNodeAddress);
    } catch (err) {
      console.error('Error getting node status:', err);
      return 'Inactive';
    }
  }, [nodeRepository, selectedNodeAddress]);

  // Mint asset for selected node via Diamond (price set via CLOB orders)
  const mintAsset = useCallback(
    async (asset: Asset, amount: number) => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        await diamondMintAsset(selectedNodeAddress, asset, amount);

        // Refresh assets and nodes
        await Promise.all([refreshAssets(), refreshNodes()]);
      } catch (err) {
        console.error('Error minting asset:', err);
        throw err;
      }
    },
    [
      diamondInitialized,
      selectedNodeAddress,
      refreshAssets,
      refreshNodes,
      diamondMintAsset,
    ],
  );

  // Update asset capacity via Diamond
  const updateAssetCapacity = useCallback(
    async (assetToken: string, assetTokenId: string, newCapacity: number) => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        await diamondUpdateAssetCapacity(
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
    [
      diamondInitialized,
      selectedNodeAddress,
      refreshAssets,
      refreshNodes,
      diamondUpdateAssetCapacity,
    ],
  );

  // Update asset price via Diamond
  const updateAssetPrice = useCallback(
    async (assetToken: string, assetTokenId: string, newPrice: bigint) => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        await diamondUpdateAssetPrice(
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
    [
      diamondInitialized,
      selectedNodeAddress,
      refreshAssets,
      refreshNodes,
      diamondUpdateAssetPrice,
    ],
  );

  // Get asset attributes via Diamond
  const getAssetAttributes = useCallback(
    async (fileHash: string): Promise<TokenizedAssetAttribute[]> => {
      if (!nodeRepository) return [];

      try {
        return await getDiamondAssetAttributes(fileHash);
      } catch (err) {
        console.error('Error getting asset attributes:', err);
        return [];
      }
    },
    [nodeRepository, getDiamondAssetAttributes],
  );

  // Add supporting document to selected node
  const addSupportingDocument = useCallback(
    async (
      url: string,
      title: string,
      description: string,
      documentType: string,
    ): Promise<boolean> => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        const isFrozen = await diamondAddSupportingDocument(
          selectedNodeAddress,
          url,
          title,
          description,
          documentType,
        );

        // Refresh documents
        await refreshDocuments();

        return isFrozen;
      } catch (err) {
        console.error('Error adding supporting document:', err);
        throw err;
      }
    },
    [
      diamondInitialized,
      selectedNodeAddress,
      diamondAddSupportingDocument,
      refreshDocuments,
    ],
  );

  // Remove supporting document from selected node
  const removeSupportingDocument = useCallback(
    async (url: string): Promise<void> => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        await diamondRemoveSupportingDocument(selectedNodeAddress, url);

        // Refresh documents
        await refreshDocuments();
      } catch (err) {
        console.error('Error removing supporting document:', err);
        throw err;
      }
    },
    [
      diamondInitialized,
      selectedNodeAddress,
      diamondRemoveSupportingDocument,
      refreshDocuments,
    ],
  );

  const value: SelectedNodeContextType = {
    // Current selection
    selectedNodeAddress,
    nodeData,

    // Node-specific data
    orders,
    assets,
    supportingDocuments,

    // Loading states
    loading,
    ordersLoading,
    assetsLoading,
    documentsLoading,
    error,

    // Selection operations
    selectNode,
    clearSelection,

    // Data refresh operations
    refreshNodeData,
    refreshOrders,
    refreshAssets,
    refreshDocuments,

    // Node operations
    updateNodeStatus,
    getNodeStatus,

    // Asset operations
    mintAsset,
    updateAssetCapacity,
    updateAssetPrice,
    getAssetAttributes,

    // Supporting document operations
    addSupportingDocument,
    removeSupportingDocument,

    // Custody actions
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
