'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Server,
  ArrowRight,
  MapPin,
  Package,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { GlassCard } from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';
import { useDiamond } from '@/app/providers/diamond.provider';

interface NodeSummary {
  nodeHash: string;
  owner: string;
  addressName: string;
  status: 'Active' | 'Inactive';
  assetCount: number;
}

/**
 * Node Explorer Page
 * Search for nodes by wallet address (shows all nodes owned) or node ID (direct view)
 */
export default function NodeExplorerPage() {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state for wallet address searches
  const [searchResults, setSearchResults] = useState<NodeSummary[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);

  const { initialized: diamondInitialized, nodeRepository } = useDiamond();

  const isWalletAddress = (address: string): boolean => {
    return address.length === 42;
  };

  const isNodeHash = (address: string): boolean => {
    return address.length === 66;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSearchResults([]);
    setShowResults(false);

    const trimmedAddress = searchAddress.trim();

    // Validate address format
    if (!trimmedAddress) {
      setError('Please enter a wallet address or node ID');
      return;
    }

    if (!trimmedAddress.startsWith('0x')) {
      setError('Address must start with 0x');
      return;
    }

    // Valid Ethereum address (42 chars) or bytes32 hash (66 chars)
    if (!isWalletAddress(trimmedAddress) && !isNodeHash(trimmedAddress)) {
      setError(
        'Invalid address format. Expected wallet address (42 chars) or node ID (66 chars)',
      );
      return;
    }

    setIsSearching(true);

    try {
      if (isNodeHash(trimmedAddress)) {
        // Direct node ID - navigate to dashboard
        router.push(`/node/dashboard?nodeId=${trimmedAddress}&view=public`);
      } else {
        // Wallet address - fetch owned nodes
        if (!diamondInitialized || !nodeRepository) {
          setError(
            'Please wait for the connection to initialize and try again.',
          );
          setIsSearching(false);
          return;
        }

        const ownedNodeHashes =
          await nodeRepository.getOwnedNodes(trimmedAddress);

        if (ownedNodeHashes.length === 0) {
          setError('No nodes found for this wallet address');
          setIsSearching(false);
          return;
        }

        // Fetch details for each node
        const nodeDetails: NodeSummary[] = await Promise.all(
          ownedNodeHashes.map(async (nodeHash) => {
            try {
              const node = await nodeRepository.getNode(nodeHash);
              const assets = await nodeRepository.getNodeAssets(nodeHash);
              return {
                nodeHash,
                owner: node?.owner || trimmedAddress,
                addressName: node?.location?.addressName || 'Unknown Location',
                status: node?.status || 'Inactive',
                assetCount: assets?.length || 0,
              };
            } catch (err) {
              console.error(`Error fetching node ${nodeHash}:`, err);
              return {
                nodeHash,
                owner: trimmedAddress,
                addressName: 'Unknown Location',
                status: 'Inactive' as const,
                assetCount: 0,
              };
            }
          }),
        );

        setSearchResults(nodeDetails);
        setSearchedAddress(trimmedAddress);
        setShowResults(true);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleNodeSelect = (nodeHash: string) => {
    router.push(`/node/dashboard?nodeId=${nodeHash}&view=public`);
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 mb-4">
            <Server className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Node Explorer
          </h1>
          <p className="text-muted-foreground">
            Search for nodes by wallet address or node ID
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
                  if (showResults) {
                    setShowResults(false);
                    setSearchResults([]);
                  }
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
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}

            <GlowButton
              type="submit"
              variant="primary"
              className="w-full py-6 text-lg"
              glow
              loading={isSearching}
              rightIcon={
                isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )
              }
            >
              {isSearching ? 'Searching...' : 'Search'}
            </GlowButton>
          </form>

          {/* Helper text */}
          {!showResults && (
            <div className="mt-6 pt-6 border-t border-neutral-800/50">
              <p className="text-sm text-muted-foreground text-center">
                Enter a wallet address to see all nodes owned by that address,
                or enter a node ID to view directly
              </p>
            </div>
          )}
        </GlassCard>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Nodes owned by{' '}
                <span className="text-amber-400 font-mono">
                  {truncateHash(searchedAddress || '')}
                </span>
              </h2>
              <span className="text-sm text-muted-foreground">
                {searchResults.length} node
                {searchResults.length !== 1 ? 's' : ''} found
              </span>
            </div>

            <div className="space-y-3">
              {searchResults.map((node) => (
                <GlassCard
                  key={node.nodeHash}
                  hover
                  className="p-4 cursor-pointer transition-all hover:border-amber-500/30"
                  onClick={() => handleNodeSelect(node.nodeHash)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-3 rounded-xl',
                          node.status === 'Active'
                            ? 'bg-green-500/20'
                            : 'bg-neutral-500/20',
                        )}
                      >
                        <Server
                          className={cn(
                            'w-5 h-5',
                            node.status === 'Active'
                              ? 'text-green-400'
                              : 'text-neutral-400',
                          )}
                        />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-foreground">
                          {truncateHash(node.nodeHash)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {node.addressName}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="w-3 h-3" />
                            {node.assetCount} asset
                            {node.assetCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          node.status === 'Active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-neutral-500/20 text-neutral-400',
                        )}
                      >
                        {node.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Example addresses */}
        {!showResults && (
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/50">Example formats:</p>
            <p className="text-xs text-muted-foreground/50 font-mono mt-1">
              Wallet: 0x1234...5678 (42 chars) → Shows all owned nodes
            </p>
            <p className="text-xs text-muted-foreground/50 font-mono">
              Node ID: 0xabcd...ef01 (66 chars) → Direct view
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
