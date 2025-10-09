'use client';

// Force dynamic rendering to avoid static generation issues with wallet libraries
export const dynamic = 'force-dynamic';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Upload, X, FileText, Image, FileCheck } from 'lucide-react';
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
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    };
  } else if (fileType === 'application/pdf') {
    return {
      icon: FileText,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    };
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return {
      icon: FileCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    };
  } else {
    return {
      icon: FileText,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
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
      durationDays: '',
      rewardRate: '',
      fundingGoal: '',
      assetPrice: '',
      supportingDocuments: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Check if wallet is connected
      if (!address) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first.',
          variant: 'destructive',
        });
        return;
      }

      // Find the selected asset details
      const selectedAsset = SUPPORTED_ASSETS.find(
        (asset) => asset.name === values.assetName,
      );
      const assetDisplayName = selectedAsset?.label || values.assetName;

      // Prepare supporting documents
      const supportingDocuments: SupportingDocument[] =
        values.supportingDocuments
          ? values.supportingDocuments.map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              file: file,
            }))
          : [];

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
        supportingDocuments:
          supportingDocuments.length > 0 ? supportingDocuments : undefined,
      };

      const result = await createPool(poolCreationData);
      toast({ title: 'Success', description: 'Pool created successfully!' });

      // Redirect to the new pool
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

              <FormField
                control={form.control}
                name="supportingDocuments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supporting Documents (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="file-upload"
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${
                              (field.value?.length || 0) >= MAX_FILES_ALLOWED
                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800'
                                : 'border-gray-300 cursor-pointer bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-gray-500'
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload
                                className={`w-8 h-8 mb-4 ${
                                  (field.value?.length || 0) >=
                                  MAX_FILES_ALLOWED
                                    ? 'text-gray-300 dark:text-gray-600'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                              />
                              {(field.value?.length || 0) >=
                              MAX_FILES_ALLOWED ? (
                                <>
                                  <p className="mb-2 text-sm text-gray-400 dark:text-gray-600">
                                    Maximum {MAX_FILES_ALLOWED} files reached
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-600">
                                    Remove a file to upload more
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">
                                      Click to upload
                                    </span>{' '}
                                    or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    PDF, Word documents, or images (MAX. 4MB
                                    each)
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                                (field.value?.length || 0) >= MAX_FILES_ALLOWED
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
                                // Reset the input so the same file can be selected again if needed
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>

                        {field.value && field.value.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                    className={`flex items-center justify-between p-3 rounded-lg border ${bgColor} border-gray-200 dark:border-gray-700 transition-colors`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div
                                        className={`p-2 rounded-lg ${bgColor}`}
                                      >
                                        <Icon className={`w-4 h-4 ${color}`} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                          {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {(file.size / (1024 * 1024)).toFixed(
                                            2,
                                          )}{' '}
                                          MB
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                      onClick={() => {
                                        const newFiles =
                                          field.value?.filter(
                                            (_, i) => i !== index,
                                          ) || [];
                                        field.onChange(newFiles);
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload up to {MAX_FILES_ALLOWED} supporting documents such
                      as PDFs, Word documents, or images to provide additional
                      context for your pool.
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
