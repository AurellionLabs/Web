'use client';

// Force dynamic rendering to avoid static generation issues with wallet libraries
export const dynamic = 'force-dynamic';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image,
  FileCheck,
  Plus,
  Zap,
  Shield,
  Loader2,
  AlertTriangle,
  Check,
  Coins,
} from 'lucide-react';
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
  EvaPanel,
  TrapButton,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '@/chain-constants';
import { useWallet } from '@/hooks/useWallet';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { PoolCreationData, SupportingDocument } from '@/domain/pool';
import { useRouter } from 'next/navigation';
import {
  useIsApprovedOperator,
  useTokenApproval,
} from '@/hooks/useRWYOpportunity';
import { Address } from '@/domain/rwy';
import { parseTokenAmount, formatErc20Balance } from '@/lib/utils';

// Supported assets configuration
const SUPPORTED_ASSETS = [
  { id: 1, name: 'GOAT', label: 'Goat' },
  { id: 2, name: 'SHEEP', label: 'Sheep' },
  { id: 3, name: 'COW', label: 'Cow' },
  { id: 4, name: 'CHICKEN', label: 'Chicken' },
  { id: 5, name: 'DUCK', label: 'Duck' },
] as const;

// Supported document types
const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
const MAX_FILES_ALLOWED = 3;

// Helper function to get file type icon and color
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return {
      icon: Image,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    };
  } else if (fileType === 'application/pdf') {
    return {
      icon: FileText,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    };
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return {
      icon: FileCheck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    };
  } else {
    return {
      icon: FileText,
      color: 'text-foreground/40',
      bgColor: 'bg-card/60',
    };
  }
};

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
  fundingGoal: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Please enter a valid number greater than 0.',
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
      return !isNaN(num) && num >= 1 && num <= 50;
    },
    {
      message: 'Reward rate must be between 1 and 50%.',
    },
  ),
  assetPrice: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid number greater than 0.',
    },
  ),
  minSalePrice: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid number greater than 0.',
    },
  ),
  collateralAmount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0; // Allow 0 collateral
    },
    {
      message: 'Please enter a valid number (0 or greater).',
    },
  ),
  // Insurance fields
  isInsured: z.boolean().optional(),
  insuranceDocument: z.instanceof(File).optional().nullable(),
  operatorFeeBps: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 1000;
      },
      {
        message: 'Operator fee must be between 0 and 1000 bps (0-10%).',
      },
    ),
  processingDays: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return (
          !isNaN(parseInt(val)) &&
          Number.isInteger(Number(val)) &&
          parseInt(val) > 0
        );
      },
      {
        message: 'Please enter a valid whole number greater than 0.',
      },
    ),
  supportingDocuments: z
    .array(z.instanceof(File))
    .optional()
    .refine(
      (files) => {
        if (!files || files.length === 0) return true;
        return files.length <= MAX_FILES_ALLOWED;
      },
      {
        message: `You can upload a maximum of ${MAX_FILES_ALLOWED} files.`,
      },
    )
    .refine(
      (files) => {
        if (!files || files.length === 0) return true;
        return files.every((file) => file.size <= MAX_FILE_SIZE);
      },
      {
        message: 'Each file must be smaller than 4MB.',
      },
    )
    .refine(
      (files) => {
        if (!files || files.length === 0) return true;
        return files.every((file) =>
          SUPPORTED_DOCUMENT_TYPES.includes(file.type),
        );
      },
      {
        message:
          'Unsupported file type. Please upload PDF, Word documents, or images.',
      },
    ),
});

