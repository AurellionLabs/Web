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
    path: '/pools',
  },
  {
    value: 'node',
    label: 'Node',
    path: '/node',
  },
  {
    value: 'driver',
    label: 'Driver',
    path: '/driver',
  },
] as const;

export function RoleSelector() {
  const [open, setOpen] = React.useState(false);
  const { currentUserRole, setCurrentUserRole } = useMainProvider();
  const router = useRouter();

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
                onSelect={(currentValue) => {
                  setCurrentUserRole(currentValue as typeof currentUserRole);
                  setOpen(false);
                  router.push(r.path);
                }}
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
