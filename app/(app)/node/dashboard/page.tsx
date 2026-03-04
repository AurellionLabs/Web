'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Server,
  Package,
  DollarSign,
  Activity,
  MapPin,
  FileText,
  Link2,
  Lock,
  Trash2,
  ChevronDown,
  ExternalLink,
  Eye,
  Clock,
} from 'lucide-react';
import {
  EvaPanel,
  HexStatCard,
  ScanTable,
  ChevronTableRow,
  TrapButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  EvaProgress,
  LaurelAccent,
  HexCluster,
  TargetRings,
  GreekKeyStrip,
  EvaSystemReadout,
} from '@/app/components/eva/eva-components';
import {
  SpinningReticle,
  PulsingHexNetwork,
  CascadeLoadBars,
  useCounter,
} from '@/app/components/eva/eva-animations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Form } from '@/app/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { useNodes } from '@/app/providers/nodes.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import type {
  TokenizedAsset,
  TokenizedAssetAttribute,
  SupportingDocument,
} from '@/domain/node';
import { useToast } from '@/hooks/use-toast';
import { MapView } from '@/app/components/ui/map-view';
import AssetSelectionForm from './asset-selection-form';
import { usePlatform } from '@/app/providers/platform.provider';
import type { Asset } from '@/domain/shared';

type AttributeValue = string | number | boolean;
import { Order, OrderStatus } from '@/domain/orders';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  type EmitSigEventsByJourneyResponse,
} from '@/infrastructure/shared/graph-queries';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';

const tokenizeFormSchema = z.object({
  assetClass: z.string().min(1, { message: 'Please select an asset class.' }),
  assetId: z.string({
    required_error: 'Please select an asset.',
  }),
  quantity: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid quantity greater than 0.',
    },
  ),
  // Price removed - set when placing sell orders on CLOB
  assetAttributes: z.record(z.string(), z.record(z.string(), z.any())),
});

interface EditingCapacity {
  id: number;
  value: string;
}

/* StatCard removed — using HexStatCard from EVA components */

