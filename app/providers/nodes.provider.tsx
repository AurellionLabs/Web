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
import { useMainProvider } from './main.provider';
import { useDiamond } from './diamond.provider';

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

  // Use Diamond system for node management
  const {
    initialized: diamondInitialized,
    getNode: getDiamondNode,
    getOwnedNodes: getDiamondOwnedNodes,
    registerNode: diamondRegisterNode,
  } = useDiamond();

  // Load nodes for the current wallet from Diamond
  const loadNodes = useCallback(
    async (walletAddress: string) => {
      if (!diamondInitialized) {
        console.log('[NodesProvider] loadNodes: Diamond not initialized');
        return;
      }

      console.log('[NodesProvider] loadNodes: Starting for', walletAddress);
      setLoading(true);
      setError(null);

      try {
        // Get node hashes owned by wallet from Diamond
        const ownedNodeHashes = await getDiamondOwnedNodes();
        console.log(
          '[NodesProvider] loadNodes: Got ownedNodeHashes:',
          ownedNodeHashes,
        );

        // Load full node data for each hash
        const nodeDataPromises = ownedNodeHashes.map((nodeHash) =>
          getDiamondNode(nodeHash),
        );

        const nodeDataResults = await Promise.all(nodeDataPromises);
        const validNodes = nodeDataResults.filter(
          (node): node is Node => node !== null,
        );

        console.log(
          '[NodesProvider] loadNodes: Valid Diamond nodes:',
          validNodes.length,
        );
        setNodes(validNodes);
        setIsRegisteredNode(validNodes.length > 0);
      } catch (err) {
        console.error('[NodesProvider] Error loading nodes from Diamond:', err);
        setError(err as Error);
      } finally {
        console.log(
          '[NodesProvider] loadNodes: Finished, setting loading=false',
        );
        setLoading(false);
      }
    },
    [diamondInitialized, getDiamondOwnedNodes, getDiamondNode],
  );

  // Get single node data from Diamond
  const getNode = useCallback(
    async (nodeHash: string): Promise<Node | null> => {
      if (!diamondInitialized) return null;

      try {
        return await getDiamondNode(nodeHash);
      } catch (err) {
        console.error('[NodesProvider] Error getting node from Diamond:', err);
        return null;
      }
    },
    [diamondInitialized, getDiamondNode],
  );

  // Register new node in Diamond
  const registerNode = useCallback(
    async (nodeData: Node) => {
      if (!diamondInitialized) throw new Error('Diamond not initialized');

      setLoading(true);
      setError(null);

      try {
        // Register node via Diamond
        const nodeHash = await diamondRegisterNode(nodeData);

        // Reload nodes after registration
        if (address) {
          await loadNodes(address);
        }

        // Navigate to the new node
        router.push(`/node/dashboard?nodeId=${nodeHash}`);
      } catch (err) {
        console.error(
          '[NodesProvider] Error registering node in Diamond:',
          err,
        );
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [diamondInitialized, diamondRegisterNode, address, loadNodes, router],
  );

  // Refresh nodes
  const refreshNodes = useCallback(async () => {
    if (address) {
      await loadNodes(address);
    }
  }, [address, loadNodes]);

  // Load nodes when wallet connects
  useEffect(() => {
    console.log('[NodesProvider] Effect check:', {
      connected,
      address: !!address,
      diamondInitialized,
    });
    if (connected && address && diamondInitialized) {
      console.log(
        '[NodesProvider] All conditions met, calling loadNodes from Diamond',
      );
      loadNodes(address);
    }
  }, [connected, address, diamondInitialized, loadNodes]);

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
