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
import { Node } from '@/domain/node/node';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useMainProvider } from './main.provider';

type NodesContextType = {
  // Collection state
  nodes: Node[];
  loading: boolean;
  error: Error | null;
  isRegisteredNode: boolean;

  // Collection operations
  loadNodes: (walletAddress: string) => Promise<void>;
  registerNode: (nodeData: Node) => Promise<void>;
  refreshNodes: () => Promise<void>;
  getNode: (nodeAddress: string) => Promise<Node | null>;
};

const NodesContext = createContext<NodesContextType | undefined>(undefined);

export function NodesProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRegisteredNode, setIsRegisteredNode] = useState(false);

  const { address } = useWallet();
  const { connected } = useMainProvider();
  const router = useRouter();

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

  // Load nodes for the current wallet
  const loadNodes = useCallback(
    async (walletAddress: string) => {
      if (!repositoryContext) return;

      setLoading(true);
      setError(null);

      try {
        const nodeRepository = repositoryContext.getNodeRepository();
        const ownedNodes = await nodeRepository.getOwnedNodes(walletAddress);

        const nodeDataPromises = ownedNodes.map((nodeAddress) =>
          nodeRepository.getNode(nodeAddress),
        );

        const nodeDataResults = await Promise.all(nodeDataPromises);
        const validNodes = nodeDataResults.filter(
          (node): node is Node => node !== null,
        );

        setNodes(validNodes);
        setIsRegisteredNode(validNodes.length > 0);
      } catch (err) {
        console.error('Error loading nodes:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [repositoryContext],
  );

  // Get single node data
  const getNode = useCallback(
    async (nodeAddress: string): Promise<Node | null> => {
      if (!repositoryContext) return null;

      try {
        const nodeRepository = repositoryContext.getNodeRepository();
        return await nodeRepository.getNode(nodeAddress);
      } catch (err) {
        console.error('Error getting node:', err);
        return null;
      }
    },
    [repositoryContext],
  );

  // Register new node
  const registerNode = useCallback(
    async (nodeData: Node) => {
      if (!serviceContext) throw new Error('Service context not initialized');

      setLoading(true);
      setError(null);

      try {
        const nodeService = serviceContext.getNodeService();
        const nodeAddress = await nodeService.registerNode(nodeData);

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
    },
    [serviceContext, address, loadNodes, router],
  );

  // Refresh nodes
  const refreshNodes = useCallback(async () => {
    if (address) {
      await loadNodes(address);
    }
  }, [address, loadNodes]);

  // Load nodes when wallet connects
  useEffect(() => {
    if (connected && address && repositoryContext) {
      loadNodes(address);
    }
  }, [connected, address, repositoryContext, loadNodes]);

  const value: NodesContextType = {
    // State
    nodes,
    loading,
    error,
    isRegisteredNode,

    // Operations
    loadNodes,
    getNode,
    registerNode,
    refreshNodes,
  };

  return (
    <NodesContext.Provider value={value}>{children}</NodesContext.Provider>
  );
}

export function useNodes() {
  const context = useContext(NodesContext);
  if (context === undefined) {
    throw new Error('useNodes must be used within a NodesProvider');
  }
  return context;
}
