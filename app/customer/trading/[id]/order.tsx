'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/form';
import { getWalletAddress } from '@/dapp-connectors/base-controller';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';
const orderFormSchema = z.object({
  quantity: z.coerce
    .number()
    .min(1, 'Quantity must be greater than 0')
    .refine((val) => Number.isInteger(val), 'Quantity must be a whole number'),
  deliveryLocation: z
    .string()
    .min(1, 'Delivery location is required')
    .min(5, 'Delivery location must be at least 5 characters'),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getAssetById, placeOrder } = useTrade();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState('');

  const asset = getAssetById(params.id);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      quantity: 1,
      deliveryLocation: '',
    },
  });

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

  const onSubmit = async (data: OrderFormValues) => {
    if (data.quantity > asset.quantity) {
      form.setError('quantity', {
        type: 'manual',
        message: 'Quantity exceeds available amount',
      });
      return;
    }

    setIsPlacingOrder(true);
    setError('');

    try {
      const success = await placeOrder({
        id: '0xf',
        token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        tokenId: BigInt(asset.id),
        tokenQuantity: BigInt(data.quantity),
        requestedTokenQuantity: BigInt(data.quantity),
        price: BigInt(asset.pricePerUnit),
        txFee: BigInt(0),
        customer: getWalletAddress(),
        journeyIds: [],
        nodes: [],
        locationData: {
          startLocation: {
            lat: '34.0522',
            lng: '-118.2437',
          },
          endLocation: {
            lat: '40.7128',
            lng: '-74.0060',
          },

          startName: 'Los Angeles, CA',
          endName: 'New York',
          currentStatus: BigInt(0),
          contracatualAgreement: '0xf',
        },
        currentStatus: BigInt(0),
        contracatualAgreement: '0xf',
      });
      // TODO: change this its bad code we shouldnt be putting contractual agreement twice
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
  };

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4 sm:mb-6">
          <Link
            href="/customer/trading"
            className="text-gray-400 hover:text-white"
          >
            Trading
          </Link>
          <span className="text-gray-600">/</span>
          <Link
            href={`/customer/trading/${params.id}`}
            className="text-gray-400 hover:text-white"
          >
            {asset.assetClass}
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">Place Order</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/customer/trading/${params.id}`}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Place Order</h1>
        </div>

        <div
          className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-6`}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        className="mt-2"
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? '' : Number(value));
                        }}
                      />
                    </FormControl>
                    <p className="text-sm text-gray-400 mt-1">
                      Max available: {asset.quantity}
                    </p>
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
                      <Input
                        placeholder="Enter delivery address"
                        {...field}
                        className="mt-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-[${colors.neutral[800]}]">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Price per unit</span>
                  <span>${asset.pricePerUnit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-6">
                  <span className="text-gray-400">Total Price</span>
                  <span className="text-xl font-bold">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPlacingOrder}
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
