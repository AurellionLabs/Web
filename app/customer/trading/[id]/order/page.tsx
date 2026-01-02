'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/app/components/ui/input';
import { useTrade } from '@/app/providers/trade.provider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  MapPin,
  ShoppingCart,
  DollarSign,
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
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';
import { Order, OrderStatus } from '@/domain/orders';
import { formatTokenAmount, parseTokenAmount } from '@/lib/formatters';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center max-w-md">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Asset Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The asset you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/customer/trading">
            <GlowButton variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trading
            </GlowButton>
          </Link>
        </GlassCard>
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
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Asset
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Place Order</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Purchase {asset.name} from {asset.nodeLocation.addressName}
          </p>
        </div>

        {/* Asset Info */}
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-lg font-bold text-accent">
                {asset.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {asset.name}
              </h2>
              <p className="text-sm text-muted-foreground capitalize">
                {asset.class}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-foreground">
                ${formatTokenAmount(asset.price || '0', 0, 2)}
              </p>
              <p className="text-sm text-muted-foreground">per unit</p>
            </div>
          </div>
        </GlassCard>

        {/* Order Form */}
        <GlassCard>
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

                  // Convert price to USDT units (6 decimals)
                  const assetPrice = asset.price || '0';
                  const priceInUSDT = parseTokenAmount(assetPrice, 6);
                  const totalPrice = priceInUSDT * BigInt(data.quantity);

                  const orderData: Order = {
                    id: orderId,
                    token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
                    tokenId: asset.id,
                    tokenQuantity: String(data.quantity),
                    price: totalPrice.toString(),
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
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Package className="w-4 h-4 text-accent" />
                  <span>Order Details</span>
                </div>

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Quantity
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={parseInt(asset.capacity || '0')}
                          className="bg-surface-overlay border-glass-border"
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
                      <p className="text-xs text-muted-foreground/70">
                        Available: {asset.capacity} units
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Delivery Location Section */}
              <div className="space-y-4 pt-4 border-t border-glass-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span>Delivery Location</span>
                </div>

                <FormField
                  control={form.control}
                  name="deliveryLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
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
                              className="bg-surface-overlay border-glass-border"
                            />
                          </Autocomplete>
                        ) : (
                          <Input
                            {...field}
                            placeholder="Loading Google Maps..."
                            disabled
                            className="bg-surface-overlay border-glass-border"
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Order Summary Section */}
              <div className="space-y-4 pt-4 border-t border-glass-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <DollarSign className="w-4 h-4 text-accent" />
                  <span>Order Summary</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Price per unit
                    </span>
                    <span className="font-mono text-foreground">
                      ${formatTokenAmount(asset.price || '0', 0, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-mono text-foreground">
                      {form.watch('quantity')}
                    </span>
                  </div>
                  <div className="border-t border-glass-border pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-semibold text-foreground">
                        Total
                      </span>
                      <span className="text-2xl font-bold font-mono text-accent">
                        ${(totalPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-trading-sell/10 border border-trading-sell/20 rounded-lg p-3">
                  <p className="text-trading-sell text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <GlowButton
                type="submit"
                variant="primary"
                className="w-full"
                glow
                loading={isPlacingOrder}
                disabled={!isLoaded || !!loadError}
              >
                Place Order - ${(totalPrice || 0).toFixed(2)}
              </GlowButton>
            </form>
          </Form>
        </GlassCard>
      </div>
    </div>
  );
}
