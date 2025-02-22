'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// This would typically come from an API or configuration
const supportedAssets = [
  { value: 'goat', label: 'Goat' },
  { value: 'sheep', label: 'Sheep' },
  { value: 'cow', label: 'Cow' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'duck', label: 'Duck' },
] as const;

const formSchema = z.object({
  location: z.string().min(3, {
    message: 'Location must be at least 3 characters.',
  }),
  supportedAssets: z.array(z.string()).min(1, {
    message: 'Please select at least one supported asset.',
  }),
});

export default function NodeRegistrationPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: '',
      supportedAssets: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // TODO: Add your blockchain call here to register the node
      console.log('Form values:', values);
      router.push('/node/dashboard');
    } catch (error: any) {
      console.error('Error registering node:', error);
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your location" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter your physical location or service area.
                    </FormDescription>
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
                              ? `${field.value.length} asset${
                                  field.value.length === 1 ? '' : 's'
                                } selected`
                              : 'Select assets...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search assets..." />
                            <CommandEmpty>No assets found.</CommandEmpty>
                            <CommandGroup>
                              {supportedAssets.map((asset) => (
                                <CommandItem
                                  key={asset.value}
                                  onSelect={() => {
                                    const currentValue = new Set(field.value);
                                    if (currentValue.has(asset.value)) {
                                      currentValue.delete(asset.value);
                                    } else {
                                      currentValue.add(asset.value);
                                    }
                                    field.onChange(Array.from(currentValue));
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value.includes(asset.value)
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )}
                                  />
                                  {asset.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
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

              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? 'Registering...'
                  : 'Register as Node'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