export default function CreatePoolPage() {
  const { address, isConnected } = useWallet();
  const { createPool, loading } = usePoolsProvider();
  const router = useRouter();
  const { toast } = useToast();

  // Check if user is an approved operator
  const { isApproved: isOperatorApproved, loading: operatorCheckLoading } =
    useIsApprovedOperator(address as Address | undefined);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      assetName: '',
      fundingGoal: '',
      durationDays: '',
      rewardRate: '',
      assetPrice: '',
      minSalePrice: '',
      collateralAmount: '0',
      operatorFeeBps: '500',
      processingDays: '',
      supportingDocuments: [],
      isInsured: false,
      insuranceDocument: null,
    },
  });

  // Watch insurance status
  const isInsured = useWatch({
    control: form.control,
    name: 'isInsured',
  });

  // Watch collateral amount for token approval check
  const collateralAmount = useWatch({
    control: form.control,
    name: 'collateralAmount',
  });

  // Watch funding goal and min sale price for required collateral calculation
  const fundingGoal = useWatch({
    control: form.control,
    name: 'fundingGoal',
  });

  const minSalePrice = useWatch({
    control: form.control,
    name: 'minSalePrice',
  });

  // Calculate minimum required collateral in AURUM tokens
  // Formula: (fundingGoal * minSalePrice * 2000) / 10000
  // 2000 bps = 20% minimum collateral
  const minimumRequiredCollateral = useMemo(() => {
    const goal = parseFloat(fundingGoal || '0');
    const salePrice = parseFloat(minSalePrice || '0');

    if (!goal || !salePrice || goal <= 0 || salePrice <= 0) {
      return null;
    }

    // Calculate: (fundingGoal * minSalePrice * 2000) / 10000
    const required = (goal * salePrice * 2000) / 10000;
    return required;
  }, [fundingGoal, minSalePrice]);

  // Calculate required collateral in wei (18 decimals) for token approval
  const requiredAmountWei = useMemo(() => {
    if (!collateralAmount || isNaN(parseFloat(collateralAmount))) return '0';
    try {
      return parseTokenAmount(collateralAmount, 18).toString();
    } catch {
      return '0';
    }
  }, [collateralAmount]);

  // Check token approval status
  const {
    isApproved: hasTokenApproval,
    loading: tokenApprovalLoading,
    approving: isApproving,
    balance: tokenBalance,
    requestApproval,
    refetch: refetchApproval,
  } = useTokenApproval(
    NEXT_PUBLIC_AURA_TOKEN_ADDRESS as Address,
    address as Address | undefined,
    requiredAmountWei,
  );

  // Format balance for display
  const formattedBalance = useMemo(() => {
    if (!tokenBalance) return '0';
    try {
      return parseFloat(formatErc20Balance(tokenBalance, 18)).toLocaleString(
        undefined,
        {
          maximumFractionDigits: 2,
        },
      );
    } catch {
      return '0';
    }
  }, [tokenBalance]);

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!tokenBalance || !requiredAmountWei) return true;
    try {
      return BigInt(tokenBalance) >= BigInt(requiredAmountWei);
    } catch {
      return true;
    }
  }, [tokenBalance, requiredAmountWei]);

  // Handle token approval request
  const handleApproveTokens = async () => {
    try {
      await requestApproval();
      toast({
        title: 'Approval Successful',
        description: 'You can now create pools with your AURA tokens.',
      });
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve tokens.',
        variant: 'destructive',
      });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!address) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first.',
          variant: 'destructive',
        });
        return;
      }

      // Check token approval before submitting
      if (!hasTokenApproval) {
        toast({
          title: 'Token Approval Required',
          description: 'Please approve AURA tokens before creating a pool.',
          variant: 'destructive',
        });
        return;
      }

      const selectedAsset = SUPPORTED_ASSETS.find(
        (asset) => asset.name === values.assetName,
      );
      const assetDisplayName = selectedAsset?.label || values.assetName;

      const supportingDocuments: SupportingDocument[] =
        values.supportingDocuments
          ? values.supportingDocuments.map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              file: file,
            }))
          : [];

      const poolCreationData: PoolCreationData = {
        name: values.name,
        description: values.description,
        assetName: assetDisplayName,
        tokenAddress: NEXT_PUBLIC_AURA_TOKEN_ADDRESS as `0x${string}`,
        fundingGoal: values.fundingGoal,
        durationDays: parseInt(values.durationDays),
        rewardRate: String(parseFloat(values.rewardRate) * 100),
        assetPrice: values.assetPrice,
        minSalePrice: values.minSalePrice,
        collateralAmount: values.collateralAmount || '0',
        operatorFeeBps: values.operatorFeeBps
          ? parseInt(values.operatorFeeBps)
          : undefined,
        processingDays: values.processingDays
          ? parseInt(values.processingDays)
          : undefined,
        supportingDocuments:
          supportingDocuments.length > 0 ? supportingDocuments : undefined,
        // Insurance data
        isInsured: values.isInsured || false,
        // Note: insuranceDocHash will be set after IPFS upload in the service
      };

      const result = await createPool(poolCreationData);
      toast({ title: 'Success', description: 'Pool created successfully!' });
      router.push(`/customer/pools/${result.poolId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error.message || 'Failed to create pool. Please try again.',
        variant: 'destructive',
      });
      console.error('Error creating pool:', error);
    }
  }

  // Show loading state while checking operator status
  if (operatorCheckLoading && isConnected) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/customer/pools"
            className="inline-flex items-center font-mono text-sm text-foreground/40 hover:text-foreground tracking-[0.1em] uppercase transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pools
          </Link>
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-gold mx-auto mb-4 animate-spin" />
            <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
              Checking Operator Status
            </h2>
            <p className="font-mono text-sm text-foreground/40 mt-2 tracking-[0.08em]">
              Verifying your operator permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if user is not an approved operator
  if (isConnected && !operatorCheckLoading && !isOperatorApproved) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/customer/pools"
            className="inline-flex items-center font-mono text-sm text-foreground/40 hover:text-foreground tracking-[0.1em] uppercase transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pools
          </Link>
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gold mx-auto mb-4" />
            <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
              Operator Access Required
            </h2>
            <p className="font-mono text-sm text-foreground/40 mt-2 max-w-md mx-auto tracking-[0.05em]">
              Your wallet is not approved as an operator. Only approved
              operators can create yield pools. Contact the platform
              administrator to request operator access.
            </p>
            <div
              className="mt-6 p-4 bg-card/40 border border-border/20 max-w-md mx-auto"
              style={{
                clipPath:
                  'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
              }}
            >
              <p className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                Your Address:
              </p>
              <p className="font-mono text-sm break-all text-foreground/60 mt-1">
                {address}
              </p>
            </div>
            <div className="mt-6">
              <Link href="/customer/pools">
                <TrapButton variant="crimson">Browse Existing Pools</TrapButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/customer/pools"
          className="inline-flex items-center font-mono text-sm text-foreground/40 hover:text-foreground tracking-[0.1em] uppercase transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pools
        </Link>

        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LaurelAccent side="left" />
            <div
              className="w-16 h-16 bg-gold/10 flex items-center justify-center"
              style={{
                clipPath:
                  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
            >
              <Plus className="w-8 h-8 text-gold" />
            </div>
            <LaurelAccent side="right" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
            Create New Pool
          </h1>
          <p className="font-mono text-sm text-foreground/40 tracking-[0.08em] mt-2">
            Set up a new yield pool by providing the required details below
          </p>
        </div>

        <EvaPanel label="Create Pool" sysId="POOL-NEW" status="pending">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <EvaSectionMarker section="Basic Information" variant="gold" />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                        Pool Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter pool name"
                          className="bg-background/80 border-border/40 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                        Choose a descriptive name for your pool
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
                      <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter pool description"
                          className="bg-background/80 border-border/40 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                        Describe the pool and its purpose
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
                      <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                        Asset
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background/80 border-border/40 font-mono">
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
                      <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                        Select the asset for this pool
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pool Parameters Section */}
              <div className="space-y-4 pt-4">
                <EvaSectionMarker section="Pool Parameters" variant="crimson" />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Duration (Days)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g., 30"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rewardRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          APY (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="1"
                            max="100"
                            placeholder="e.g., 12.5"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="assetPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Asset Price (USD)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 100"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Display price in USD
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
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Funding Goal
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 10000"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minSalePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Target Sale Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 10"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Expected sale price per unit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="collateralAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Your Collateral (AURA)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 2000"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Your stake to back this opportunity
                        </FormDescription>
                        <FormMessage />
                        {minimumRequiredCollateral !== null && (
                          <div
                            className={`mt-2 p-3 border ${
                              parseFloat(field.value || '0') >=
                                minimumRequiredCollateral || isInsured
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-amber-500/10 border-amber-500/30'
                            }`}
                            style={{
                              clipPath:
                                'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                            }}
                          >
                            <p
                              className={`font-mono text-sm font-bold ${
                                parseFloat(field.value || '0') >=
                                  minimumRequiredCollateral || isInsured
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {isInsured ? (
                                <>
                                  <Shield className="w-3 h-3 inline mr-1" />
                                  Insured — Collateral optional
                                </>
                              ) : (
                                <>
                                  Minimum Required:{' '}
                                  {minimumRequiredCollateral.toLocaleString()}{' '}
                                  AURA
                                </>
                              )}
                            </p>
                            {!isInsured && (
                              <p className="font-mono text-[10px] text-foreground/30 mt-1 tracking-wider">
                                20% of ({fundingGoal || '0'} × $
                                {minSalePrice || '0'} = $
                                {(
                                  parseFloat(fundingGoal || '0') *
                                  parseFloat(minSalePrice || '0')
                                ).toLocaleString()}
                                )
                              </p>
                            )}
                            {isInsured &&
                              parseFloat(field.value || '0') === 0 && (
                                <p className="font-mono text-[10px] text-foreground/30 mt-1 tracking-wider">
                                  Insurance covers investor protection
                                </p>
                              )}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Advanced Parameters Section */}
              <div className="space-y-4 pt-4">
                <EvaSectionMarker
                  section="Advanced Parameters"
                  label="Optional"
                  variant="gold"
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operatorFeeBps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Operator Fee (bps)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="1000"
                            placeholder="e.g., 500"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Fee for operator (1-10%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="processingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Processing Days
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            placeholder="e.g., 30"
                            className="bg-background/80 border-border/40 font-mono tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Days to process after funding
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Insurance Section */}
              <div className="space-y-4 pt-4">
                <EvaSectionMarker
                  section="Insurance"
                  label="Optional"
                  variant="gold"
                />

                <FormField
                  control={form.control}
                  name="isInsured"
                  render={({ field }) => (
                    <FormItem
                      className="flex flex-row items-center justify-between p-4 bg-background/60 border border-border/30"
                      style={{
                        clipPath:
                          'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      }}
                    >
                      <div className="space-y-0.5">
                        <FormLabel className="font-mono text-sm font-bold text-foreground tracking-[0.1em] uppercase">
                          Pool Insurance
                        </FormLabel>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Mark this pool as insured to attract more investors
                        </FormDescription>
                      </div>
                      <FormControl>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={field.value}
                          onClick={() => field.onChange(!field.value)}
                          className={cn(
                            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
                            field.value ? 'bg-emerald-500' : 'bg-neutral-600',
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                              field.value ? 'translate-x-5' : 'translate-x-0',
                            )}
                          />
                        </button>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isInsured && (
                  <FormField
                    control={form.control}
                    name="insuranceDocument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                          Insurance Document
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex items-center justify-center w-full">
                              <label
                                htmlFor="insurance-upload"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed transition-colors border-emerald-500/30 cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                                style={{
                                  clipPath:
                                    'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                                }}
                              >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Shield className="w-8 h-8 mb-4 text-emerald-500" />
                                  {field.value ? (
                                    <>
                                      <p className="mb-2 font-mono text-sm text-emerald-400">
                                        <span className="font-bold">
                                          {field.value.name}
                                        </span>
                                      </p>
                                      <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
                                        {(
                                          field.value.size /
                                          (1024 * 1024)
                                        ).toFixed(2)}{' '}
                                        MB — Click to replace
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="mb-2 font-mono text-sm text-foreground/40">
                                        <span className="font-bold text-emerald-400">
                                          Click to upload
                                        </span>{' '}
                                        insurance certificate
                                      </p>
                                      <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
                                        PDF or image (MAX. 4MB)
                                      </p>
                                    </>
                                  )}
                                </div>
                                <Input
                                  id="insurance-upload"
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      field.onChange(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {field.value && (
                              <div
                                className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30"
                                style={{
                                  clipPath:
                                    'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <Shield className="w-5 h-5 text-emerald-500" />
                                  <div>
                                    <p className="font-mono text-sm font-bold text-foreground">
                                      {field.value.name}
                                    </p>
                                    <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
                                      Insurance document uploaded
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => field.onChange(null)}
                                  className="p-1.5 text-foreground/30 hover:text-crimson transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                          Upload your insurance certificate or policy document
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isInsured && (
                  <div
                    className="p-4 bg-emerald-500/10 border border-emerald-500/30"
                    style={{
                      clipPath:
                        'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-mono text-sm font-bold text-emerald-400 tracking-[0.1em] uppercase">
                          Insured Pool Benefits
                        </p>
                        <ul className="font-mono text-[10px] text-foreground/30 mt-2 space-y-1 tracking-wider">
                          <li>• Higher visibility in pool listings</li>
                          <li>• Increased investor confidence</li>
                          <li>• Can operate with lower or zero collateral</li>
                          <li>• Insurance badge displayed on pool</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Section */}
              <div className="space-y-4 pt-4">
                <EvaSectionMarker
                  section="Documents"
                  label="Optional"
                  variant="crimson"
                />

                <FormField
                  control={form.control}
                  name="supportingDocuments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                        Supporting Documents (Optional)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="file-upload"
                              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed transition-colors ${
                                (field.value?.length || 0) >= MAX_FILES_ALLOWED
                                  ? 'border-border/20 bg-card/30 cursor-not-allowed opacity-50'
                                  : 'border-border/30 cursor-pointer bg-card/20 hover:bg-card/40 hover:border-gold/30'
                              }`}
                              style={{
                                clipPath:
                                  'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                              }}
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload
                                  className={`w-8 h-8 mb-4 ${
                                    (field.value?.length || 0) >=
                                    MAX_FILES_ALLOWED
                                      ? 'text-foreground/10'
                                      : 'text-foreground/30'
                                  }`}
                                />
                                {(field.value?.length || 0) >=
                                MAX_FILES_ALLOWED ? (
                                  <>
                                    <p className="mb-2 font-mono text-sm text-foreground/20 tracking-wider">
                                      Maximum {MAX_FILES_ALLOWED} files reached
                                    </p>
                                    <p className="font-mono text-[10px] text-foreground/15 tracking-wider">
                                      Remove a file to upload more
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="mb-2 font-mono text-sm text-foreground/40">
                                      <span className="font-bold text-foreground/70">
                                        Click to upload
                                      </span>{' '}
                                      or drag and drop
                                    </p>
                                    <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
                                      PDF, Word documents, or images (MAX. 4MB
                                      each)
                                    </p>
                                    <p className="font-mono text-[10px] text-foreground/20 mt-1 tracking-wider">
                                      {field.value?.length || 0} of{' '}
                                      {MAX_FILES_ALLOWED} files
                                    </p>
                                  </>
                                )}
                              </div>
                              <Input
                                id="file-upload"
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                className="hidden"
                                disabled={
                                  (field.value?.length || 0) >=
                                  MAX_FILES_ALLOWED
                                }
                                onChange={(e) => {
                                  const newFiles = Array.from(
                                    e.target.files || [],
                                  );
                                  const existingFiles = field.value || [];
                                  const remainingSlots =
                                    MAX_FILES_ALLOWED - existingFiles.length;
                                  const filesToAdd = newFiles.slice(
                                    0,
                                    remainingSlots,
                                  );
                                  const allFiles = [
                                    ...existingFiles,
                                    ...filesToAdd,
                                  ];
                                  field.onChange(allFiles);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          {field.value && field.value.length > 0 && (
                            <div className="space-y-3">
                              <p className="font-mono text-sm font-bold text-foreground tracking-[0.1em] uppercase">
                                {field.value.length} file
                                {field.value.length > 1 ? 's' : ''} selected
                              </p>
                              <div className="grid gap-2">
                                {field.value.map((file, index) => {
                                  const {
                                    icon: Icon,
                                    color,
                                    bgColor,
                                  } = getFileIcon(file.type);
                                  return (
                                    <div
                                      key={index}
                                      className={`flex items-center justify-between p-3 ${bgColor} border border-border/20 transition-colors`}
                                      style={{
                                        clipPath:
                                          'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                                      }}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div
                                          className={`p-2 ${bgColor}`}
                                          style={{
                                            clipPath:
                                              'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                          }}
                                        >
                                          <Icon
                                            className={`w-4 h-4 ${color}`}
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-mono text-sm font-bold text-foreground truncate">
                                            {file.name}
                                          </p>
                                          <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
                                            {(
                                              file.size /
                                              (1024 * 1024)
                                            ).toFixed(2)}{' '}
                                            MB
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        className="p-1.5 text-foreground/30 hover:text-crimson transition-colors"
                                        onClick={() => {
                                          const newFiles =
                                            field.value?.filter(
                                              (_, i) => i !== index,
                                            ) || [];
                                          field.onChange(newFiles);
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="font-mono text-[10px] text-foreground/25 tracking-wider">
                        Upload up to {MAX_FILES_ALLOWED} supporting documents
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Token Approval Section */}
              {isConnected &&
                collateralAmount &&
                parseFloat(collateralAmount) > 0 && (
                  <div className="space-y-4 pt-4">
                    <EvaSectionMarker section="Token Approval" variant="gold" />

                    <div
                      className="p-4 bg-background/60 border border-border/30"
                      style={{
                        clipPath:
                          'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-mono text-sm font-bold text-foreground tracking-[0.1em] uppercase">
                            AURA Token Allowance
                          </p>
                          <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
                            Balance: {formattedBalance} AURA
                          </p>
                          {!hasSufficientBalance && (
                            <p className="font-mono text-[10px] text-amber-500 flex items-center gap-1 tracking-wider">
                              <AlertTriangle className="w-3 h-3" />
                              Insufficient balance for collateral
                            </p>
                          )}
                        </div>

                        {tokenApprovalLoading ? (
                          <div className="flex items-center gap-2 font-mono text-sm text-foreground/40 tracking-wider">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Checking...
                          </div>
                        ) : hasTokenApproval ? (
                          <div className="flex items-center gap-2 font-mono text-sm text-emerald-500 tracking-wider font-bold">
                            <Check className="w-4 h-4" />
                            Approved
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleApproveTokens}
                            disabled={isApproving}
                            className="relative font-mono tracking-[0.12em] uppercase font-bold transition-all duration-300 bg-gold/10 hover:bg-gold/20 text-gold px-4 py-1.5 text-[11px] disabled:opacity-40 disabled:pointer-events-none"
                            style={{
                              clipPath:
                                'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                            }}
                          >
                            {isApproving ? 'Approving...' : 'Approve AURA'}
                          </button>
                        )}
                      </div>

                      {!hasTokenApproval && !tokenApprovalLoading && (
                        <p className="font-mono text-[10px] text-foreground/25 mt-3 tracking-wider">
                          You need to approve the platform to use your AURA
                          tokens as collateral before creating a pool.
                        </p>
                      )}
                    </div>
                  </div>
                )}

              <EvaScanLine variant="mixed" />

              <div className="pt-4">
                <TrapButton
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={
                    Boolean(form.formState.isSubmitting) ||
                    Boolean(loading) ||
                    (Boolean(collateralAmount) &&
                      parseFloat(collateralAmount) > 0 &&
                      !Boolean(hasTokenApproval))
                  }
                >
                  {form.formState.isSubmitting || loading
                    ? 'Creating...'
                    : !hasTokenApproval &&
                        collateralAmount &&
                        parseFloat(collateralAmount) > 0
                      ? 'Approve Tokens First'
                      : 'Create Pool'}
                </TrapButton>
              </div>
            </form>
          </Form>
        </EvaPanel>

        <GreekKeyStrip color="gold" />
      </div>
    </div>
  );
}
