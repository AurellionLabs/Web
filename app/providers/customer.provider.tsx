'use client';

import { ethers, type BytesLike } from 'ethers';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
// ServiceContext not used; we call contract directly via RepositoryContext
import { DiamondP2PService } from '@/infrastructure/diamond/diamond-p2p-service';
import { handleContractError } from '@/utils/error-handler';
import { useWallet } from '@/hooks/useWallet';
import { Order, OrderStatus } from '@/domain/orders/order';
import { usePlatform } from './platform.provider';
import { OrderWithAsset } from '@/app/types/shared';
import { P2PDeliveryDetails } from '@/domain/p2p';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  type EmitSigEventsByJourneyResponse,
} from '@/infrastructure/shared/graph-queries';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';
import {
  detectJourneyRoleConflict,
  getJourneyRoleConflictMessage,
} from '@/utils/journey-role-conflicts';

type CustomerContextType = {
  orders: OrderWithAsset[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  confirmReceipt: (orderId: string) => Promise<void>;
  /** Sign for delivery on a P2P order (calls packageSign, then auto-attempts handOff).
   *  Returns 'settled' if handOff succeeded, 'driver_not_signed' if driver hasn't signed,
   *  or 'signed' if only the signature recorded. */
  signP2PDelivery: (
    orderId: string,
    journeyId: string,
  ) => Promise<'settled' | 'driver_not_signed' | 'signed'>;
  /** Attempt handOff on a P2P order. Returns 'settled' or 'driver_not_signed'. */
  completeP2PHandoff: (
    orderId: string,
    journeyId: string,
  ) => Promise<'settled' | 'driver_not_signed'>;
  /** Fetch live receiver/driver signature states for pickup and delivery */
  getP2PSignatureState: (
    orderId: string,
    journeyId: string,
  ) => Promise<{
    buyerSigned: boolean;
    driverDeliverySigned: boolean;
    senderPickupSigned?: boolean;
    driverPickupSigned?: boolean;
    roleConflict?: boolean;
    roleConflictReason?: string;
  }>;
  /** Create a delivery journey for an accepted P2P order that has no journey */
  createP2PJourney: (
    orderId: string,
    delivery: P2PDeliveryDetails,
  ) => Promise<void>;
};

// Create context
const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined,
);

