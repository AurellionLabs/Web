'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useMainProvider } from '@/app/providers/main.provider';
import { useRouter } from 'next/navigation';
import { useNodesSafe } from '@/app/providers/nodes.provider';

const roles = [
  {
    value: 'customer',
    label: 'Market',
  },
  {
    value: 'node',
    label: 'Node',
  },
  {
    value: 'driver',
    label: 'Logistics',
  },
] as const;

export function RoleSelector() {
  const [open, setOpen] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const { currentUserRole, setCurrentUserRole } = useMainProvider();
  const router = useRouter();
  const nodesContext = useNodesSafe();
  const nodeStatus = nodesContext?.isRegisteredNode ?? false;
  const comboboxId = React.useId();

  const checkNodeRegistration = async () => {
    try {
      return nodeStatus;
    } catch (error) {
      console.error('Error checking node registration:', error);
      return false;
    }
  };

  const handleRoleSelect = async (currentValue: string) => {
    setCurrentUserRole(currentValue as typeof currentUserRole);
    setOpen(false);
    setIsNavigating(true);

    if (currentValue === 'node') {
      router.push('/node/overview');
    } else if (currentValue === 'customer') {
      router.push('/customer/dashboard');
    } else if (currentValue === 'driver') {
      router.push('/driver/dashboard');
    }

    // Force a route-level refresh so role-specific data providers reload immediately.
    router.refresh();

    // Reset navigating state after a brief moment
    // The loading.tsx files will handle the actual loading UI
    setTimeout(() => setIsNavigating(false), 1000);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          aria-controls={`${comboboxId}-list`}
          disabled={isNavigating}
          className="w-[140px] px-3 py-2 text-sm font-medium rounded-lg border border-neutral-700 bg-neutral-900/50 text-white hover:bg-neutral-800 hover:text-white hover:border-neutral-600 transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentUserRole
            ? roles.find((r) => r.value === currentUserRole)?.label
            : 'Select role...'}
          {isNavigating ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[140px] p-0 bg-neutral-900 border-neutral-800">
        <Command id={`${comboboxId}-list`} className="bg-transparent">
          <CommandInput
            placeholder="Search role..."
            className="border-neutral-800"
          />
          <CommandEmpty className="text-white/80 text-sm py-3">
            No role found.
          </CommandEmpty>
          <CommandGroup>
            {roles.map((r) => (
              <CommandItem
                key={r.value}
                value={r.value}
                onSelect={handleRoleSelect}
                className="text-white hover:bg-neutral-800 hover:text-white aria-selected:bg-amber-500/10 aria-selected:text-amber-400"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    currentUserRole === r.value
                      ? 'opacity-100 text-amber-400'
                      : 'opacity-0',
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
