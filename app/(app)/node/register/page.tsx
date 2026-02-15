'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Node } from '@/domain/node';
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
  EvaPanel,
  TrapButton,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { Check, ChevronsUpDown, Server, MapPin, Package } from 'lucide-react';
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
    libraries: GOOGLE_LIBRARIES,
  });

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  if (!isLoaded)
    return (
      <Input
        placeholder="Loading..."
        disabled
        className="bg-background/80 border-border/40 font-mono"
      />
    );

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
        className="bg-background/80 border-border/40 font-mono"
      />
    </Autocomplete>
  );
};

/**
 * NodeRegistrationPage - Register a new node with EVA/NERV theme
 */
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

  // Keep capacity array aligned to selected assets
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
      const nodeData: Node = {
        address: '',
        owner: walletAddress,
        location: {
          addressName: values.addressName,
          location: {
            lat: values.lat,
            lng: values.lng,
          },
        },
        validNode: true,
        status: 'Active',
        // Use empty arrays for initial registration - assets can be added after registration
        // The selected asset classes are for UI purposes only
        // assets array will be populated when assets are actually added
        assets: [],
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
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div
            className="w-16 h-16 bg-gold/10 flex items-center justify-center mx-auto mb-4"
            style={{
              clipPath:
                'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
            }}
          >
            <Server className="w-8 h-8 text-gold" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <LaurelAccent side="left" />
            <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
              Register as a Node
            </h1>
            <LaurelAccent side="right" />
          </div>
          <p className="font-mono text-sm tracking-[0.08em] uppercase text-foreground/40 mt-2">
            Provide your details to register as a node in the network
          </p>
          <div className="mt-4">
            <GreekKeyStrip color="gold" />
          </div>
        </div>

        <EvaPanel
          label="Node Registration"
          sublabel="SYS:REG"
          sysId="FORM-01"
          status="pending"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Location Section */}
              <div className="space-y-4">
                <EvaSectionMarker
                  section="Location"
                  label="Details"
                  variant="crimson"
                />

                <FormField
                  control={form.control}
                  name="addressName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/45 font-bold">
                        Location
                      </FormLabel>
                      <FormControl>
                        <div
                          className="relative group"
                          style={{
                            clipPath:
                              'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                          }}
                        >
                          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors" />
                          <LocationInput
                            defaultValue={field.value}
                            onLocationSelect={(address, lat, lng) => {
                              field.onChange(address);
                              form.setValue('lat', lat);
                              form.setValue('lng', lng);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="font-mono text-[11px] tracking-[0.08em] text-foreground/30">
                        Search for your location
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Assets Section */}
              <div className="space-y-4">
                <EvaScanLine variant="mixed" />
                <EvaSectionMarker
                  section="Assets"
                  label="Supported"
                  variant="gold"
                />

                <FormField
                  control={form.control}
                  name="supportedAssets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/45 font-bold">
                        Asset Classes
                      </FormLabel>
                      <FormControl>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between bg-background/80 border-border/40 hover:bg-background/60 font-mono text-xs tracking-[0.08em] uppercase"
                              type="button"
                              style={{
                                clipPath:
                                  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                              }}
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
                              <CommandList>
                                {isLoading ? (
                                  <div className="p-4 text-center font-mono text-sm tracking-[0.08em] text-foreground/40">
                                    Loading assets...
                                  </div>
                                ) : (
                                  <>
                                    <CommandEmpty>
                                      No assets found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {supportedAssetClasses.map(
                                        (assetClass) => (
                                          <CommandItem
                                            key={assetClass}
                                            value={assetClass}
                                            onSelect={() => {
                                              const currentValue = new Set(
                                                field.value,
                                              );
                                              if (
                                                currentValue.has(assetClass)
                                              ) {
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
                                        ),
                                      )}
                                    </CommandGroup>
                                  </>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormDescription className="font-mono text-[11px] tracking-[0.08em] text-foreground/30">
                        Select the assets you can support in your operations
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
                      <FormDescription className="font-mono text-[11px] tracking-[0.08em] text-foreground/30">
                        Enter the capacity for each selected asset
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <EvaScanLine variant="crimson" />

              <div className="pt-2">
                <GreekKeyStrip color="crimson" />
                <div className="pt-4">
                  <TrapButton
                    variant="gold"
                    size="lg"
                    className="w-full"
                    disabled={form.formState.isSubmitting || isLoading}
                  >
                    {form.formState.isSubmitting
                      ? 'Registering...'
                      : isLoading
                        ? 'Loading assets...'
                        : 'Register as Node'}
                  </TrapButton>
                </div>
              </div>
            </form>
          </Form>
        </EvaPanel>
      </div>
    </div>
  );
}