// Provider component
export function CustomerProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderWithAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repoContext = RepositoryContext.getInstance();
  const orderRepository = repoContext.getOrderRepository();
  const { address, connectedWallet } = useWallet();
  const { getAssetByTokenId } = usePlatform();

  /**
   * Get a signer-aligned Ausys contract.
   * If the RepositoryContext signer doesn't match the current wallet,
   * derive a fresh signer from the Privy wallet's Ethereum provider.
   */
  const getAlignedAusysContract = useCallback(async () => {
    const ausys = repoContext.getAusysContract();
    if (!address) throw new Error('Wallet not connected');

    const signerAddr = await repoContext.getSignerAddress();
    if (signerAddr.toLowerCase() === address.toLowerCase()) {
      return ausys; // Already aligned
    }

    console.warn(
      `[CustomerProvider] Signer mismatch: stored=${signerAddr}, wallet=${address}. Reconnecting...`,
    );

    if (connectedWallet) {
      const ethereumProvider = await connectedWallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const freshSigner = await provider.getSigner();
      await repoContext.updateSigner(freshSigner);
      return repoContext.getAusysContract();
    }

    console.warn(
      '[CustomerProvider] No Privy wallet available for signer alignment',
    );
    return ausys;
  }, [repoContext, address, connectedWallet]);
  const loadCustomerOrders = useCallback(async () => {
    if (!orderRepository) {
      setError('Order Repository not available.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      if (!address) {
        setOrders([]);
        return;
      }

      const userAddr = address;

      // Fetch CLOB buyer orders and P2P orders in parallel
      const [buyerOrders, allP2POrders] = await Promise.all([
        orderRepository.getBuyerOrders(userAddr),
        orderRepository.getP2POrdersForUser(userAddr).catch((err) => {
          console.warn('[CustomerProvider] Failed to load P2P orders:', err);
          return [] as Order[];
        }),
      ]);

      // Customer dashboard only shows P2P orders where the user is the BUYER.
      // Seller P2P orders belong on the node dashboard (seller = node operator).
      const p2pBuyerOrders = allP2POrders.filter(
        (order) => order.buyer?.toLowerCase() === userAddr.toLowerCase(),
      );

      // Merge and deduplicate by order ID
      const seenIds = new Set<string>();
      const allOrders: Order[] = [];
      for (const order of [...buyerOrders, ...p2pBuyerOrders]) {
        const oid = order.id.toLowerCase();
        if (!seenIds.has(oid)) {
          seenIds.add(oid);
          allOrders.push(order);
        }
      }

      // Fetch asset details for each order
      const ordersWithAssets: OrderWithAsset[] = await Promise.all(
        allOrders.map(async (order) => {
          try {
            const asset = await getAssetByTokenId(order.tokenId);
            return {
              ...order,
              asset,
            };
          } catch (err) {
            console.warn(
              `Failed to fetch asset for tokenId ${order.tokenId}:`,
              err,
            );
            return {
              ...order,
              asset: null,
            };
          }
        }),
      );

      setOrders(ordersWithAssets);
    } catch (err) {
      console.error('Error loading customer orders:', err);
      setError('Failed to load customer orders');
      handleContractError(err, 'load customer orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderRepository, address, getAssetByTokenId]);

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        setIsLoading(true);
        const diamondContext = repoContext.getDiamondContext();
        const p2pService = new DiamondP2PService(diamondContext);
        await p2pService.cancelOffer(orderId);

        // Optimistically update local state; refreshOrders will sync from chain
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? { ...order, currentStatus: OrderStatus.CANCELLED }
              : order,
          ),
        );

        // Give indexer a beat to catch up, then re-sync
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await loadCustomerOrders();
      } catch (err) {
        console.error('[CustomerProvider] Error cancelling order:', err);
        throw handleContractError(err, 'cancelOrder');
      } finally {
        setIsLoading(false);
      }
    },
    [repoContext, loadCustomerOrders],
  );

  const confirmReceipt = useCallback(
    async (orderId: string) => {
      const orderToConfirm = orders.find((o) => o.id === orderId);

      if (!orderToConfirm) {
        console.error('[CustomerProvider] Order not found:', orderId);
        setError(`Order with ID ${orderId} not found.`);
        return;
      }

      if (
        !orderToConfirm.journeyIds ||
        orderToConfirm.journeyIds.length === 0
      ) {
        setError(`Order ${orderId} has no associated journey to sign.`);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const ausys = await getAlignedAusysContract();
        const journeyId = orderToConfirm.journeyIds[0];

        // 1. Sign the receipt (receiver confirms receipt) - this sets customerHandOff[receiver][id] = true
        // 1. Sign the receipt (receiver confirms delivery)
        const signTx = await ausys.packageSign(journeyId as BytesLike);
        await signTx.wait();

        // 2. Try to complete delivery (handOff) with retry for RPC propagation
        const MAX_ATTEMPTS = 3;
        let settled = false;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const handOffTx = await ausys.handOff(journeyId as BytesLike);
            await handOffTx.wait();

            // Success! Update order status
            setOrders((prevOrders) =>
              prevOrders.map((order) =>
                order.id === orderId
                  ? { ...order, currentStatus: OrderStatus.SETTLED }
                  : order,
              ),
            );
            settled = true;
            break;
          } catch (handOffErr) {
            const handOffMsg =
              handOffErr instanceof Error
                ? handOffErr.message
                : String(handOffErr);

            // ReceiverNotSigned after we just signed — RPC stale, retry
            if (
              (handOffMsg.includes('0x04d27bc2') ||
                handOffMsg.includes('ReceiverNotSigned')) &&
              attempt < MAX_ATTEMPTS
            ) {
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }

            // Expected: one side hasn't signed yet
            if (
              handOffMsg.includes('0x9651c947') ||
              handOffMsg.includes('DriverNotSigned') ||
              handOffMsg.includes('0x04d27bc2') ||
              handOffMsg.includes('ReceiverNotSigned')
            ) {
              return;
            }

            // Other errors should be thrown
            throw handOffErr;
          }
        }
      } catch (err) {
        console.error('Error confirming receipt:', err);
        setError('Failed to confirm receipt');
        handleContractError(err, 'confirm receipt');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [orders, getAlignedAusysContract],
  );

  /**
   * Sign for delivery on a P2P order.
   * Calls packageSign on the journey, then auto-attempts handOff.
   * Returns 'settled' if handOff succeeds, 'driver_not_signed' if
   * the driver hasn't signed yet (not an error — just waiting).
   */
  const signP2PDelivery = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<'settled' | 'driver_not_signed' | 'signed'> => {
      try {
        // NOTE: Do NOT set isLoading here — it unmounts the page and destroys
        // P2POrderFlow's optimistic state (buyerSigned badge).
        setError(null);
        const ausys = await getAlignedAusysContract();

        // Guard against premature signing before the journey enters transit.
        const journey = await ausys.getJourney(journeyId as BytesLike);
        const roleConflict = detectJourneyRoleConflict(
          journey.sender,
          journey.receiver,
          journey.driver,
        );
        if (roleConflict.hasConflict) {
          throw new Error(
            roleConflict.message ||
              'Sender, driver, and customer must use different wallet addresses.',
          );
        }
        if (Number(journey.currentStatus) !== 1) {
          throw new Error(
            'You can sign for delivery only after pickup is complete and the journey is in transit.',
          );
        }

        // 1. Sign for delivery (receiver confirms delivery receipt)
        const signTx = await ausys.packageSign(journeyId as BytesLike);
        await signTx.wait();

        // 2. Auto-attempt handOff with retry — the RPC may not have propagated
        //    our packageSign state change to the node that processes handOff.
        const MAX_HANDOFF_ATTEMPTS = 3;
        for (let attempt = 1; attempt <= MAX_HANDOFF_ATTEMPTS; attempt++) {
          try {
            const handOffTx = await ausys.handOff(journeyId as BytesLike);
            await handOffTx.wait();

            // Success — update order status optimistically
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId
                  ? { ...o, currentStatus: OrderStatus.SETTLED }
                  : o,
              ),
            );

            // Delay indexer refresh so the optimistic SETTLED status isn't
            // overwritten by stale PROCESSING data from the indexer.
            setTimeout(async () => {
              await loadCustomerOrders();
            }, 5000);

            return 'settled';
          } catch (handOffErr) {
            const msg =
              handOffErr instanceof Error
                ? handOffErr.message
                : String(handOffErr);

            // ReceiverNotSigned — we just signed as receiver, RPC likely stale.
            // Retry after a short delay to let state propagate.
            if (
              (msg.includes('0x04d27bc2') ||
                msg.includes('ReceiverNotSigned')) &&
              attempt < MAX_HANDOFF_ATTEMPTS
            ) {
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }

            // DriverNotSigned (0x9651c947) — driver genuinely hasn't signed
            if (msg.includes('0x9651c947') || msg.includes('DriverNotSigned')) {
              return 'driver_not_signed';
            }
            // ReceiverNotSigned after all retries — treat as waiting
            if (
              msg.includes('0x04d27bc2') ||
              msg.includes('ReceiverNotSigned')
            ) {
              console.warn(
                '[CustomerProvider] signP2PDelivery: receiver sig not detected after retries',
              );
              return 'driver_not_signed';
            }
            // Other handOff errors — the sign itself succeeded, don't throw
            console.warn('[CustomerProvider] handOff not ready yet:', msg);
            return 'signed';
          }
        }
        // Shouldn't reach here, but just in case
        return 'signed';
      } catch (err) {
        console.error('[CustomerProvider] signP2PDelivery error:', err);
        // let journey role conflicts bubble up with their specific messages
        if (getJourneyRoleConflictMessage(err)) {
          throw err;
        }
        setError('Failed to sign for delivery');
        handleContractError(err, 'sign P2P delivery');
        throw err;
      }
    },
    [getAlignedAusysContract, loadCustomerOrders],
  );

  /**
   * Attempt to complete the handoff on a P2P order (triggers settlement).
   * If the driver hasn't signed yet, resolves with 'driver_not_signed'
   * instead of throwing — the UI can show a waiting state.
   */
  const completeP2PHandoff = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<'settled' | 'driver_not_signed'> => {
      try {
        // NOTE: Do NOT set isLoading — same reason as signP2PDelivery
        setError(null);
        const ausys = await getAlignedAusysContract();

        const journey = await ausys.getJourney(journeyId as BytesLike);
        const roleConflict = detectJourneyRoleConflict(
          journey.sender,
          journey.receiver,
          journey.driver,
        );
        if (roleConflict.hasConflict) {
          throw new Error(
            roleConflict.message ||
              'Sender, driver, and customer must use different wallet addresses.',
          );
        }
        if (Number(journey.currentStatus) === 0) {
          // Pending pickup — not ready for handoff.
          return 'driver_not_signed';
        }

        const handOffTx = await ausys.handOff(journeyId as BytesLike);
        await handOffTx.wait();

        // Update local state optimistically
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, currentStatus: OrderStatus.SETTLED } : o,
          ),
        );

        // Also refresh from indexer
        await loadCustomerOrders();
        return 'settled';
      } catch (err) {
        if (getJourneyRoleConflictMessage(err)) {
          throw err;
        }
        const msg = err instanceof Error ? err.message : String(err);
        // DriverNotSigned (0x9651c947) — driver hasn't signed for delivery yet
        if (msg.includes('0x9651c947') || msg.includes('DriverNotSigned')) {
          return 'driver_not_signed';
        }
        // ReceiverNotSigned (0x04d27bc2) — receiver hasn't signed yet
        if (msg.includes('0x04d27bc2') || msg.includes('ReceiverNotSigned')) {
          return 'driver_not_signed';
        }
        console.error('[CustomerProvider] completeP2PHandoff error:', err);
        setError('Failed to complete handoff');
        handleContractError(err, 'complete P2P handoff');
        throw err;
      }
    },
    [getAlignedAusysContract, loadCustomerOrders],
  );

  /**
   * Fetch live receiver/driver signature states for both pickup and delivery.
   *
   * Uses journey.journeyStart (set when handOn succeeds) to distinguish
   * pickup sigs from delivery sigs. Only EmitSig events AFTER journeyStart
   * count as delivery signatures. Events before are pickup signatures.
   */
  const getP2PSignatureState = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<{
      buyerSigned: boolean;
      driverDeliverySigned: boolean;
      senderPickupSigned?: boolean;
      driverPickupSigned?: boolean;
      roleConflict?: boolean;
      roleConflictReason?: string;
    }> => {
      try {
        const ausys = repoContext.getAusysContract();
        const journey = await ausys.getJourney(journeyId as BytesLike);
        const status = Number(journey.currentStatus);
        const roleConflict = detectJourneyRoleConflict(
          journey.sender,
          journey.receiver,
          journey.driver,
        );

        // Definitive: Delivered means both parties signed and handOff succeeded
        if (status >= 2) {
          return {
            buyerSigned: true,
            driverDeliverySigned: true,
            senderPickupSigned: true,
            driverPickupSigned: true,
            roleConflict: false,
          };
        }

        // Fetch EmitSig events for this journey
        try {
          const sigResponse =
            await graphqlRequest<EmitSigEventsByJourneyResponse>(
              getCurrentIndexerUrl(),
              GET_EMIT_SIG_EVENTS_BY_JOURNEY,
              { journeyId, limit: 50 },
            );

          const sigEvents = sigResponse.diamondEmitSigEventss?.items || [];
          const sender = journey.sender.toLowerCase();
          const receiver = journey.receiver.toLowerCase();
          const driver = journey.driver.toLowerCase();
          const pickupTimestamp = Number(journey.journeyStart);

          if (status === 0) {
            // Pending — check pickup sigs
            const senderPickupSigned = sigEvents.some(
              (e) => e.user.toLowerCase() === sender,
            );
            const driverPickupSigned = sigEvents.some(
              (e) => e.user.toLowerCase() === driver,
            );

            return {
              buyerSigned: false,
              driverDeliverySigned: false,
              senderPickupSigned,
              driverPickupSigned,
              roleConflict: roleConflict.hasConflict,
              roleConflictReason: roleConflict.message,
            };
          }

          if (status === 1) {
            // InTransit — only sigs AFTER pickup count as delivery sigs
            const deliverySigs = sigEvents.filter(
              (e) => Number(e.block_timestamp) > pickupTimestamp,
            );

            const buyerSigned = deliverySigs.some(
              (e) => e.user.toLowerCase() === receiver,
            );
            const driverDeliverySigned = deliverySigs.some(
              (e) => e.user.toLowerCase() === driver,
            );

            return {
              buyerSigned,
              driverDeliverySigned,
              senderPickupSigned: true,
              driverPickupSigned: true,
              roleConflict: roleConflict.hasConflict,
              roleConflictReason: roleConflict.message,
            };
          }
        } catch (indexerErr) {
          console.warn(
            '[CustomerProvider] EmitSig query failed, using defaults:',
            indexerErr,
          );
        }

        return {
          buyerSigned: false,
          driverDeliverySigned: false,
          roleConflict: roleConflict.hasConflict,
          roleConflictReason: roleConflict.message,
        };
      } catch (err) {
        console.warn('[CustomerProvider] getP2PSignatureState error:', err);
        return { buyerSigned: false, driverDeliverySigned: false };
      }
    },
    [repoContext],
  );

  /**
   * Create a delivery journey for an accepted P2P order that has no journey yet.
   * This handles orders that "slipped through" before the Accept & Schedule flow.
   */
  const createP2PJourney = useCallback(
    async (orderId: string, delivery: P2PDeliveryDetails) => {
      try {
        setIsLoading(true);
        setError(null);
        // Use the Diamond contract (has createOrderJourney), not the Ausys contract
        const diamond = repoContext.getDiamondContext().getDiamond();
        const isZeroAddress = (addr?: string | null) =>
          !addr ||
          addr.toLowerCase() === '0x0000000000000000000000000000000000000000';

        // Resolve canonical participants from on-chain order state.
        // Event-derived order views can contain zero placeholders.
        const onchainOrder = await diamond.getAuSysOrder(orderId);
        const canonicalSeller = String(onchainOrder.seller || '').trim();
        const canonicalBuyer = String(onchainOrder.buyer || '').trim();
        const providedSender = String(delivery.senderNodeAddress || '').trim();
        const providedReceiver = String(delivery.receiverAddress || '').trim();
        const senderAddress = canonicalSeller;
        const receiverAddress = canonicalBuyer;

        if (
          providedSender &&
          !isZeroAddress(providedSender) &&
          providedSender.toLowerCase() !== canonicalSeller.toLowerCase()
        ) {
          console.warn(
            `[CustomerProvider] Ignoring mismatched senderNodeAddress. provided=${providedSender}, seller=${canonicalSeller}`,
          );
        }
        if (
          providedReceiver &&
          !isZeroAddress(providedReceiver) &&
          providedReceiver.toLowerCase() !== canonicalBuyer.toLowerCase()
        ) {
          console.warn(
            `[CustomerProvider] Ignoring mismatched receiverAddress. provided=${providedReceiver}, buyer=${canonicalBuyer}`,
          );
        }

        if (isZeroAddress(senderAddress)) {
          throw new Error(
            'Cannot create delivery journey: seller/node sender address is unresolved.',
          );
        }
        if (isZeroAddress(receiverAddress)) {
          throw new Error(
            'Cannot create delivery journey: receiver address is unresolved.',
          );
        }
        const roleConflict = detectJourneyRoleConflict(
          senderAddress,
          receiverAddress,
        );
        if (roleConflict.hasConflict) {
          throw new Error(
            roleConflict.message ||
              'Sender, driver, and customer must use different wallet addresses.',
          );
        }

        const canonicalStartLat = String(
          onchainOrder.locationData?.startLocation?.lat || '',
        ).trim();
        const canonicalStartLng = String(
          onchainOrder.locationData?.startLocation?.lng || '',
        ).trim();
        const canonicalStartName = String(
          onchainOrder.locationData?.startName || '',
        ).trim();

        // Use delivery pickup metadata when present, otherwise canonical on-chain
        // order metadata set during sell-offer creation from selected pickup node.
        const parcelData = {
          ...delivery.parcelData,
          startLocation: {
            lat:
              String(delivery.parcelData?.startLocation?.lat || '').trim() ||
              canonicalStartLat,
            lng:
              String(delivery.parcelData?.startLocation?.lng || '').trim() ||
              canonicalStartLng,
          },
          endLocation: {
            lat: String(delivery.parcelData?.endLocation?.lat || '').trim(),
            lng: String(delivery.parcelData?.endLocation?.lng || '').trim(),
          },
          startName:
            String(delivery.parcelData?.startName || '').trim() ||
            canonicalStartName,
          endName: String(delivery.parcelData?.endName || '').trim(),
        };

        if (!parcelData.startLocation.lat || !parcelData.startLocation.lng) {
          throw new Error(
            'Cannot schedule delivery without a pickup location. Ask the seller/node to provide pickup coordinates.',
          );
        }
        if (!parcelData.startName) {
          throw new Error(
            'Cannot schedule delivery without a pickup address label.',
          );
        }
        if (!parcelData.endName) {
          throw new Error(
            'Cannot schedule delivery without a destination address.',
          );
        }
        if (!parcelData.endLocation.lat || !parcelData.endLocation.lng) {
          throw new Error(
            'Cannot schedule delivery without destination coordinates. Choose a suggested address so coordinates are captured.',
          );
        }

        const journeyTx = await diamond.createOrderJourney(
          orderId,
          senderAddress,
          receiverAddress,
          parcelData,
          delivery.bountyWei,
          delivery.etaTimestamp,
          delivery.tokenQuantity,
          delivery.assetId,
        );
        await journeyTx.wait();

        // Wait for indexer to catch up (eventual consistency) then refresh.
        // The indexer typically needs 2-4s to process a new block.
        await new Promise((r) => setTimeout(r, 3000));
        await loadCustomerOrders();

        // Schedule a second refresh in case the first was too early
        setTimeout(() => {
          loadCustomerOrders();
        }, 5000);
      } catch (err) {
        console.error('[CustomerProvider] createP2PJourney error:', err);

        // let journey role conflicts bubble up with their specific messages
        if (getJourneyRoleConflictMessage(err)) {
          throw err;
        }

        setError('Failed to create delivery journey');
        handleContractError(err, 'create P2P journey');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [repoContext, loadCustomerOrders],
  );

  const refreshOrders = useCallback(async () => {
    await loadCustomerOrders();
  }, [loadCustomerOrders]);

  useEffect(() => {
    loadCustomerOrders();
  }, [loadCustomerOrders]);

  const value = {
    orders,
    isLoading,
    error,
    refreshOrders,
    cancelOrder,
    confirmReceipt,
    signP2PDelivery,
    completeP2PHandoff,
    getP2PSignatureState,
    createP2PJourney,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

// Hook for using the customer context
export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
