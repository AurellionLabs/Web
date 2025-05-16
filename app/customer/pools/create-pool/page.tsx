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
import { usePools } from '@/app/providers/pools.provider';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Operation name must be at least 3 characters.',
  }),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Please enter a valid token address.',
  }),
  lengthInDays: z
    .string()
    .refine(
      (val) =>
        !isNaN(parseInt(val)) &&
        Number.isInteger(Number(val)) &&
        parseInt(val) > 0,
      {
        message: 'Please enter a valid whole number greater than 0 for days.',
      },
    ),
  reward: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0.01 && num <= 100;
    },
    {
      message: 'Reward percentage must be between 0.01 and 100.',
    },
  ),
  asset: z.string().min(1, {
    message: "Please enter the asset's name (e.g., RWA name).",
  }),
  fundingGoal: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Funding goal must be a positive number.',
    }),
  assetPrice: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Asset price must be a positive number.',
    }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
});

export default function CreateOperationPage() {
  const router = useRouter();
  const { address: walletAddress } = useWallet();
  const {
    createOperation: createPoolOperation,
    loadingCreateOperation,
    errorCreateOperation,
  } = usePools();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      token: '',
      lengthInDays: '30',
      reward: '5',
      asset: '',
      fundingGoal: '',
      assetPrice: '',
      description: '',
    },
  });

  useEffect(() => {
    if (errorCreateOperation) {
      toast.error(
        errorCreateOperation.message ||
          'Failed to create pool. Please try again.',
      );
    }
  }, [errorCreateOperation]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const fundingGoalWei = ethers.parseUnits(values.fundingGoal, 18);
      const assetPriceWei = ethers.parseUnits(values.assetPrice, 18);
      const rewardBasisPoints = BigInt(
        Math.floor(parseFloat(values.reward) * 100),
      );
      const deadlineInSeconds = BigInt(
        Math.floor(Date.now() / 1000) +
          parseInt(values.lengthInDays) * 24 * 60 * 60,
      );

      const txReceipt = await createPoolOperation(
        values.name,
        values.description,
        values.token,
        deadlineInSeconds,
        rewardBasisPoints,
        values.asset,
        fundingGoalWei,
        assetPriceWei,
      );

      if (txReceipt) {
        toast.success('Pool created successfully!');
        form.reset();
        router.push('/customer/pools');
      } else if (!loadingCreateOperation && !errorCreateOperation) {
        toast.error(
          'Pool creation may have failed. Please check transactions.',
        );
      }
    } catch (error: any) {
      console.error(
        'Error in onSubmit (data preparation) for creating pool:',
        error,
      );
      toast.error(
        error.message ||
          'An unexpected error occurred during submission process.',
      );
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
                    <FormLabel>Asset Name (RWA Name)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Carbon Credit Batch A"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the name of the Real World Asset or underlying
                      asset.
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
                      <Input
                        placeholder="0x... (ERC20 token to be staked)"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Address of the ERC20 token users will stake.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Provider Address (Creator)</FormLabel>
                <FormControl>
                  <Input
                    value={walletAddress || 'Connect wallet to see address'}
                    readOnly
                    disabled
                  />
                </FormControl>
                <FormDescription>
                  The pool will be created using your currently connected wallet
                  address.
                </FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="lengthInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g., 30"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Duration for which the pool will be active and accept
                      stakes.
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
                    <FormLabel>Reward APY (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        placeholder="e.g., 5.5 for 5.5%"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Annual Percentage Yield for stakers (e.g., 5 for 5%).
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
                    <FormLabel>Funding Goal (in Tokens)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g., 10000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Total amount of tokens aimed to be staked in this pool.
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
                    <FormLabel>Asset Price (per Token)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g., 0.1"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This typically represents the price of the RWA unit
                      relative to the staking token, or vice-versa. Example: If
                      1 RWA unit costs 10 staking tokens, this value could be
                      0.1 (staking tokens per RWA unit) or 10 (RWA units per
                      staking token) depending on contract interpretation.
                      Clarify based on how `assetPrice` is used by the smart
                      contract.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loadingCreateOperation || !walletAddress}
              >
                {loadingCreateOperation ? 'Creating Pool...' : 'Create Pool'}
              </Button>
              {!walletAddress && (
                <p className="text-sm text-red-500 text-center mt-2">
                  Please connect your wallet to create a pool.
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
