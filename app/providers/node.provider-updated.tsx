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
import { Node, TokenizedAsset, TokenizedAssetAttribute, NodeAsset } from '@/domain/node/node';
import { Asset } from '@/domain/platform';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useMainProvider } from './main.provider';

// Updated Order type with buyer/seller instead of customer
export type Order = {
  id: string;
  buyer: string;        // Changed from 'customer'
  seller: string;       // Added explicit seller
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
  refreshNodes: () => Promise<void>;

  // Asset operations - UPDATED signatures
  mintAsset: (
    nodeAddress: string,
    asset: Asset,
    amount: number,
    priceWei: bigint,
  ) => Promise<void>;
  getNodeAssets: (nodeAddress: string) => Promise<TokenizedAsset[]>;
  updateAssetCapacity: (
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ) => Promise<void>;
  updateAssetPrice: (
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ) => Promise<void>;
  getAssetAttributes: (fileHash: string) => Promise<TokenizedAssetAttribute[]>;
};

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export function NodeProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRegisteredNode, setIsRegisteredNode] = useState(false);
  const [nodeStatus, setNodeStatus] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentNodeData, setCurrentNodeData] = useState<Node | null>(null);

  const { address } = useWallet();
  const { connected } = useMainProvider();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize contexts
  const [repositoryContext, setRepositoryContext] = useState<RepositoryContext | null>(null);
  const [serviceContext, setServiceContext] = useState<ServiceContext | null>(null);

  useEffect(() => {
    if (connected && address) {
      const repoContext = RepositoryContext.getInstance();
      const servContext = ServiceContext.getInstance();
      setRepositoryContext(repoContext);
      setServiceContext(servContext);
    }
  }, [connected, address]);

  // Load nodes for the current wallet
  const loadNodes = useCallback(async (walletAddress: string) => {
    if (!repositoryContext) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      const ownedNodes = await nodeRepository.getOwnedNodes(walletAddress);
      
      const nodeDataPromises = ownedNodes.map(nodeAddress => 
        nodeRepository.getNode(nodeAddress)
      );
      
      const nodeDataResults = await Promise.all(nodeDataPromises);
      const validNodes = nodeDataResults.filter((node): node is Node => node !== null);
      
      setNodes(validNodes);
      setIsRegisteredNode(validNodes.length > 0);
      
      // Auto-select first node or from URL params
      const nodeIdFromUrl = searchParams.get('nodeId');
      if (nodeIdFromUrl && validNodes.some(n => n.address === nodeIdFromUrl)) {
        selectNode(nodeIdFromUrl);
      } else if (validNodes.length > 0 && !selectedNode) {
        selectNode(validNodes[0].address);
      }
    } catch (err) {
      console.error('Error loading nodes:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [repositoryContext, searchParams, selectedNode]);

  // Get single node data
  const getNode = useCallback(async (nodeAddress: string): Promise<Node | null> => {
    if (!repositoryContext) return null;
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      return await nodeRepository.getNode(nodeAddress);
    } catch (err) {
      console.error('Error getting node:', err);
      return null;
    }
  }, [repositoryContext]);

  // Register new node
  const registerNode = useCallback(async (nodeData: Node) => {
    if (!repositoryContext) throw new Error('Repository context not initialized');
    
    setLoading(true);
    setError(null);
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      const nodeAddress = await nodeRepository.registerNode(nodeData);
      
      // Reload nodes after registration
      if (address) {
        await loadNodes(address);
      }
      
      // Navigate to the new node
      router.push(`/node/dashboard?nodeId=${nodeAddress}`);
    } catch (err) {
      console.error('Error registering node:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [repositoryContext, address, loadNodes, router]);

  // Update node status
  const updateNodeStatus = useCallback(async (
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ) => {
    if (!repositoryContext) throw new Error('Repository context not initialized');
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      await nodeRepository.updateNodeStatus(nodeAddress, status);
      
      // Update local state
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.address === nodeAddress ? { ...node, status } : node
        )
      );
      
      if (currentNodeData?.address === nodeAddress) {
        setCurrentNodeData(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error('Error updating node status:', err);
      throw err;
    }
  }, [repositoryContext, currentNodeData]);

  // Get node status
  const getNodeStatus = useCallback(async (nodeAddress: string): Promise<'Active' | 'Inactive'> => {
    if (!repositoryContext) return 'Inactive';
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      return await nodeRepository.getNodeStatus(nodeAddress);
    } catch (err) {
      console.error('Error getting node status:', err);
      return 'Inactive';
    }
  }, [repositoryContext]);

  // Get node orders
  const getNodeOrders = useCallback(async (nodeAddress: string): Promise<Order[]> => {
    if (!repositoryContext) return [];
    
    try {
      const orderRepository = repositoryContext.getOrderRepository();
      const orders = await orderRepository.getNodeOrders(nodeAddress);
      
      // Convert to frontend Order format
      return orders.map(order => ({
        id: order.id,
        buyer: order.buyer,
        seller: order.seller,
        asset: order.tokenId.toString(),
        quantity: Number(order.tokenQuantity),
        value: order.price.toString(),
        status: order.currentStatus === 0n ? 'pending' : 
                order.currentStatus === 1n ? 'active' :
                order.currentStatus === 2n ? 'completed' : 'cancelled'
      }));
    } catch (err) {
      console.error('Error getting node orders:', err);
      return [];
    }
  }, [repositoryContext]);

  // Select node
  const selectNode = useCallback((nodeAddress: string) => {
    setSelectedNode(nodeAddress);
    
    const node = nodes.find(n => n.address === nodeAddress);
    setCurrentNodeData(node || null);
    
    if (node) {
      setNodeStatus(node.status);
    }
  }, [nodes]);

  // Refresh nodes
  const refreshNodes = useCallback(async () => {
    if (address) {
      await loadNodes(address);
    }
  }, [address, loadNodes]);

  // UPDATED: Mint asset with new signature
  const mintAsset = useCallback(async (
    nodeAddress: string,
    asset: Asset,
    amount: number,
    priceWei: bigint,
  ) => {
    if (!serviceContext) throw new Error('Service context not initialized');
    
    try {
      const nodeAssetService = serviceContext.getNodeAssetService();
      await nodeAssetService.mintAsset(nodeAddress, asset, amount, priceWei);
      
      // Refresh current node data
      if (address) {
        await loadNodes(address);
      }
    } catch (err) {
      console.error('Error minting asset:', err);
      throw err;
    }
  }, [serviceContext, address, loadNodes]);

  // Get node assets
  const getNodeAssets = useCallback(async (nodeAddress: string): Promise<TokenizedAsset[]> => {
    if (!repositoryContext) return [];
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      return await nodeRepository.getNodeAssets(nodeAddress);
    } catch (err) {
      console.error('Error getting node assets:', err);
      return [];
    }
  }, [repositoryContext]);

  // UPDATED: Update asset capacity with new signature
  const updateAssetCapacity = useCallback(async (
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ) => {
    if (!serviceContext) throw new Error('Service context not initialized');
    
    try {
      const nodeAssetService = serviceContext.getNodeAssetService();
      await nodeAssetService.updateAssetCapacity(nodeAddress, assetToken, assetTokenId, newCapacity);
      
      // Refresh current node data
      if (address) {
        await loadNodes(address);
      }
    } catch (err) {
      console.error('Error updating asset capacity:', err);
      throw err;
    }
  }, [serviceContext, address, loadNodes]);

  // UPDATED: Update asset price with new signature
  const updateAssetPrice = useCallback(async (
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ) => {
    if (!serviceContext) throw new Error('Service context not initialized');
    
    try {
      const nodeAssetService = serviceContext.getNodeAssetService();
      await nodeAssetService.updateAssetPrice(nodeAddress, assetToken, assetTokenId, newPrice);
      
      // Refresh current node data
      if (address) {
        await loadNodes(address);
      }
    } catch (err) {
      console.error('Error updating asset price:', err);
      throw err;
    }
  }, [serviceContext, address, loadNodes]);

  // Get asset attributes
  const getAssetAttributes = useCallback(async (fileHash: string): Promise<TokenizedAssetAttribute[]> => {
    if (!repositoryContext) return [];
    
    try {
      const nodeRepository = repositoryContext.getNodeRepository();
      return await nodeRepository.getAssetAttributes(fileHash);
    } catch (err) {
      console.error('Error getting asset attributes:', err);
      return [];
    }
  }, [repositoryContext]);

  // Load nodes when wallet connects
  useEffect(() => {
    if (connected && address && repositoryContext) {
      loadNodes(address);
    }
  }, [connected, address, repositoryContext, loadNodes]);

  const value: NodeContextType = {
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
    refreshNodes,

    // Asset operations
    mintAsset,
    getNodeAssets,
    updateAssetCapacity,
    updateAssetPrice,
    getAssetAttributes,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
}

export function useNode() {
  const context = useContext(NodeContext);
  if (context === undefined) {
    throw new Error('useNode must be used within a NodeProvider');
  }
  return context;
}














