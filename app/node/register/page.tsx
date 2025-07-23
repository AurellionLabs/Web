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
});

const CapacityAndPriceInput = ({
  capacityValue,
  priceValue,
  onCapacityChange,
  onPriceChange,
  selectedAssets,
  supportedAssets,
}: {
  capacityValue: number[];
  priceValue: number[];
  onCapacityChange: (value: number[]) => void;
  onPriceChange: (value: number[]) => void;
  selectedAssets: number[];
  supportedAssets: Asset[];
}) => {
  return (
    <div className="space-y-4">
      {capacityValue.map((cap, index) => {
        const assetId = selectedAssets[index];
        const asset = supportedAssets.find((a) => a.id === assetId);
        const assetLabel = asset?.label || `Asset ${index + 1}`;

        return (
          <div key={index} className="space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {assetLabel}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                value={cap}
                onChange={(e) => {
                  const newValue = [...capacityValue];
                  newValue[index] = parseInt(e.target.value) || 0;
                  onCapacityChange(newValue);
                }}
                placeholder={`Capacity for ${assetLabel}`}
                min="0"
              />
              <Input
                type="number"
                value={priceValue[index] || 0}
                onChange={(e) => {
                  const newValue = [...priceValue];
                  newValue[index] = parseInt(e.target.value) || 0;
                  onPriceChange(newValue);
                }}
                placeholder={`Price for ${assetLabel}`}
                min="0"
              />
            </div>
          </div>
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('on Submit');
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Capacity and Prices</FormLabel>
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
