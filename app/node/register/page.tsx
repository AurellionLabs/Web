'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/app/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useNode } from '@/app/providers/node.provider';
import { ethers } from 'ethers';
import {
  getCurrentWalletAddress,
  initializeProvider,
} from '@/dapp-connectors/base-controller';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useMainProvider } from '@/app/providers/main.provider';
import { toast } from 'react-hot-toast';
import { Asset } from '@/domain/node';

// Utility function to format snake_case to Title Case
const formatAttributeName = (name: string): string => {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

type CustomAttribute = {
  name: string;
  type: 'string' | 'number';
  value?: any;
};

const formSchema = z.object({
  addressName: z.string().min(3, {
    message: 'Location name must be at least 3 characters.',
  }),
  lat: z.string().regex(/^-?\d+\.\d+$/, {
    message: 'Please enter a valid latitude',
  }),
  lng: z.string().regex(/^-?\d+\.\d+$/, {
    message: 'Please enter a valid longitude',
  }),
  supportedAssets: z.array(z.number()).min(1, {
    message: 'Please select at least one supported asset.',
  }),
  capacity: z.array(z.number()).min(1, {
    message: 'Please specify capacity for each asset.',
  }),
  prices: z.array(z.number()).min(1, {
    message: 'Please specify price for each asset.',
  }),
  assetAttributes: z
    .record(z.string(), z.record(z.string(), z.any()))
    .optional(),
  customAttributes: z
    .record(
      z.string(),
      z.array(
        z.object({
          name: z.string(),
          type: z.enum(['string', 'number']),
          value: z.any().default(''),
        }),
      ),
    )
    .optional(),
});

const AssetAttributeInput = ({
  asset,
  attributeValues,
  customAttributes,
  onAttributeChange,
  onCustomAttributeChange,
}: {
  asset: Asset;
  attributeValues: Record<string, any>;
  customAttributes: CustomAttribute[];
  onAttributeChange: (
    assetId: number,
    attributeName: string,
    value: any,
  ) => void;
  onCustomAttributeChange: (
    assetId: number,
    attributes: CustomAttribute[],
  ) => void;
}) => {
  const addCustomAttribute = () => {
    const newAttribute: CustomAttribute = {
      name: '',
      type: 'string',
      value: '',
    };
    onCustomAttributeChange(asset.id, [...customAttributes, newAttribute]);
  };

  const updateCustomAttribute = (
    index: number,
    field: keyof CustomAttribute,
    value: any,
  ) => {
    const updated = [...customAttributes];

    if (field === 'value') {
      // Auto-detect type based on value
      const isNumber =
        value !== '' && !isNaN(Number(value)) && isFinite(Number(value));
      updated[index] = {
        ...updated[index],
        value: isNumber ? Number(value) : value,
        type: isNumber ? 'number' : 'string',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    onCustomAttributeChange(asset.id, updated);
  };

  const removeCustomAttribute = (index: number) => {
    const updated = customAttributes.filter((_, i) => i !== index);
    onCustomAttributeChange(asset.id, updated);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Attributes
        </h5>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustomAttribute}
          className="text-xs text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          + Add Custom
        </Button>
      </div>

      {/* Default Attributes */}
      {asset.defaultAttributes.map((attribute) => {
        const currentValue =
          attributeValues[attribute.name] ?? attribute.defaultValue;

        return (
          <div
            key={attribute.name}
            className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatAttributeName(attribute.name)}
                {attribute.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                {attribute.unit && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({attribute.unit})
                  </span>
                )}
              </label>
            </div>

            <div className="col-span-3">
              {attribute.type === 'number' ? (
                <Input
                  type="number"
                  value={currentValue}
                  onChange={(e) => {
                    const value =
                      e.target.value === '' ? '' : Number(e.target.value);
                    onAttributeChange(asset.id, attribute.name, value);
                  }}
                  placeholder={
                    attribute.description ||
                    `Enter ${formatAttributeName(attribute.name).toLowerCase()}`
                  }
                  required={attribute.required}
                  min="0"
                  className="w-full h-9"
                />
              ) : (
                <Input
                  type="text"
                  value={currentValue || ''}
                  onChange={(e) => {
                    onAttributeChange(asset.id, attribute.name, e.target.value);
                  }}
                  placeholder={
                    attribute.description ||
                    `Enter ${formatAttributeName(attribute.name).toLowerCase()}`
                  }
                  required={attribute.required}
                  className="w-full h-9"
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Custom Attributes */}
      {customAttributes.map((attr, index) => (
        <div
          key={index}
          className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        >
          <div className="col-span-2">
            <Input
              type="text"
              value={attr.name}
              onChange={(e) =>
                updateCustomAttribute(index, 'name', e.target.value)
              }
              placeholder="Attribute name"
              className="w-full h-9 text-sm"
            />
          </div>

          <div className="col-span-2">
            <Input
              type="text"
              value={attr.value}
              onChange={(e) => {
                updateCustomAttribute(index, 'value', e.target.value);
              }}
              placeholder="Enter value"
              className="w-full h-9"
            />
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCustomAttribute(index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const CapacityAndPriceInput = ({
  capacityValue,
  priceValue,
  onCapacityChange,
  onPriceChange,
  selectedAssets,
  supportedAssets,
  assetAttributes,
  customAttributes,
  onAssetAttributeChange,
  onCustomAttributeChange,
}: {
  capacityValue: number[];
  priceValue: number[];
  onCapacityChange: (value: number[]) => void;
  onPriceChange: (value: number[]) => void;
  selectedAssets: number[];
  supportedAssets: Asset[];
  assetAttributes: Record<string, Record<string, any>>;
  customAttributes: Record<string, CustomAttribute[]>;
  onAssetAttributeChange: (
    assetId: number,
    attributeName: string,
    value: any,
  ) => void;
  onCustomAttributeChange: (
    assetId: number,
    attributes: CustomAttribute[],
  ) => void;
}) => {
  return (
    <div className="space-y-6">
      {capacityValue.map((cap, index) => {
        const assetId = selectedAssets[index];
        const asset = supportedAssets.find((a) => a.id === assetId);
        const assetLabel = asset?.label || `Asset ${index + 1}`;

        if (!asset) return null;

        return (
          <>
            {index > 0 && (
              <hr className="my-8 border-t border-gray-700 dark:border-gray-600" />
            )}
            <div key={index}>
              {/* Asset Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-8 bg-amber-300 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {assetLabel}
                </h3>
              </div>

              {/* Capacity Row */}
              <div className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={cap}
                    onChange={(e) => {
                      const newValue = [...capacityValue];
                      newValue[index] = parseInt(e.target.value) || 0;
                      onCapacityChange(newValue);
                    }}
                    placeholder="Maximum capacity"
                    min="0"
                    className="w-full h-9"
                  />
                </div>
              </div>

              {/* Price Row */}
              <div className="grid grid-cols-5 gap-4 items-center py-3 mb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Price <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={priceValue[index] || 0}
                    onChange={(e) => {
                      const newValue = [...priceValue];
                      newValue[index] = parseInt(e.target.value) || 0;
                      onPriceChange(newValue);
                    }}
                    placeholder="Price per unit"
                    min="0"
                    className="w-full h-9"
                  />
                </div>
              </div>

              {/* Asset Attributes */}
              <AssetAttributeInput
                asset={asset}
                attributeValues={assetAttributes[assetId.toString()] || {}}
                customAttributes={customAttributes[assetId.toString()] || []}
                onAttributeChange={onAssetAttributeChange}
                onCustomAttributeChange={onCustomAttributeChange}
              />
            </div>
          </>
        );
      })}
    </div>
  );
};

// At the top of the file, outside any component
const GOOGLE_LIBRARIES: 'places'[] = ['places'];

const LocationInput = ({
  onLocationSelect,
  defaultValue,
}: {
  onLocationSelect: (address: string, lat: string, lng: string) => void;
  defaultValue?: string;
}) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: GOOGLE_LIBRARIES, // Use the static array
  });

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  if (!isLoaded) return <Input placeholder="Loading..." disabled />;

  return (
    <Autocomplete
      onLoad={(autocompleteInstance) => {
        setAutocomplete(autocompleteInstance);
      }}
      onPlaceChanged={() => {
        if (autocomplete) {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            onLocationSelect(
              place.formatted_address || '',
              place.geometry.location.lat().toString(),
              place.geometry.location.lng().toString(),
            );
          }
        }
      }}
    >
      <Input
        id="location-input"
        placeholder="Search for a location"
        defaultValue={defaultValue}
      />
    </Autocomplete>
  );
};

export default function NodeRegistrationPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supportedAssets, setSupportedAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { connected } = useMainProvider();
  const { registerNode, getSupportedAssets } = useNode();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      addressName: '',
      lat: '',
      lng: '',
      supportedAssets: [],
      capacity: [],
      prices: [],
      assetAttributes: {},
      customAttributes: {},
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        await initializeProvider();
      } catch (error) {
        console.error('Failed to initialize provider:', error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        const assets = await getSupportedAssets();
        setSupportedAssets(assets);
      } catch (error) {
        console.error('Failed to load supported assets:', error);
        toast.error('Failed to load supported assets');
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, [getSupportedAssets]);

  const handleAssetAttributeChange = (
    assetId: number,
    attributeName: string,
    value: any,
  ) => {
    const currentAttributes = form.getValues('assetAttributes') || {};
    const assetAttributes = currentAttributes[assetId.toString()] || {};

    form.setValue('assetAttributes', {
      ...currentAttributes,
      [assetId.toString()]: {
        ...assetAttributes,
        [attributeName]: value,
      },
    });
  };

  const handleCustomAttributeChange = (
    assetId: number,
    attributes: CustomAttribute[],
  ) => {
    const currentCustomAttributes = form.getValues('customAttributes') || {};

    form.setValue('customAttributes', {
      ...currentCustomAttributes,
      [assetId.toString()]: attributes,
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('on Submit');
    console.log('Asset Attributes:', values.assetAttributes);
    console.log('Custom Attributes:', values.customAttributes);
    try {
      if (!connected) {
        toast.error('Please connect your wallet first');
        return;
      }

      const walletAddress = await getCurrentWalletAddress();
      if (!walletAddress) {
        toast.error('No wallet address found');
        return;
      }

      const nodeData = {
        address: '', // This will be set by the contract
        owner: walletAddress,
        location: {
          addressName: values.addressName,
          location: {
            lat: values.lat,
            lng: values.lng,
          },
        },
        validNode: '0x01',
        status: 'Active' as const,
        supportedAssets: values.supportedAssets,
        capacity: values.capacity,
        assetPrices: values.prices,
        // Asset attributes can be stored for future use
        assetAttributes: values.assetAttributes,
      };

      await registerNode(nodeData);
      toast.success('Node registered successfully');
      router.push('/node/overview');
    } catch (error) {
      console.error('Error registering node:', error);
      toast.error('Failed to register node');
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card className="border-primary-200 dark:border-primary-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            Register as a Node
          </CardTitle>
          <CardDescription>
            Provide your details to register as a node in the network.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="addressName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <LocationInput
                        defaultValue={field.value}
                        onLocationSelect={(address, lat, lng) => {
                          field.onChange(address);
                          form.setValue('lat', lat);
                          form.setValue('lng', lng);
                        }}
                      />
                    </FormControl>
                    <FormDescription>Search for your location</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supportedAssets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supported Assets</FormLabel>
                    <FormControl>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                          >
                            {field.value.length > 0
                              ? `${field.value.length} asset${field.value.length === 1 ? '' : 's'} selected`
                              : 'Select assets...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search assets..." />
                            {loading ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Loading assets...
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>No assets found.</CommandEmpty>
                                <CommandGroup>
                                  {supportedAssets.map((asset) => (
                                    <CommandItem
                                      key={asset.id}
                                      onSelect={() => {
                                        const currentValue = new Set(
                                          field.value,
                                        );
                                        if (currentValue.has(asset.id)) {
                                          currentValue.delete(asset.id);
                                        } else {
                                          currentValue.add(asset.id);
                                        }
                                        const newValue =
                                          Array.from(currentValue);
                                        field.onChange(newValue);
                                        form.setValue(
                                          'capacity',
                                          new Array(newValue.length).fill(0),
                                        );
                                        form.setValue(
                                          'prices',
                                          new Array(newValue.length).fill(0),
                                        );

                                        // Clear attributes for deselected assets
                                        const currentAttributes =
                                          form.getValues('assetAttributes') ||
                                          {};
                                        const updatedAttributes: Record<
                                          string,
                                          Record<string, any>
                                        > = {};
                                        newValue.forEach((assetId) => {
                                          if (
                                            currentAttributes[
                                              assetId.toString()
                                            ]
                                          ) {
                                            updatedAttributes[
                                              assetId.toString()
                                            ] =
                                              currentAttributes[
                                                assetId.toString()
                                              ];
                                          }
                                        });
                                        form.setValue(
                                          'assetAttributes',
                                          updatedAttributes,
                                        );
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          field.value.includes(asset.id)
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                      {asset.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </>
                            )}
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormDescription>
                      Select the assets you can support in your operations.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CapacityAndPriceInput
                        capacityValue={field.value}
                        priceValue={form.watch('prices')}
                        onCapacityChange={field.onChange}
                        onPriceChange={(value) =>
                          form.setValue('prices', value)
                        }
                        selectedAssets={form.watch('supportedAssets')}
                        supportedAssets={supportedAssets}
                        assetAttributes={form.watch('assetAttributes') || {}}
                        customAttributes={form.watch('customAttributes') || {}}
                        onAssetAttributeChange={handleAssetAttributeChange}
                        onCustomAttributeChange={handleCustomAttributeChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the capacity and price for each selected asset.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={form.formState.isSubmitting || loading}
              >
                {form.formState.isSubmitting
                  ? 'Registering...'
                  : loading
                    ? 'Loading assets...'
                    : 'Register as Node'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