export default function NodeDashboardPage() {
  const {
    selectedNodeAddress,
    nodeData: currentNodeData,
    orders,
    assets: nodeAssets,
    supportingDocuments,
    loading: nodeLoading,
    documentsLoading,
    selectNode,
    mintAsset,
    updateNodeStatus,
    updateAssetCapacity,
    getAssetAttributes,
    refreshAssets,
    refreshDocuments,
    addSupportingDocument,
    removeSupportingDocument,
    packageSign,
    startJourney,
    refreshOrders,
  } = useSelectedNode();

  const { refreshNodes } = useNodes();
  const router = useRouter();
  const { toast } = useToast();
  const { isReadOnly: diamondIsReadOnly } = useDiamond();

  const searchParams = new URLSearchParams(window.location.search);
  const nodeIdFromUrl = searchParams.get('nodeId');
  const viewMode = searchParams.get('view');
  // Read-only if URL says public OR if Diamond context is in read-only mode (no wallet)
  const isReadOnly = viewMode === 'public' || diamondIsReadOnly;

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isViewingOrders, setIsViewingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  const assets = nodeAssets;
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [assetAttributes, setAssetAttributes] = useState<
    Record<string, Record<string, AttributeValue>>
  >({});
  const [assetAttributesData, setAssetAttributesData] = useState<
    Record<string, TokenizedAssetAttribute[]>
  >({});
  const [loadingAttributes, setLoadingAttributes] = useState<boolean>(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);
  const [editingCapacity, setEditingCapacity] =
    useState<EditingCapacity | null>(null);
  const { supportedAssetClasses, getAssetByTokenId } = usePlatform();
  const [selectedAssetName, setSelectedAssetName] = useState<string>('');

  // Document management state
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [showDocumentHistory, setShowDocumentHistory] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    url: '',
    title: '',
    description: '',
    documentType: 'certification',
  });

  // ── Order completion percentage (completed vs total) ──
  const totalOrders = orders?.length || 0;
  const completedOrders =
    orders?.filter((o) => o.currentStatus === OrderStatus.SETTLED).length || 0;
  const orderCompletionTarget =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const [completionMounted, setCompletionMounted] = useState(false);
  useEffect(() => {
    if (totalOrders > 0) setCompletionMounted(true);
  }, [totalOrders]);
  const animatedCompletion = useCounter(
    orderCompletionTarget,
    2000,
    completionMounted,
  );

  // Track local status overrides after signing (e.g., awaiting driver signature)
  const [signedOrders, setSignedOrders] = useState<Record<string, boolean>>({});

  // Track which P2P orders are expanded to show the flow detail
  const [expandedP2POrders, setExpandedP2POrders] = useState<
    Record<string, boolean>
  >({});

  const toggleP2PExpand = (orderId: string) => {
    setExpandedP2POrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  /**
   * Fetch live signature states for a P2P order's journey.
   * Uses journey.journeyStart to distinguish pickup sigs from delivery sigs.
   * Returns pickup signature states for Pending journeys (status 0).
   */
  const getP2PSignatureState = async (
    _orderId: string,
    journeyId: string,
  ): Promise<{
    buyerSigned: boolean;
    driverDeliverySigned: boolean;
    senderPickupSigned?: boolean;
    driverPickupSigned?: boolean;
  }> => {
    try {
      const repoContext = RepositoryContext.getInstance();
      const ausys = repoContext.getAusysContract();
      const journey = await ausys.getJourney(journeyId);
      const status = Number(journey.currentStatus);

      if (status >= 2) {
        return {
          buyerSigned: true,
          driverDeliverySigned: true,
          senderPickupSigned: true,
          driverPickupSigned: true,
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
          // Pending — check pickup signatures (events BEFORE journey start, or all if journeyStart === 0)
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
          };
        }

        if (status === 1) {
          // InTransit — pickup already done, check delivery sigs
          // Only sigs AFTER pickup count as delivery sigs
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
          };
        }
      } catch (indexerErr) {
        console.warn('[NodeDashboard] EmitSig query failed:', indexerErr);
      }

      return { buyerSigned: false, driverDeliverySigned: false };
    } catch (err) {
      console.warn('[NodeDashboard] getP2PSignatureState error:', err);
      return { buyerSigned: false, driverDeliverySigned: false };
    }
  };

  const form = useForm<z.infer<typeof tokenizeFormSchema>>({
    resolver: zodResolver(tokenizeFormSchema),
    defaultValues: {
      assetClass: '',
      assetId: '',
      quantity: '',
      assetAttributes: {},
    },
  });

  useEffect(() => {
    if (nodeIdFromUrl && nodeIdFromUrl !== selectedNodeAddress) {
      const attemptSelection = async () => {
        try {
          await selectNode(nodeIdFromUrl);
        } catch (error) {
          console.error('Error selecting node from URL:', error);
          toast({
            title: 'Error',
            description:
              'Failed to load node data. Please ensure your wallet is connected and try again.',
            variant: 'destructive',
          });
        }
      };

      attemptSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdFromUrl, selectedNodeAddress, selectNode]); // toast excluded: stable callback, including would cause infinite re-render

  // When returning to this page with an already-selected node, force a fresh load
  // so newly created offers/orders appear without requiring a hard browser reload.
  useEffect(() => {
    if (!nodeIdFromUrl || !selectedNodeAddress) return;
    if (nodeIdFromUrl !== selectedNodeAddress) return;

    const refreshOnEntry = async () => {
      try {
        await refreshOrders();
        // Follow-up refresh for eventual indexer consistency.
        setTimeout(() => {
          refreshOrders();
        }, 2000);
      } catch (err) {
        console.warn('[NodeDashboard] Failed to refresh orders on entry:', err);
      }
    };

    refreshOnEntry();
  }, [nodeIdFromUrl, selectedNodeAddress, refreshOrders]);

  const onSubmit = async (values: z.infer<typeof tokenizeFormSchema>) => {
    if (!selectedNodeAddress || !currentNodeData) return;

    setCapacityError(null);
    setIsTokenizing(true);
    try {
      const assetIdStr = values.assetId;
      const assetId = Number(assetIdStr);
      const quantity = Number(values.quantity);

      const assetInfo = currentNodeData.assets?.find(
        (a) => Number(a.tokenId) === assetId,
      );
      if (assetInfo) {
        const totalCapacity = Number(assetInfo.capacity);
        const currentTokenizedAsset = assets.find(
          (a) => Number(a.id) === assetId,
        );
        const currentAmount = currentTokenizedAsset
          ? Number(currentTokenizedAsset.amount)
          : 0;
        const remainingCapacity = totalCapacity - currentAmount;

        if (quantity > remainingCapacity) {
          setCapacityError(
            `You are exceeding capacity for ${getAssetByTokenId(assetIdStr)}. Remaining capacity: ${remainingCapacity}. Increase capacity to tokenize more assets of this type.`,
          );
          setIsTokenizing(false);
          return;
        }
      }

      const selectedValues = assetAttributes[assetIdStr] || {};
      const normalizedAttributes = Object.entries(selectedValues)
        .filter(
          ([attrName, attrValue]) => attrName != null && attrValue != null,
        )
        .map(([attrName, attrValue]) => ({
          name: String(attrName),
          values: [String(attrValue)],
          description: '',
        }));
      const assetPayload: Asset = {
        assetClass: form.getValues('assetClass'),
        tokenId: assetIdStr,
        tokenID: BigInt(assetIdStr), // Deprecated, kept for backward compatibility
        name: selectedAssetName,
        attributes: normalizedAttributes,
      };
      // Price is set when placing sell orders on CLOB, not during tokenization
      await mintAsset(assetPayload, quantity);

      await loadAssetAttributes(assets);

      toast({ title: 'Success', description: 'Asset tokenized successfully' });
      setIsAddAssetOpen(false);
      form.reset();
      setCapacityError(null);
      setAssetAttributes({});
    } catch (error) {
      console.error('Error tokenizing asset:', error);
      setCapacityError('Failed to tokenize asset. Please try again.');
    } finally {
      setIsTokenizing(false);
    }
  };

  const supportedAssetsCount = assets.length;
  // Total quantity of all tokenized assets — use actual ERC1155 balance (amount),
  // which correctly accounts for tokens escrowed in active orders.
  const totalTokenizedQuantity = assets.reduce(
    (total, asset) => total + Number(asset.amount),
    0,
  );

  // ── Reputation scores (4 categories) ──
  // 1. Amount Tokenized — tokenized quantity vs total capacity
  const totalCapacity =
    currentNodeData?.assets?.reduce(
      (sum, a) => sum + Number(a.capacity || 0),
      0,
    ) || 0;
  const reputationTokenized =
    totalCapacity > 0
      ? Math.min(
          Math.round((totalTokenizedQuantity / totalCapacity) * 100),
          100,
        )
      : 0;

  // 2. Security — has audit/insurance docs been uploaded?
  const securityDocTypes = ['audit', 'insurance', 'certification'];
  const uploadedSecurityDocs =
    supportingDocuments?.filter((d) =>
      securityDocTypes.some((t) => d.documentType?.toLowerCase().includes(t)),
    )?.length || 0;
  const reputationSecurity = Math.min(
    Math.round(
      (uploadedSecurityDocs / Math.max(securityDocTypes.length, 1)) * 100,
    ),
    100,
  );

  // 3. Chain Sync — orders that have been attested (processing or settled) vs total
  const attestedOrders =
    orders?.filter(
      (o) =>
        o.currentStatus === OrderStatus.PROCESSING ||
        o.currentStatus === OrderStatus.SETTLED,
    ).length || 0;
  const reputationChainSync =
    totalOrders > 0 ? Math.round((attestedOrders / totalOrders) * 100) : 0;

  // 4. Settlement — settled orders vs orders needing settlement
  const ordersNeedingSettlement =
    orders?.filter(
      (o) =>
        o.currentStatus === OrderStatus.PROCESSING ||
        o.currentStatus === OrderStatus.SETTLED,
    ).length || 0;
  const reputationSettlement =
    ordersNeedingSettlement > 0
      ? Math.round((completedOrders / ordersNeedingSettlement) * 100)
      : 0;
  const nodeSyncAggregate = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (reputationTokenized +
          reputationSecurity +
          reputationChainSync +
          reputationSettlement) /
          4,
      ),
    ),
  );

  const getAssetsSummaryByClass = () => {
    const summary: Record<string, { quantity: number }> = {};

    // Deduplicate assets by token ID to avoid double-counting
    const seenTokenIds = new Set<string>();
    assets.forEach((asset) => {
      const tokenId = String(asset.id || '');
      if (seenTokenIds.has(tokenId)) return;
      seenTokenIds.add(tokenId);

      const assetClass = asset.class || 'Unknown';
      const quantity = Number(asset.amount) || 0;

      if (summary[assetClass]) {
        summary[assetClass].quantity += quantity;
      } else {
        summary[assetClass] = { quantity };
      }
    });

    return Object.entries(summary).map(([assetClass, { quantity }]) => ({
      assetClass,
      totalQuantity: quantity,
    }));
  };

  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const loadAssetAttributes = async (assets: TokenizedAsset[]) => {
    if (assets.length === 0) return;

    setLoadingAttributes(true);
    const attributesMap: Record<string, TokenizedAssetAttribute[]> = {};

    try {
      await Promise.all(
        assets.map(async (asset) => {
          try {
            // Fetch full asset metadata from IPFS via platform provider
            const ipfsAsset = await getAssetByTokenId(asset.id);
            if (
              ipfsAsset &&
              ipfsAsset.attributes &&
              ipfsAsset.attributes.length > 0
            ) {
              attributesMap[asset.id] = ipfsAsset.attributes.map((attr) => ({
                name: attr.name,
                value: attr.values.join(', '),
                description: attr.description,
              }));
            } else {
              attributesMap[asset.id] = [];
            }
          } catch (error) {
            console.error(
              `Error loading attributes for asset ${asset.id}:`,
              error,
            );
            attributesMap[asset.id] = [];
          }
        }),
      );

      setAssetAttributesData(attributesMap);
    } catch (error) {
      console.error('Error loading asset attributes:', error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  useEffect(() => {
    if (assets.length > 0) {
      loadAssetAttributes(assets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]); // loadAssetAttributes excluded: intentionally runs once when assets change, function reference is stable

  const handleAssetAttributeChange = (
    assetId: string,
    attributeName: string,
    value: AttributeValue,
  ) => {
    const currentAttributes = assetAttributes[assetId] || {};
    setAssetAttributes({
      ...assetAttributes,
      [assetId]: {
        ...currentAttributes,
        [attributeName]: value,
      },
    });
  };

  const renderAssetDetailsRows = () => {
    if (!assets || assets.length === 0) {
      return (
        <tr>
          <td />
          <td colSpan={6} className="p-4 text-center text-muted-foreground">
            No assets found
          </td>
          <td />
        </tr>
      );
    }

    // Deduplicate assets by token ID before rendering
    const seenIds = new Set<string>();
    const uniqueAssets = assets.filter((asset) => {
      const id = String(asset.id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    return uniqueAssets.map((asset) => {
      const attributes = assetAttributesData[asset.id] || [];
      const hasAttributes = attributes.length > 0;

      return (
        <React.Fragment key={asset.id}>
          <tr className="border-b border-glass-border hover:bg-glass-hover transition-colors">
            <td />
            <td className="p-4 font-mono text-sm text-foreground">
              {truncateId(asset.id)}
            </td>
            <td className="p-4 text-foreground">{asset.name}</td>
            <td className="p-4 capitalize text-foreground">{asset.class}</td>
            <td className="p-4 font-mono text-foreground">
              {Number(asset.amount ?? '0').toLocaleString()}
            </td>
            <td className="p-4 font-mono text-foreground/50">
              {Number(asset.capacity ?? '0').toLocaleString()}
            </td>
            <td className="p-4 font-mono text-muted-foreground text-sm">
              Set via trading
            </td>
            <td />
          </tr>
          {/* Attributes row */}
          <tr className="border-b border-glass-border">
            <td />
            <td colSpan={6} className="px-4 pb-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {loadingAttributes ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : hasAttributes ? (
                  <div className="flex flex-wrap gap-2">
                    {attributes.map((attr, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs"
                        title={attr.description || undefined}
                      >
                        <span className="font-medium">{attr.name}:</span>
                        <span>{attr.value}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">
                    No attributes
                  </span>
                )}
              </div>
            </td>
            <td />
          </tr>
        </React.Fragment>
      );
    });
  };

  const truncateId = (value: string, max: number = 10) =>
    value && value.length > max ? value.slice(0, max) + '...' : value;

  const handleStatusUpdate = async () => {
    if (!currentNodeData) return;

    setIsUpdatingStatus(true);
    try {
      const newStatus =
        currentNodeData.status === 'Active' ? 'Inactive' : 'Active';
      await updateNodeStatus(newStatus);
      toast({
        title: 'Success',
        description: 'Node status updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update node status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmPickup = async (
    order: Order,
  ): Promise<'started' | 'waiting_for_driver' | 'signed'> => {
    try {
      const journeyId = order.journeyIds?.[0];
      if (!journeyId) {
        toast({
          title: 'Error',
          description: 'No journey found for this order',
          variant: 'destructive',
        });
        return 'signed';
      }

      // Safety guard: in P2P flows the sender should only sign pickup after
      // the driver has already signed pickup (driver accepted and acknowledged).
      if (order.isP2P) {
        const sigState = await getP2PSignatureState(order.id, journeyId);
        if (!sigState.driverPickupSigned) {
          toast({
            title: 'Driver Signature Required',
            description:
              'The driver must sign pickup first before you can confirm pickup.',
          });
          return 'waiting_for_driver';
        }
      }

      await packageSign(journeyId);

      // Try to start journey (requires both driver + sender signatures)
      try {
        await startJourney(journeyId);
        toast({
          title: 'Success',
          description: 'Pickup confirmed and journey started',
        });

        // Wait for indexer to catch up, then refresh
        await new Promise((r) => setTimeout(r, 3000));
        await refreshOrders();
        setTimeout(() => refreshOrders(), 5000);

        return 'started';
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const msg = err.message || '';
        // ethers errors may carry extra fields (e.g. revert data)
        const errData = (e as { data?: string })?.data;

        const isDriverPending =
          msg.includes('DriverNotSigned') ||
          msg.includes('0x9651c947') ||
          errData === '0x9651c947';

        const isSenderPending =
          msg.includes('SenderNotSigned') ||
          msg.includes('0x4b2c0751') ||
          errData === '0x4b2c0751';

        if (isDriverPending) {
          setSignedOrders((prev) => ({ ...prev, [order.id]: true }));
          toast({
            title: 'Pickup Signature Recorded',
            description:
              'Your signature is recorded. Waiting for driver to sign.',
          });
          return 'waiting_for_driver';
        } else if (isSenderPending || msg.includes('revert')) {
          setSignedOrders((prev) => ({ ...prev, [order.id]: true }));
          toast({
            title: 'Pickup Signature Recorded',
            description:
              'Your signature is recorded. Waiting for other party to sign.',
          });
          return 'signed';
        } else {
          toast({
            title: 'Error',
            description: 'Pickup signed, but failed to start journey. ' + msg,
            variant: 'destructive',
          });
          return 'signed';
        }
      }
    } catch (e) {
      const err = e as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to sign for pickup',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const handleCapacityUpdate = async (assetId: number, newValue: string) => {
    if (!currentNodeData) return;

    setIsUpdatingCapacity(true);
    try {
      await updateAssetCapacity(
        currentNodeData.owner,
        String(assetId),
        parseInt(newValue),
      );

      setEditingCapacity(null);
      toast({ title: 'Success', description: 'Capacity updated successfully' });
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update capacity',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  // Document handlers
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentForm.url || !documentForm.title) {
      toast({
        title: 'Error',
        description: 'URL and title are required',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingDocument(true);
    try {
      const isFrozen = await addSupportingDocument(
        documentForm.url,
        documentForm.title,
        documentForm.description,
        documentForm.documentType,
      );

      toast({
        title: 'Document Added',
        description: isFrozen
          ? 'Document added and detected as immutable (IPFS/Arweave)'
          : 'Document added successfully',
      });

      setIsAddDocumentOpen(false);
      setDocumentForm({
        url: '',
        title: '',
        description: '',
        documentType: 'certification',
      });
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: 'Error',
        description: 'Failed to add document',
        variant: 'destructive',
      });
    } finally {
      setIsAddingDocument(false);
    }
  };

  const handleRemoveDocument = async (url: string) => {
    try {
      await removeSupportingDocument(url);
      toast({
        title: 'Document Removed',
        description: 'Document has been removed from your node',
      });
    } catch (error) {
      console.error('Error removing document:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove document',
        variant: 'destructive',
      });
    }
  };

  // Filter documents into active and removed
  const activeDocuments = supportingDocuments.filter((doc) => !doc.isRemoved);
  const removedDocuments = supportingDocuments.filter((doc) => doc.isRemoved);

  if (nodeLoading || (!currentNodeData && nodeIdFromUrl)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-gold animate-spin" />
          <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40">
            Loading node data...
          </p>
          {nodeIdFromUrl && (
            <p className="font-mono text-xs text-foreground/20 tabular-nums">
              Node ID: {nodeIdFromUrl.slice(0, 10)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!currentNodeData && !nodeIdFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EvaPanel label="No Node Selected" sysId="ERR.404" accent="crimson">
          <div className="text-center py-8 px-6">
            <TargetRings size={80} className="mx-auto mb-4" />
            <p className="font-mono text-sm text-foreground/40 mb-6">
              Please select a node to view its dashboard
            </p>
            <TrapButton
              variant="gold"
              onClick={() => router.push('/node/overview')}
            >
              Go to Node Overview
            </TrapButton>
          </div>
        </EvaPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative">
          <div className="flex items-start gap-4">
            <LaurelAccent side="left" className="hidden md:block mt-1" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                  Node Dashboard
                </h1>
                {isReadOnly && (
                  <EvaStatusBadge status="pending" label="View Only" />
                )}
              </div>
              <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40 mt-1">
                {isReadOnly
                  ? 'Viewing node details in read-only mode'
                  : 'Manage your node and its assets'}
              </p>
              <GreekKeyStrip color="crimson" />
            </div>
          </div>
          {!isReadOnly && (
            <Dialog
              open={isAddAssetOpen}
              onOpenChange={(open) => {
                setIsAddAssetOpen(open);
                if (!open) {
                  form.reset();
                  setAssetAttributes({});
                  setCapacityError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <TrapButton variant="gold" disabled={isTokenizing}>
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Asset
                  </span>
                </TrapButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Tokenize New Asset</DialogTitle>
                  <DialogDescription>
                    Add a new asset to be tokenized in the network.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <AssetSelectionForm
                      selectedAssetClass={form.watch('assetClass')}
                      selectedAssetId={form.watch('assetId')}
                      quantity={form.watch('quantity')}
                      supportedAssetClasses={supportedAssetClasses}
                      onAssetClassChange={(value) => {
                        form.setValue('assetClass', value);
                      }}
                      onAssetIdChange={(value) => {
                        form.setValue('assetId', value);
                      }}
                      onQuantityChange={(value) =>
                        form.setValue('quantity', value)
                      }
                      assetAttributes={assetAttributes}
                      onAssetAttributeChange={handleAssetAttributeChange}
                      onSelectedAssetChange={(asset) =>
                        setSelectedAssetName(asset?.name || '')
                      }
                    />
                    {capacityError && (
                      <p className="text-sm font-medium text-crimson font-mono">
                        {capacityError}
                      </p>
                    )}
                    <TrapButton
                      variant="gold"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={isTokenizing}
                      className="w-full"
                    >
                      {isTokenizing ? 'Tokenizing...' : 'Tokenize Asset'}
                    </TrapButton>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <EvaScanLine variant="mixed" />

        {/* ── Stats Overview — Hex Cards + Spinning Reticle ── */}
        <div className="relative">
          <HexCluster size="md" className="absolute top-2 right-8" />
          <div className="grid grid-cols-12 gap-3">
            {/* Node Status — large notched card with Spinning Reticle */}
            <div
              className="col-span-12 md:col-span-5 relative overflow-hidden"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
              }}
            >
              <div
                className="absolute inset-0 bg-card/70"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
                }}
              />
              <div
                className={`absolute top-0 left-0 w-1 bottom-4 ${currentNodeData?.status === 'Active' ? 'bg-emerald-500/40' : 'bg-crimson/40'}`}
              />
              <div className="absolute inset-0 eva-hex-pattern opacity-20 pointer-events-none" />
              <EvaSystemReadout
                lines={['NODE.CTRL', 'UPTIME:OK', 'SYNC:100%']}
                position="right"
              />
              <div className="relative p-6 ml-1 flex items-center gap-6">
                <div className="flex-1">
                  <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/45 block mb-3 font-bold">
                    Node Status
                  </span>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div
                        className={`w-3.5 h-3.5 rounded-full ${currentNodeData?.status === 'Active' ? 'bg-emerald-500' : 'bg-crimson'}`}
                      />
                      <div
                        className={`absolute inset-0 w-3.5 h-3.5 rounded-full animate-ping opacity-30 ${currentNodeData?.status === 'Active' ? 'bg-emerald-500' : 'bg-crimson'}`}
                      />
                    </div>
                    <span
                      className={`font-mono text-4xl font-bold ${currentNodeData?.status === 'Active' ? 'text-emerald-400' : 'text-crimson'}`}
                    >
                      {currentNodeData?.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/35">
                        Order Completion
                      </span>
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${animatedCompletion === 100 ? 'text-emerald-400' : animatedCompletion >= 50 ? 'text-gold' : 'text-crimson'}`}
                      >
                        {animatedCompletion}%
                      </span>
                    </div>
                    <EvaProgress
                      value={animatedCompletion}
                      color={
                        animatedCompletion === 100
                          ? 'emerald'
                          : animatedCompletion >= 50
                            ? 'gold'
                            : 'crimson'
                      }
                    />
                  </div>
                </div>
                {/* Spinning Reticle — Node Sync Visualization */}
                <div className="hidden lg:block">
                  <SpinningReticle
                    size={130}
                    label="NODE SYNC"
                    value={nodeSyncAggregate}
                  />
                </div>
              </div>
            </div>
            {/* Hex stat cards */}
            <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-3">
              <HexStatCard
                label="Supported Assets"
                value={String(supportedAssetsCount)}
                sub="Total assets tokenized"
                color="gold"
                powerLevel={Math.min(supportedAssetsCount, 10)}
              />
              <HexStatCard
                label="Total Quantity"
                value={totalTokenizedQuantity.toLocaleString()}
                sub="Total tokenized units"
                color="gold"
                powerLevel={Math.min(
                  Math.ceil(totalTokenizedQuantity / 500),
                  10,
                )}
              />
            </div>
          </div>
          <div className="mt-4">
            <GreekKeyStrip color="gold" />
          </div>
        </div>

        <EvaSectionMarker
          section="SEC.01"
          label="Asset Registry"
          variant="gold"
        />

        {/* Tokenized Assets Summary */}
        <div className="relative">
          <TargetRings
            size={44}
            className="absolute top-6 right-12 hidden lg:block"
          />
          <EvaPanel
            label="Tokenized Assets"
            sublabel="Summary by class"
            sysId="REG.001"
            status="active"
            accent="gold"
          >
            <ScanTable headers={['Asset Class', 'Quantity']}>
              {getAssetsSummaryByClass().length > 0 ? (
                getAssetsSummaryByClass().map((summary, i) => (
                  <ChevronTableRow
                    key={summary.assetClass}
                    highlight={i === 0}
                    index={i + 1}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gold rotate-45" />
                        <span className="font-mono text-base text-foreground/85 font-bold capitalize">
                          {summary.assetClass}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono text-xl font-bold text-gold tabular-nums">
                        {summary.totalQuantity.toLocaleString()}
                      </span>
                    </td>
                  </ChevronTableRow>
                ))
              ) : (
                <tr>
                  <td />
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center font-mono text-sm text-foreground/30"
                  >
                    No tokenized assets found
                  </td>
                  <td />
                </tr>
              )}
            </ScanTable>
          </EvaPanel>
        </div>

        <EvaScanLine variant="crimson" />

        {/* Asset Details */}
        <EvaPanel
          label="Asset Details"
          sublabel="Capacity and attributes"
          sysId="AST.DTL"
          accent="crimson"
        >
          <ScanTable
            headers={[
              'ID',
              'Asset',
              'Class',
              'Quantity',
              'Capacity',
              'Trading',
            ]}
          >
            {renderAssetDetailsRows()}
          </ScanTable>
        </EvaPanel>

        <EvaSectionMarker section="SEC.02" label="Orders" variant="crimson" />

        {/* Orders */}
        <div className="relative">
          <LaurelAccent
            side="right"
            className="absolute right-4 top-12 hidden xl:block"
          />
          <EvaPanel
            label="Orders"
            sublabel="Track accepted orders"
            sysId="ORD.TRK"
            accent="crimson"
          >
            <div className="flex items-center justify-end mb-4">
              <TrapButton
                variant="gold"
                size="sm"
                onClick={async () => {
                  setIsViewingOrders(true);
                  try {
                    if (!selectedNodeAddress) {
                      toast({
                        title: 'Error',
                        description: 'No node selected to view orders.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    await router.push(`/node/${selectedNodeAddress}/orders`);
                  } finally {
                    setIsViewingOrders(false);
                  }
                }}
                disabled={isViewingOrders}
              >
                View All Orders
              </TrapButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-glass-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {currentOrders.map((order) => {
                    const isP2P = Boolean(order.isP2P);
                    const isExpanded = expandedP2POrders[order.id];

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={cn(
                            'hover:bg-glass-hover transition-colors',
                            isP2P && 'cursor-pointer',
                            isExpanded && 'bg-glass-hover',
                          )}
                          onClick={
                            isP2P ? () => toggleP2PExpand(order.id) : undefined
                          }
                        >
                          <td className="px-4 py-4 font-mono text-sm text-foreground">
                            <div className="flex items-center gap-2">
                              {truncateId(order.id, 12)}
                              {isP2P && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                  P2P
                                </span>
                              )}
                              {isP2P && (
                                <ChevronDown
                                  className={cn(
                                    'w-3 h-3 text-muted-foreground transition-transform',
                                    isExpanded && 'rotate-180',
                                  )}
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-sm text-foreground">
                            {truncateId(order.buyer, 12)}
                          </td>
                          <td className="px-4 py-4 capitalize text-foreground">
                            {order.asset?.name || 'Unknown Asset'}
                          </td>
                          <td className="px-4 py-4 font-mono text-foreground">
                            {order.tokenQuantity}
                          </td>
                          <td className="px-4 py-4 font-mono text-foreground">
                            ${formatTokenAmount(order.price, 18, 2)}
                          </td>
                          <td className="px-4 py-4">
                            {signedOrders[order.id] &&
                            order.currentStatus !== OrderStatus.PROCESSING &&
                            order.currentStatus !== OrderStatus.SETTLED ? (
                              <EvaStatusBadge
                                status="pending"
                                label="Awaiting Driver"
                              />
                            ) : (
                              <EvaStatusBadge
                                status={
                                  order.currentStatus === OrderStatus.SETTLED
                                    ? 'completed'
                                    : order.currentStatus ===
                                        OrderStatus.PROCESSING
                                      ? 'processing'
                                      : 'created'
                                }
                                label={order.currentStatus}
                              />
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {signedOrders[order.id] &&
                            order.currentStatus !== OrderStatus.PROCESSING &&
                            order.currentStatus !== OrderStatus.SETTLED ? (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                                <span className="text-xs text-amber-300">
                                  Awaiting driver signature
                                </span>
                              </div>
                            ) : !isP2P &&
                              (order.currentStatus === OrderStatus.CREATED ||
                                (order.currentStatus ===
                                  OrderStatus.PROCESSING &&
                                  order.journeyStatus === 0)) &&
                              order.seller?.toLowerCase() ===
                                currentNodeData?.owner?.toLowerCase() ? (
                              <TrapButton
                                variant="gold"
                                size="sm"
                                onClick={() => {
                                  handleConfirmPickup(order);
                                }}
                              >
                                Sign for Pickup
                              </TrapButton>
                            ) : order.currentStatus === OrderStatus.CREATED ? (
                              <span className="text-sm text-muted-foreground">
                                Pending
                              </span>
                            ) : order.currentStatus ===
                                OrderStatus.PROCESSING &&
                              order.journeyStatus === 0 ? (
                              <span className="text-sm text-amber-400 font-medium">
                                Awaiting Pickup
                              </span>
                            ) : order.currentStatus ===
                              OrderStatus.PROCESSING ? (
                              <span className="text-sm text-accent font-medium">
                                In Transit
                              </span>
                            ) : order.currentStatus === OrderStatus.SETTLED ? (
                              <span className="text-sm text-trading-buy font-medium">
                                Completed
                              </span>
                            ) : order.currentStatus ===
                              OrderStatus.CANCELLED ? (
                              <span className="text-sm text-trading-sell font-medium">
                                Cancelled
                              </span>
                            ) : null}
                          </td>
                        </tr>

                        {/* Expandable P2P Order Flow row */}
                        {isP2P && isExpanded && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-2 bg-surface-overlay/50"
                            >
                              <P2POrderFlow
                                order={order}
                                fetchSignatureState={getP2PSignatureState}
                                onSignPickup={
                                  order.seller?.toLowerCase() ===
                                  currentNodeData?.owner?.toLowerCase()
                                    ? async (orderId) => {
                                        const matchedOrder = orders.find(
                                          (o) => o.id === orderId,
                                        );
                                        if (!matchedOrder) {
                                          console.error(
                                            '[NodeDashboard] onSignPickup: order not found in orders array',
                                            orderId,
                                          );
                                          throw new Error(
                                            'Order not found. Please refresh and try again.',
                                          );
                                        }
                                        return await handleConfirmPickup(
                                          matchedOrder,
                                        );
                                      }
                                    : undefined
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              )}

              {/* Pagination Controls */}
              {orders.length > ordersPerPage && (
                <div className="mt-4 flex items-center justify-between px-2 pt-4 border-t border-border/15">
                  <div className="font-mono text-xs text-foreground/30 tracking-wider">
                    Showing {startIndex + 1} to{' '}
                    {Math.min(endIndex, orders.length)} of {orders.length}{' '}
                    orders
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsLeft className="w-4 h-4 text-foreground/40" />
                    </button>
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground/40" />
                    </button>
                    <span className="px-4 font-mono text-xs text-foreground/30 tabular-nums">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-foreground/40" />
                    </button>
                    <button
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4 text-foreground/40" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </EvaPanel>
        </div>

        <EvaSectionMarker section="SEC.03" label="Geography" variant="gold" />

        {/* Node Location */}
        <div className="relative">
          <HexCluster
            size="lg"
            className="absolute top-4 left-12 hidden lg:block"
          />
          <EvaPanel
            label="Node Location"
            sublabel="Physical node in network"
            sysId="GEO.SYS"
            status="active"
            accent="gold"
          >
            <MapView
              lat={currentNodeData?.location?.location?.lat || '0'}
              lng={currentNodeData?.location?.location?.lng || '0'}
              addressName={
                currentNodeData?.location?.addressName || 'Unknown Location'
              }
            />
          </EvaPanel>
        </div>

        {/* ── Network Topology — Pulsing Hex Network ── */}
        <EvaSectionMarker
          section="SEC.03b"
          label="Network Topology"
          variant="gold"
        />
        <EvaPanel
          label="Node Network"
          sublabel="Active tokenization nodes"
          sysId="NET.TOP"
          status="active"
          accent="gold"
        >
          <PulsingHexNetwork />
        </EvaPanel>

        {/* ── Node Reputation — Cascading Load Bars ── */}
        <EvaSectionMarker
          section="SEC.03c"
          label="Node Reputation"
          variant="gold"
        />
        <EvaPanel
          label="Reputation Grading"
          sublabel="Performance & trust metrics"
          sysId="REP.GRD"
          accent="gold"
        >
          <CascadeLoadBars
            labels={[
              'AMOUNT TOKENIZED',
              'SECURITY',
              'CHAIN SYNC',
              'SETTLEMENT',
            ]}
            values={[
              reputationTokenized,
              reputationSecurity,
              reputationChainSync,
              reputationSettlement,
            ]}
          />
        </EvaPanel>

        <EvaSectionMarker
          section="SEC.04"
          label="Documentation"
          variant="crimson"
        />

        {/* Supporting Documents */}
        <div className="relative">
          <LaurelAccent
            side="right"
            className="absolute right-4 top-10 hidden xl:block"
          />
          <EvaPanel
            label="Supporting Documents"
            sublabel="Certifications and audits"
            sysId="DOC.SYS"
            accent="crimson"
          >
            <div className="flex items-center justify-end mb-4">
              {!isReadOnly && (
                <Dialog
                  open={isAddDocumentOpen}
                  onOpenChange={setIsAddDocumentOpen}
                >
                  <DialogTrigger asChild>
                    <TrapButton
                      variant="gold"
                      size="sm"
                      disabled={isAddingDocument}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-crimson">+</span> Add Document
                      </span>
                    </TrapButton>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add Supporting Document</DialogTitle>
                      <DialogDescription>
                        Add a certification, audit report, or other supporting
                        document. IPFS and Arweave URLs are automatically marked
                        as immutable.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddDocument} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Document URL *
                        </label>
                        <Input
                          placeholder="https://... or ipfs://..."
                          value={documentForm.url}
                          onChange={(e) =>
                            setDocumentForm({
                              ...documentForm,
                              url: e.target.value,
                            })
                          }
                          className="bg-neutral-900/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Title *
                        </label>
                        <Input
                          placeholder="e.g., Annual Security Audit 2024"
                          value={documentForm.title}
                          onChange={(e) =>
                            setDocumentForm({
                              ...documentForm,
                              title: e.target.value,
                            })
                          }
                          className="bg-neutral-900/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Description
                        </label>
                        <Input
                          placeholder="Brief description of the document"
                          value={documentForm.description}
                          onChange={(e) =>
                            setDocumentForm({
                              ...documentForm,
                              description: e.target.value,
                            })
                          }
                          className="bg-neutral-900/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Document Type
                        </label>
                        <select
                          value={documentForm.documentType}
                          onChange={(e) =>
                            setDocumentForm({
                              ...documentForm,
                              documentType: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-neutral-900/50 border border-neutral-700/50 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          <option value="certification">Certification</option>
                          <option value="audit">Audit Report</option>
                          <option value="license">License</option>
                          <option value="legal">Legal Document</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <TrapButton
                        variant="gold"
                        onClick={() => handleAddDocument({ preventDefault: () => {} } as React.FormEvent)}
                        disabled={isAddingDocument}
                        className="w-full"
                      >
                        {isAddingDocument ? 'Adding...' : 'Add Document'}
                      </TrapButton>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Active Documents */}
            <div className="space-y-3">
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-accent animate-spin" />
                </div>
              ) : activeDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents attached</p>
                  {!isReadOnly && (
                    <p className="text-sm text-muted-foreground/50 mt-1">
                      Add certifications, audits, or other supporting documents
                    </p>
                  )}
                </div>
              ) : (
                activeDocuments.map((doc, index) => (
                  <div
                    key={`${doc.url}-${index}`}
                    className="p-4 rounded-lg bg-neutral-900/30 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground">
                            {doc.title}
                          </h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-800 text-white text-xs capitalize">
                            {doc.documentType}
                          </span>
                          {doc.isFrozen && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 text-amber-400 text-xs"
                              title="Content is immutable (IPFS/Arweave)"
                            >
                              <Lock className="w-3 h-3" />
                              Frozen
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {doc.description}
                          </p>
                        )}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80 mt-2 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          <span className="truncate max-w-[300px]">
                            {doc.url}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-xs text-muted-foreground/50 mt-2">
                          Added{' '}
                          {new Date(doc.addedAt * 1000).toLocaleDateString()} by{' '}
                          {doc.addedBy.slice(0, 6)}...{doc.addedBy.slice(-4)}
                        </p>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleRemoveDocument(doc.url)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Document History (Removed Documents) */}
            {removedDocuments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-neutral-800/50">
                <button
                  onClick={() => setShowDocumentHistory(!showDocumentHistory)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      showDocumentHistory && 'rotate-180',
                    )}
                  />
                  View {removedDocuments.length} removed document
                  {removedDocuments.length !== 1 ? 's' : ''}
                </button>

                {showDocumentHistory && (
                  <div className="mt-2 space-y-2">
                    {removedDocuments.map((doc, index) => (
                      <div
                        key={`removed-${doc.url}-${index}`}
                        className="relative bg-background/20 opacity-50"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-foreground/8" />
                        <div className="px-5 py-4 ml-[3px]">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm text-foreground/35 line-through">
                              {doc.title}
                            </span>
                            <EvaStatusBadge status="pending" label="Removed" />
                          </div>
                          {doc.description && (
                            <p className="font-mono text-xs text-foreground/20 mt-1">
                              {doc.description}
                            </p>
                          )}
                          <p className="font-mono text-xs text-foreground/15 mt-2">
                            Removed{' '}
                            {doc.removedAt
                              ? new Date(
                                  doc.removedAt * 1000,
                                ).toLocaleDateString()
                              : 'N/A'}{' '}
                            by {doc.removedBy?.slice(0, 6)}...
                            {doc.removedBy?.slice(-4)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </EvaPanel>
        </div>
      </div>
    </div>
  );
}
