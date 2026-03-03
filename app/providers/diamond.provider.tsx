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
  DiamondP2PService,
  DiamondP2PRepository,
} from '@/infrastructure/diamond/diamond-p2p-service';
import {
  P2POffer,
  IP2PService,
  IP2PRepository,
  CreateP2POfferInput,
} from '@/domain/p2p';
import {
  Node,
  NodeRepository,
  TokenizedAsset,
  TokenizedAssetAttribute,
  NodeAsset,
  SupportingDocument,
} from '@/domain/node/node';
import { Asset } from '@/domain/shared';
import { BrowserProvider } from 'ethers';
import { PinataSDK } from 'pinata';
import { getSettlementService } from '@/infrastructure/services/settlement-service';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';

interface DiamondContextType {
  // Context state
  initialized: boolean;
  loading: boolean;
  error: Error | null;
  isReadOnly: boolean;

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
  updateSupportedAssets: (
    nodeHash: string,
    assets: NodeAsset[],
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
  // Wallet ERC1155 balance (for P2P sell orders - queries actual tokens in wallet)
  balanceOf: (account: string, tokenId: string) => Promise<bigint>;
  getNodeInventory: (
    nodeHash: string,
  ) => Promise<{ tokenIds: bigint[]; balances: bigint[] }>;
  approveClobForTokens: (nodeHash: string) => Promise<void>;
  isClobApproved: () => Promise<boolean>;
  placeSellOrderFromNode: (
    nodeHash: string,
    tokenId: string,
    quoteToken: string,
    price: bigint,
    amount: bigint,
  ) => Promise<string>; // Returns orderId
  placeNodeMarketSellOrder: (
    nodeHash: string,
    tokenId: string,
    quoteToken: string,
    price: bigint,
    amount: bigint,
    maxSlippageBps: number,
  ) => Promise<string>; // Returns orderId

  // Order management
  cancelCLOBOrder: (orderId: string) => Promise<void>;

  // Supporting documents
  getSupportingDocuments: (nodeHash: string) => Promise<SupportingDocument[]>;
  addSupportingDocument: (
    nodeHash: string,
    url: string,
    title: string,
    description: string,
    documentType: string,
  ) => Promise<boolean>; // Returns isFrozen
  removeSupportingDocument: (nodeHash: string, url: string) => Promise<void>;

  // P2P Trading
  p2pService: IP2PService | null;
  p2pRepository: IP2PRepository | null;
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
  const [p2pService, setP2PService] = useState<DiamondP2PService | null>(null);
  const [p2pRepository, setP2PRepository] =
    useState<DiamondP2PRepository | null>(null);

  const { connectedWallet, address, isConnected } = useWallet();
  const { connected: mainConnected } = useMainProvider();

  // Track if we're in read-only mode
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Helper to create Pinata SDK
  const createPinataSDK = (): PinataSDK | undefined => {
    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (pinataJwt) {
      return new PinataSDK({
        pinataJwt,
        pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
      });
    }
    return undefined;
  };

  // Initialize Diamond context - supports both connected wallet and read-only mode
  useEffect(() => {
    async function initializeDiamond() {
      // Check if we need to re-initialize due to wallet connection change
      const needsWalletUpgrade =
        initialized && isReadOnly && isConnected && connectedWallet && address;
      const needsInitialInit = !initialized || !diamondContext?.isInitialized();

      if (!needsInitialInit && !needsWalletUpgrade) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const context = getDiamondContext();

        if (isConnected && connectedWallet && address) {
          // Full initialization with wallet signer
          const ethereumProvider = await connectedWallet.getEthereumProvider();
          const browserProvider = new BrowserProvider(ethereumProvider);
          await context.initialize(browserProvider);
          setIsReadOnly(false);
        } else {
          // Read-only initialization using public RPC from env
          const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL_84532 || '';
          await context.initializeReadOnly(rpcUrl);
          setIsReadOnly(true);
        }

        // Create Pinata SDK for IPFS metadata fetching
        const pinata = createPinataSDK();
        if (pinata) {
        } else {
          console.warn(
            '[DiamondProvider] PINATA_JWT not available, IPFS metadata will not be fetched',
          );
        }

        // Create services with Pinata for IPFS metadata
        const repository = new DiamondNodeRepository(context, pinata);
        const service = new DiamondNodeService(context);
        const assetService = new DiamondNodeAssetService(context);
        const p2pSvc = new DiamondP2PService(context);
        const p2pRepo = new DiamondP2PRepository(context);

        setDiamondContext(context);
        setNodeRepository(repository);
        setNodeService(service);
        setNodeAssetService(assetService);
        setP2PService(p2pSvc);
        setP2PRepository(p2pRepo);
        setInitialized(true);
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
  }, [
    isConnected,
    connectedWallet,
    address,
    initialized,
    diamondContext,
    isReadOnly,
  ]);

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

  const updateSupportedAssets = useCallback(
    async (nodeHash: string, assets: NodeAsset[]): Promise<void> => {
      if (!nodeAssetService) {
        throw new Error('Node asset service not initialised');
      }
      await nodeAssetService.updateSupportedAssets(nodeHash, assets);
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
      const signer = await diamondContext.getSigner();
      const signerAddress = await signer.getAddress();
      const diamondAddress = await diamond.getAddress();

      // First, approve Diamond to transfer user's tokens
      const settlementService = getSettlementService();
      const isApproved = await settlementService.isApprovedForAll(
        signerAddress,
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        diamondAddress,
      );

      if (!isApproved) {
        await settlementService.setApprovalForAll(
          NEXT_PUBLIC_DIAMOND_ADDRESS,
          diamondAddress,
        );
      }

      // Now deposit tokens to node
      const tx = await diamond.depositTokensToNode(nodeHash, tokenId, amount);
      await tx.wait();
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
      const tx = await diamond.withdrawTokensFromNode(
        nodeHash,
        tokenId,
        amount,
      );
      await tx.wait();
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

  // Get wallet's ERC1155 balance (actual tokens in wallet, not node internal balance)
  const balanceOf = useCallback(
    async (account: string, tokenId: string): Promise<bigint> => {
      if (!diamondContext) {
        return BigInt(0);
      }
      const diamond = diamondContext.getDiamond();
      try {
        const balance = await diamond.balanceOf(account, tokenId);
        return BigInt(balance.toString());
      } catch (err) {
        console.error('[DiamondProvider] Error getting wallet balance:', err);
        return BigInt(0);
      }
    },
    [diamondContext],
  );

  // Get full node inventory (all tokenIds and their balances)
  const getNodeInventory = useCallback(
    async (
      nodeHash: string,
    ): Promise<{ tokenIds: bigint[]; balances: bigint[] }> => {
      if (!diamondContext) {
        return { tokenIds: [], balances: [] };
      }
      const diamond = diamondContext.getDiamond();
      try {
        const [tokenIds, balances] = await diamond.getNodeInventory(nodeHash);
        return {
          tokenIds: tokenIds.map((t: { toString(): string }) =>
            BigInt(t.toString()),
          ),
          balances: balances.map((b: { toString(): string }) =>
            BigInt(b.toString()),
          ),
        };
      } catch (err) {
        console.error('[DiamondProvider] Error getting node inventory:', err);
        return { tokenIds: [], balances: [] };
      }
    },
    [diamondContext],
  );

  // DEPRECATED: CLOB approval is no longer needed since CLOBFacet is internal to Diamond
  // Kept for backward compatibility - always succeeds immediately
  const approveClobForTokens = useCallback(
    async (nodeHash: string): Promise<void> => {
      // No-op: CLOB is now internal to Diamond via CLOBFacet
      // Tokens are held by Diamond and CLOBFacet can access them directly
    },
    [],
  );

  // DEPRECATED: CLOB is always "approved" since it's internal to Diamond
  const isClobApproved = useCallback(async (): Promise<boolean> => {
    // CLOBFacet is internal to Diamond, always "approved"
    return true;
  }, []);

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
      const tx = await diamond.placeSellOrderFromNode(
        nodeHash,
        tokenId,
        quoteToken,
        price,
        amount,
      );
      const receipt = await tx.wait();

      // Extract orderId from events if available
      // For now, return tx hash as order reference
      return receipt.hash;
    },
    [diamondContext],
  );

  // Place market sell order from node inventory (executes immediately at best price)
  const placeNodeMarketSellOrder = useCallback(
    async (
      nodeHash: string,
      tokenId: string,
      quoteToken: string,
      price: bigint,
      amount: bigint,
      maxSlippageBps: number,
    ): Promise<string> => {
      if (!diamondContext) {
        throw new Error('Diamond not initialized');
      }
      const diamond = diamondContext.getDiamond();
      const tx = await diamond.placeNodeMarketSellOrder(
        nodeHash,
        tokenId,
        quoteToken,
        price,
        amount,
        maxSlippageBps,
      );
      const receipt = await tx.wait();

      // Extract orderId from events if available
      // For now, return tx hash as order reference
      return receipt.hash;
    },
    [diamondContext],
  );

  // Cancel a CLOB order
  const cancelCLOBOrder = useCallback(
    async (orderId: string): Promise<void> => {
      if (!diamondContext) {
        throw new Error('Diamond not initialized');
      }
      const diamond = diamondContext.getDiamond();

      // Call cancelCLOBOrder on the Diamond contract
      const tx = await diamond.cancelCLOBOrder(orderId);
      const receipt = await tx.wait();
    },
    [diamondContext],
  );

  // Get supporting documents for a node
  const getSupportingDocuments = useCallback(
    async (nodeHash: string): Promise<SupportingDocument[]> => {
      if (!nodeRepository) {
        return [];
      }
      return nodeRepository.getSupportingDocuments(nodeHash);
    },
    [nodeRepository],
  );

  // Add a supporting document to a node
  const addSupportingDocument = useCallback(
    async (
      nodeHash: string,
      url: string,
      title: string,
      description: string,
      documentType: string,
    ): Promise<boolean> => {
      if (!nodeService) {
        throw new Error('Diamond not initialized');
      }
      return nodeService.addSupportingDocument(
        nodeHash,
        url,
        title,
        description,
        documentType,
      );
    },
    [nodeService],
  );

  // Remove a supporting document from a node
  const removeSupportingDocument = useCallback(
    async (nodeHash: string, url: string): Promise<void> => {
      if (!nodeService) {
        throw new Error('Diamond not initialized');
      }
      await nodeService.removeSupportingDocument(nodeHash, url);
    },
    [nodeService],
  );

  const value: DiamondContextType = {
    initialized,
    loading,
    error,
    isReadOnly,
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
    updateSupportedAssets,
    getNodeAssets,
    getAssetAttributes,
    depositTokensToNode,
    withdrawTokensFromNode,
    getNodeTokenBalance,
    balanceOf,
    getNodeInventory,
    approveClobForTokens,
    isClobApproved,
    placeSellOrderFromNode,
    cancelCLOBOrder,
    placeNodeMarketSellOrder,
    getSupportingDocuments,
    addSupportingDocument,
    removeSupportingDocument,
    // P2P Trading
    p2pService,
    p2pRepository,
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
