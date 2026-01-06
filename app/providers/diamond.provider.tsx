'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useMainProvider } from './main.provider';
import {
  DiamondContext,
  getDiamondContext,
  DiamondNodeRepository,
  DiamondNodeService,
  DiamondNodeAssetService,
} from '@/infrastructure/diamond';
import {
  Node,
  NodeRepository,
  TokenizedAsset,
  TokenizedAssetAttribute,
  NodeAsset,
} from '@/domain/node/node';
import { Asset } from '@/domain/shared';
import { BrowserProvider } from 'ethers';

interface DiamondContextType {
  // Context state
  initialized: boolean;
  loading: boolean;
  error: Error | null;

  // Services
  nodeRepository: NodeRepository | null;
  nodeService: DiamondNodeService | null;
  nodeAssetService: DiamondNodeAssetService | null;

  // Node operations
  registerNode: (nodeData: Node) => Promise<string>;
  getNode: (nodeHash: string) => Promise<Node | null>;
  getOwnedNodes: () => Promise<string[]>;
  updateNodeStatus: (
    nodeHash: string,
    status: 'Active' | 'Inactive',
  ) => Promise<void>;

  // Asset operations (price set via CLOB orders, not during minting)
  mintAsset: (nodeHash: string, asset: Asset, amount: number) => Promise<void>;
  updateAssetCapacity: (
    nodeHash: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ) => Promise<void>;
  updateAssetPrice: (
    nodeHash: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ) => Promise<void>;
  getNodeAssets: (nodeHash: string) => Promise<TokenizedAsset[]>;
  getAssetAttributes: (fileHash: string) => Promise<TokenizedAssetAttribute[]>;
}

const DiamondProviderContext = createContext<DiamondContextType | undefined>(
  undefined,
);

export function DiamondProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [diamondContext, setDiamondContext] = useState<DiamondContext | null>(
    null,
  );
  const [nodeRepository, setNodeRepository] =
    useState<DiamondNodeRepository | null>(null);
  const [nodeService, setNodeService] = useState<DiamondNodeService | null>(
    null,
  );
  const [nodeAssetService, setNodeAssetService] =
    useState<DiamondNodeAssetService | null>(null);

  const { connectedWallet, address, isConnected } = useWallet();
  const { connected: mainConnected } = useMainProvider();

  // Initialize Diamond context when wallet connects
  useEffect(() => {
    async function initializeDiamond() {
      if (!isConnected || !connectedWallet || !address) {
        // Cleanup on disconnect
        setDiamondContext(null);
        setNodeRepository(null);
        setNodeService(null);
        setNodeAssetService(null);
        setInitialized(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const context = getDiamondContext();

        // Initialize with browser provider from connected wallet
        const ethereumProvider = await connectedWallet.getEthereumProvider();
        const browserProvider = new BrowserProvider(ethereumProvider);
        await context.initialize(browserProvider);

        // Create services
        const repository = new DiamondNodeRepository(context);
        const service = new DiamondNodeService(context);
        const assetService = new DiamondNodeAssetService(context);

        setDiamondContext(context);
        setNodeRepository(repository);
        setNodeService(service);
        setNodeAssetService(assetService);
        setInitialized(true);

        console.log('[DiamondProvider] Initialized successfully');
      } catch (err) {
        console.error('[DiamondProvider] Initialization error:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to initialize Diamond'),
        );
      } finally {
        setLoading(false);
      }
    }

    initializeDiamond();
  }, [isConnected, connectedWallet, address]);

  // Node operations
  const registerNode = useCallback(
    async (nodeData: Node): Promise<string> => {
      if (!nodeService) {
        throw new Error('Diamond not initialized');
      }
      return nodeService.registerNode(nodeData);
    },
    [nodeService],
  );

  const getNode = useCallback(
    async (nodeHash: string): Promise<Node | null> => {
      if (!nodeRepository) {
        throw new Error('Diamond not initialized');
      }
      return nodeRepository.getNode(nodeHash);
    },
    [nodeRepository],
  );

  const getOwnedNodes = useCallback(async (): Promise<string[]> => {
    if (!nodeRepository || !address) {
      return [];
    }
    return nodeRepository.getOwnedNodes(address);
  }, [nodeRepository, address]);

  const updateNodeStatus = useCallback(
    async (nodeHash: string, status: 'Active' | 'Inactive'): Promise<void> => {
      if (!nodeService) {
        throw new Error('Diamond not initialized');
      }
      await nodeService.updateNodeStatus(nodeHash, status);
    },
    [nodeService],
  );

  // Asset operations (price set via CLOB orders, not during minting)
  const mintAsset = useCallback(
    async (nodeHash: string, asset: Asset, amount: number): Promise<void> => {
      if (!nodeAssetService) {
        throw new Error('Diamond not initialized');
      }
      await nodeAssetService.mintAsset(nodeHash, asset, amount);
    },
    [nodeAssetService],
  );

  const updateAssetCapacity = useCallback(
    async (
      nodeHash: string,
      assetToken: string,
      assetTokenId: string,
      newCapacity: number,
    ): Promise<void> => {
      if (!nodeAssetService) {
        throw new Error('Diamond not initialized');
      }
      await nodeAssetService.updateAssetCapacity(
        nodeHash,
        assetToken,
        assetTokenId,
        newCapacity,
      );
    },
    [nodeAssetService],
  );

  const updateAssetPrice = useCallback(
    async (
      nodeHash: string,
      assetToken: string,
      assetTokenId: string,
      newPrice: bigint,
    ): Promise<void> => {
      if (!nodeAssetService) {
        throw new Error('Diamond not initialized');
      }
      await nodeAssetService.updateAssetPrice(
        nodeHash,
        assetToken,
        assetTokenId,
        newPrice,
      );
    },
    [nodeAssetService],
  );

  const getNodeAssets = useCallback(
    async (nodeHash: string): Promise<TokenizedAsset[]> => {
      if (!nodeRepository) {
        return [];
      }
      return nodeRepository.getNodeAssets(nodeHash);
    },
    [nodeRepository],
  );

  const getAssetAttributes = useCallback(
    async (fileHash: string): Promise<TokenizedAssetAttribute[]> => {
      if (!nodeRepository) {
        return [];
      }
      return nodeRepository.getAssetAttributes(fileHash);
    },
    [nodeRepository],
  );

  const value: DiamondContextType = {
    initialized,
    loading,
    error,
    nodeRepository,
    nodeService,
    nodeAssetService,
    registerNode,
    getNode,
    getOwnedNodes,
    updateNodeStatus,
    mintAsset,
    updateAssetCapacity,
    updateAssetPrice,
    getNodeAssets,
    getAssetAttributes,
  };

  return (
    <DiamondProviderContext.Provider value={value}>
      {children}
    </DiamondProviderContext.Provider>
  );
}

export function useDiamond() {
  const context = useContext(DiamondProviderContext);
  if (context === undefined) {
    throw new Error('useDiamond must be used within a DiamondProvider');
  }
  return context;
}
