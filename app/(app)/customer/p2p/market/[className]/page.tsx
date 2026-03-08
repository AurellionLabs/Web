'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import type { Asset } from '@/domain/shared';
import {
  buildTokenIdToClassMap,
  isTokenInClass as isTokenInClassPure,
  filterOffersForMarket,
} from '@/domain/p2p/offer-filter';
import {
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  HexStatCard,
  EvaButton,
} from '@/app/components/eva/eva-components';
import {
  RefreshCw,
  Plus,
  ShoppingCart,
  Tag,
  Clock,
  User,
  X,
  ArrowRight,
  ArrowLeft,
  Filter,
  Package,
} from 'lucide-react';
import { P2POffer, P2POfferStatus, P2PDeliveryDetails } from '@/domain/p2p';
import { formatUnits } from 'ethers';
import {
  DeliveryDetailsDialog,
  DeliveryFormData,
} from '@/app/components/p2p/delivery-details-dialog';
import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import { SettlementDestinationModal } from '@/app/components/settlement/SettlementDestinationModal';
import { useCustomer } from '@/app/providers/customer.provider';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';
import { useToast } from '@/hooks/use-toast';
import { OrderStatus } from '@/domain/orders/order';
import { getJourneyRoleConflictMessage } from '@/utils/journey-role-conflicts';

/**
 * P2P Market Offers Page
 *
 * Shows P2P offers filtered to a specific asset class (market).
 * Users navigate here from the P2P market selection grid.
 *
 * Features:
 * - View open P2P offers for the selected market
 * - Filter by buy/sell offers
 * - View my offers
 * - Accept offers from others
 * - Cancel my offers
 * - Create new offers
 */
