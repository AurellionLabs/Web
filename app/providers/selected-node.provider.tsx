'use client';

import React, {
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
  SupportingDocument,
} from '@/domain/node/node';
import { Asset } from '@/domain/shared';
import { ethers } from 'ethers';
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

  // Asset operations (for selected node)
  mintAsset: (
    asset: Asset,
    amount: number,
    priceInput: string,
  ) => Promise<void>;
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
  const INDEXER_POLL_INTERVAL_MS = 1500;
  const INDEXER_MAX_POLL_ATTEMPTS = 12;

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

  const { address, connectedWallet } = useWallet();
  const { connected } = useMainProvider();
  const { getNode, refreshNodes } = useNodes();
  const { getAssetByTokenId, supportedAssets } = usePlatform();

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
    async (nodeAddress: string, ownerAddress?: string) => {
      if (!nodeRepository) return;

      setOrdersLoading(true);
      try {
        const nodeOrders = await nodeRepository.getNodeOrders(
          nodeAddress,
          ownerAddress,
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
    [nodeRepository, getAssetByTokenId],
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
          loadOrders(nodeAddress, node.owner),
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

  useEffect(() => {
    if (
      !selectedNodeAddress ||
      orders.length === 0 ||
      supportedAssets.length === 0
    )
      return;
    if (!orders.some((order) => !order.asset)) return;

    let cancelled = false;

    (async () => {
      let resolvedAny = false;
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          if (order.asset) return order;
          try {
            const asset = await getAssetByTokenId(order.tokenId);
            if (asset) {
              resolvedAny = true;
              return { ...order, asset };
            }
          } catch (err) {
            console.warn(
              `Failed to re-enrich node order asset for tokenId ${order.tokenId}:`,
              err,
            );
          }
          return order;
        }),
      );

      if (!cancelled && resolvedAny) {
        setOrders(enrichedOrders);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedNodeAddress, orders, supportedAssets.length, getAssetByTokenId]);

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
    if (!selectedNodeAddress || !nodeData) return;
    await loadOrders(selectedNodeAddress, nodeData.owner);
  }, [selectedNodeAddress, nodeData, loadOrders]);

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

  const waitForIndexedAsset = useCallback(
    async (
      nodeAddress: string,
      expectedTokenId: string,
      expectedAmount: bigint,
      expectedTotalAmount: bigint,
    ): Promise<boolean> => {
      for (let attempt = 0; attempt < INDEXER_MAX_POLL_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, INDEXER_POLL_INTERVAL_MS),
          );
        }

        try {
          const latestAssets = await getDiamondNodeAssets(nodeAddress);
          setAssets(latestAssets);

          const totalAmount = latestAssets.reduce(
            (sum, item) => sum + BigInt(item.amount || '0'),
            0n,
          );

          if (!expectedTokenId) {
            if (totalAmount >= expectedTotalAmount) {
              return true;
            }
            continue;
          }

          const matchingAsset = latestAssets.find(
            (item) => item.id === expectedTokenId,
          );
          const matchingAmount = matchingAsset
            ? BigInt(matchingAsset.amount || '0')
            : 0n;

          if (matchingAmount >= expectedAmount) {
            return true;
          }
        } catch (err) {
          console.warn(
            `[SelectedNodeProvider] waitForIndexedAsset poll ${attempt + 1} failed:`,
            err,
          );
        }
      }

      return false;
    },
    [getDiamondNodeAssets],
  );

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

  /**
   * Get a signer-aligned Ausys contract.
   * If the RepositoryContext signer doesn't match the current wallet,
   * derive a fresh signer from the Privy wallet's Ethereum provider.
   */
  const getAlignedAusysContract = useCallback(async () => {
    const repoContext = RepositoryContext.getInstance();
    const ausys = repoContext.getAusysContract();
    if (!address) throw new Error('Wallet not connected');

    const signerAddr = await repoContext.getSignerAddress();
    if (signerAddr.toLowerCase() === address.toLowerCase()) {
      return ausys; // Already aligned
    }

    console.warn(
      `[NodeProvider] Signer mismatch: stored=${signerAddr}, wallet=${address}. Reconnecting...`,
    );

    if (connectedWallet) {
      const ethereumProvider = await connectedWallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const freshSigner = await provider.getSigner();
      await repoContext.updateSigner(freshSigner);
      return repoContext.getAusysContract();
    }

    console.warn(
      '[NodeProvider] No Privy wallet available for signer alignment',
    );
    return ausys;
  }, [address, connectedWallet]);

  // Node custody actions: packageSign and startJourney
  // Uses the AuSys contract on the Diamond for signing and journey management
  const packageSign = useCallback(
    async (journeyId: string) => {
      if (!diamondInitialized) throw new Error('Diamond not initialized');
      if (!selectedNodeAddress) throw new Error('No node selected');

      const ausys = await getAlignedAusysContract();

      const tx = await ausys.packageSign(journeyId);
      await tx.wait();

      // Refresh orders with indexer polling for eventual consistency
      if (selectedNodeAddress) {
        await new Promise((r) => setTimeout(r, 2000));
        await loadOrders(selectedNodeAddress, nodeData?.owner);
      }
    },
    [
      diamondInitialized,
      selectedNodeAddress,
      nodeData,
      loadOrders,
      getAlignedAusysContract,
    ],
  );

  const startJourney = useCallback(
    async (journeyId: string) => {
      if (!diamondInitialized) throw new Error('Diamond not initialized');
      if (!selectedNodeAddress) throw new Error('No node selected');

      const ausys = await getAlignedAusysContract();

      const tx = await ausys.handOn(journeyId);
      await tx.wait();

      // Refresh orders with indexer polling for eventual consistency
      await new Promise((r) => setTimeout(r, 3000));
      await loadOrders(selectedNodeAddress, nodeData?.owner);

      // Follow-up refresh in case indexer was slow
      setTimeout(() => {
        if (selectedNodeAddress) {
          loadOrders(selectedNodeAddress, nodeData?.owner);
        }
      }, 5000);
    },
    [
      diamondInitialized,
      selectedNodeAddress,
      nodeData,
      loadOrders,
      getAlignedAusysContract,
    ],
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

  // Mint asset for selected node via Diamond
  const mintAsset = useCallback(
    async (asset: Asset, amount: number, priceInput: string) => {
      if (!diamondInitialized || !selectedNodeAddress) {
        throw new Error('Diamond not initialized or no node selected');
      }

      try {
        const tokenIdFromAsset = String(asset.tokenId ?? asset.tokenID ?? '');
        const amountDelta = BigInt(amount);
        const currentAssetAmount = assets.find(
          (item) => item.id === tokenIdFromAsset,
        );
        const currentAmount = currentAssetAmount
          ? BigInt(currentAssetAmount.amount || '0')
          : 0n;
        const currentTotalAmount = assets.reduce(
          (sum, item) => sum + BigInt(item.amount || '0'),
          0n,
        );

        await diamondMintAsset(selectedNodeAddress, asset, amount, priceInput);

        // Refresh assets and nodes
        await Promise.all([refreshAssets(), refreshNodes()]);

        // Indexer/database can lag behind tx confirmation; poll until visible in UI data.
        const indexed = await waitForIndexedAsset(
          selectedNodeAddress,
          tokenIdFromAsset,
          currentAmount + amountDelta,
          currentTotalAmount + amountDelta,
        );

        if (!indexed) {
          console.warn(
            '[SelectedNodeProvider] Mint tx confirmed but indexer refresh timed out',
            {
              node: selectedNodeAddress,
              tokenId: tokenIdFromAsset,
              attempts: INDEXER_MAX_POLL_ATTEMPTS,
            },
          );
        }
      } catch (err) {
        console.error('Error minting asset:', err);
        throw err;
      }
    },
    [
      diamondInitialized,
      selectedNodeAddress,
      assets,
      refreshAssets,
      refreshNodes,
      diamondMintAsset,
      waitForIndexedAsset,
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
