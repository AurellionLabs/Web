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
import { useNodes } from '@/app/providers/nodes.provider';
import { ethers } from 'ethers';
import {
  getCurrentWalletAddress,
  initializeProvider,
} from '@/dapp-connectors/base-controller';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { useToast } from '@/hooks/use-toast';
import CapacityInput from './CapacityInput';

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
  capacity: z
    .array(z.string())
    .min(1, { message: 'Please specify capacity for each asset.' })
    .refine((arr) => arr.every((v) => v !== ''), {
      message: 'Capacity is required for each selected asset.',
    })
    .refine((arr) => arr.every((v) => /^\d+$/.test(v)), {
      message: 'Capacity must be a whole number.',
    }),
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
  const { registerNode } = useNodes();
  const { supportedAssetClasses, isLoading } = usePlatform();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      addressName: '',
      lat: '',
      lng: '',
      supportedAssets: [],
      capacity: [],
    },
  });

  // Keep capacity array aligned to selected assets; preserve existing values by asset label
  // Simple sync: ensure capacity length matches selected assets; no defaults
  useEffect(() => {
    const assets = form.watch('supportedAssets');
    const capacities = form.getValues('capacity');
    if (capacities.length !== assets.length) {
      form.setValue(
        'capacity',
        Array.from({ length: assets.length }, (_, i) => capacities[i] ?? ''),
        { shouldDirty: true },
      );
    }
  }, [form.watch('supportedAssets')]);

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
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        });
        return;
      }

      const walletAddress = await getCurrentWalletAddress();
      if (!walletAddress) {
        toast({
          title: 'Error',
          description: 'No wallet address found',
          variant: 'destructive',
        });
        return;
      }

      // Note: The contract expects Asset[] structs, not class names
      // For initial registration, we'll use empty arrays and add assets after registration
      // The selected asset classes are stored for reference but won't be used in registration
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
        // Use empty arrays for initial registration - assets can be added after registration
        // The selected asset classes are for UI purposes only
        supportedAssets: [],
        capacity: [],
        assetPrices: [],
      };

      await registerNode(nodeData);
      toast({ title: 'Success', description: 'Node registered successfully' });
      router.push('/node/overview');
    } catch (error) {
      console.error('Error registering node:', error);
      toast({
        title: 'Error',
        description: 'Failed to register node',
        variant: 'destructive',
      });
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
                      <CapacityInput
                        capacities={field.value}
                        onCapacityChange={field.onChange}
                        selectedAssets={form.watch('supportedAssets')}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the capacity for each selected asset.
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
