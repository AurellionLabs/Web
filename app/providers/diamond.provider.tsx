'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useMainProvider } from './main.provider';
import { useE2EAuth } from './e2e-auth.provider';
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
import {
  NEXT_PUBLIC_DEFAULT_CHAIN_ID,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '@/chain-constants';
import {
  getPublicRpcConfigurationError,
  NETWORK_CONFIGS,
} from '@/config/network';
import { setCurrentChainId } from '@/infrastructure/config/indexer-endpoint';
import { resolvePublicNodeChain } from '@/lib/public-node-chain';

interface DiamondContextType {
  // Context state
  initialized: boolean;
  loading: boolean;
  error: Error | null;
  isReadOnly: boolean;
  diamondContext: DiamondContext | null;
  contextVersion: number;

  // Services
  nodeRepository: NodeRepository | null;
  nodeService: DiamondNodeService | null;
  nodeAssetService: DiamondNodeAssetService | null;

  // Node operations
  registerNode: (nodeData: Node) => Promise<string>;
  getNode: (nodeHash: string) => Promise<Node | null>;
  getOwnedNodes: (ownerAddress?: string) => Promise<string[]>;
  updateNodeStatus: (
    nodeHash: string,
    status: 'Active' | 'Inactive',
  ) => Promise<void>;

  // Asset operations
  mintAsset: (
    nodeHash: string,
    asset: Asset,
    amount: number,
    priceInput: string,
  ) => Promise<void>;
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
  // Batch balance query for multiple tokenIds (more efficient)
  balanceOfBatch: (account: string, tokenIds: bigint[]) => Promise<bigint[]>;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [diamondContext, setDiamondContext] = useState<DiamondContext | null>(
    null,
  );
  const [contextVersion, setContextVersion] = useState(0);
  const [initializedWalletAddress, setInitializedWalletAddress] = useState<
    string | null
  >(null);
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
  const IS_E2E = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
  const forceReadOnly =
    pathname === '/node/explorer' ||
    (pathname === '/node/dashboard' && searchParams.get('view') === 'public');
  const publicChain = resolvePublicNodeChain(searchParams);
  const requestedReadOnlyChainId = forceReadOnly ? publicChain.chainId : null;
  const fallbackReadOnlyChainId = forceReadOnly
    ? requestedReadOnlyChainId
    : NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  const currentContextChainId =
    diamondContext && diamondContext.isInitialized()
      ? diamondContext.getChainId()
      : null;
  // E2E signer comes directly from E2EAuthProvider — do NOT go through
  // Diamond signer setup requires full initialization first.
  const { signer: e2eSigner, provider: e2eProvider } = useE2EAuth();

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
      const normalizedAddress = address?.toLowerCase() ?? null;
      // Check if we need to re-initialize due to wallet connection change
      const needsWalletUpgrade =
        initialized &&
        isReadOnly &&
        !forceReadOnly &&
        isConnected &&
        connectedWallet &&
        address;
      const needsWriteWalletRefresh =
        initialized &&
        !isReadOnly &&
        !forceReadOnly &&
        isConnected &&
        connectedWallet &&
        normalizedAddress !== null &&
        normalizedAddress !== initializedWalletAddress;
      const needsModeSwitch = initialized && isReadOnly !== forceReadOnly;
      const needsReadOnlyChainSwitch =
        initialized &&
        forceReadOnly &&
        requestedReadOnlyChainId !== null &&
        currentContextChainId !== requestedReadOnlyChainId;
      const needsInitialInit = !initialized || !diamondContext?.isInitialized();

      if (
        !needsInitialInit &&
        !needsWalletUpgrade &&
        !needsWriteWalletRefresh &&
        !needsModeSwitch &&
        !needsReadOnlyChainSwitch
      ) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const context = getDiamondContext();

        if (forceReadOnly && requestedReadOnlyChainId === null) {
          context.disconnect();
          setCurrentChainId(null);
          setDiamondContext(null);
          setNodeRepository(null);
          setNodeService(null);
          setNodeAssetService(null);
          setP2PService(null);
          setP2PRepository(null);
          setInitializedWalletAddress(null);
          setInitialized(false);
          setIsReadOnly(true);
          setContextVersion((version) => version + 1);
          setError(new Error(publicChain.error || 'Unsupported public chain.'));
          setLoading(false);
          return;
        }

        if (
          needsWalletUpgrade ||
          needsWriteWalletRefresh ||
          needsModeSwitch ||
          needsReadOnlyChainSwitch
        ) {
          context.disconnect();
        }

        if (IS_E2E) {
          // E2E mode: signer comes directly from E2EAuthProvider.
          // mainConnected is set by WalletConnectionE2E once E2EAuthProvider is ready.
          if (!mainConnected || !e2eSigner || !e2eProvider) {
            setLoading(false);
            return; // Wait for E2EAuthProvider to finish initializing
          }
          await context.initializeWithSigner(e2eSigner, e2eProvider);
          setInitializedWalletAddress(
            (await e2eSigner.getAddress()).toLowerCase(),
          );
          setIsReadOnly(false);
        } else if (
          !forceReadOnly &&
          isConnected &&
          connectedWallet &&
          address
        ) {
          // Full initialization with wallet signer
          const ethereumProvider = await connectedWallet.getEthereumProvider();
          const browserProvider = new BrowserProvider(ethereumProvider);
          await context.initialize(browserProvider);
          setInitializedWalletAddress(normalizedAddress);
          setIsReadOnly(false);
        } else {
          if (!fallbackReadOnlyChainId) {
            throw new Error('Read-only chain is not available.');
          }

          const rpcConfigurationError = getPublicRpcConfigurationError(
            fallbackReadOnlyChainId,
          );
          if (rpcConfigurationError) {
            throw new Error(rpcConfigurationError);
          }

          const networkConfig = NETWORK_CONFIGS[fallbackReadOnlyChainId];
          if (!networkConfig?.rpcUrl) {
            throw new Error(
              `No RPC configured for read-only chain ${fallbackReadOnlyChainId}.`,
            );
          }

          setCurrentChainId(fallbackReadOnlyChainId);
          await context.initializeReadOnly(
            networkConfig.rpcUrl,
            fallbackReadOnlyChainId,
          );
          setInitializedWalletAddress(null);
          setIsReadOnly(true);
        }

        // Pinata remains available here for metadata writes during tokenization.
        const pinata = createPinataSDK();
        if (!pinata) {
          console.warn(
            '[DiamondProvider] PINATA_JWT not available, metadata uploads will not be available',
          );
        }

        // Read-side metadata resolution now goes through our server metadata API.
        const repository = new DiamondNodeRepository(context);
        const service = new DiamondNodeService(context);
        const assetService = new DiamondNodeAssetService(
          context,
          pinata || undefined,
        );
        const p2pSvc = new DiamondP2PService(context);
        const p2pRepo = new DiamondP2PRepository(context);

        setDiamondContext(context);
        setNodeRepository(repository);
        setNodeService(service);
        setNodeAssetService(assetService);
        setP2PService(p2pSvc);
        setP2PRepository(p2pRepo);
        setInitialized(true);
        setContextVersion((version) => version + 1);
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
    forceReadOnly,
    publicChain.error,
    initialized,
    diamondContext,
    isReadOnly,
    initializedWalletAddress,
    requestedReadOnlyChainId,
    currentContextChainId,
    mainConnected, // re-run when E2E wallet signals ready
    e2eSigner, // re-run when E2E signer becomes available
    e2eProvider, // re-run when E2E provider becomes available
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

  const getOwnedNodes = useCallback(
    async (ownerAddress?: string): Promise<string[]> => {
      const queryAddress = ownerAddress ?? address;
      if (!nodeRepository || !queryAddress) {
        return [];
      }
      return nodeRepository.getOwnedNodes(queryAddress);
    },
    [nodeRepository, address],
  );

  const updateNodeStatus = useCallback(
    async (nodeHash: string, status: 'Active' | 'Inactive'): Promise<void> => {
      if (!nodeService) {
        throw new Error('Diamond not initialized');
      }
      await nodeService.updateNodeStatus(nodeHash, status);
    },
    [nodeService],
  );

  // Asset operations
  const mintAsset = useCallback(
    async (
      nodeHash: string,
      asset: Asset,
      amount: number,
      priceInput: string,
    ): Promise<void> => {
      if (!nodeAssetService) {
        throw new Error('Diamond not initialized');
      }
      await nodeAssetService.mintAsset(nodeHash, asset, amount, priceInput);
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

  // Batch balance query for multiple tokenIds (more efficient)
  const balanceOfBatch = useCallback(
    async (account: string, tokenIds: bigint[]): Promise<bigint[]> => {
      if (!diamondContext || tokenIds.length === 0) {
        return [];
      }
      const diamond = diamondContext.getDiamond();
      try {
        const balances = await diamond.balanceOfBatch(
          tokenIds.map(() => account),
          tokenIds,
        );
        return balances.map((b: { toString(): string }) =>
          BigInt(b.toString()),
        );
      } catch (err) {
        console.error(
          '[DiamondProvider] Error getting wallet batch balances:',
          err,
        );
        // Fallback to individual queries
        const results: bigint[] = [];
        for (const tokenId of tokenIds) {
          try {
            const balance = await diamond.balanceOf(account, tokenId);
            results.push(BigInt(balance.toString()));
          } catch {
            results.push(BigInt(0));
          }
        }
        return results;
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
    diamondContext,
    contextVersion,
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
    balanceOfBatch,
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
