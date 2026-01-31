'use client';

// Force dynamic rendering to avoid static generation issues with wallet libraries
export const dynamic = 'force-dynamic';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image,
  FileCheck,
  Plus,
  Zap,
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
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { useToast } from '@/hooks/use-toast';
import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '@/chain-constants';
import { useWallet } from '@/hooks/useWallet';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { PoolCreationData, SupportingDocument } from '@/domain/pool';
import { useRouter } from 'next/navigation';

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
      color: 'text-muted-foreground',
      bgColor: 'bg-glass-bg',
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
      return !isNaN(num) && num >= 1 && num <= 100;
    },
    {
      message: 'Reward rate must be between 1 and 100.',
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
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid number greater than 0.',
    },
  ),
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
  const { address } = useWallet();
  const { createPool, loading } = usePoolsProvider();
  const router = useRouter();
  const { toast } = useToast();

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
      collateralAmount: '',
      operatorFeeBps: '500',
      processingDays: '',
      supportingDocuments: [],
    },
  });

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
        collateralAmount: values.collateralAmount,
        operatorFeeBps: values.operatorFeeBps
          ? parseInt(values.operatorFeeBps)
          : undefined,
        processingDays: values.processingDays
          ? parseInt(values.processingDays)
          : undefined,
        supportingDocuments:
          supportingDocuments.length > 0 ? supportingDocuments : undefined,
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

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/customer/pools"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pools
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Create New Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Set up a new yield pool by providing the required details below
          </p>
        </div>

        <GlassCard>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Zap className="w-4 h-4 text-accent" />
                  <span>Basic Information</span>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Pool Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter pool name"
                          className="bg-surface-overlay border-glass-border"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-muted-foreground/70">
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
                      <FormLabel className="text-muted-foreground">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter pool description"
                          className="bg-surface-overlay border-glass-border"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-muted-foreground/70">
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
                      <FormLabel className="text-muted-foreground">
                        Asset
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-surface-overlay border-glass-border">
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
                      <FormDescription className="text-muted-foreground/70">
                        Select the asset for this pool
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pool Parameters Section */}
              <div className="space-y-4 pt-4 border-t border-glass-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Zap className="w-4 h-4 text-accent" />
                  <span>Pool Parameters</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Duration (Days)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g., 30"
                            className="bg-surface-overlay border-glass-border"
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
                        <FormLabel className="text-muted-foreground">
                          APY (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="1"
                            max="100"
                            placeholder="e.g., 12.5"
                            className="bg-surface-overlay border-glass-border"
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
                        <FormLabel className="text-muted-foreground">
                          Asset Price (USD)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 100"
                            className="bg-surface-overlay border-glass-border"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground/70">
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
                        <FormLabel className="text-muted-foreground">
                          Funding Goal
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 10000"
                            className="bg-surface-overlay border-glass-border"
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
                        <FormLabel className="text-muted-foreground">
                          Target Sale Price (AURUM)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 10"
                            className="bg-surface-overlay border-glass-border"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground/70">
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
                        <FormLabel className="text-muted-foreground">
                          Your Collateral (AURUM)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g., 2000"
                            className="bg-surface-overlay border-glass-border"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground/70">
                          Your stake to back this opportunity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Advanced Parameters Section */}
              <div className="space-y-4 pt-4 border-t border-glass-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Zap className="w-4 h-4 text-accent" />
                  <span>Advanced Parameters (Optional)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operatorFeeBps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Operator Fee (bps)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="1000"
                            placeholder="e.g., 500"
                            className="bg-surface-overlay border-glass-border"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground/70">
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
                        <FormLabel className="text-muted-foreground">
                          Processing Days
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            placeholder="e.g., 30"
                            className="bg-surface-overlay border-glass-border"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground/70">
                          Days to process after funding
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="collateralAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Collateral Amount
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g., 1000"
                          className="bg-surface-overlay border-glass-border"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-muted-foreground/70">
                        Operator collateral amount (in input token)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Documents Section */}
              <div className="space-y-4 pt-4 border-t border-glass-border">
                <FormField
                  control={form.control}
                  name="supportingDocuments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Supporting Documents (Optional)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="file-upload"
                              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-colors ${
                                (field.value?.length || 0) >= MAX_FILES_ALLOWED
                                  ? 'border-glass-border bg-glass-bg cursor-not-allowed opacity-50'
                                  : 'border-glass-border cursor-pointer bg-glass-bg hover:bg-glass-hover hover:border-accent/30'
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload
                                  className={`w-8 h-8 mb-4 ${
                                    (field.value?.length || 0) >=
                                    MAX_FILES_ALLOWED
                                      ? 'text-muted-foreground/30'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                                {(field.value?.length || 0) >=
                                MAX_FILES_ALLOWED ? (
                                  <>
                                    <p className="mb-2 text-sm text-muted-foreground/50">
                                      Maximum {MAX_FILES_ALLOWED} files reached
                                    </p>
                                    <p className="text-xs text-muted-foreground/50">
                                      Remove a file to upload more
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="mb-2 text-sm text-muted-foreground">
                                      <span className="font-semibold text-foreground">
                                        Click to upload
                                      </span>{' '}
                                      or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      PDF, Word documents, or images (MAX. 4MB
                                      each)
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
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
                              <p className="text-sm font-medium text-foreground">
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
                                      className={`flex items-center justify-between p-3 rounded-lg ${bgColor} border border-glass-border transition-colors`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div
                                          className={`p-2 rounded-lg ${bgColor}`}
                                        >
                                          <Icon
                                            className={`w-4 h-4 ${color}`}
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {file.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
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
                                        className="p-1.5 rounded-lg hover:bg-glass-hover text-muted-foreground hover:text-foreground transition-colors"
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
                      <FormDescription className="text-muted-foreground/70">
                        Upload up to {MAX_FILES_ALLOWED} supporting documents
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <GlowButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  glow
                  loading={form.formState.isSubmitting || loading}
                >
                  {form.formState.isSubmitting || loading
                    ? 'Creating...'
                    : 'Create Pool'}
                </GlowButton>
              </div>
            </form>
          </Form>
        </GlassCard>
      </div>
    </div>
  );
}
