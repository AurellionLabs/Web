'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { useNodes } from '@/app/providers/nodes.provider';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import type { Asset, AssetAttribute } from '@/domain/shared';
import {
  EvaPanel,
  TrapButton,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  EvaDataRow,
  EvaStatusBadge,
} from '@/app/components/eva/eva-components';
import { Input } from '@/app/components/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Tag,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Truck,
  Globe,
  Wallet,
  Package,
  Network,
  MapPin,
} from 'lucide-react';
import { parseUnits, isAddress } from 'ethers';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

type Step =
  | 'type'
  | 'filters'
  | 'asset'
  | 'details'
  | 'logistics'
  | 'target'
  | 'review';

interface FormData {
  offerType: 'buy' | 'sell' | null;
  assetClass: string;
  selectedNodeHash: string;
  tokenId: string;
  selectedAttributes: Record<string, string>;
  quantity: string;
  price: string;
  expiryHours: string;
  logisticsType: 'network' | 'custom';
  logisticsPartner: string; // Node address for network, wallet address for custom
  targetType: 'public' | 'targeted';
  targetAddress: string;
  deliveryAddress: string;
  deliveryLat: string;
  deliveryLng: string;
}

const GOOGLE_LIBRARIES: 'places'[] = ['places'];

/** Format snake_case attribute names to Title Case */
const formatAttributeName = (name: string): string => {
  if (!name) return '';
  return name
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getPrimaryAttributeValue = (
  attribute?: { values?: string[] } | null,
): string => {
  if (!attribute || !Array.isArray(attribute.values)) return '';
  return (
    attribute.values.find((value) => value && value.trim().length > 0) || ''
  );
};

const normalizeTokenId = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  try {
    // Canonicalize to decimal so hex/decimal forms dedupe to one ID.
    return BigInt(raw).toString(10);
  } catch {
    return raw;
  }
};

const parseBalance = (value?: string): bigint => {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
};

const formatNodeLabel = (nodeHash: string, locationName?: string): string => {
  if (locationName && locationName.trim().length > 0) {
    return locationName;
  }
  return `${nodeHash.slice(0, 8)}...${nodeHash.slice(-6)}`;
};

const computeDeterministicTokenId = (
  name: string,
  assetClass: string,
  attributes: Record<string, string>,
): string => {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const sortedAttributes = Object.entries(attributes)
    .filter(([, value]) => value && value.trim().length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([attrName, value]) => ({
      name: attrName,
      values: [value],
      description: '',
    }));

  const encodedAsset = abiCoder.encode(
    [
      'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
    ],
    [{ name, assetClass, attributes: sortedAttributes }],
  );
  return BigInt(ethers.keccak256(encodedAsset)).toString();
};

/**
 * P2P Offer Creation Wizard
 *
 * Steps:
 * 1. Select offer type (buy or sell)
 * 2. Apply filters (asset class, and for sell offers choose the node)
 * 3. Select the exact asset/token
 * 4. Enter quantity and price
 * 5. Set target (public or specific address)
 * 6. Review and confirm
 */
