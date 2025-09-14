'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Node, TokenizedAsset, TokenizedAssetAttribute } from '@/domain/node';
import { Asset } from '@/domain/shared';
import { Order } from '@/domain/orders';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useMainProvider } from './main.provider';
import { usePlatform } from '@/app/providers/platform.provider';

export type OrderUI = Omit<Order, 'id'> & {
  asset: Asset;
};

type NodeContextType = {
  // State
  orders: OrderUI[];
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
  getNodeOrders: (nodeAddress: string) => Promise<OrderUI[]>;
  selectNode: (nodeAddress: string) => void;
  refreshOrders: (nodeId: string) => Promise<void>;

  // Asset operations
  getNodeAssets: (nodeAddress: string) => Promise<TokenizedAsset[]>;
  getAllNodeAssets: () => Promise<TokenizedAsset[]>;
  getAssetAttributes: (fileHash: string) => Promise<TokenizedAssetAttribute[]>;
  mintAsset: (
    nodeAddress: string,
    asset: Asset,
    amount: number,
    priceWei: number,
  ) => Promise<void>;
  updateAssetCapacity: (
    nodeAddress: string,
    assetId: number,
    newCapacity: number,
    supportedAssets: number[],
    capacities: number[],
    assetPrices: number[],
  ) => Promise<void>;
  updateAssetPrice: (
    nodeAddress: string,
    assetId: number,
    newPrice: number,
    supportedAssets: number[],
    assetPrices: number[],
  ) => Promise<void>;
  updateSupportedAssets: (
    nodeAddress: string,
    quantities: number[],
    assets: number[],
    prices: number[],
  ) => Promise<void>;

  // Utility
  refreshNodes: () => Promise<void>;
};

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export const NodeProvider = ({ children }: { children: ReactNode }) => {
  console.log('[NodeProvider] Provider rendering...');
  const [orders, setOrders] = useState<OrderUI[]>([]);
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
  const searchParams = useSearchParams();
  const { address } = useWallet();
  const { currentUserRole } = useMainProvider();
  const { getAssetByTokenId } = usePlatform();
  console.log(`[NodeProvider] Address from useWallet on render: ${address}`);

  const nodeRepository = RepositoryContext.getInstance().getNodeRepository();
  const orderRepository = RepositoryContext.getInstance().getOrderRepository();
  const serviceContext = ServiceContext.getInstance(
    RepositoryContext.getInstance(),
  );
  const nodeAssetService = serviceContext.getNodeAssetService();

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
          console.log(
            '[NodeProvider] Fetched node data (pre-filter):',
            loadedNodes,
          );

          // Filter out any null results before setting state
          const validNodes = loadedNodes.filter(
            (node): node is Node => node !== null,
          );
          console.log('[NodeProvider] Filtered valid nodes:', validNodes);

          setNodes(validNodes); // Set state with only valid Node objects
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
        // Update the node in our local list state
        setNodes((currentNodes) =>
          currentNodes.map((node) =>
            node.address === nodeAddress ? { ...node, status } : node,
          ),
        );
        // Also update the currently viewed node data if it matches
        if (currentNodeData?.address === nodeAddress) {
          setCurrentNodeData(
            (prevData) => (prevData ? { ...prevData, status } : null), // Ensure prevData is not null
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to update node status'),
        );
        // Re-throw the error so the UI layer can potentially handle it (e.g., show toast)
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // Added currentNodeData and setCurrentNodeData to dependencies
    [nodeRepository, currentNodeData, setCurrentNodeData],
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

  // Get asset attributes by tokenId via Pinata keyvalues
  const getAssetAttributes = useCallback(
    async (tokenId: string): Promise<TokenizedAssetAttribute[]> => {
      console.log('in function getAssetAttributes tokenId', tokenId);
      try {
        if (!tokenId) return [];
        const platformRepository =
          RepositoryContext.getInstance().getPlatformRepository();
        console.log('calling getAssetByTokenId from front end');
        const assetDef = await platformRepository.getAssetByTokenId(tokenId);
        if (!assetDef || !Array.isArray(assetDef.attributes)) return [];
        return assetDef.attributes.map(
          (attr: { name: string; values: string[]; description: string }) => ({
            name: attr.name,
            value:
              Array.isArray(attr.values) && attr.values.length > 0
                ? attr.values[0]
                : '',
            description: attr.description ?? '',
          }),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to get asset attributes'),
        );
        return [];
      }
    },
    [],
  );

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
    async (nodeAddress: string): Promise<OrderUI[]> => {
      try {
        const contractOrders = await orderRepository.getNodeOrders(nodeAddress);
        const orderUIs: OrderUI[] = [];

        for (const order of contractOrders) {
          const asset = await getAssetByTokenId(order.tokenId.toString());
          console.log('found asset', asset);
          if (asset) {
            const { id, ...orderWithoutId } = order;
            console.log('orderWithoutId', orderWithoutId);
            const orderUI: OrderUI = {
              ...orderWithoutId,
              asset,
            };
            console.log('orderUI', orderUI);
            orderUIs.push(orderUI);
          }
        }

        console.log('[NodeProvider] Contract orders>>>>>:', contractOrders);
        console.log('[NodeProvider] OrderUI objects>>>>>:', orderUIs);
        return orderUIs;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to get node orders'),
        );
        return [];
      }
    },
    [orderRepository, getAssetByTokenId],
  );

  const selectNode = useCallback(
    async (nodeAddress: string) => {
      try {
        console.log(`[NodeProvider] Selecting node: ${nodeAddress}`);
        const node = await getNode(nodeAddress);
        if (!node) return;

        setSelectedNode(nodeAddress);
        setCurrentNodeData(node);

        // Update orders for the selected node
        const nodeOrders = await getNodeOrders(nodeAddress);
        console.log('[NodeProvider] Node orders>>>>>:', nodeOrders);
        setOrders(nodeOrders);

        // Update node status
        const status = await getNodeStatus(nodeAddress);
        setIsRegisteredNode(!!status);
        setNodeStatus(status);
      } catch (error) {
        console.error('Error selecting node:', error);
      }
    },
    [getNode, getNodeOrders, getNodeStatus],
  );

  const refreshOrders = useCallback(
    async (nodeId: string) => {
      console.log(`[NodeProvider] refreshOrders called for nodeId: ${nodeId}`);
      setLoading(true);
      setError(null);
      try {
        // Use the existing getNodeOrders function from this provider
        const fetchedOrders = await getNodeOrders(nodeId);
        setOrders(fetchedOrders);
        console.log(
          `[NodeProvider] Orders fetched for node ${nodeId}:`,
          fetchedOrders,
        );
      } catch (err) {
        console.error(
          `[NodeProvider] Error fetching orders for node ${nodeId}:`,
          err,
        );
        setError(
          err instanceof Error
            ? err
            : new Error(`Failed to fetch orders for node ${nodeId}`),
        );
        setOrders([]); // Clear orders on error
      } finally {
        setLoading(false);
      }
    },
    // Add getNodeOrders to dependencies if it's not already implicitly included
    // by being defined in the same scope, or if it relies on external state.
    // For simplicity and safety, let's add it.
    [getNodeOrders], // <--- Use getNodeOrders from provider context
  );

  // Effect to load nodes based on address AND role
  useEffect(() => {
    console.log(
      `[NodeProvider] Address/Role Effect Triggered. Role: ${currentUserRole}, Address: ${address}`,
    );
    // Only load nodes if address is present AND role is node
    if (address && currentUserRole === 'node') {
      console.log(
        '[NodeProvider] Address/Role Effect - Address and Role valid, calling loadNodes().',
      );
      loadNodes(address);
    } else {
      // Clear node state if address disconnects OR role is not node
      console.log(
        '[NodeProvider] Address/Role Effect - Clearing Node State (No address or role !== node).',
      );
      setNodes([]);
      setSelectedNode(null);
      setCurrentNodeData(null);
      // setOrders([]);
      setCurrentWalletAddress(null);
      // Don't set loading to false here, as loadNodes wasn't called
    }
    // Add currentUserRole to dependency array
  }, [address, currentUserRole, loadNodes]);

  // Effect to select node based on URL parameter OR clear selection if param removed
  useEffect(() => {
    const nodeAddressFromUrl = searchParams.get('node');
    console.log(
      `[NodeProvider] URL Param Effect - Param: ${nodeAddressFromUrl}, Nodes Loaded: ${nodes.length}, Current Selected: ${selectedNode}`,
    );

    if (nodeAddressFromUrl) {
      // Case 1: URL has a node parameter
      if (
        nodes.length > 0 && // Check if nodes are loaded
        nodeAddressFromUrl !== selectedNode // Check if not already selected
      ) {
        // Check if the node from URL is actually owned by the user
        const nodeExistsInList = nodes.some(
          (node) => node.address === nodeAddressFromUrl,
        );

        if (nodeExistsInList) {
          console.log(
            `[NodeProvider] URL Param Effect - Selecting node from URL: ${nodeAddressFromUrl}`,
          );
          selectNode(nodeAddressFromUrl);
        } else {
          console.warn(
            `[NodeProvider] URL Param Effect - Node ${nodeAddressFromUrl} not found in user's owned nodes. Clearing selection.`,
          );
          // Clear selection if URL node isn't valid or owned
          setSelectedNode(null);
          setCurrentNodeData(null);
          // setOrders([]); // Clear orders too
        }
      }
    } else {
      // Case 2: URL does NOT have a node parameter
      if (selectedNode !== null) {
        console.log(
          '[NodeProvider] URL Param Effect - No node in URL, clearing selection.',
        );
        setSelectedNode(null);
        setCurrentNodeData(null);
        // setOrders([]); // Clear orders too
      }
    }
    // Ensure all dependencies used in the logic are included
  }, [
    nodes,
    searchParams,
    selectNode,
    selectedNode,
    setSelectedNode,
    setCurrentNodeData,
  ]);

  // Asset service methods

  const mintAsset = useCallback(
    async (
      nodeAddress: string,
      asset: Asset,
      amount: number,
      priceWei: number,
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await nodeAssetService.mintAsset(nodeAddress, asset, amount, priceWei);
        // Refresh node assets after minting
        if (selectedNode === nodeAddress) {
          const assets = await getNodeAssets(nodeAddress);
          // You might want to add a state for node assets and update it here
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to mint asset'),
        );
      } finally {
        setLoading(false);
      }
    },
    [nodeAssetService, selectedNode, getNodeAssets],
  );

  const updateAssetCapacity = useCallback(
    async (
      nodeAddress: string,
      assetId: number,
      newCapacity: number,
      supportedAssets: number[],
      capacities: number[],
      assetPrices: number[],
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await nodeAssetService.updateAssetCapacity(
          nodeAddress,
          assetId,
          newCapacity,
          supportedAssets,
          capacities,
          assetPrices,
        );
        // Refresh node data after updating capacity
        if (selectedNode === nodeAddress) {
          const node = await getNode(nodeAddress);
          if (node) {
            setCurrentNodeData(node);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to update asset capacity'),
        );
      } finally {
        setLoading(false);
      }
    },
    [nodeAssetService, selectedNode, getNode],
  );

  const updateAssetPrice = useCallback(
    async (
      nodeAddress: string,
      assetId: number,
      newPrice: number,
      supportedAssets: number[],
      assetPrices: number[],
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await nodeAssetService.updateAssetPrice(
          nodeAddress,
          assetId,
          newPrice,
          supportedAssets,
          assetPrices,
        );
        // Refresh node data after updating price
        if (selectedNode === nodeAddress) {
          const node = await getNode(nodeAddress);
          if (node) {
            setCurrentNodeData(node);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to update asset price'),
        );
      } finally {
        setLoading(false);
      }
    },
    [nodeAssetService, selectedNode, getNode],
  );

  const updateSupportedAssets = useCallback(
    async (
      nodeAddress: string,
      quantities: number[],
      assets: number[],
      prices: number[],
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await nodeAssetService.updateSupportedAssets(
          nodeAddress,
          quantities,
          assets,
          prices,
        );
        // Refresh node data after updating supported assets
        if (selectedNode === nodeAddress) {
          const node = await getNode(nodeAddress);
          if (node) {
            setCurrentNodeData(node);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to update supported assets'),
        );
      } finally {
        setLoading(false);
      }
    },
    [nodeAssetService, selectedNode, getNode],
  );

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
    getAssetAttributes,
    mintAsset,
    updateAssetCapacity,
    updateAssetPrice,
    updateSupportedAssets,

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
