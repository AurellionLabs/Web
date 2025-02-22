'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useMainProvider } from '@/app/providers/main.provider';
import { useRouter } from 'next/navigation';

const roles = [
  {
    value: 'customer',
    label: 'Customer',
  },
  {
    value: 'node',
    label: 'Node',
  },
  {
    value: 'driver',
    label: 'Driver',
  },
] as const;

export function RoleSelector() {
  const [open, setOpen] = React.useState(false);
  const { currentUserRole, setCurrentUserRole } = useMainProvider();
  const router = useRouter();

  const checkNodeRegistration = async () => {
    try {
      // TODO: Add your blockchain call here to check if the wallet is registered as a node
      // const isRegistered = await yourContract.isRegisteredNode(walletAddress);
      // return isRegistered;
      return true;
    } catch (error) {
      console.error('Error checking node registration:', error);
      return false;
    }
  };

  const handleRoleSelect = async (currentValue: string) => {
    setCurrentUserRole(currentValue as typeof currentUserRole);
    setOpen(false);
    if (currentValue === 'node') {
      const isRegisteredNode = await checkNodeRegistration();
      if (isRegisteredNode) {
        router.push('/node/dashboard');
      } else {
        router.push('/node/register');
      }
    } else if (currentValue === 'customer') {
      router.push('/customer/pools');
    } else if (currentValue === 'driver') {
      router.push('/driver');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {currentUserRole
            ? roles.find((r) => r.value === currentUserRole)?.label
            : 'Select role...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search role..." />
          <CommandEmpty>No role found.</CommandEmpty>
          <CommandGroup>
            {roles.map((r) => (
              <CommandItem
                key={r.value}
                value={r.value}
                onSelect={handleRoleSelect}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    currentUserRole === r.value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