export default function CreateP2POfferPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { p2pService } = useDiamond();
  const { supportedAssetClasses, getClassAssets } = usePlatform();
  const { nodes: ownedNodes } = useNodes();
  const router = useRouter();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [formData, setFormData] = useState<FormData>({
    offerType: null,
    assetClass: '',
    selectedNodeHash: '',
    tokenId: '',
    selectedAttributes: {},
    quantity: '',
    price: '',
    expiryHours: '24',
    logisticsType: 'network',
    logisticsPartner: '',
    targetType: 'public',
    targetAddress: '',
    deliveryAddress: '',
    deliveryLat: '',
    deliveryLng: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Asset selection state
  const [classAssets, setClassAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  // Fetch ALL user-owned assets (single hook call to avoid re-render loops)
  const { sellableAssets: allSellableAssets, isLoading: isLoadingSellable } =
    useUserAssets();

  // Filter sellable assets by selected class
  const sellableAssets = useMemo(() => {
    if (!formData.assetClass) return [];
    return allSellableAssets.filter(
      (a) => a.class.toLowerCase() === formData.assetClass.toLowerCase(),
    );
  }, [allSellableAssets, formData.assetClass]);

  const ownedNodesByHash = useMemo(() => {
    return new Map(ownedNodes.map((node) => [node.address, node]));
  }, [ownedNodes]);

  const sellNodeOptions = useMemo(() => {
    const assetsByNode = new Map<
      string,
      {
        nodeHash: string;
        assets: typeof sellableAssets;
        totalBalance: bigint;
      }
    >();

    for (const asset of sellableAssets) {
      if (!asset.nodeHash) continue;

      const existing = assetsByNode.get(asset.nodeHash) || {
        nodeHash: asset.nodeHash,
        assets: [],
        totalBalance: 0n,
      };

      existing.assets.push(asset);
      existing.totalBalance += parseBalance(asset.balance);
      assetsByNode.set(asset.nodeHash, existing);
    }

    return Array.from(assetsByNode.values())
      .map((entry) => {
        const node = ownedNodesByHash.get(entry.nodeHash);
        const sortedAssets = [...entry.assets].sort((a, b) => {
          const byName = a.name.localeCompare(b.name);
          if (byName !== 0) return byName;
          return a.tokenId.localeCompare(b.tokenId);
        });

        return {
          ...entry,
          assets: sortedAssets,
          locationName: node?.location?.addressName || '',
          ownerAddress: node?.owner || '',
          status: node?.status,
        };
      })
      .sort((a, b) => {
        if (a.locationName && b.locationName) {
          return a.locationName.localeCompare(b.locationName);
        }
        return a.nodeHash.localeCompare(b.nodeHash);
      });
  }, [ownedNodesByHash, sellableAssets]);

  const selectedSellNode = useMemo(() => {
    return sellNodeOptions.find(
      (option) => option.nodeHash === formData.selectedNodeHash,
    );
  }, [sellNodeOptions, formData.selectedNodeHash]);

  const selectedNodeAssets = useMemo(() => {
    return selectedSellNode?.assets || [];
  }, [selectedSellNode]);

  const selectedSellNodeOwnerAddress = useMemo(() => {
    return selectedSellNode?.ownerAddress || '';
  }, [selectedSellNode]);

  // Derive unique asset classes the user actually owns (for sell class dropdown)
  const ownedAssetClasses = useMemo(() => {
    const classes = new Set<string>();
    allSellableAssets.forEach((a) => {
      if (a.class && a.class !== 'Unknown') classes.add(a.class);
    });
    return Array.from(classes);
  }, [allSellableAssets]);

  const isSellFlow = formData.offerType === 'sell';
  const selectedBuyFilters = useMemo(
    () =>
      Object.entries(formData.selectedAttributes).filter(
        ([, value]) => value && value.trim().length > 0,
      ),
    [formData.selectedAttributes],
  );

  const buyClassAttributeOptions = useMemo(() => {
    if (isSellFlow) return [] as Array<{ name: string; values: string[] }>;

    const optionsByName = new Map<string, Set<string>>();
    classAssets.forEach((asset) => {
      (asset.attributes || []).forEach((attribute) => {
        if (!attribute?.name) return;
        const values = optionsByName.get(attribute.name) || new Set<string>();
        const primaryValue = getPrimaryAttributeValue(attribute);
        if (primaryValue) values.add(primaryValue);
        optionsByName.set(attribute.name, values);
      });
    });

    return Array.from(optionsByName.entries())
      .map(([name, values]) => ({
        name,
        values: Array.from(values).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classAssets, isSellFlow]);

  const filteredBuyAssets = useMemo(() => {
    if (isSellFlow) return [] as Asset[];

    const byAttributes = classAssets.filter((asset) => {
      if (selectedBuyFilters.length === 0) return true;
      return selectedBuyFilters.every(([filterName, filterValue]) =>
        (asset.attributes || []).some(
          (attribute) =>
            attribute.name === filterName &&
            getPrimaryAttributeValue(attribute).toLowerCase() ===
              filterValue.toLowerCase(),
        ),
      );
    });

    // Avoid duplicate options when metadata has repeated entries for same tokenId
    const seenTokenIds = new Set<string>();
    return byAttributes.filter((asset) => {
      const tokenId = normalizeTokenId(asset?.tokenId ?? asset?.tokenID);
      if (!tokenId || seenTokenIds.has(tokenId)) return false;
      seenTokenIds.add(tokenId);
      return true;
    });
  }, [classAssets, selectedBuyFilters, isSellFlow]);

  // Load assets when asset class changes (buy flow only)
  useEffect(() => {
    if (isSellFlow) return; // Sell flow uses useUserAssets instead
    const loadAssetsForClass = async () => {
      setSelectedAsset(null);
      setClassAssets([]);
      if (!formData.assetClass) return;
      setLoadingAssets(true);
      try {
        const assets = await getClassAssets(formData.assetClass);
        setClassAssets(assets);
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssetsForClass();
  }, [formData.assetClass, getClassAssets, isSellFlow]);

  // Update selected asset when tokenId changes (buy flow)
  useEffect(() => {
    if (isSellFlow) return;
    if (formData.tokenId) {
      const asset = classAssets.find((a: Asset) => {
        const idStr = normalizeTokenId(a?.tokenId ?? a?.tokenID ?? '');
        return idStr === normalizeTokenId(formData.tokenId);
      });
      setSelectedAsset(asset || null);
    } else {
      setSelectedAsset(null);
    }
  }, [formData.tokenId, classAssets, isSellFlow]);

  // Update selected asset when tokenId changes (sell flow - from sellableAssets)
  useEffect(() => {
    if (!isSellFlow) return;
    if (formData.tokenId) {
      const match = selectedNodeAssets.find(
        (a) => a.tokenId === formData.tokenId,
      );
      if (match) {
        // Map SellableAsset to Asset shape for the review step
        setSelectedAsset({
          name: match.name,
          assetClass: match.class,
          tokenId: match.tokenId,
          attributes: (match.attributes || []).map((attr) => ({
            name: attr.name,
            values: [attr.value],
            description: '',
          })),
        });
      } else {
        setSelectedAsset(null);
      }
    } else {
      setSelectedAsset(null);
    }
  }, [formData.tokenId, selectedNodeAssets, isSellFlow]);

  useEffect(() => {
    if (!isSellFlow) return;

    if (
      formData.selectedNodeHash &&
      !sellNodeOptions.some(
        (option) => option.nodeHash === formData.selectedNodeHash,
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        selectedNodeHash: '',
        tokenId: '',
      }));
      setError(null);
    }
  }, [formData.selectedNodeHash, isSellFlow, sellNodeOptions]);

  useEffect(() => {
    if (!isSellFlow || !formData.selectedNodeHash || !formData.tokenId) return;

    const tokenStillAvailable = selectedNodeAssets.some(
      (asset) => asset.tokenId === formData.tokenId,
    );

    if (!tokenStillAvailable) {
      setFormData((prev) => ({
        ...prev,
        tokenId: '',
      }));
      setError(null);
    }
  }, [
    formData.selectedNodeHash,
    formData.tokenId,
    isSellFlow,
    selectedNodeAssets,
  ]);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Update form data
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  /**
   * Quantity must be a positive integer. Keep invalid user input out of state
   * so the "Next" button reflects validation immediately.
   */
  const handleQuantityChange = (rawValue: string) => {
    const value = rawValue.trim();
    if (value === '') {
      updateFormData({ quantity: '' });
      return;
    }
    if (!/^\d+$/.test(value)) {
      updateFormData({ quantity: '' });
      return;
    }
    updateFormData({ quantity: value });
  };

  /**
   * Price accepts non-negative decimal input in the field, while step gating
   * still enforces strictly greater than zero before proceeding.
   */
  const handlePriceChange = (rawValue: string) => {
    const value = rawValue.trim();
    if (value === '') {
      updateFormData({ price: '' });
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) {
      updateFormData({ price: '' });
      return;
    }
    updateFormData({ price: value });
  };

  const validateDetailsStep = useCallback((): {
    valid: boolean;
    reason?: string;
  } => {
    const qtyText = formData.quantity.trim();
    const priceText = formData.price.trim();

    if (!qtyText || !priceText) {
      return { valid: false, reason: 'Quantity and price are required.' };
    }

    // Quantity must be an integer >= 1.
    if (!/^\d+$/.test(qtyText)) {
      return { valid: false, reason: 'Quantity must be a whole number.' };
    }
    const qty = Number(qtyText);
    if (!Number.isSafeInteger(qty) || qty < 1) {
      return { valid: false, reason: 'Quantity must be at least 1.' };
    }

    // Price must be a positive decimal.
    if (!/^\d*\.?\d+$/.test(priceText)) {
      return { valid: false, reason: 'Price must be a valid number.' };
    }
    const price = Number(priceText);
    if (!Number.isFinite(price) || price <= 0) {
      return { valid: false, reason: 'Price must be greater than zero.' };
    }

    if (isSellFlow) {
      if (!formData.selectedNodeHash) {
        return {
          valid: false,
          reason: 'Select a node before setting sell terms.',
        };
      }

      const asset = selectedNodeAssets.find(
        (a) => a.tokenId === formData.tokenId,
      );
      const available = Number(parseBalance(asset?.balance));

      if (!asset) {
        return {
          valid: false,
          reason: 'The selected asset is no longer available on that node.',
        };
      }

      if (qty > available) {
        return {
          valid: false,
          reason:
            'Quantity exceeds the selected node inventory for this asset.',
        };
      }
    }

    return { valid: true };
  }, [
    formData.quantity,
    formData.price,
    formData.tokenId,
    formData.selectedNodeHash,
    isSellFlow,
    selectedNodeAssets,
  ]);

  // Step navigation
  const steps: Step[] = [
    'type',
    'filters',
    'asset',
    'details',
    'logistics',
    'target',
    'review',
  ];
  const currentStepIndex = steps.indexOf(currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'type':
        return formData.offerType !== null;
      case 'filters': {
        if (formData.assetClass === '') return false;
        if (isSellFlow) {
          return formData.selectedNodeHash !== '';
        }
        return true;
      }
      case 'asset': {
        if (formData.tokenId === '') return false;
        return true;
      }
      case 'details': {
        return validateDetailsStep().valid;
      }
      case 'logistics':
        if (formData.offerType === 'buy') {
          const hasDestination =
            formData.deliveryAddress.trim().length > 0 &&
            formData.deliveryLat.trim().length > 0 &&
            formData.deliveryLng.trim().length > 0;
          if (!hasDestination) return false;
        }
        return true;
      case 'target':
        return (
          formData.targetType === 'public' ||
          (formData.targetType === 'targeted' &&
            isAddress(formData.targetAddress))
        );
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    } else {
      router.push('/customer/p2p');
    }
  };

  // Submit offer
  const handleSubmit = useCallback(async () => {
    if (!p2pService || !connected) return;

    // Guard submit path even if the user reaches review via stale UI state.
    const detailsValidation = validateDetailsStep();
    if (!detailsValidation.valid) {
      setCurrentStep('details');
      setError(detailsValidation.reason || 'Invalid quantity or price.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const expiresAt =
        formData.expiryHours === '0'
          ? 0
          : Math.floor(Date.now() / 1000) +
            parseInt(formData.expiryHours) * 3600;

      const selectedTokenId = formData.tokenId;
      const tokenIdToSubmit =
        formData.offerType === 'buy' &&
        !selectedAsset &&
        selectedBuyFilters.length > 0
          ? computeDeterministicTokenId(
              classAssets[0]?.name || `AU${formData.assetClass.toUpperCase()}`,
              formData.assetClass,
              formData.selectedAttributes,
            )
          : selectedTokenId;

      const selectedNodeAddresses =
        formData.offerType === 'sell' && selectedSellNodeOwnerAddress
          ? [selectedSellNodeOwnerAddress]
          : undefined;

      await p2pService.createOffer({
        token: NEXT_PUBLIC_DIAMOND_ADDRESS,
        tokenId: tokenIdToSubmit,
        quantity: BigInt(formData.quantity),
        price: parseUnits(formData.price, 18),
        isSellOffer: formData.offerType === 'sell',
        nodes: selectedNodeAddresses,
        targetCounterparty:
          formData.targetType === 'targeted'
            ? formData.targetAddress
            : undefined,
        expiresAt,
        deliveryDestination:
          formData.offerType === 'buy'
            ? {
                address: formData.deliveryAddress.trim(),
                lat: formData.deliveryLat.trim(),
                lng: formData.deliveryLng.trim(),
              }
            : undefined,
      });

      // Brief delay to allow RPC state propagation before navigating
      await new Promise((resolve) => setTimeout(resolve, 2000));
      router.push('/customer/p2p?created=true');
    } catch (err) {
      console.error('Error creating offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    p2pService,
    connected,
    formData,
    router,
    selectedAsset,
    selectedBuyFilters,
    selectedSellNodeOwnerAddress,
    classAssets,
    validateDetailsStep,
  ]);

  const handlePlaceSelect = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) return;

    updateFormData({
      deliveryAddress: place.formatted_address || '',
      deliveryLat: String(place.geometry.location.lat()),
      deliveryLng: String(place.geometry.location.lng()),
    });
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              'w-8 h-8 flex items-center justify-center font-mono text-sm font-bold tracking-[0.1em] transition-colors',
              index < currentStepIndex
                ? 'bg-emerald-500/20 text-emerald-400'
                : index === currentStepIndex
                  ? 'bg-gold/20 text-gold'
                  : 'bg-card/60 text-foreground/30',
            )}
            style={{
              clipPath:
                'polygon(4px 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0 50%)',
            }}
          >
            {index < currentStepIndex ? (
              <Check className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-12 h-[2px] mx-1',
                index < currentStepIndex ? 'bg-emerald-500/50' : 'bg-border/20',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                What would you like to do?
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                Choose whether you want to buy or sell assets
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Buy Option */}
              <button
                onClick={() =>
                  updateFormData({
                    offerType: 'buy',
                    assetClass: '',
                    selectedNodeHash: '',
                    tokenId: '',
                    selectedAttributes: {},
                  })
                }
                className="text-left"
                aria-pressed={formData.offerType === 'buy'}
              >
                <EvaPanel
                  label="Buy"
                  sysId="BUY-01"
                  accent="gold"
                  className={cn(
                    'transition-all duration-300 border',
                    formData.offerType === 'buy'
                      ? 'ring-2 ring-gold/70 border-gold/40 bg-gold/5 shadow-[0_0_24px_rgba(245,158,11,0.18)]'
                      : 'border-border/20 hover:ring-1 hover:ring-gold/20 hover:border-gold/30',
                  )}
                >
                  <div className="py-4">
                    {formData.offerType === 'buy' && (
                      <div className="mb-3 inline-flex items-center gap-1 px-2 py-1 border border-gold/70 bg-gold/20">
                        <Check className="w-3 h-3 text-gold" />
                        <span className="font-mono text-[10px] font-bold text-gold tracking-[0.12em] uppercase">
                          Selected
                        </span>
                      </div>
                    )}
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 mx-auto">
                      <ShoppingCart className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="font-mono text-lg font-bold text-foreground tracking-[0.12em] uppercase text-center mb-2">
                      I want to Buy
                    </h3>
                    <p className="font-mono text-xs text-foreground/40 text-center tracking-[0.08em]">
                      Create a buy offer and wait for a seller to accept your
                      terms
                    </p>
                  </div>
                </EvaPanel>
              </button>

              {/* Sell Option */}
              <button
                onClick={() =>
                  updateFormData({
                    offerType: 'sell',
                    assetClass: '',
                    selectedNodeHash: '',
                    tokenId: '',
                    selectedAttributes: {},
                  })
                }
                className="text-left"
                aria-pressed={formData.offerType === 'sell'}
              >
                <EvaPanel
                  label="Sell"
                  sysId="SELL-01"
                  accent="crimson"
                  className={cn(
                    'transition-all duration-300 border',
                    formData.offerType === 'sell'
                      ? 'ring-2 ring-emerald-500/70 border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                      : 'border-border/20 hover:ring-1 hover:ring-emerald-500/20 hover:border-emerald-500/30',
                  )}
                >
                  <div className="py-4">
                    {formData.offerType === 'sell' && (
                      <div className="mb-3 inline-flex items-center gap-1 px-2 py-1 border border-emerald-500/70 bg-emerald-500/20">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono text-[10px] font-bold text-emerald-300 tracking-[0.12em] uppercase">
                          Selected
                        </span>
                      </div>
                    )}
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 mx-auto">
                      <Tag className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="font-mono text-lg font-bold text-foreground tracking-[0.12em] uppercase text-center mb-2">
                      I want to Sell
                    </h3>
                    <p className="font-mono text-xs text-foreground/40 text-center tracking-[0.08em]">
                      Create a sell offer and wait for a buyer to accept your
                      terms
                    </p>
                  </div>
                </EvaPanel>
              </button>
            </div>
          </div>
        );

      case 'filters':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                Step 2 Filters
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                {isSellFlow
                  ? 'Select an asset class, then choose which of your nodes will fulfill it'
                  : 'Choose the asset class and optional attribute filters'}
              </p>
            </div>

            <EvaPanel label="Filters" sysId="AST-FLT">
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                    Asset Class
                  </label>
                  <select
                    value={formData.assetClass}
                    onChange={(e) =>
                      updateFormData({
                        assetClass: e.target.value,
                        selectedNodeHash: '',
                        tokenId: '',
                        selectedAttributes: {},
                      })
                    }
                    className="w-full bg-background/80 border border-border/40 rounded-none px-4 py-3 font-mono text-foreground focus:outline-none focus:border-gold/50"
                    style={{
                      clipPath:
                        'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    }}
                  >
                    <option value="">Select an asset class</option>
                    {(isSellFlow
                      ? ownedAssetClasses
                      : supportedAssetClasses
                    ).map((assetClass) => (
                      <option key={assetClass} value={assetClass}>
                        {assetClass}
                      </option>
                    ))}
                  </select>
                  {isSellFlow &&
                    ownedAssetClasses.length === 0 &&
                    !isLoadingSellable && (
                      <p className="font-mono text-xs text-gold mt-1 tracking-[0.08em]">
                        You don&apos;t own any tokenized assets yet
                      </p>
                    )}
                </div>

                <EvaScanLine variant="gold" />

                {isSellFlow ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                        Select Node
                      </label>
                      <p className="font-mono text-xs text-foreground/30 tracking-[0.08em]">
                        Only nodes in this account that hold the selected asset
                        class are shown here.
                      </p>
                    </div>
                    {isLoadingSellable ? (
                      <div className="p-4 font-mono text-sm text-foreground/40 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading your nodes...
                      </div>
                    ) : !formData.assetClass ? (
                      <div className="p-4 text-center font-mono text-sm text-foreground/40 border border-border/20 bg-card/40">
                        <p>Select an asset class first</p>
                      </div>
                    ) : sellNodeOptions.length === 0 ? (
                      <div className="p-6 text-center border border-border/20 bg-card/40">
                        <Network className="w-8 h-8 mx-auto mb-2 text-foreground/20" />
                        <p className="font-mono text-sm text-foreground/40">
                          No nodes in this account currently custody{' '}
                          {formData.assetClass}
                        </p>
                        <p className="font-mono text-xs text-foreground/25 mt-1">
                          Add inventory to a node before creating a sell offer
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sellNodeOptions.map((nodeOption) => {
                          const isSelected =
                            formData.selectedNodeHash === nodeOption.nodeHash;

                          return (
                            <button
                              key={nodeOption.nodeHash}
                              onClick={() =>
                                updateFormData({
                                  selectedNodeHash: nodeOption.nodeHash,
                                  tokenId: '',
                                })
                              }
                              className={cn(
                                'w-full p-4 border transition-all text-left',
                                isSelected
                                  ? 'border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                                  : 'border-border/20 bg-card/40 hover:border-emerald-500/30',
                              )}
                              style={{
                                clipPath:
                                  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                              }}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-mono font-bold text-foreground tracking-[0.08em] flex items-center gap-2">
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-emerald-400" />
                                      )}
                                      {formatNodeLabel(
                                        nodeOption.nodeHash,
                                        nodeOption.locationName,
                                      )}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      {nodeOption.locationName && (
                                        <span className="inline-flex items-center gap-1 font-mono text-xs text-foreground/40">
                                          <MapPin className="w-3 h-3" />
                                          {nodeOption.locationName}
                                        </span>
                                      )}
                                      <span className="font-mono text-xs text-foreground/30 break-all">
                                        {nodeOption.nodeHash}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {isSelected && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 border border-emerald-500/70 bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-300 tracking-[0.12em] uppercase">
                                        Selected
                                      </span>
                                    )}
                                    <p className="font-mono text-lg font-bold text-gold tabular-nums">
                                      {nodeOption.totalBalance.toString()}
                                    </p>
                                    <p className="font-mono text-xs text-foreground/30 tracking-[0.1em] uppercase">
                                      total units
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-2">
                                  {nodeOption.assets.map((asset) => (
                                    <div
                                      key={`${nodeOption.nodeHash}-${asset.tokenId}`}
                                      className="border border-border/20 bg-background/40 px-3 py-2"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-mono text-sm font-bold text-foreground tracking-[0.06em]">
                                            {asset.name}
                                          </p>
                                          <p className="font-mono text-[11px] text-foreground/25 break-all">
                                            Token ID: {asset.tokenId}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-mono text-sm font-bold text-gold tabular-nums">
                                            {asset.balance}
                                          </p>
                                          <p className="font-mono text-[10px] text-foreground/30 uppercase tracking-[0.1em]">
                                            available
                                          </p>
                                        </div>
                                      </div>
                                      {asset.attributes &&
                                        asset.attributes.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                            {asset.attributes.map((attr) => (
                                              <span
                                                key={attr.name}
                                                className="px-2 py-0.5 font-mono text-xs bg-card/80 text-foreground/50 border border-border/20"
                                              >
                                                {formatAttributeName(attr.name)}
                                                : {attr.value}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {buyClassAttributeOptions.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-mono text-xs font-bold text-foreground/50 mb-1 tracking-[0.2em] uppercase">
                            Filter by Attributes
                          </h3>
                          <p className="font-mono text-xs text-foreground/30 tracking-[0.08em]">
                            Narrow the market before you select a token ID in
                            the next step
                          </p>
                        </div>
                        {buyClassAttributeOptions.map((attribute) => (
                          <div key={attribute.name}>
                            <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                              {formatAttributeName(attribute.name)}
                            </label>
                            <select
                              value={
                                formData.selectedAttributes[attribute.name] ||
                                ''
                              }
                              onChange={(e) =>
                                updateFormData({
                                  selectedAttributes: {
                                    ...formData.selectedAttributes,
                                    [attribute.name]: e.target.value,
                                  },
                                  tokenId: '',
                                })
                              }
                              className="w-full bg-background/80 border border-border/40 rounded-none px-4 py-3 font-mono text-foreground focus:outline-none focus:border-gold/50"
                              style={{
                                clipPath:
                                  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                              }}
                            >
                              <option value="">
                                Any {formatAttributeName(attribute.name)}
                              </option>
                              {attribute.values.map((val) => (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </EvaPanel>
          </div>
        );

      case 'asset':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                Select Asset
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                {isSellFlow
                  ? 'Choose the exact asset variant held by the selected node'
                  : 'Select the specific asset you want to buy'}
              </p>
            </div>

            <EvaPanel label="Asset Selection" sysId="AST-SEL">
              <div className="space-y-4">
                {isSellFlow ? (
                  <div>
                    <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                      Node Inventory
                    </label>
                    {!formData.assetClass ? (
                      <div className="p-4 text-center font-mono text-sm text-foreground/40 border border-border/20 bg-card/40">
                        <p>Select an asset class in Step 2 first</p>
                      </div>
                    ) : !formData.selectedNodeHash ? (
                      <div className="p-4 text-center font-mono text-sm text-foreground/40 border border-border/20 bg-card/40">
                        <p>Select a node in Step 2 first</p>
                      </div>
                    ) : selectedNodeAssets.length === 0 ? (
                      <div className="p-4 text-center font-mono text-sm text-foreground/40 border border-border/20 bg-card/40">
                        <p>No eligible assets found on that node</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-none border border-gold/20 bg-gold/5 px-4 py-3">
                          <p className="font-mono text-xs text-gold tracking-[0.08em]">
                            Each sell offer is backed by one token ID from one
                            node. If you need to sell multiple variants, create
                            one offer per asset variant.
                          </p>
                        </div>
                        <div className="space-y-2">
                          {selectedNodeAssets.map((asset) => (
                            <button
                              key={`${formData.selectedNodeHash}-${asset.tokenId}`}
                              onClick={() =>
                                updateFormData({
                                  tokenId: asset.tokenId,
                                  selectedAttributes: {},
                                })
                              }
                              className={cn(
                                'w-full p-4 border transition-all text-left',
                                formData.tokenId === asset.tokenId
                                  ? 'border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                                  : 'border-border/20 bg-card/40 hover:border-emerald-500/30',
                              )}
                              style={{
                                clipPath:
                                  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-mono font-bold text-foreground tracking-[0.08em] flex items-center gap-2">
                                    {formData.tokenId === asset.tokenId && (
                                      <Check className="w-4 h-4 text-emerald-400" />
                                    )}
                                    {asset.name}
                                  </p>
                                  <EvaStatusBadge
                                    status="active"
                                    label={asset.class}
                                  />
                                </div>
                                <div className="text-right">
                                  {formData.tokenId === asset.tokenId && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 border border-emerald-500/70 bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-300 tracking-[0.12em] uppercase">
                                      Selected
                                    </span>
                                  )}
                                  <p className="font-mono text-lg font-bold text-gold tabular-nums">
                                    {asset.balance}
                                  </p>
                                  <p className="font-mono text-xs text-foreground/30 tracking-[0.1em] uppercase">
                                    available on node
                                  </p>
                                </div>
                              </div>
                              {asset.attributes &&
                                asset.attributes.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {asset.attributes.map((attr) => (
                                      <span
                                        key={attr.name}
                                        className="px-2 py-0.5 font-mono text-xs bg-card/80 text-foreground/50 border border-border/20"
                                      >
                                        {formatAttributeName(attr.name)}:{' '}
                                        {attr.value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              <p className="font-mono text-[11px] text-foreground/25 mt-2 break-all">
                                Token ID: {asset.tokenId}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                      Asset
                    </label>
                    {loadingAssets ? (
                      <div className="p-4 font-mono text-sm text-foreground/40 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading assets...
                      </div>
                    ) : !formData.assetClass ? (
                      <div className="p-4 text-center font-mono text-sm text-foreground/40 border border-border/20 bg-card/40">
                        <p>Select an asset class first</p>
                      </div>
                    ) : filteredBuyAssets.length === 0 ? (
                      <div className="p-4 text-center font-mono text-sm text-foreground/40 border border-border/20 bg-card/40 space-y-3">
                        <p>No tokenized assets match those attribute filters</p>
                        {selectedBuyFilters.length > 0 && (
                          <TrapButton
                            variant="gold"
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              updateFormData({
                                tokenId: computeDeterministicTokenId(
                                  classAssets[0]?.name ||
                                    `AU${formData.assetClass.toUpperCase()}`,
                                  formData.assetClass,
                                  formData.selectedAttributes,
                                ),
                              })
                            }
                          >
                            Create Buy Offer For This New Combination
                          </TrapButton>
                        )}
                        {formData.tokenId && (
                          <p className="font-mono text-xs text-gold/70 tracking-[0.08em] break-all">
                            Deterministic Token ID: {formData.tokenId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <select
                        value={normalizeTokenId(formData.tokenId)}
                        onChange={(e) =>
                          updateFormData({
                            tokenId: normalizeTokenId(e.target.value),
                          })
                        }
                        className="w-full bg-background/80 border border-border/40 rounded-none px-4 py-3 font-mono text-foreground focus:outline-none focus:border-gold/50"
                        style={{
                          clipPath:
                            'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                        }}
                      >
                        <option value="">Select an asset</option>
                        {filteredBuyAssets.map((asset: Asset) => (
                          <option
                            key={normalizeTokenId(
                              asset?.tokenId ?? asset?.tokenID,
                            )}
                            value={normalizeTokenId(
                              asset?.tokenId ?? asset?.tokenID,
                            )}
                          >
                            {`${asset.name} • #${normalizeTokenId(asset?.tokenId ?? asset?.tokenID).slice(0, 6)}…${normalizeTokenId(asset?.tokenId ?? asset?.tokenID).slice(-4)}${
                              Array.isArray(asset.attributes) &&
                              asset.attributes.length > 0
                                ? ` • ${asset.attributes
                                    .slice(0, 2)
                                    .map((attr: AssetAttribute) => {
                                      const attrValue =
                                        getPrimaryAttributeValue(attr);
                                      return `${formatAttributeName(attr?.name || '')}: ${attrValue || '-'}`;
                                    })
                                    .join(' • ')}`
                                : ''
                            }`}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedAsset && (
                      <p className="font-mono text-xs text-foreground/30 mt-1 tracking-[0.08em]">
                        Token ID: {formData.tokenId}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </EvaPanel>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                Set Terms
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                Enter the quantity and price for your offer
              </p>
            </div>

            <EvaPanel label="Offer Terms" sysId="TRM-01">
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    min="1"
                    max={
                      isSellFlow
                        ? selectedNodeAssets.find(
                            (a) => a.tokenId === formData.tokenId,
                          )?.balance
                        : undefined
                    }
                    className="bg-background/80 border-border/40 font-mono rounded-none"
                  />
                  {isSellFlow &&
                    formData.tokenId &&
                    (() => {
                      const available = parseInt(
                        String(
                          selectedNodeAssets.find(
                            (a) => a.tokenId === formData.tokenId,
                          )?.balance ?? '0',
                        ),
                        10,
                      );
                      const qty = parseInt(formData.quantity || '0', 10);
                      const exceeds = qty > available;
                      return (
                        <p
                          className={`font-mono text-xs mt-1 tracking-[0.08em] ${exceeds ? 'text-red-400' : 'text-foreground/30'}`}
                        >
                          Available on selected node:{' '}
                          <span
                            className={
                              exceeds
                                ? 'text-red-400 font-bold'
                                : 'text-gold font-bold'
                            }
                          >
                            {available}
                          </span>
                          {exceeds && (
                            <span className="text-red-400 ml-2">
                              — Exceeds available balance
                            </span>
                          )}
                        </p>
                      );
                    })()}
                </div>

                <EvaScanLine variant="gold" />

                <div>
                  <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                    Price (USD)
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter total price"
                    value={formData.price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    min="0"
                    step="0.01"
                    className="bg-background/80 border-border/40 font-mono rounded-none"
                  />
                  <p className="font-mono text-xs text-foreground/30 mt-1 tracking-[0.08em]">
                    Total price for all {formData.quantity || '0'} units
                  </p>
                </div>

                <EvaScanLine variant="gold" />

                <div>
                  <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                    Expiry
                  </label>
                  <select
                    value={formData.expiryHours}
                    onChange={(e) =>
                      updateFormData({ expiryHours: e.target.value })
                    }
                    className="w-full bg-background/80 border border-border/40 rounded-none px-4 py-3 font-mono text-foreground focus:outline-none focus:border-gold/50"
                    style={{
                      clipPath:
                        'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    }}
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                    <option value="0">No expiry</option>
                  </select>
                </div>
              </div>
            </EvaPanel>
          </div>
        );

      case 'logistics':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                Choose a Driver
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                Select who will deliver the physical asset
              </p>
            </div>

            <div className="space-y-4">
              {formData.offerType === 'buy' && (
                <EvaPanel
                  label="Delivery Destination"
                  sysId="BUY-ADDR"
                  accent="gold"
                >
                  <div className="space-y-2">
                    <label className="block font-mono text-xs font-bold text-foreground/50 tracking-[0.2em] uppercase">
                      Where should the seller deliver?
                    </label>
                    {mapsLoaded ? (
                      <Autocomplete
                        onLoad={(instance) => setAutocomplete(instance)}
                        onPlaceChanged={handlePlaceSelect}
                      >
                        <Input
                          type="text"
                          placeholder="Search for delivery address..."
                          value={formData.deliveryAddress}
                          onChange={(e) =>
                            updateFormData({
                              deliveryAddress: e.target.value,
                              deliveryLat: '',
                              deliveryLng: '',
                            })
                          }
                          className="bg-background/80 border-border/40 font-mono rounded-none"
                        />
                      </Autocomplete>
                    ) : (
                      <Input
                        type="text"
                        value={formData.deliveryAddress}
                        onChange={(e) =>
                          updateFormData({ deliveryAddress: e.target.value })
                        }
                        placeholder="Enter delivery address"
                        className="bg-background/80 border-border/40 font-mono rounded-none"
                      />
                    )}
                    {formData.deliveryAddress &&
                      (!formData.deliveryLat || !formData.deliveryLng) && (
                        <p className="font-mono text-xs text-crimson">
                          Please choose a suggested address so coordinates are
                          captured.
                        </p>
                      )}
                    <p className="font-mono text-xs text-foreground/30 tracking-[0.05em]">
                      This destination is saved with your buy offer and used
                      when a seller accepts.
                    </p>
                  </div>
                </EvaPanel>
              )}

              {/* Network Drivers Option */}
              <button
                onClick={() =>
                  updateFormData({
                    logisticsType: 'network',
                    logisticsPartner: '',
                  })
                }
                className="w-full text-left"
                aria-pressed={formData.logisticsType === 'network'}
              >
                <EvaPanel
                  label="Aurellion Network"
                  sysId="NET-DRV"
                  accent="gold"
                  className={cn(
                    'transition-all duration-300 border',
                    formData.logisticsType === 'network'
                      ? 'ring-2 ring-gold/70 border-gold/40 bg-gold/5 shadow-[0_0_24px_rgba(245,158,11,0.18)]'
                      : 'border-border/20 hover:ring-1 hover:ring-gold/20 hover:border-gold/30',
                  )}
                >
                  <div className="flex items-center gap-4 py-2">
                    {formData.logisticsType === 'network' && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 border border-gold/70 bg-gold/20">
                        <Check className="w-3 h-3 text-gold" />
                        <span className="font-mono text-[10px] font-bold text-gold tracking-[0.12em] uppercase">
                          Selected
                        </span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="font-mono text-sm text-foreground/40 tracking-[0.08em]">
                        Let any verified driver from our network accept the
                        delivery
                      </p>
                    </div>
                  </div>
                </EvaPanel>
              </button>

              {/* Network - No selection needed, any driver can accept */}
              {formData.logisticsType === 'network' && (
                <div className="mt-4 p-4 bg-gold/5 border border-gold/20">
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-sm text-gold font-bold mb-1 tracking-[0.08em] uppercase">
                        Open to all network drivers
                      </p>
                      <p className="font-mono text-xs text-foreground/40 tracking-[0.05em]">
                        Any verified driver in the Aurellion network can accept
                        this delivery job. The first driver to accept will be
                        assigned.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-card/40 border border-border/20">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-foreground/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-sm text-foreground font-bold mb-1 tracking-[0.08em] uppercase">
                      Specific-driver routing is not live yet
                    </p>
                    <p className="font-mono text-xs text-foreground/40 tracking-[0.05em]">
                      This release uses the Aurellion network delivery flow
                      only. We are hiding driver allowlisting until it is
                      enforced onchain.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'target':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                Who can accept?
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                Choose if this offer is open to everyone or a specific address
              </p>
            </div>

            <div className="space-y-4">
              {/* Public Option */}
              <button
                onClick={() => updateFormData({ targetType: 'public' })}
                className="w-full text-left"
                aria-pressed={formData.targetType === 'public'}
              >
                <EvaPanel
                  label="Public Offer"
                  sysId="PUB-01"
                  accent="gold"
                  className={cn(
                    'transition-all duration-300 border',
                    formData.targetType === 'public'
                      ? 'ring-2 ring-gold/70 border-gold/40 bg-gold/5 shadow-[0_0_24px_rgba(245,158,11,0.18)]'
                      : 'border-border/20 hover:ring-1 hover:ring-gold/20 hover:border-gold/30',
                  )}
                >
                  <div className="flex items-center gap-4 py-2">
                    {formData.targetType === 'public' && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 border border-gold/70 bg-gold/20">
                        <Check className="w-3 h-3 text-gold" />
                        <span className="font-mono text-[10px] font-bold text-gold tracking-[0.12em] uppercase">
                          Selected
                        </span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-gold" />
                    </div>
                    <p className="font-mono text-sm text-foreground/40 tracking-[0.08em]">
                      Anyone can accept this offer
                    </p>
                  </div>
                </EvaPanel>
              </button>

              {/* Targeted Option */}
              <button
                onClick={() => updateFormData({ targetType: 'targeted' })}
                className="w-full text-left"
                aria-pressed={formData.targetType === 'targeted'}
              >
                <EvaPanel
                  label="Targeted Offer"
                  sysId="TGT-01"
                  accent="crimson"
                  className={cn(
                    'transition-all duration-300 border',
                    formData.targetType === 'targeted'
                      ? 'ring-2 ring-crimson/70 border-crimson/40 bg-crimson/5 shadow-[0_0_24px_rgba(239,68,68,0.18)]'
                      : 'border-border/20 hover:ring-1 hover:ring-crimson/20 hover:border-crimson/30',
                  )}
                >
                  <div className="flex items-center gap-4 py-2">
                    {formData.targetType === 'targeted' && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 border border-crimson/70 bg-crimson/20">
                        <Check className="w-3 h-3 text-crimson" />
                        <span className="font-mono text-[10px] font-bold text-crimson tracking-[0.12em] uppercase">
                          Selected
                        </span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-crimson/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-crimson" />
                    </div>
                    <p className="font-mono text-sm text-foreground/40 tracking-[0.08em]">
                      Only a specific address can accept
                    </p>
                  </div>
                </EvaPanel>
              </button>

              {/* Target Address Input */}
              {formData.targetType === 'targeted' && (
                <div className="mt-4">
                  <label className="block font-mono text-xs font-bold text-foreground/50 mb-2 tracking-[0.2em] uppercase">
                    Target Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={formData.targetAddress}
                    onChange={(e) =>
                      updateFormData({ targetAddress: e.target.value })
                    }
                    className="bg-background/80 border-border/40 font-mono rounded-none"
                  />
                  {formData.targetAddress &&
                    !isAddress(formData.targetAddress) && (
                      <p className="font-mono text-xs text-crimson mt-1">
                        Please enter a valid Ethereum address
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                Review Your Offer
              </h2>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                Please review the details before submitting
              </p>
            </div>

            <EvaPanel label="Offer Summary" sysId="REV-01" status="pending">
              <div className="space-y-1">
                {/* Offer Type */}
                <div className="flex items-center justify-between py-3 border-b border-border/10">
                  <span className="font-mono text-sm text-foreground/50">
                    Offer Type
                  </span>
                  <EvaStatusBadge
                    status={
                      formData.offerType === 'sell' ? 'active' : 'processing'
                    }
                    label={formData.offerType === 'sell' ? 'SELL' : 'BUY'}
                  />
                </div>

                {/* Asset */}
                <div className="py-3 border-b border-border/10">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-foreground/50">
                      Asset
                    </span>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {selectedAsset?.name || formData.assetClass}
                      </span>
                      {formData.assetClass && (
                        <EvaStatusBadge
                          status="pending"
                          label={formData.assetClass}
                        />
                      )}
                    </div>
                  </div>
                  {/* Selected Attributes */}
                  {Object.keys(formData.selectedAttributes).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 justify-end">
                      {Object.entries(formData.selectedAttributes).map(
                        ([name, value]) => (
                          <span
                            key={name}
                            className="px-2 py-1 font-mono text-xs bg-card/80 text-foreground/50 border border-border/20"
                          >
                            {formatAttributeName(name)}: {value}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  <p className="font-mono text-xs text-foreground/25 mt-1 text-right tracking-[0.05em]">
                    Token ID: {formData.tokenId}
                  </p>
                </div>

                <EvaDataRow label="Quantity" value={formData.quantity} />
                {isSellFlow && selectedSellNode && (
                  <EvaDataRow
                    label="Fulfillment Node"
                    value={formatNodeLabel(
                      selectedSellNode.nodeHash,
                      selectedSellNode.locationName,
                    )}
                  />
                )}
                <EvaDataRow
                  label="Price"
                  value={`$${parseFloat(formData.price).toLocaleString()}`}
                  valueColor="gold"
                />
                <EvaDataRow
                  label="Fee (2%)"
                  value={`$${(parseFloat(formData.price) * 0.02).toLocaleString()}`}
                  valueColor="crimson"
                />

                {/* Expiry */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/10">
                  <span className="font-mono text-sm text-foreground/50">
                    Expiry
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formData.expiryHours === '0'
                      ? 'No expiry'
                      : `${formData.expiryHours} hours`}
                  </span>
                </div>

                {/* Driver */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/10">
                  <span className="font-mono text-sm text-foreground/50">
                    Driver
                  </span>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-foreground flex items-center gap-2 justify-end">
                      <Truck className="w-4 h-4" />
                      Any Network Driver
                    </span>
                  </div>
                </div>

                {formData.offerType === 'buy' && (
                  <div className="flex items-center justify-between py-2.5 border-b border-border/10">
                    <span className="font-mono text-sm text-foreground/50">
                      Delivery Destination
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground max-w-[65%] text-right truncate">
                      {formData.deliveryAddress || 'Not set'}
                    </span>
                  </div>
                )}

                {/* Target */}
                <div className="flex items-center justify-between py-2.5">
                  <span className="font-mono text-sm text-foreground/50">
                    Target
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {formData.targetType === 'public'
                      ? 'Public (anyone)'
                      : `${formData.targetAddress.slice(0, 6)}...${formData.targetAddress.slice(-4)}`}
                  </span>
                </div>
              </div>
            </EvaPanel>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-gold/5 border border-gold/20">
              <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-sm text-gold font-bold mb-1 tracking-[0.08em] uppercase">
                  {formData.offerType === 'sell'
                    ? 'Your tokens will be escrowed'
                    : 'Your payment will be escrowed'}
                </p>
                <p className="font-mono text-xs text-foreground/40 tracking-[0.05em]">
                  {formData.offerType === 'sell'
                    ? `${formData.quantity} tokens will be held in escrow until the offer is accepted or canceled.`
                    : `$${(parseFloat(formData.price) * 1.02).toLocaleString()} (including fee) will be held in escrow until the offer is accepted or canceled.`}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-crimson/5 border border-crimson/30">
                <AlertCircle className="w-5 h-5 text-crimson flex-shrink-0 mt-0.5" />
                <p className="font-mono text-sm text-crimson">{error}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Decorative top strip */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="mb-8 mt-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 font-mono text-sm text-foreground/40 hover:text-foreground transition-colors mb-4 tracking-[0.1em] uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground tracking-[0.15em] uppercase">
                Create P2P Offer
              </h1>
              <p className="font-mono text-sm text-foreground/40 mt-1 tracking-[0.1em] uppercase">
                Create a new peer-to-peer trade offer
              </p>
            </div>
            <LaurelAccent side="right" />
          </div>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Step Indicator */}
        <div className="mt-6">{renderStepIndicator()}</div>

        {/* Step Content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <TrapButton variant="crimson" onClick={goBack}>
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </span>
          </TrapButton>

          {currentStep === 'review' ? (
            <TrapButton
              variant="emerald"
              onClick={handleSubmit}
              disabled={isSubmitting || !connected}
            >
              <span className="flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Offer
                  </>
                )}
              </span>
            </TrapButton>
          ) : (
            <TrapButton
              variant="gold"
              onClick={goNext}
              disabled={!canProceed()}
            >
              <span className="flex items-center gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </span>
            </TrapButton>
          )}
        </div>

        {/* Bottom decorative strip */}
        <div className="mt-8">
          <GreekKeyStrip color="crimson" />
        </div>
      </div>
    </div>
  );
}
