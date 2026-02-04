'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Server, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Node Explorer Page
 * Simple search page to find and view nodes by wallet address
 */
export default function NodeExplorerPage() {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedAddress = searchAddress.trim();

    // Validate address format
    if (!trimmedAddress) {
      setError('Please enter a wallet address or node ID');
      return;
    }

    // Check if it's a valid hex string (address or bytes32 hash)
    if (!trimmedAddress.startsWith('0x')) {
      setError('Address must start with 0x');
      return;
    }

    // Valid Ethereum address (42 chars) or bytes32 hash (66 chars)
    if (trimmedAddress.length !== 42 && trimmedAddress.length !== 66) {
      setError(
        'Invalid address format. Expected wallet address (42 chars) or node ID (66 chars)',
      );
      return;
    }

    setIsSearching(true);

    try {
      // Navigate to dashboard with public view mode
      router.push(`/node/dashboard?nodeId=${trimmedAddress}&view=public`);
    } catch (err) {
      setError('Failed to search. Please try again.');
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 mb-4">
            <Server className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Node Explorer
          </h1>
          <p className="text-muted-foreground">
            Search for any node by wallet address or node ID
          </p>
        </div>

        {/* Search Card */}
        <GlassCard className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter wallet address (0x...) or node ID"
                value={searchAddress}
                onChange={(e) => {
                  setSearchAddress(e.target.value);
                  setError(null);
                }}
                className={cn(
                  'pl-12 pr-4 py-6 text-lg bg-neutral-900/50 border-neutral-700/50',
                  'focus:border-amber-500/50 focus:ring-amber-500/20',
                  'placeholder:text-neutral-500',
                  error && 'border-red-500/50',
                )}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {error}
              </p>
            )}

            <GlowButton
              type="submit"
              variant="primary"
              className="w-full py-6 text-lg"
              glow
              loading={isSearching}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {isSearching ? 'Searching...' : 'View Node'}
            </GlowButton>
          </form>

          {/* Helper text */}
          <div className="mt-6 pt-6 border-t border-neutral-800/50">
            <p className="text-sm text-muted-foreground text-center">
              View node details, assets, and supporting documents in read-only
              mode
            </p>
          </div>
        </GlassCard>

        {/* Example addresses */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/50">Example formats:</p>
          <p className="text-xs text-muted-foreground/50 font-mono mt-1">
            Wallet: 0x1234...5678 (42 chars)
          </p>
          <p className="text-xs text-muted-foreground/50 font-mono">
            Node ID: 0xabcd...ef01 (66 chars)
          </p>
        </div>
      </div>
    </div>
  );
}
