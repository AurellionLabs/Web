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
import { Slider } from '@/app/components/ui/slider';
import { GlowButton } from '@/app/components/ui/glow-button';
import { cn } from '@/lib/utils';
import {
  Send,
  MapPin,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Shield,
  Clock,
} from 'lucide-react';
import { UserHolding } from '@/hooks/useUserHoldings';
import { RedemptionService } from '@/infrastructure/services/redemption-service';
import { useToast } from '@/hooks/use-toast';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

// Google Maps libraries
const GOOGLE_LIBRARIES: 'places'[] = ['places'];

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

  // Google Maps
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  // Form state
  const [quantity, setQuantity] = useState('1');
  const [confirmationLevel, setConfirmationLevel] = useState(3); // Default: 3 nodes
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // UI state
  const [step, setStep] = useState<
    'details' | 'confirm' | 'processing' | 'success'
  >('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate redemption fee based on confirmation level and quantity
  const baseRedemptionFee = 5; // $5 base fee
  const perNodeFee = 3; // $3 per intermediate node
  const perUnitFee = 2; // $2 per unit
  const quantityNum = parseInt(quantity) || 0;
  // Fee increases with more nodes (more security = higher cost)
  const totalFee =
    baseRedemptionFee +
    perNodeFee * (confirmationLevel - 1) +
    perUnitFee * quantityNum;

  // Estimated delivery time based on confirmation level
  const estimatedDays = confirmationLevel + 2; // Base 3 days + 1 day per extra node

  const isValidQuantity =
    quantityNum > 0 && BigInt(quantityNum) <= holding.balance;
  const isAddressComplete =
    deliveryAddress.length > 0 && deliveryCoords !== null;

  // Confirmation level descriptions
  const getConfirmationDescription = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Direct', security: 'Basic', speed: 'Fastest' };
      case 2:
        return { label: 'Standard', security: 'Good', speed: 'Fast' };
      case 3:
        return { label: 'Enhanced', security: 'Strong', speed: 'Medium' };
      case 4:
        return {
          label: 'High Security',
          security: 'Very Strong',
          speed: 'Slower',
        };
      case 5:
        return { label: 'Maximum', security: 'Maximum', speed: 'Slowest' };
      default:
        return { label: 'Standard', security: 'Good', speed: 'Medium' };
    }
  };

  const confirmationDesc = getConfirmationDescription(confirmationLevel);

  const handleQuantityChange = (value: string) => {
    // Only allow positive integers
    const num = parseInt(value);
    if (value === '' || (num > 0 && num <= Number(holding.balance))) {
      setQuantity(value);
    }
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setDeliveryAddress(place.formatted_address || '');
        setDeliveryCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    }
  };

  const handleProceedToConfirm = () => {
    if (!isValidQuantity) {
      setError('Please enter a valid quantity');
      return;
    }
    if (!isAddressComplete) {
      setError('Please select a delivery address from the dropdown');
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

      if (!deliveryCoords) {
        throw new Error('Delivery coordinates not set');
      }

      const result = await redemptionService.requestRedemption({
        tokenId: holding.tokenId,
        quantity: BigInt(quantityNum),
        deliveryAddress: deliveryAddress,
        originNode: holding.originNode || '',
        originCustodianAddress: holding.originCustodianAddress,
        originNodeHash: holding.originNodeHash,
        confirmationLevel: confirmationLevel,
        destinationLat: deliveryCoords.lat,
        destinationLng: deliveryCoords.lng,
      });

      if (!result.success) {
        throw new Error(result.error || 'Redemption failed');
      }

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
    setConfirmationLevel(3);
    setDeliveryAddress('');
    setDeliveryCoords(null);
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

            {/* Delivery Address - Google Places Autocomplete */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </Label>
              {mapsLoaded ? (
                <Autocomplete
                  onLoad={(autocompleteInstance) => {
                    setAutocomplete(autocompleteInstance);
                  }}
                  onPlaceChanged={handlePlaceSelect}
                >
                  <Input
                    placeholder="Search for a delivery address..."
                    className="bg-surface-overlay border-glass-border"
                  />
                </Autocomplete>
              ) : (
                <Input
                  placeholder="Loading maps..."
                  disabled
                  className="bg-surface-overlay border-glass-border"
                />
              )}
              {deliveryAddress && (
                <p className="text-xs text-muted-foreground mt-1">
                  {deliveryAddress}
                </p>
              )}
            </div>

            {/* Confirmation Level Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Level
                </Label>
                <span className="text-sm font-medium text-accent">
                  {confirmationDesc.label}
                </span>
              </div>

              <div className="px-1">
                <Slider
                  value={[confirmationLevel]}
                  onValueChange={(value) => setConfirmationLevel(value[0])}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>

              {/* Security level info */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-glass-bg border border-glass-border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Security</p>
                    <p className="text-sm font-medium">
                      {confirmationDesc.security}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Est. Delivery
                    </p>
                    <p className="text-sm font-medium">{estimatedDays} days</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Higher security routes your package through more verification
                nodes, increasing delivery time but providing stronger proof of
                custody.
              </p>
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
                    {deliveryAddress}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security Level</span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-accent" />
                    {confirmationDesc.label} ({confirmationLevel} nodes)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Delivery</span>
                  <span>{estimatedDays} days</span>
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
