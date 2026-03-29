'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Server,
  ArrowRight,
  MapPin,
  Package,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  TargetRings,
} from '@/app/components/eva/eva-components';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';
import { useDiamond } from '@/app/providers/diamond.provider';
import {
  DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID,
  getPublicNodeChainOptions,
  resolvePublicNodeChain,
} from '@/lib/public-node-chain';
import {
  getPublicRpcConfigurationError,
  NETWORK_CONFIGS,
} from '@/config/network';

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
  const searchParams = useSearchParams();
  const rawChainId = searchParams.get('chainId');
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChainId, setPendingChainId] = useState<number | null>(null);

  // Results state for wallet address searches
  const [searchResults, setSearchResults] = useState<NodeSummary[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);

  const {
    initialized: diamondInitialized,
    loading: diamondLoading,
    error: diamondError,
    nodeRepository,
  } = useDiamond();
  const publicChain = resolvePublicNodeChain(searchParams);
  const selectedChainId =
    pendingChainId ??
    publicChain.chainId ??
    (rawChainId ? null : DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID);
  const publicChainOptions = getPublicNodeChainOptions();
  const selectedChainLabel =
    selectedChainId === null
      ? 'Unsupported Chain'
      : (NETWORK_CONFIGS[selectedChainId]?.name ?? String(selectedChainId));
  const publicRpcError =
    selectedChainId === null
      ? null
      : getPublicRpcConfigurationError(selectedChainId);
  const displayError =
    error ||
    publicChain.error ||
    publicRpcError ||
    diamondError?.message ||
    null;

  useEffect(() => {
    if (rawChainId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('chainId', String(DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID));
    router.replace(`/node/explorer?${params.toString()}`);
  }, [rawChainId, router, searchParams]);

  useEffect(() => {
    if (pendingChainId === null) return;
    if (publicChain.chainId === pendingChainId) {
      setPendingChainId(null);
    }
  }, [pendingChainId, publicChain.chainId]);

  const isWalletAddress = (address: string): boolean => {
    return address.length === 42;
  };

  const isNodeHash = (address: string): boolean => {
    return address.length === 66;
  };

  const isRpcTransportFailure = (message: string): boolean => {
    return (
      message.includes('Too Many Requests') ||
      message.includes('missing response for request') ||
      message.includes('BAD_DATA') ||
      message.includes('failed to detect network') ||
      message.includes('Failed to fetch') ||
      message.includes('ERR_FAILED') ||
      message.includes('Public RPC is not configured')
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSearchResults([]);
    setShowResults(false);

    if (selectedChainId === null) {
      setError(publicChain.error || 'Unsupported public chain.');
      return;
    }

    if (publicRpcError) {
      setError(publicRpcError);
      return;
    }

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
        router.push(
          `/node/dashboard?nodeId=${trimmedAddress}&view=public&chainId=${selectedChainId}`,
        );
      } else {
        // Wallet address - fetch owned nodes
        if (
          pendingChainId !== null ||
          diamondLoading ||
          !diamondInitialized ||
          !nodeRepository
        ) {
          setError(
            'Please wait for the selected chain to finish loading and try again.',
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
      const message = err instanceof Error ? err.message : String(err);
      setError(
        isRpcTransportFailure(message)
          ? message
          : 'Failed to search. Please try again.',
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleNodeSelect = (nodeHash: string) => {
    router.push(
      `/node/dashboard?nodeId=${nodeHash}&view=public&chainId=${selectedChainId}`,
    );
  };

  const handleChainChange = (chainId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chainId', String(chainId));
    setPendingChainId(chainId);
    setError(null);
    setSearchResults([]);
    setShowResults(false);
    router.push(`/node/explorer?${params.toString()}`);
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
          <div className="flex items-center justify-center gap-3">
            <LaurelAccent side="left" />
            <h1 className="text-3xl font-serif font-bold tracking-[0.15em] uppercase text-foreground">
              Node Explorer
            </h1>
            <LaurelAccent side="right" />
          </div>
          <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/50 mt-2">
            Search for nodes by wallet address or node ID
          </p>
          <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/35 mt-3">
            Public chain: {selectedChainLabel}
          </p>
          <GreekKeyStrip width="full" color="gold" />
        </div>

        {/* Search Panel */}
        <EvaPanel label="Node Search" sysId="SYS-EXPL" accent="gold">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {publicChainOptions.map((chain) => (
                <TrapButton
                  key={chain.id}
                  type="button"
                  variant="gold"
                  className={cn(
                    'h-auto w-full border px-5 py-4 text-left',
                    selectedChainId === chain.id
                      ? 'border-gold/60 bg-gold/18 text-gold shadow-[0_0_0_1px_rgba(212,175,55,0.18)]'
                      : 'border-white/10 bg-background/35 text-foreground/70 hover:border-gold/30 hover:bg-gold/8 hover:text-gold',
                  )}
                  onClick={() => handleChainChange(chain.id)}
                >
                  <span className="flex items-center justify-between gap-4">
                    <span className="flex flex-col items-start gap-1">
                      <span className="text-sm tracking-[0.15em] uppercase">
                        {chain.label}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] tracking-[0.18em] uppercase',
                          selectedChainId === chain.id
                            ? 'text-gold/75'
                            : 'text-foreground/35',
                        )}
                      >
                        {selectedChainId === chain.id
                          ? 'Selected chain'
                          : 'Switch chain'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                        selectedChainId === chain.id
                          ? 'border-gold/70 bg-gold/15 text-gold'
                          : 'border-white/15 text-transparent',
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </span>
                </TrapButton>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 z-10" />
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
                  'pl-12 pr-4 py-6 text-lg bg-background/60 border-border/40',
                  'focus:border-gold/50 focus:ring-gold/20',
                  'placeholder:text-foreground/25',
                  'font-mono tracking-[0.05em]',
                  error && 'border-crimson/50',
                )}
              />
            </div>

            {displayError && (
              <p className="font-mono text-sm tracking-[0.05em] text-crimson flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {displayError}
              </p>
            )}

            <TrapButton
              variant="gold"
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSearching || !!publicRpcError}
            >
              {isSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Search
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </TrapButton>
          </form>

          {/* Helper text */}
          {!showResults && (
            <>
              <EvaScanLine variant="mixed" />
              <div className="flex flex-col items-center gap-3 py-2">
                <TargetRings size={40} />
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/35 text-center">
                  Enter a wallet address to see all nodes owned by that address,
                  or enter a node ID to view directly
                </p>
              </div>
            </>
          )}
        </EvaPanel>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-6 space-y-4">
            <EvaSectionMarker
              section="Results"
              label={`${searchResults.length} node${searchResults.length !== 1 ? 's' : ''} found`}
              variant="gold"
            />

            <div className="flex items-center justify-between px-1">
              <h2 className="font-mono text-sm tracking-[0.12em] uppercase font-bold text-foreground/80">
                Nodes owned by{' '}
                <span className="text-gold font-mono">
                  {truncateHash(searchedAddress || '')}
                </span>
              </h2>
            </div>

            <EvaScanLine variant="gold" />

            <div className="space-y-3">
              {searchResults.map((node) => (
                <EvaPanel
                  key={node.nodeHash}
                  label={truncateHash(node.nodeHash)}
                  sublabel={node.addressName}
                  status={node.status === 'Active' ? 'active' : 'offline'}
                  accent={node.status === 'Active' ? 'gold' : 'crimson'}
                  noPadding
                >
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer transition-all hover:bg-gold/[0.03]"
                    onClick={() => handleNodeSelect(node.nodeHash)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-3',
                          node.status === 'Active'
                            ? 'bg-emerald-500/10'
                            : 'bg-foreground/5',
                        )}
                        style={{
                          clipPath:
                            'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                        }}
                      >
                        <Server
                          className={cn(
                            'w-5 h-5',
                            node.status === 'Active'
                              ? 'text-emerald-400'
                              : 'text-foreground/30',
                          )}
                        />
                      </div>
                      <div>
                        <p className="font-mono text-sm tracking-[0.08em] text-foreground/80">
                          {truncateHash(node.nodeHash)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 font-mono text-[11px] tracking-[0.05em] text-foreground/40">
                            <MapPin className="w-3 h-3" />
                            {node.addressName}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px] tracking-[0.05em] text-foreground/40">
                            <Package className="w-3 h-3" />
                            {node.assetCount} asset
                            {node.assetCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <EvaStatusBadge
                        status={node.status === 'Active' ? 'active' : 'pending'}
                        label={node.status}
                      />
                      <ChevronRight className="w-5 h-5 text-foreground/25" />
                    </div>
                  </div>
                </EvaPanel>
              ))}
            </div>
          </div>
        )}

        {/* Example addresses */}
        {!showResults && (
          <div className="mt-6 text-center space-y-2">
            <GreekKeyStrip width="full" color="crimson" />
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/25">
              Example formats
            </p>
            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-foreground/25 mt-1">
              Wallet: 0x1234...5678 (42 chars) → Shows all owned nodes
            </p>
            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-foreground/25">
              Node ID: 0xabcd...ef01 (66 chars) → Direct view
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