export default function P2PMarketOffersPage() {
  const params = useParams();
  const className = decodeURIComponent(String(params.className || ''));
  const { setCurrentUserRole, connected } = useMainProvider();
  const { address } = useWallet();
  const {
    p2pRepository,
    p2pService,
    initialized: diamondInitialized,
  } = useDiamond();
  const { getAssetByTokenId, supportedAssets } = usePlatform();
  const router = useRouter();
  const searchParams = useSearchParams();
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [assetMetadataMap, setAssetMetadataMap] = useState<Map<string, Asset>>(
    new Map(),
  );

  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [myOffers, setMyOffers] = useState<P2POffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Delivery dialog state
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);

  // P2P order flow state
  const {
    orders,
    signP2PDelivery,
    completeP2PHandoff,
    getP2PSignatureState,
    createP2PJourney,
  } = useCustomer();
  const { toast } = useToast();
  const { refetch: refetchSettlements } = useSettlementDestination();
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<
    string | null
  >(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [expandedP2POrders, setExpandedP2POrders] = useState<
    Record<string, boolean>
  >({});
  const [p2pActionLoading, setP2PActionLoading] = useState(false);
  const [scheduleDeliveryOrderId, setScheduleDeliveryOrderId] = useState<
    string | null
  >(null);
  const [scheduleDeliveryDialogOpen, setScheduleDeliveryDialogOpen] =
    useState(false);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Build a lookup of tokenId -> assetClass from supportedAssets
  const tokenIdToClass = useMemo(() => {
    const map = new Map<string, string>();
    supportedAssets.forEach((a) => {
      if (a.tokenId && a.assetClass) {
        map.set(a.tokenId, a.assetClass);
        // Also store BigInt-normalized key to handle hex vs decimal
        try {
          const normalized = BigInt(a.tokenId).toString(10);
          if (normalized !== a.tokenId) {
            map.set(normalized, a.assetClass);
          }
        } catch {
          /* ignore */
        }
      }
    });
    return map;
  }, [supportedAssets]);

  // Check if a tokenId belongs to the current market class
  const isTokenInClass = useCallback(
    (tokenId: string): boolean => {
      const directClass = tokenIdToClass.get(tokenId);
      if (directClass) {
        return directClass.toLowerCase() === className.toLowerCase();
      }
      // Try BigInt normalization
      try {
        const normalized = BigInt(tokenId).toString(10);
        const normalizedClass = tokenIdToClass.get(normalized);
        if (normalizedClass) {
          return normalizedClass.toLowerCase() === className.toLowerCase();
        }
      } catch {
        /* ignore */
      }
      // If we can't determine the class, check metadata map
      const meta = assetMetadataMap.get(tokenId);
      if (meta?.assetClass) {
        return meta.assetClass.toLowerCase() === className.toLowerCase();
      }
      return false;
    },
    [tokenIdToClass, className, assetMetadataMap],
  );

  // Load offers
  const loadOffers = useCallback(async () => {
    if (!p2pRepository || !diamondInitialized) return;

    try {
      const openOffers = await p2pRepository.getOpenOffers();
      setOffers(openOffers);

      if (address) {
        const userOffers = await p2pRepository.getUserOffers(address);
        setMyOffers(userOffers);
      }
    } catch (error) {
      console.error('Error loading P2P offers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [p2pRepository, diamondInitialized, address]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Resolve asset metadata for unique tokenIds
  useEffect(() => {
    const allOffers = [...offers, ...myOffers];
    const uniqueTokenIds = [
      ...new Set(allOffers.map((o) => o.tokenId).filter(Boolean)),
    ];
    const unresolvedIds = uniqueTokenIds.filter(
      (id) => !assetMetadataMap.has(id),
    );
    if (unresolvedIds.length === 0) return;

    // Step 1: Resolve from supportedAssets
    const locallyResolved = new Map<string, Asset>();
    const stillUnresolved: string[] = [];

    for (const id of unresolvedIds) {
      let idBigInt: bigint | null = null;
      try {
        idBigInt = BigInt(id);
      } catch {
        /* skip */
      }

      const match = supportedAssets.find((a) => {
        if (a.tokenId === id) return true;
        if (idBigInt !== null) {
          try {
            return BigInt(a.tokenId) === idBigInt;
          } catch {
            return false;
          }
        }
        return false;
      });

      if (match && match.name) {
        locallyResolved.set(id, match);
      } else {
        stillUnresolved.push(id);
      }
    }

    if (locallyResolved.size > 0) {
      setAssetMetadataMap((prev) => {
        const next = new Map(prev);
        locallyResolved.forEach((asset, id) => next.set(id, asset));
        return next;
      });
    }

    // Step 2: Pinata fallback
    if (stillUnresolved.length === 0) {
      return;
    }
    let cancelled = false;
    const resolveMetadata = async () => {
      const results = await Promise.allSettled(
        stillUnresolved.map((id) => getAssetByTokenId(id)),
      );
      if (cancelled) return;
      setAssetMetadataMap((prev) => {
        const next = new Map(prev);
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            next.set(stillUnresolved[idx], result.value);
          }
        });
        return next;
      });
    };
    resolveMetadata();
    return () => {
      cancelled = true;
    };
  }, [offers, myOffers, getAssetByTokenId, supportedAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-retry after returning from offer creation
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      router.replace(`/customer/p2p/market/${encodeURIComponent(className)}`, {
        scroll: false,
      });
      const retryDelays = [2000, 4000, 8000];
      retryDelays.forEach((delay) => {
        const timer = setTimeout(() => {
          loadOffers();
        }, delay);
        retryTimerRef.current = timer;
      });
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }
  }, [searchParams, loadOffers, router, className]);

  // Refresh offers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadOffers();
    setIsRefreshing(false);
  }, [loadOffers]);

  const hasStoredDeliveryDestination = (offer: P2POffer): boolean => {
    const destination = offer.locationData;
    return Boolean(
      destination?.endName?.trim() &&
        destination?.endLocation?.lat?.trim() &&
        destination?.endLocation?.lng?.trim(),
    );
  };

  // Accept flow:
  // - seller-initiated offer => buyer enters destination via dialog
  // - buy offer => use buyer-provided destination stored on the offer
  const handleAcceptOffer = useCallback(
    async (offerId: string) => {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) return;
      if (!p2pService || !address) return;

      if (offer.isSellerInitiated) {
        setSelectedOffer(offer);
        setDeliveryDialogOpen(true);
        return;
      }

      if (!hasStoredDeliveryDestination(offer)) {
        setErrorMessage(
          'This buy offer is missing a delivery destination. Ask the buyer to recreate the offer with a delivery address.',
        );
        return;
      }

      setProcessingOfferId(offer.id);
      setErrorMessage(null);
      try {
        const storedLocation = offer.locationData!;
        const delivery: P2PDeliveryDetails = {
          senderNodeAddress:
            offer.nodes && offer.nodes.length > 0 ? offer.nodes[0] : address,
          receiverAddress: offer.buyer,
          parcelData: {
            startLocation: {
              lat: storedLocation.startLocation?.lat || '',
              lng: storedLocation.startLocation?.lng || '',
            },
            endLocation: {
              lat: storedLocation.endLocation.lat,
              lng: storedLocation.endLocation.lng,
            },
            startName: storedLocation.startName || 'Pickup Location',
            endName: storedLocation.endName,
          },
          bountyWei: BigInt('500000000000000000'),
          etaTimestamp: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600),
          tokenQuantity: BigInt(offer.quantity.toString()),
          assetId: BigInt(offer.tokenId),
          deliveryAddress: storedLocation.endName,
        };

        await p2pService.acceptOfferWithDelivery(offer.id, delivery);
        await loadOffers();
      } catch (error: unknown) {
        console.error('Error accepting buy offer with stored delivery:', error);
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to accept offer. Please try again.';
        setErrorMessage(msg);
        await loadOffers();
      } finally {
        setProcessingOfferId(null);
      }
    },
    [offers, p2pService, address, loadOffers],
  );

  // Confirm accept + schedule delivery
  const handleConfirmAcceptWithDelivery = useCallback(
    async (deliveryData: DeliveryFormData) => {
      if (!p2pService || !selectedOffer || !address) return;
      setProcessingOfferId(selectedOffer.id);
      setErrorMessage(null);
      try {
        const delivery: P2PDeliveryDetails = {
          senderNodeAddress: deliveryData.senderNodeAddress,
          receiverAddress: address,
          parcelData: {
            startLocation: {
              lat: selectedOffer.locationData?.startLocation?.lat || '',
              lng: selectedOffer.locationData?.startLocation?.lng || '',
            },
            endLocation: { lat: '', lng: '' },
            startName:
              selectedOffer.locationData?.startName || 'Pickup Location',
            endName: deliveryData.deliveryAddress,
          },
          bountyWei: BigInt('500000000000000000'), // 0.5 USDT default bounty
          etaTimestamp: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600), // 7 days
          tokenQuantity: BigInt(selectedOffer.quantity.toString()),
          assetId: BigInt(selectedOffer.tokenId),
          deliveryAddress: deliveryData.deliveryAddress,
        };

        await p2pService.acceptOfferWithDelivery(selectedOffer.id, delivery);

        setDeliveryDialogOpen(false);
        setSelectedOffer(null);
        await loadOffers();
      } catch (error: unknown) {
        console.error('Error accepting offer with delivery:', error);
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to accept offer. Please try again.';
        setErrorMessage(msg);
        await loadOffers();
        // Re-throw so the dialog can show the error too
        throw error;
      } finally {
        setProcessingOfferId(null);
      }
    },
    [p2pService, selectedOffer, address, loadOffers],
  );

  // Cancel an offer
  const handleCancelOffer = useCallback(
    async (offerId: string) => {
      if (!p2pService) return;
      setProcessingOfferId(offerId);
      setErrorMessage(null);
      try {
        await p2pService.cancelOffer(offerId);
        await loadOffers();
      } catch (error: unknown) {
        console.error('Error canceling offer:', error);
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to cancel offer. Please try again.';
        setErrorMessage(msg);
        await loadOffers();
      } finally {
        setProcessingOfferId(null);
      }
    },
    [p2pService, loadOffers],
  );

  const isTerminalOffer = useCallback((offer: P2POffer): boolean => {
    if (
      offer.status === P2POfferStatus.EXPIRED ||
      offer.status === P2POfferStatus.SETTLED ||
      offer.status === P2POfferStatus.CANCELLED
    ) {
      return true;
    }
    return (
      offer.expiresAt > 0 && offer.expiresAt <= Math.floor(Date.now() / 1000)
    );
  }, []);

  // Active P2P orders for this asset class
  const activeP2POrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.isP2P) return false;
      if (
        order.currentStatus === OrderStatus.SETTLED ||
        order.currentStatus === OrderStatus.CANCELLED
      )
        return false;
      return isTokenInClass(order.tokenId);
    });
  }, [orders, isTokenInClass]);

  const toggleP2PExpand = useCallback((orderId: string) => {
    setExpandedP2POrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }, []);

  const handleSignP2PDelivery = useCallback(
    async (orderId: string, journeyId: string) => {
      try {
        setP2PActionLoading(true);
        const result = await signP2PDelivery(orderId, journeyId);
        if (result === 'settled') {
          toast({
            title: 'Order Settled',
            description:
              'Both parties signed. Tokens and payment have been distributed.',
          });
        } else {
          toast({
            title: 'Delivery Signed',
            description: 'Your delivery signature has been recorded on-chain.',
          });
        }
        return result;
      } catch (err) {
        let toastTitle = 'Error';
        let toastDescription = 'Failed to sign for delivery. Please try again.';

        const roleConflictMessage = getJourneyRoleConflictMessage(err);
        if (roleConflictMessage) {
          toastTitle = 'Role Mismatch';
          toastDescription = roleConflictMessage;
        }

        toast({
          title: toastTitle,
          description: toastDescription,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setP2PActionLoading(false);
      }
    },
    [signP2PDelivery, toast],
  );

  const handleCompleteP2PHandoff = useCallback(
    async (orderId: string, journeyId: string) => {
      try {
        setP2PActionLoading(true);
        const result = await completeP2PHandoff(orderId, journeyId);
        if (result === 'settled') {
          toast({
            title: 'Handoff Complete',
            description:
              'The order has been settled. Tokens and payment distributed.',
          });
        } else if (result === 'driver_not_signed') {
          toast({
            title: 'Waiting for Driver',
            description:
              'The driver has not signed for delivery yet. Please wait.',
          });
        }
        return result;
      } catch (err) {
        let toastTitle = 'Error';
        let toastDescription = 'Failed to complete handoff. Please try again.';

        const roleConflictMessage = getJourneyRoleConflictMessage(err);
        if (roleConflictMessage) {
          toastTitle = 'Role Mismatch';
          toastDescription = roleConflictMessage;
        }

        toast({
          title: toastTitle,
          description: toastDescription,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setP2PActionLoading(false);
      }
    },
    [completeP2PHandoff, toast],
  );

  const handleScheduleDelivery = useCallback((orderId: string) => {
    setScheduleDeliveryOrderId(orderId);
    setScheduleDeliveryDialogOpen(true);
  }, []);

  const handleConfirmScheduleDelivery = useCallback(
    async (deliveryData: DeliveryFormData) => {
      if (!scheduleDeliveryOrderId || !address) return;
      const order = orders.find((o) => o.id === scheduleDeliveryOrderId);
      if (!order) return;
      try {
        setP2PActionLoading(true);
        const senderNode =
          deliveryData.senderNodeAddress ||
          order.seller ||
          order.nodes?.[0] ||
          '';
        const delivery: P2PDeliveryDetails = {
          senderNodeAddress: senderNode,
          receiverAddress: address,
          parcelData: {
            startLocation: {
              lat: order.locationData?.startLocation?.lat || '',
              lng: order.locationData?.startLocation?.lng || '',
            },
            endLocation: { lat: '', lng: '' },
            startName: order.locationData?.startName || 'Pickup Location',
            endName: deliveryData.deliveryAddress,
          },
          bountyWei: BigInt('500000000000000000'),
          etaTimestamp: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600),
          tokenQuantity: BigInt(order.tokenQuantity),
          assetId: BigInt(order.tokenId),
          deliveryAddress: deliveryData.deliveryAddress,
        };
        await createP2PJourney(scheduleDeliveryOrderId, delivery);
        setScheduleDeliveryDialogOpen(false);
        setScheduleDeliveryOrderId(null);
        toast({
          title: 'Delivery Scheduled',
          description: 'A delivery journey has been created for this order.',
        });
      } catch (err) {
        let toastTitle = 'Error';
        let toastDescription =
          err instanceof Error
            ? err.message
            : 'Failed to schedule delivery. Please try again.';

        const roleConflictMessage = getJourneyRoleConflictMessage(err);
        if (roleConflictMessage) {
          toastTitle = 'Role Mismatch';
          toastDescription = roleConflictMessage;
        }

        toast({
          title: toastTitle,
          description: toastDescription,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setP2PActionLoading(false);
      }
    },
    [scheduleDeliveryOrderId, address, orders, createP2PJourney, toast],
  );

  // Filter offers: by market class + by type
  // Uses pure function with direct data deps to avoid stale closure issues
  const filteredOffers = useMemo(() => {
    return filterOffersForMarket(
      offers,
      className,
      tokenIdToClass,
      assetMetadataMap,
      filterType,
    );
  }, [offers, className, tokenIdToClass, assetMetadataMap, filterType]);

  const hasKnownClass = useCallback(
    (tokenId: string): boolean => {
      if (tokenIdToClass.has(tokenId)) return true;
      try {
        const normalized = BigInt(tokenId).toString(10);
        if (tokenIdToClass.has(normalized)) return true;
      } catch {
        /* ignore */
      }
      return assetMetadataMap.has(tokenId);
    },
    [tokenIdToClass, assetMetadataMap],
  );

  // Filter my offers by class
  const filteredMyOffers = useMemo(() => {
    return myOffers.filter((offer) => {
      // Hide terminal offers in "My Offers"
      if (isTerminalOffer(offer)) {
        return false;
      }

      // Normal case: class is resolvable and matches current market
      if (
        isTokenInClassPure(
          offer.tokenId,
          className,
          tokenIdToClass,
          assetMetadataMap,
        )
      )
        return true;

      // During metadata/indexer lag or Pinata throttling, keep unresolved class
      // offers visible so newly created offers don't disappear from this tab.
      if (!hasKnownClass(offer.tokenId)) return true;

      return false;
    });
  }, [
    myOffers,
    className,
    tokenIdToClass,
    assetMetadataMap,
    hasKnownClass,
    isTerminalOffer,
  ]);

  // Check if user is the creator of an offer
  const isMyOffer = (offer: P2POffer) => {
    if (!address) return false;
    return offer.creator.toLowerCase() === address.toLowerCase();
  };

  // Check if the offer is targeted to a different user (can't accept it)
  const isTargetedToOther = (offer: P2POffer) => {
    if (!offer.targetCounterparty || !address) return false;
    const zeroAddr = '0x0000000000000000000000000000000000000000';
    if (offer.targetCounterparty.toLowerCase() === zeroAddr) return false;
    return offer.targetCounterparty.toLowerCase() !== address.toLowerCase();
  };

  // Format price for display
  const formatPrice = (price: bigint) => {
    return parseFloat(formatUnits(price, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  // Format expiry time
  const formatExpiry = (expiresAt: number) => {
    if (expiresAt === 0) return 'No expiry';
    const date = new Date(expiresAt * 1000);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return 'Expired';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h left`;
    return date.toLocaleDateString();
  };

  // Truncate address
  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Render offer card
  const renderOfferCard = (offer: P2POffer) => {
    const isMine = isMyOffer(offer);
    const isProcessing = processingOfferId === offer.id;
    const assetMeta = assetMetadataMap.get(offer.tokenId);

    return (
      <EvaPanel
        key={offer.id}
        label={assetMeta?.name || `Token ${offer.tokenId.slice(0, 8)}...`}
        sublabel={
          assetMeta
            ? `TID: ${offer.tokenId.slice(0, 10)}...${offer.tokenId.slice(-6)}`
            : truncateAddress(offer.token)
        }
        sysId={offer.isSellerInitiated ? 'SELL' : 'BUY'}
        accent={offer.isSellerInitiated ? 'gold' : 'crimson'}
        className="relative"
      >
        {/* Offer type badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {offer.isSellerInitiated ? (
              <Tag className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShoppingCart className="w-4 h-4 text-blue-400" />
            )}
            {assetMeta?.assetClass && (
              <EvaStatusBadge status="pending" label={assetMeta.assetClass} />
            )}
          </div>
          <EvaStatusBadge
            status={offer.isSellerInitiated ? 'active' : 'processing'}
            label={offer.isSellerInitiated ? 'SELL' : 'BUY'}
          />
        </div>

        {/* Asset Attributes */}
        {assetMeta?.attributes && assetMeta.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {assetMeta.attributes.map((attr) => (
              <span
                key={attr.name}
                className="px-2 py-0.5 font-mono text-xs bg-card/80 text-foreground/50 border border-border/20"
              >
                {attr.name
                  .split('_')
                  .filter(Boolean)
                  .map(
                    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                  )
                  .join(' ')}
                : {attr.values.length > 0 ? attr.values.join(', ') : 'N/A'}
              </span>
            ))}
          </div>
        )}

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold mb-1">
              Quantity
            </p>
            <p className="font-mono text-lg font-bold text-foreground tabular-nums">
              {offer.quantity.toString()}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold mb-1">
              Price
            </p>
            <p className="font-mono text-lg font-bold text-gold tabular-nums">
              ${formatPrice(offer.price)}
            </p>
          </div>
        </div>

        <EvaScanLine variant="gold" />

        {/* Creator and Expiry */}
        <div className="flex items-center justify-between font-mono text-sm mt-3">
          <div className="flex items-center gap-2 text-foreground/40">
            <User className="w-3 h-3" />
            <span className="tracking-[0.08em]">
              {isMine ? 'You' : truncateAddress(offer.creator)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-foreground/40">
            <Clock className="w-3 h-3" />
            <span className="tracking-[0.08em]">
              {formatExpiry(offer.expiresAt)}
            </span>
          </div>
        </div>

        {/* Target counterparty */}
        {offer.targetCounterparty && (
          <div className="font-mono text-xs text-foreground/30 bg-card/60 border border-border/15 px-3 py-2 mt-3">
            <span className="text-gold font-bold tracking-[0.1em]">
              TARGETED:
            </span>{' '}
            {truncateAddress(offer.targetCounterparty)}
          </div>
        )}

        {/* Actions */}
        <div className="pt-4">
          {isMine ? (
            <TrapButton
              variant="crimson"
              size="sm"
              className="w-full"
              onClick={() => handleCancelOffer(offer.id)}
              disabled={isProcessing}
            >
              <span className="flex items-center justify-center gap-2">
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Cancel Offer
              </span>
            </TrapButton>
          ) : isTargetedToOther(offer) ? (
            <div className="font-mono text-xs text-center text-foreground/25 py-2 tracking-[0.1em] uppercase">
              Targeted to another buyer
            </div>
          ) : (
            <TrapButton
              variant={offer.isSellerInitiated ? 'emerald' : 'gold'}
              size="sm"
              className="w-full"
              onClick={() => handleAcceptOffer(offer.id)}
              disabled={isProcessing || !connected}
            >
              <span className="flex items-center justify-center gap-2">
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {offer.isSellerInitiated ? 'Buy Now' : 'Sell Now'}
              </span>
            </TrapButton>
          )}
        </div>
      </EvaPanel>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <EvaPanel
      label={activeTab === 'my' ? 'No Offers Created' : 'No Open Offers'}
      sysId="EMPTY"
      status="offline"
    >
      <div className="text-center py-12">
        <div
          className="w-16 h-16 mx-auto mb-4 bg-card/80 flex items-center justify-center"
          style={{
            clipPath:
              'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
          }}
        >
          <ShoppingCart className="w-8 h-8 text-foreground/20" />
        </div>
        <h3 className="font-mono text-lg font-bold text-foreground tracking-[0.15em] uppercase mb-2">
          {activeTab === 'my' ? 'No Offers Created' : 'No Open Offers'}
        </h3>
        <p className="font-mono text-sm text-foreground/40 mb-6 max-w-md mx-auto tracking-[0.05em]">
          {activeTab === 'my'
            ? `You haven't created any ${className} P2P offers yet.`
            : `No open ${className} P2P offers at the moment. Be the first!`}
        </p>
        <TrapButton
          variant="gold"
          onClick={() => router.push('/customer/p2p/create')}
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Offer
          </span>
        </TrapButton>
      </div>
    </EvaPanel>
  );

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-64 bg-card/40 animate-pulse"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Decorative top strip */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="mb-8 mt-6">
          <button
            onClick={() => router.push('/customer/p2p')}
            className="flex items-center gap-2 font-mono text-sm text-foreground/40 hover:text-foreground transition-colors mb-4 tracking-[0.1em] uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LaurelAccent side="left" />
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground tracking-[0.15em] uppercase">
                  {className} P2P Market
                </h1>
                <p className="font-mono text-sm text-foreground/40 mt-1 tracking-[0.1em] uppercase">
                  Peer-to-peer offers for {className} assets
                </p>
              </div>
              <LaurelAccent side="right" />
            </div>
            <div className="flex items-center gap-3">
              <EvaStatusBadge status="active" label="Live" />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className={cn(
                  'p-2',
                  'bg-card/60 border border-border/25',
                  'hover:border-gold/30 transition-colors',
                  'disabled:opacity-40 disabled:pointer-events-none',
                )}
                style={{
                  clipPath:
                    'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                }}
                aria-label="Refresh offers"
              >
                <RefreshCw
                  className={cn(
                    'w-4 h-4 text-foreground/40',
                    (isRefreshing || isLoading) && 'animate-spin',
                  )}
                />
              </button>
              <TrapButton
                variant="gold"
                size="sm"
                onClick={() => router.push('/customer/p2p/create')}
                disabled={!connected}
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Offer
                </span>
              </TrapButton>
            </div>
          </div>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Tabs and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <EvaButton
              variant="gold"
              size="sm"
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
            >
              All Offers
            </EvaButton>
            <EvaButton
              variant="gold"
              size="sm"
              active={activeTab === 'my'}
              onClick={() => setActiveTab('my')}
            >
              My Offers
              {filteredMyOffers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-[10px] bg-gold/20 text-gold">
                  {filteredMyOffers.length}
                </span>
              )}
            </EvaButton>
          </div>

          {/* Filter */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-foreground/30" />
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as 'all' | 'buy' | 'sell')
                }
                className="bg-background/80 border border-border/40 rounded-none px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-gold/50"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                <option value="all">All Types</option>
                <option value="sell">Sell Offers</option>
                <option value="buy">Buy Offers</option>
              </select>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 border border-crimson/30 bg-crimson/5 px-4 py-3 font-mono text-sm text-crimson">
            <X className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 tracking-[0.05em]">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="shrink-0 text-crimson/60 hover:text-crimson transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Section Marker */}
        <EvaSectionMarker
          section={activeTab === 'all' ? 'Open Offers' : 'My Offers'}
          label={className}
          variant="crimson"
        />

        {/* Content */}
        {isLoading ? (
          renderSkeleton()
        ) : activeTab === 'all' ? (
          filteredOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredOffers.map(renderOfferCard)}
            </div>
          ) : (
            renderEmptyState()
          )
        ) : filteredMyOffers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMyOffers.map(renderOfferCard)}
          </div>
        ) : (
          renderEmptyState()
        )}

        {/* Active P2P Orders for this class */}
        {activeP2POrders.length > 0 && (
          <>
            <div className="mt-8">
              <EvaSectionMarker
                section="Active Orders"
                label={className}
                variant="gold"
              />
            </div>
            <div className="space-y-4 mt-4">
              {activeP2POrders.map((order) => {
                const isExpanded = expandedP2POrders[order.id];
                const assetMeta = assetMetadataMap.get(order.tokenId);
                return (
                  <EvaPanel
                    key={order.id}
                    label={
                      assetMeta?.name || `Order ${order.id.slice(0, 8)}...`
                    }
                    sublabel={`Order ID: ${order.id.slice(0, 10)}...${order.id.slice(-6)}`}
                    sysId="P2P"
                    accent="gold"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gold" />
                        <span className="font-mono text-xs text-foreground/50">
                          Qty: {order.tokenQuantity} · $
                          {formatPrice(BigInt(order.price))}
                        </span>
                      </div>
                      <EvaButton
                        variant="gold"
                        size="sm"
                        active={isExpanded}
                        onClick={() => toggleP2PExpand(order.id)}
                      >
                        {isExpanded ? 'Hide Flow' : 'View Flow'}
                      </EvaButton>
                    </div>
                    {isExpanded && (
                      <P2POrderFlow
                        order={order}
                        onSettled={(orderId) => {
                          setSelectedPendingOrder(orderId);
                          setIsSettlementModalOpen(true);
                        }}
                        onSignDelivery={handleSignP2PDelivery}
                        onCompleteHandoff={handleCompleteP2PHandoff}
                        onScheduleDelivery={handleScheduleDelivery}
                        fetchSignatureState={getP2PSignatureState}
                        isActionLoading={p2pActionLoading}
                      />
                    )}
                  </EvaPanel>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom decorative strip */}
        <div className="mt-8">
          <GreekKeyStrip color="crimson" />
        </div>
      </div>

      {/* Delivery Details Dialog */}
      {selectedOffer && (
        <DeliveryDetailsDialog
          offer={selectedOffer}
          open={deliveryDialogOpen}
          onOpenChange={(open) => {
            setDeliveryDialogOpen(open);
            if (!open) {
              setSelectedOffer(null);
              setProcessingOfferId(null);
            }
          }}
          onConfirm={handleConfirmAcceptWithDelivery}
          assetName={assetMetadataMap.get(selectedOffer.tokenId)?.name}
        />
      )}

      {/* Settlement Destination Modal */}
      {selectedPendingOrder && (
        <SettlementDestinationModal
          isOpen={isSettlementModalOpen}
          orderId={selectedPendingOrder}
          onClose={() => {
            setIsSettlementModalOpen(false);
            setSelectedPendingOrder(null);
          }}
          onSuccess={() => {
            refetchSettlements();
          }}
        />
      )}

      {/* Delivery Details Dialog for stuck P2P orders */}
      {scheduleDeliveryOrderId &&
        (() => {
          const stuckOrder = orders.find(
            (o) => o.id === scheduleDeliveryOrderId,
          );
          if (!stuckOrder) return null;
          const pseudoOffer: P2POffer = {
            id: stuckOrder.id,
            creator: stuckOrder.seller,
            targetCounterparty: null,
            token: stuckOrder.token,
            tokenId: stuckOrder.tokenId,
            quantity: BigInt(stuckOrder.tokenQuantity),
            price: BigInt(stuckOrder.price),
            txFee: BigInt(stuckOrder.txFee),
            isSellerInitiated: true,
            status: P2POfferStatus.PROCESSING,
            buyer: stuckOrder.buyer,
            seller: stuckOrder.seller,
            createdAt: 0,
            expiresAt: 0,
            locationData: stuckOrder.locationData,
            nodes: stuckOrder.nodes || [],
          };
          return (
            <DeliveryDetailsDialog
              offer={pseudoOffer}
              open={scheduleDeliveryDialogOpen}
              onOpenChange={(open) => {
                setScheduleDeliveryDialogOpen(open);
                if (!open) setScheduleDeliveryOrderId(null);
              }}
              onConfirm={handleConfirmScheduleDelivery}
              assetName={stuckOrder.asset?.name}
              initialDeliveryAddress={stuckOrder.locationData?.endName || ''}
              lockDeliveryAddress={Boolean(stuckOrder.locationData?.endName)}
            />
          );
        })()}
    </div>
  );
}
