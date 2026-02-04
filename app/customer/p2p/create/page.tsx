'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
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
} from 'lucide-react';
import { parseUnits, isAddress } from 'ethers';
import { NEXT_PUBLIC_AURA_ASSET_ADDRESS } from '@/chain-constants';

type Step = 'type' | 'asset' | 'details' | 'target' | 'review';

interface FormData {
  offerType: 'buy' | 'sell' | null;
  assetClass: string;
  tokenId: string;
  quantity: string;
  price: string;
  expiryHours: string;
  targetType: 'public' | 'targeted';
  targetAddress: string;
}

/**
 * P2P Offer Creation Wizard
 *
 * Steps:
 * 1. Select offer type (buy or sell)
 * 2. Select asset class and token
 * 3. Enter quantity and price
 * 4. Set target (public or specific address)
 * 5. Review and confirm
 */
export default function CreateP2POfferPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { address } = useWallet();
  const { p2pService, initialized: diamondInitialized } = useDiamond();
  const { assetClasses } = usePlatform();
  const router = useRouter();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [formData, setFormData] = useState<FormData>({
    offerType: null,
    assetClass: '',
    tokenId: '',
    quantity: '',
    price: '',
    expiryHours: '24',
    targetType: 'public',
    targetAddress: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Update form data
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  // Step navigation
  const steps: Step[] = ['type', 'asset', 'details', 'target', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'type':
        return formData.offerType !== null;
      case 'asset':
        return formData.assetClass !== '' && formData.tokenId !== '';
      case 'details':
        return (
          formData.quantity !== '' &&
          parseFloat(formData.quantity) > 0 &&
          formData.price !== '' &&
          parseFloat(formData.price) > 0
        );
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

    setIsSubmitting(true);
    setError(null);

    try {
      const expiresAt =
        formData.expiryHours === '0'
          ? 0
          : Math.floor(Date.now() / 1000) +
            parseInt(formData.expiryHours) * 3600;

      await p2pService.createOffer({
        token: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        tokenId: formData.tokenId,
        quantity: BigInt(formData.quantity),
        price: parseUnits(formData.price, 18),
        isSellOffer: formData.offerType === 'sell',
        targetCounterparty:
          formData.targetType === 'targeted'
            ? formData.targetAddress
            : undefined,
        expiresAt,
      });

      router.push('/customer/p2p');
    } catch (err) {
      console.error('Error creating offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setIsSubmitting(false);
    }
  }, [p2pService, connected, formData, router]);

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              index < currentStepIndex
                ? 'bg-emerald-500 text-white'
                : index === currentStepIndex
                  ? 'bg-amber-500 text-white'
                  : 'bg-neutral-700 text-neutral-400',
            )}
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
                'w-12 h-0.5 mx-1',
                index < currentStepIndex ? 'bg-emerald-500' : 'bg-neutral-700',
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
              <h2 className="text-2xl font-bold text-foreground mb-2">
                What would you like to do?
              </h2>
              <p className="text-muted-foreground">
                Choose whether you want to buy or sell assets
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Buy Option */}
              <button
                onClick={() => updateFormData({ offerType: 'buy' })}
                className={cn(
                  'p-8 rounded-xl border-2 transition-all text-left',
                  formData.offerType === 'buy'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-glass-border bg-glass-bg hover:border-blue-500/50',
                )}
              >
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  I want to Buy
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create a buy offer and wait for a seller to accept your terms
                </p>
              </button>

              {/* Sell Option */}
              <button
                onClick={() => updateFormData({ offerType: 'sell' })}
                className={cn(
                  'p-8 rounded-xl border-2 transition-all text-left',
                  formData.offerType === 'sell'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-glass-border bg-glass-bg hover:border-emerald-500/50',
                )}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Tag className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  I want to Sell
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create a sell offer and wait for a buyer to accept your terms
                </p>
              </button>
            </div>
          </div>
        );

      case 'asset':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Select Asset
              </h2>
              <p className="text-muted-foreground">
                Choose the asset class and enter the token ID
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Asset Class
                </label>
                <select
                  value={formData.assetClass}
                  onChange={(e) =>
                    updateFormData({ assetClass: e.target.value })
                  }
                  className="w-full bg-neutral-800/50 border border-glass-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Select an asset class</option>
                  {assetClasses.map((ac) => (
                    <option key={ac.name} value={ac.name}>
                      {ac.name}
                    </option>
                  ))}
                  <option value="GOAT">GOAT</option>
                  <option value="GOLD">GOLD</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Token ID
                </label>
                <Input
                  type="text"
                  placeholder="Enter the token ID"
                  value={formData.tokenId}
                  onChange={(e) => updateFormData({ tokenId: e.target.value })}
                  className="bg-neutral-800/50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The specific token ID you want to{' '}
                  {formData.offerType === 'buy' ? 'buy' : 'sell'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Set Terms
              </h2>
              <p className="text-muted-foreground">
                Enter the quantity and price for your offer
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quantity
                </label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => updateFormData({ quantity: e.target.value })}
                  min="1"
                  className="bg-neutral-800/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price (USD)
                </label>
                <Input
                  type="number"
                  placeholder="Enter total price"
                  value={formData.price}
                  onChange={(e) => updateFormData({ price: e.target.value })}
                  min="0"
                  step="0.01"
                  className="bg-neutral-800/50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Total price for all {formData.quantity || '0'} units
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Expiry
                </label>
                <select
                  value={formData.expiryHours}
                  onChange={(e) =>
                    updateFormData({ expiryHours: e.target.value })
                  }
                  className="w-full bg-neutral-800/50 border border-glass-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-amber-500/50"
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
          </div>
        );

      case 'target':
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Who can accept?
              </h2>
              <p className="text-muted-foreground">
                Choose if this offer is open to everyone or a specific address
              </p>
            </div>

            <div className="space-y-4">
              {/* Public Option */}
              <button
                onClick={() => updateFormData({ targetType: 'public' })}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all text-left',
                  formData.targetType === 'public'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-glass-border bg-glass-bg hover:border-amber-500/50',
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Public Offer
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Anyone can accept this offer
                    </p>
                  </div>
                </div>
              </button>

              {/* Targeted Option */}
              <button
                onClick={() => updateFormData({ targetType: 'targeted' })}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all text-left',
                  formData.targetType === 'targeted'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-glass-border bg-glass-bg hover:border-amber-500/50',
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Targeted Offer
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Only a specific address can accept
                    </p>
                  </div>
                </div>
              </button>

              {/* Target Address Input */}
              {formData.targetType === 'targeted' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Target Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={formData.targetAddress}
                    onChange={(e) =>
                      updateFormData({ targetAddress: e.target.value })
                    }
                    className="bg-neutral-800/50"
                  />
                  {formData.targetAddress &&
                    !isAddress(formData.targetAddress) && (
                      <p className="text-xs text-red-400 mt-1">
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
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Review Your Offer
              </h2>
              <p className="text-muted-foreground">
                Please review the details before submitting
              </p>
            </div>

            <GlassCard>
              <div className="p-6 space-y-4">
                {/* Offer Type */}
                <div className="flex items-center justify-between py-3 border-b border-glass-border">
                  <span className="text-muted-foreground">Offer Type</span>
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      formData.offerType === 'sell'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400',
                    )}
                  >
                    {formData.offerType === 'sell' ? 'SELL' : 'BUY'}
                  </span>
                </div>

                {/* Asset */}
                <div className="flex items-center justify-between py-3 border-b border-glass-border">
                  <span className="text-muted-foreground">Asset</span>
                  <span className="text-foreground font-medium">
                    {formData.assetClass} #{formData.tokenId}
                  </span>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between py-3 border-b border-glass-border">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="text-foreground font-medium">
                    {formData.quantity}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between py-3 border-b border-glass-border">
                  <span className="text-muted-foreground">Price</span>
                  <span className="text-amber-400 font-medium">
                    ${parseFloat(formData.price).toLocaleString()}
                  </span>
                </div>

                {/* Fee */}
                <div className="flex items-center justify-between py-3 border-b border-glass-border">
                  <span className="text-muted-foreground">Fee (2%)</span>
                  <span className="text-foreground font-medium">
                    ${(parseFloat(formData.price) * 0.02).toLocaleString()}
                  </span>
                </div>

                {/* Expiry */}
                <div className="flex items-center justify-between py-3 border-b border-glass-border">
                  <span className="text-muted-foreground">Expiry</span>
                  <span className="text-foreground font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formData.expiryHours === '0'
                      ? 'No expiry'
                      : `${formData.expiryHours} hours`}
                  </span>
                </div>

                {/* Target */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Target</span>
                  <span className="text-foreground font-medium">
                    {formData.targetType === 'public'
                      ? 'Public (anyone)'
                      : `${formData.targetAddress.slice(0, 6)}...${formData.targetAddress.slice(-4)}`}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium mb-1">
                  {formData.offerType === 'sell'
                    ? 'Your tokens will be escrowed'
                    : 'Your payment will be escrowed'}
                </p>
                <p className="text-muted-foreground">
                  {formData.offerType === 'sell'
                    ? `${formData.quantity} tokens will be held in escrow until the offer is accepted or canceled.`
                    : `$${(parseFloat(formData.price) * 1.02).toLocaleString()} (including fee) will be held in escrow until the offer is accepted or canceled.`}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Create P2P Offer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new peer-to-peer trade offer
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <GlowButton variant="secondary" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </GlowButton>

          {currentStep === 'review' ? (
            <GlowButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !connected}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Offer
                </>
              )}
            </GlowButton>
          ) : (
            <GlowButton
              variant="primary"
              onClick={goNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}
