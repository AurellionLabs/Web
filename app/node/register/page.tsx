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
import { usePlatform } from '@/app/providers/platform.provider';
import { toast } from 'react-hot-toast';
import CapacityAndPriceInput from './CapacityAndPriceInput';

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
  supportedAssets: z.array(z.string()).min(1, {
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
  const { connected } = useMainProvider();
  const { registerNode } = useNode();
  const { supportedAssetClasses, isLoading } = usePlatform();

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
                    <FormLabel>Supported Asset Classes</FormLabel>
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
                            {isLoading ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Loading assets...
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>No assets found.</CommandEmpty>
                                <CommandGroup>
                                  {supportedAssetClasses.map((assetClass) => (
                                    <CommandItem
                                      key={assetClass}
                                      onSelect={() => {
                                        const currentValue = new Set(
                                          field.value,
                                        );
                                        if (currentValue.has(assetClass)) {
                                          currentValue.delete(assetClass);
                                        } else {
                                          currentValue.add(assetClass);
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
                                          if (currentAttributes[assetId]) {
                                            updatedAttributes[assetId] =
                                              currentAttributes[assetId];
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
                                          field.value.includes(assetClass)
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                      {assetClass}
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
                disabled={form.formState.isSubmitting || isLoading}
              >
                {form.formState.isSubmitting
                  ? 'Registering...'
                  : isLoading
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
