'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useTrade } from '@/app/providers/trade.provider';
import { colors } from '@/lib/constants/colors';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
import { Order } from '@/domain/orders';

// Replace with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
    libraries: ['places'],
  });

  const asset = getAssetById(params.id);

  const orderFormSchema = z.object({
    quantity: z.coerce
      .number()
      .min(1, 'Quantity must be greater than 0')
      .refine((val) => Number.isInteger(val), 'Quantity must be a whole number')
      .refine(
        (val) => val <= asset!.quantity,
        `Quantity must be less than or equal to ${asset?.quantity}`,
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
      <div
        className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
      >
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Asset Not Found</h1>
        </div>
      </div>
    );
  }

  const totalPrice = form.watch('quantity') * asset.pricePerUnit;

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Link
            href={`/customer/trading/${params.id}`}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Asset
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Place Order</h1>

        <div
          className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-6`}
        >
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

                  // Build the proper LocationContract.OrderStruct
                  const orderData: Order = {
                    id: orderId,
                    token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
                    tokenId: BigInt(asset.id),
                    tokenQuantity: BigInt(data.quantity),
                    requestedTokenQuantity: BigInt(data.quantity),
                    price: ethers.parseUnits(
                      (asset.pricePerUnit * data.quantity).toFixed(18),
                      18,
                    ),
                    txFee: BigInt(0),
                    customer: '0x0000000000000000000000000000000000000000', // Will be set by the trade.provider
                    journeyIds: [],
                    nodes: [ethers.getAddress(asset.nodeId)],
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
                    currentStatus: BigInt(0),
                    contracatualAgreement: ethers.ZeroHash,
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
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max={asset.quantity}
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value > asset.quantity) {
                                  form.setValue('quantity', asset.quantity);
                                } else if (value < 1) {
                                  form.setValue('quantity', 1);
                                } else {
                                  field.onChange(e);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Location</FormLabel>
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
                                  className="w-full"
                                />
                              </Autocomplete>
                            ) : (
                              <Input
                                {...field}
                                placeholder="Loading Google Maps..."
                                disabled
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Order Summary
                  </h3>
                  <div className="flex justify-between mb-2">
                    <span>Price per unit:</span>
                    <span>${asset.pricePerUnit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Quantity:</span>
                    <span>{form.watch('quantity')}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-700">
                    <span>Total:</span>
                    <span className="text-xl font-bold">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPlacingOrder || !isLoaded || !!loadError}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium"
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
