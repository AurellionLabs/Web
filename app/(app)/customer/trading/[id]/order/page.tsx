'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/app/components/ui/input';
import { useTrade } from '@/app/providers/trade.provider';
import {
  EvaPanel,
  TrapButton,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  MapPin,
  ShoppingCart,
  DollarSign,
  Wallet,
  AlertCircle,
  Droplets,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { ethers } from 'ethers';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
  NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL,
} from '@/chain-constants';
import { Order, OrderStatus } from '@/domain/orders';
import { formatTokenAmount, parseTokenAmount } from '@/lib/formatters';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuraToken } from '@/hooks/useAuraToken';

// Replace with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Keep libraries as a stable constant to prevent LoadScript reloads
const GOOGLE_LIBRARIES: 'places'[] = ['places'];

// Force dynamic rendering to avoid static generation issues with wallet libraries
export const dynamic = 'force-dynamic';

export default function OrderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getAssetById, placeOrder } = useTrade();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: string;
    lng: string;
  } | null>(null);

  // AURA token balance for payment
  const {
    balance: auraBalance,
    balanceRaw: auraBalanceRaw,
    isLoadingBalance,
    symbol: auraSymbol,
  } = useAuraToken();

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  const asset = getAssetById(params.id);

  const orderFormSchema = z.object({
    quantity: z.coerce
      .number()
      .min(1, 'Quantity must be greater than 0')
      .refine((val) => Number.isInteger(val), 'Quantity must be a whole number')
      .refine(
        (val) => val <= parseInt(asset!.capacity || '0'),
        `Quantity must be less than or equal to ${asset?.capacity || '0'}`,
      ),
    deliveryLocation: z
      .string()
      .min(1, 'Delivery location is required')
      .min(5, 'Delivery location must be at least 5 characters'),
  });

  type OrderFormValues = z.infer<typeof orderFormSchema>;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      quantity: 1,
      deliveryLocation: '',
    },
  });

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat().toString();
        const lng = place.geometry.location.lng().toString();
        const address = place.formatted_address || '';

        setSelectedLocation({
          address,
          lat,
          lng,
        });

        form.setValue('deliveryLocation', address);
      }
    }
  };

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <EvaPanel
          label="SYSTEM ALERT"
          sysId="ERR-404"
          accent="crimson"
          className="max-w-md"
        >
          <div className="text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-2xl font-serif font-bold text-foreground mb-4 tracking-[0.15em] uppercase">
              Asset Not Found
            </h1>
            <p className="text-muted-foreground font-mono mb-6 tracking-[0.15em]">
              The asset you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link href="/customer/trading">
              <TrapButton variant="crimson">
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Trading
                </span>
              </TrapButton>
            </Link>
          </div>
        </EvaPanel>
      </div>
    );
  }

  const totalPrice = form.watch('quantity') * parseFloat(asset.price || '0');

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href={`/customer/trading/${params.id}`}
          className="inline-flex items-center text-sm font-mono text-muted-foreground hover:text-foreground transition-colors tracking-[0.15em] uppercase"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Asset
        </Link>

        {/* Decorative top accent */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-accent" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <LaurelAccent side="left" />
            <h1 className="text-2xl font-serif font-bold text-foreground tracking-[0.15em] uppercase">
              Place Order
            </h1>
            <LaurelAccent side="right" />
          </div>
          <p className="text-sm font-mono text-muted-foreground mt-2 tracking-[0.15em] uppercase">
            Purchase {asset.name} from {asset.nodeLocation.addressName}
          </p>
        </div>

        {/* Asset Info */}
        <EvaPanel label="ASSET INFO" sysId="TKN-01">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-lg font-bold font-mono text-accent">
                {asset.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-mono font-semibold text-foreground tracking-[0.15em] uppercase">
                {asset.name}
              </h2>
              <p className="text-sm font-mono text-muted-foreground tracking-[0.15em] uppercase">
                {asset.class}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-foreground">
                ${formatTokenAmount(asset.price || '0', 0, 2)}
              </p>
              <p className="text-sm font-mono text-muted-foreground tracking-[0.15em] uppercase">
                per unit
              </p>
            </div>
          </div>
        </EvaPanel>

        {/* AURA Balance Card */}
        <EvaPanel label="WALLET BALANCE" sysId="WAL-01" status="active">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-mono text-muted-foreground tracking-[0.15em] uppercase">
                  Your {auraSymbol} Balance
                </p>
                <p className="text-xl font-bold font-mono text-foreground">
                  {isLoadingBalance ? '...' : auraBalance}{' '}
                  <span className="text-amber-400 text-sm font-mono">
                    {auraSymbol}
                  </span>
                </p>
              </div>
            </div>
            {parseFloat(auraBalance.replace(/,/g, '')) < totalPrice &&
              totalPrice > 0 && (
                <Link
                  href="/customer/faucet"
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-mono tracking-[0.15em] uppercase"
                  style={{
                    clipPath:
                      'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                  }}
                >
                  <Droplets className="w-4 h-4" />
                  Get Tokens
                </Link>
              )}
          </div>
          {parseFloat(auraBalance.replace(/,/g, '')) < totalPrice &&
            totalPrice > 0 && (
              <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm font-mono">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Insufficient balance. You need{' '}
                  {(
                    totalPrice - parseFloat(auraBalance.replace(/,/g, ''))
                  ).toFixed(2)}{' '}
                  more {NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL}.
                </span>
              </div>
            )}
        </EvaPanel>

        {/* Order Form */}
        <EvaPanel label="ORDER FORM" sysId="ORD-01">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (data) => {
                setIsPlacingOrder(true);
                setError('');

                if (!selectedLocation) {
                  setError(
                    'Please select a valid delivery location from the dropdown',
                  );
                  setIsPlacingOrder(false);
                  return;
                }

                try {
                  // Generate a unique order ID
                  const randomBytes = ethers.randomBytes(32);
                  const orderId = ethers.hexlify(randomBytes);

                  // Convert price to quote token units (configurable decimals)
                  // Testnet: AURA (18 decimals), Production: USDC (6 decimals)
                  const assetPrice = asset.price || '0';
                  const priceInQuoteToken = parseTokenAmount(
                    assetPrice,
                    NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
                  );
                  const totalPriceWei =
                    priceInQuoteToken * BigInt(data.quantity);

                  const orderData: Order = {
                    id: orderId,
                    token: NEXT_PUBLIC_DIAMOND_ADDRESS,
                    tokenId: asset.id,
                    tokenQuantity: String(data.quantity),
                    price: totalPriceWei.toString(),
                    txFee: String(0),
                    journeyIds: [],
                    nodes: [ethers.getAddress(asset.nodeAddress)],
                    locationData: {
                      startLocation: {
                        lat: asset.nodeLocation.location.lat,
                        lng: asset.nodeLocation.location.lng,
                      },
                      endLocation: {
                        lat: selectedLocation.lat,
                        lng: selectedLocation.lng,
                      },
                      startName: asset.nodeLocation.addressName,
                      endName: data.deliveryLocation,
                    },
                    currentStatus: OrderStatus.CREATED,
                    buyer: '0x0000000000000000000000000000000000000000',
                    seller: ethers.getAddress(asset.nodeAddress),
                    contractualAgreement: '',
                  };

                  const success = await placeOrder(orderData);

                  if (success) {
                    router.push('/customer/trading');
                  } else {
                    setError('Failed to place order');
                  }
                } catch (error) {
                  setError('An error occurred while placing the order');
                } finally {
                  setIsPlacingOrder(false);
                }
              })}
              className="space-y-6"
            >
              {/* Order Details Section */}
              <div className="space-y-4">
                <EvaSectionMarker section="ORDER DETAILS" variant="gold" />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
                        Quantity
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={parseInt(asset.capacity || '0')}
                          className="bg-surface-overlay border-glass-border font-mono"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            const maxCapacity = parseInt(asset.capacity || '0');
                            if (value > maxCapacity) {
                              form.setValue('quantity', maxCapacity);
                            } else if (value < 1) {
                              form.setValue('quantity', 1);
                            } else {
                              field.onChange(e);
                            }
                          }}
                        />
                      </FormControl>
                      <p className="text-xs font-mono text-muted-foreground/70 tracking-[0.15em] uppercase">
                        Available: {asset.capacity} units
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Delivery Location Section */}
              <EvaScanLine variant="mixed" />
              <div className="space-y-4">
                <EvaSectionMarker section="DELIVERY LOCATION" variant="gold" />

                <FormField
                  control={form.control}
                  name="deliveryLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
                        Address
                      </FormLabel>
                      <FormControl>
                        {isLoaded ? (
                          <Autocomplete
                            onLoad={(autocomplete) =>
                              setAutocomplete(autocomplete)
                            }
                            onPlaceChanged={onPlaceChanged}
                            restrictions={{ country: ['us', 'ca', 'uk'] }}
                          >
                            <Input
                              {...field}
                              placeholder="Enter delivery address"
                              className="bg-surface-overlay border-glass-border font-mono"
                            />
                          </Autocomplete>
                        ) : (
                          <Input
                            {...field}
                            placeholder="Loading Google Maps..."
                            disabled
                            className="bg-surface-overlay border-glass-border font-mono"
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Order Summary Section */}
              <EvaScanLine variant="mixed" />
              <div className="space-y-4">
                <EvaSectionMarker section="ORDER SUMMARY" variant="crimson" />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm text-muted-foreground tracking-[0.15em] uppercase">
                      Price per unit
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      ${formatTokenAmount(asset.price || '0', 0, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm text-muted-foreground tracking-[0.15em] uppercase">
                      Quantity
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {form.watch('quantity')}
                    </span>
                  </div>
                  <EvaScanLine variant="crimson" />
                  <div className="pt-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-serif font-semibold text-foreground tracking-[0.15em] uppercase">
                        Total
                      </span>
                      <span className="text-2xl font-bold font-mono text-gold">
                        ${(totalPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-trading-sell/10 border border-trading-sell/20 rounded-lg p-3">
                  <p className="text-trading-sell text-sm font-mono">{error}</p>
                </div>
              )}

              <EvaScanLine variant="gold" />

              {/* Submit Button */}
              <TrapButton
                variant="gold"
                size="lg"
                className="w-full"
                disabled={
                  isPlacingOrder ||
                  !isLoaded ||
                  !!loadError ||
                  parseFloat(auraBalance.replace(/,/g, '')) < totalPrice
                }
              >
                {isPlacingOrder
                  ? 'PLACING ORDER...'
                  : parseFloat(auraBalance.replace(/,/g, '')) < totalPrice &&
                      totalPrice > 0
                    ? `INSUFFICIENT ${NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL} BALANCE`
                    : `PLACE ORDER — ${(totalPrice || 0).toFixed(2)} ${NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL}`}
              </TrapButton>
            </form>
          </Form>
        </EvaPanel>

        {/* Bottom decorative accent */}
        <GreekKeyStrip color="crimson" />
      </div>
    </div>
  );
}
