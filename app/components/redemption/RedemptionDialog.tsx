'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { GlowButton } from '@/app/components/ui/glow-button';
import { cn } from '@/lib/utils';
import {
  Send,
  MapPin,
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { UserHolding } from '@/hooks/useUserHoldings';
import { RedemptionService } from '@/infrastructure/services/redemption-service';
import { useToast } from '@/hooks/use-toast';

interface RedemptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  holding: UserHolding;
  onSuccess: () => void;
}

/**
 * RedemptionDialog - Modal for initiating physical delivery of tokenized assets
 *
 * Flow:
 * 1. User enters delivery address
 * 2. System calculates redemption fee
 * 3. User confirms redemption
 * 4. Token is burned, logistics order created
 * 5. Physical delivery begins via driver network
 */
export function RedemptionDialog({
  isOpen,
  onClose,
  holding,
  onSuccess,
}: RedemptionDialogProps) {
  const { toast } = useToast();

  // Form state
  const [quantity, setQuantity] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  // UI state
  const [step, setStep] = useState<
    'details' | 'confirm' | 'processing' | 'success'
  >('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate redemption fee (simplified - in production this would be based on distance/nodes)
  const baseRedemptionFee = 5; // $5 base fee
  const perUnitFee = 2; // $2 per unit
  const quantityNum = parseInt(quantity) || 0;
  const totalFee = baseRedemptionFee + perUnitFee * quantityNum;

  const isValidQuantity =
    quantityNum > 0 && BigInt(quantityNum) <= holding.balance;
  const isAddressComplete =
    deliveryAddress.street &&
    deliveryAddress.city &&
    deliveryAddress.state &&
    deliveryAddress.postalCode &&
    deliveryAddress.country;

  const handleQuantityChange = (value: string) => {
    // Only allow positive integers
    const num = parseInt(value);
    if (value === '' || (num > 0 && num <= Number(holding.balance))) {
      setQuantity(value);
    }
  };

  const handleAddressChange = (
    field: keyof typeof deliveryAddress,
    value: string,
  ) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleProceedToConfirm = () => {
    if (!isValidQuantity) {
      setError('Please enter a valid quantity');
      return;
    }
    if (!isAddressComplete) {
      setError('Please complete all address fields');
      return;
    }
    setError(null);
    setStep('confirm');
  };

  const handleConfirmRedemption = async () => {
    setIsSubmitting(true);
    setError(null);
    setStep('processing');

    try {
      const redemptionService = new RedemptionService();

      // Format delivery address as a single string for the parcel data
      const formattedAddress = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postalCode}, ${deliveryAddress.country}`;

      await redemptionService.requestRedemption({
        tokenId: holding.tokenId,
        quantity: BigInt(quantityNum),
        deliveryAddress: formattedAddress,
        originNode: holding.originNode || '',
      });

      setStep('success');

      // Auto-close after success
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 2000);
    } catch (err) {
      console.error('[RedemptionDialog] Redemption failed:', err);
      setError(err instanceof Error ? err.message : 'Redemption failed');
      setStep('confirm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuantity('1');
    setDeliveryAddress({
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    });
    setStep('details');
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Send className="w-5 h-5 text-accent" />
            Redeem Asset for Delivery
          </DialogTitle>
          <DialogDescription>
            Convert your tokenized asset into a physical delivery
          </DialogDescription>
        </DialogHeader>

        {/* Step: Details */}
        {step === 'details' && (
          <div className="space-y-6">
            {/* Asset Summary */}
            <div className="rounded-lg bg-glass-bg border border-glass-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Asset</span>
                <span className="font-semibold">{holding.name}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Class</span>
                <span className="text-sm">{holding.assetClass}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available</span>
                <span className="font-mono">
                  {holding.balance.toString()} units
                </span>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Redeem</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={holding.balance.toString()}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="bg-surface-overlay border-glass-border"
              />
              {!isValidQuantity && quantity !== '' && (
                <p className="text-xs text-trading-sell">
                  Quantity must be between 1 and {holding.balance.toString()}
                </p>
              )}
            </div>

            {/* Delivery Address */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </Label>

              <Input
                placeholder="Street Address"
                value={deliveryAddress.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className="bg-surface-overlay border-glass-border"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={deliveryAddress.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="bg-surface-overlay border-glass-border"
                />
                <Input
                  placeholder="State/Province"
                  value={deliveryAddress.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  className="bg-surface-overlay border-glass-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Postal Code"
                  value={deliveryAddress.postalCode}
                  onChange={(e) =>
                    handleAddressChange('postalCode', e.target.value)
                  }
                  className="bg-surface-overlay border-glass-border"
                />
                <Input
                  placeholder="Country"
                  value={deliveryAddress.country}
                  onChange={(e) =>
                    handleAddressChange('country', e.target.value)
                  }
                  className="bg-surface-overlay border-glass-border"
                />
              </div>
            </div>

            {/* Fee Estimate */}
            <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Estimated Redemption Fee
                </span>
                <span className="font-bold text-accent">
                  ${totalFee.toFixed(2)} USDC
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Fee covers node relay and delivery costs
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-trading-sell text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-glass-bg border border-glass-border p-4 space-y-3">
              <h4 className="font-semibold text-foreground">
                Confirm Redemption
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset</span>
                  <span>{holding.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-mono">{quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery To</span>
                  <span className="text-right max-w-[200px] truncate">
                    {deliveryAddress.city}, {deliveryAddress.state}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-glass-border">
                  <span className="text-muted-foreground">Redemption Fee</span>
                  <span className="font-bold text-accent">
                    ${totalFee.toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">
                    This action will burn your tokens
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your {quantity} {holding.name} tokens will be permanently
                    burned and converted into a physical delivery order.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-trading-sell text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <p className="text-lg font-medium">Processing Redemption...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please confirm the transaction in your wallet
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-trading-buy/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-trading-buy" />
            </div>
            <p className="text-lg font-medium text-trading-buy">
              Redemption Successful!
            </p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Your delivery order has been created.
              <br />
              Track it in the orders section.
            </p>
          </div>
        )}

        {/* Footer */}
        {(step === 'details' || step === 'confirm') && (
          <DialogFooter className="flex justify-between sm:justify-between gap-4 pt-4">
            {step === 'details' ? (
              <>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="w-full"
                >
                  Cancel
                </Button>
                <GlowButton
                  variant="primary"
                  onClick={handleProceedToConfirm}
                  disabled={!isValidQuantity || !isAddressComplete}
                  className="w-full"
                >
                  Continue
                </GlowButton>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setStep('details')}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Back
                </Button>
                <GlowButton
                  variant="primary"
                  onClick={handleConfirmRedemption}
                  disabled={isSubmitting}
                  className="w-full"
                  leftIcon={
                    isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )
                  }
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Redemption'}
                </GlowButton>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RedemptionDialog;
