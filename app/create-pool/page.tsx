'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ethers } from 'ethers';
import { createOperation } from '@/dapp-connectors/staking-controller';
import { toast } from 'sonner';

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
  lengthInDays: z.string().min(1, {
    message: 'Please enter the length in days.',
  }),
  reward: z.string().min(1, {
    message: 'Please enter a reward amount.',
  }),
  asset: z.string().min(1, {
    message: 'Please enter the pools asset .',
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
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const rewardInWei = ethers.parseEther(values.reward);

      await createOperation(
        values.name,
        values.token,
        values.provider,
        parseInt(values.lengthInDays),
        rewardInWei,
        values.asset,
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
          href="/pools"
          className="inline-flex items-center text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pools
        </Link>
      </div>

      <Card className="border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            Create New Operation
          </CardTitle>
          <CardDescription>
            Set up a new operation by providing the required details below.
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
                    <FormLabel>Operation Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter operation name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name for your operation.
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
                        placeholder="Enter number of days"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Specify the duration of the operation in days.
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
                    <FormLabel>Reward Amount</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the reward amount in tokens.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-600 text-white"
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
