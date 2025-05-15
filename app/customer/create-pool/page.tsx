'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { ethers } from 'ethers';
import {
  createOperation,
  requestTokenAllowance,
} from '@/dapp-connectors/staking-controller';
import { toast } from 'sonner';
import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '@/chain-constants';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Operation name must be at least 3 characters.',
  }),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Please enter a valid token address.',
  }),
  provider: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Please enter a valid provider address.',
  }),
  lengthInDays: z
    .string()
    .refine(
      (val) =>
        !isNaN(parseInt(val)) &&
        Number.isInteger(Number(val)) &&
        parseInt(val) > 0,
      {
        message: 'Please enter a valid whole number greater than 0.',
      },
    ),
  reward: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 1 && num <= 100;
    },
    {
      message: 'Reward amount must be between 1 and 100.',
    },
  ),
  asset: z.string().min(1, {
    message: 'Please enter the pools asset .',
  }),
  fundingGoal: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Please enter a valid number greater than 0.',
    }),
  assetPrice: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Please enter a valid number greater than 0.',
    }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
});

export default function CreateOperationPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      token: '',
      provider: '',
      lengthInDays: '',
      reward: '',
      asset: '',
      fundingGoal: '',
      assetPrice: '',
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await requestTokenAllowance(NEXT_PUBLIC_AURA_TOKEN_ADDRESS);

      // Convert decimal values to wei (18 decimals)
      const fundingGoalWei = ethers.parseUnits(values.fundingGoal, 18);
      const assetPriceWei = ethers.parseUnits(values.assetPrice, 18);

      // Convert reward to basis points (multiply by 100 for percentage)
      const rewardBasisPoints = BigInt(
        Math.floor(parseFloat(values.reward) * 100),
      );

      await createOperation(
        values.name,
        values.description,
        values.token,
        values.provider,
        parseInt(values.lengthInDays),
        rewardBasisPoints,
        values.asset,
        fundingGoalWei,
        assetPriceWei,
      );
      toast.success('Operation created successfully!');
    } catch (error: any) {
      toast.error(
        error.message || 'Failed to create operation. Please try again.',
      );
      console.error('Error creating operation:', error);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <div className="mb-6">
        <Link
          href="/customer/pools"
          className="inline-flex items-center text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pools
        </Link>
      </div>

      <Card className="border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            Create New Pool
          </CardTitle>
          <CardDescription>
            Set up a new pool by providing the required details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter pool name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name for your pool.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter pool description" {...field} />
                    </FormControl>
                    <FormDescription>
                      Describe the pool and its purpose.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <FormControl>
                      <Input placeholder="Goat" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the assset that will be used in an operation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the Ethereum address of the token contract.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the Ethereum address of the provider.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lengthInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Enter number of days"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Specify the duration of the operation in days (whole
                      numbers only).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>APY</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="1"
                        max="100"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the APY (as a percentage between 1 and 100)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fundingGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funding Goal</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the funding goal in tokens (decimals allowed).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assetPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the asset price in tokens (decimals allowed).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant={'default'}
                className="w-full text-stone-900"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? 'Creating...'
                  : 'Create Operation'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
