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

  // Trading operations
  depositTokensToNode: (
    nodeHash: string,
    tokenId: string,
    amount: bigint,
  ) => Promise<void>;
  withdrawTokensFromNode: (
    nodeHash: string,
    tokenId: string,
    amount: bigint,
  ) => Promise<void>;
  getNodeTokenBalance: (nodeHash: string, tokenId: string) => Promise<bigint>;
  approveClobForTokens: (nodeHash: string) => Promise<void>;
  isClobApproved: () => Promise<boolean>;
  placeSellOrderFromNode: (
    nodeHash: string,
    tokenId: string,
    quoteToken: string,
    price: bigint,
    amount: bigint,
  ) => Promise<string>; // Returns orderId
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

  // Trading operations - deposit tokens from user wallet to node for selling on CLOB
  const depositTokensToNode = useCallback(
    async (
      nodeHash: string,
      tokenId: string,
      amount: bigint,
    ): Promise<void> => {
      if (!diamondContext) {
        throw new Error('Diamond not initialized');
      }
      const diamond = diamondContext.getDiamond();
      console.log('[DiamondProvider] Depositing tokens to node:', {
        nodeHash,
        tokenId,
        amount: amount.toString(),
      });

      // First, approve Diamond to transfer user's tokens
      const { NEXT_PUBLIC_AURA_ASSET_ADDRESS } = await import(
        '@/chain-constants'
      );
      const { ethers } = await import('ethers');

      const signer = await diamondContext.getSigner();
      const auraAsset = new ethers.Contract(
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        [
          'function setApprovalForAll(address operator, bool approved) external',
          'function isApprovedForAll(address account, address operator) view returns (bool)',
        ],
        signer,
      );

      const diamondAddress = await diamond.getAddress();
      const isApproved = await auraAsset.isApprovedForAll(
        await signer.getAddress(),
        diamondAddress,
      );

      if (!isApproved) {
        console.log(
          '[DiamondProvider] Approving Diamond to transfer tokens...',
        );
        const approveTx = await auraAsset.setApprovalForAll(
          diamondAddress,
          true,
        );
        await approveTx.wait();
        console.log('[DiamondProvider] Diamond approved');
      }

      // Now deposit tokens to node
      const tx = await diamond.depositTokensToNode(nodeHash, tokenId, amount);
      await tx.wait();
      console.log('[DiamondProvider] Tokens deposited successfully');
    },
    [diamondContext],
  );

  // Withdraw tokens from node to user wallet
  const withdrawTokensFromNode = useCallback(
    async (
      nodeHash: string,
      tokenId: string,
      amount: bigint,
    ): Promise<void> => {
      if (!diamondContext) {
        throw new Error('Diamond not initialized');
      }
      const diamond = diamondContext.getDiamond();
      console.log('[DiamondProvider] Withdrawing tokens from node:', {
        nodeHash,
        tokenId,
        amount: amount.toString(),
      });
      const tx = await diamond.withdrawTokensFromNode(
        nodeHash,
        tokenId,
        amount,
      );
      await tx.wait();
      console.log('[DiamondProvider] Tokens withdrawn successfully');
    },
    [diamondContext],
  );

  // Get node's deposited token balance (available for selling on CLOB)
  const getNodeTokenBalance = useCallback(
    async (nodeHash: string, tokenId: string): Promise<bigint> => {
      if (!diamondContext) {
        return BigInt(0);
      }
      const diamond = diamondContext.getDiamond();
      try {
        const balance = await diamond.getNodeTokenBalance(nodeHash, tokenId);
        return BigInt(balance.toString());
      } catch (err) {
        console.error(
          '[DiamondProvider] Error getting node token balance:',
          err,
        );
        return BigInt(0);
      }
    },
    [diamondContext],
  );

  // Approve CLOB to transfer tokens from Diamond (for node selling)
  const approveClobForTokens = useCallback(
    async (nodeHash: string): Promise<void> => {
      if (!diamondContext) {
        throw new Error('Diamond not initialized');
      }
      const diamond = diamondContext.getDiamond();
      const { NEXT_PUBLIC_CLOB_ADDRESS } = await import('@/chain-constants');

      // Check if already approved
      const isApproved = await diamond.isClobApproved(NEXT_PUBLIC_CLOB_ADDRESS);
      if (isApproved) {
        console.log('[DiamondProvider] CLOB already approved');
        return;
      }

      console.log('[DiamondProvider] Approving CLOB for token transfers...');
      const tx = await diamond.approveClobForTokens(
        nodeHash,
        NEXT_PUBLIC_CLOB_ADDRESS,
      );
      await tx.wait();
      console.log('[DiamondProvider] CLOB approved successfully');
    },
    [diamondContext],
  );

  // Check if CLOB is approved
  const isClobApproved = useCallback(async (): Promise<boolean> => {
    if (!diamondContext) {
      return false;
    }
    const diamond = diamondContext.getDiamond();
    const { NEXT_PUBLIC_CLOB_ADDRESS } = await import('@/chain-constants');
    return await diamond.isClobApproved(NEXT_PUBLIC_CLOB_ADDRESS);
  }, [diamondContext]);

  // Place sell order directly from node inventory (no withdrawal to wallet needed)
  const placeSellOrderFromNode = useCallback(
    async (
      nodeHash: string,
      tokenId: string,
      quoteToken: string,
      price: bigint,
      amount: bigint,
    ): Promise<string> => {
      if (!diamondContext) {
        throw new Error('Diamond not initialized');
      }
      const diamond = diamondContext.getDiamond();
      console.log('[DiamondProvider] Placing sell order from node:', {
        nodeHash,
        tokenId,
        quoteToken,
        price: price.toString(),
        amount: amount.toString(),
      });
      const tx = await diamond.placeSellOrderFromNode(
        nodeHash,
        tokenId,
        quoteToken,
        price,
        amount,
      );
      const receipt = await tx.wait();
      console.log('[DiamondProvider] Sell order placed, tx:', receipt.hash);

      // Extract orderId from events if available
      // For now, return tx hash as order reference
      return receipt.hash;
    },
    [diamondContext],
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
    depositTokensToNode,
    withdrawTokensFromNode,
    getNodeTokenBalance,
    approveClobForTokens,
    isClobApproved,
    placeSellOrderFromNode,
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
