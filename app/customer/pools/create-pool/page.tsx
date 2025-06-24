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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { toast } from 'sonner';
import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '@/chain-constants';
import { useWallet } from '@/hooks/useWallet';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { PoolCreationData } from '@/domain/pool';
import { useRouter } from 'next/navigation';

// Supported assets configuration
const SUPPORTED_ASSETS = [
  { id: 1, name: 'GOAT', label: 'Goat' },
  { id: 2, name: 'SHEEP', label: 'Sheep' },
  { id: 3, name: 'COW', label: 'Cow' },
  { id: 4, name: 'CHICKEN', label: 'Chicken' },
  { id: 5, name: 'DUCK', label: 'Duck' },
] as const;

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Pool name must be at least 3 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  assetName: z.string().min(1, {
    message: 'Please select an asset.',
  }),
  durationDays: z
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
  rewardRate: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 1 && num <= 100;
    },
    {
      message: 'Reward rate must be between 1 and 100.',
    },
  ),
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
});

export default function CreatePoolPage() {
  const { address } = useWallet();
  const { createPool, loading } = usePoolsProvider();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      assetName: '',
      durationDays: '',
      rewardRate: '',
      fundingGoal: '',
      assetPrice: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Check if wallet is connected
      if (!address) {
        toast.error('Please connect your wallet first.');
        return;
      }

      // Find the selected asset details
      const selectedAsset = SUPPORTED_ASSETS.find(
        (asset) => asset.name === values.assetName,
      );
      const assetDisplayName = selectedAsset?.label || values.assetName;

      // Prepare pool creation data according to domain interface
      const poolCreationData: PoolCreationData = {
        name: values.name,
        description: values.description,
        assetName: assetDisplayName,
        tokenAddress: NEXT_PUBLIC_AURA_TOKEN_ADDRESS as `0x${string}`,
        fundingGoal: values.fundingGoal,
        durationDays: parseInt(values.durationDays),
        rewardRate: parseFloat(values.rewardRate) * 100, // Convert to basis points
        assetPrice: values.assetPrice,
      };

      const result = await createPool(poolCreationData);
      toast.success('Pool created successfully!');

      // Redirect to the new pool
      router.push(`/customer/pools/${result.poolId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create pool. Please try again.');
      console.error('Error creating pool:', error);
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
                name="assetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_ASSETS.map((asset) => (
                          <SelectItem key={asset.id} value={asset.name}>
                            {asset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the asset that will be used in the pool.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Days)</FormLabel>
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
                      Specify the duration of the pool in days (whole numbers
                      only).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rewardRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>APY (%)</FormLabel>
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
                disabled={form.formState.isSubmitting || loading}
              >
                {form.formState.isSubmitting || loading
                  ? 'Creating...'
                  : 'Create Pool'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
