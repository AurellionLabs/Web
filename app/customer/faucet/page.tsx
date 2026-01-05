'use client';

import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { AnimatedNumber } from '@/app/components/ui/animated-number';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Droplets,
  Wallet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
} from 'lucide-react';
import { useAuraToken } from '@/hooks/useAuraToken';
import { useWallet } from '@/hooks/useWallet';
import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '@/chain-constants';

/**
 * Preset mint amounts for quick selection
 */
const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000];

/**
 * FaucetPage - Testnet AURA token faucet
 *
 * Features:
 * - Display current AURA balance
 * - Mint test AURA tokens
 * - Preset amount buttons for quick minting
 * - Custom amount input
 * - Transaction status feedback
 */
export default function FaucetPage() {
  const { setCurrentUserRole } = useMainProvider();
  const { isConnected, address } = useWallet();
  const {
    balance,
    isLoadingBalance,
    isMinting,
    error,
    lastTxHash,
    refreshBalance,
    mintTokens,
    symbol,
  } = useAuraToken();

  // State
  const [mintAmount, setMintAmount] = useState<string>('1000');
  const [showSuccess, setShowSuccess] = useState(false);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Show success message briefly after successful mint
  useEffect(() => {
    if (lastTxHash && !isMinting) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastTxHash, isMinting]);

  /**
   * Handle mint button click
   */
  const handleMint = async () => {
    const amount = parseInt(mintAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    await mintTokens(amount);
  };

  /**
   * Handle preset amount selection
   */
  const handlePresetClick = (amount: number) => {
    setMintAmount(amount.toString());
  };

  /**
   * Truncate address for display
   */
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 mb-4">
            <Droplets className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            AURA Token Faucet
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Mint test AURA tokens for trading on Base Sepolia testnet. These
            tokens have no real value.
          </p>
        </div>

        {/* Balance Card */}
        <GlassCard variant="glow" className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-red-500/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-muted-foreground">
                  Your Balance
                </span>
              </div>
              <button
                onClick={refreshBalance}
                disabled={isLoadingBalance}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Refresh balance"
              >
                <RefreshCw
                  className={cn(
                    'w-4 h-4 text-muted-foreground',
                    isLoadingBalance && 'animate-spin',
                  )}
                />
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              {isConnected ? (
                <>
                  <span className="text-4xl font-display font-bold text-foreground">
                    {isLoadingBalance ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <AnimatedNumber
                        value={parseFloat(balance.replace(/,/g, '')) || 0}
                        fixed={0}
                      />
                    )}
                  </span>
                  <span className="text-xl text-amber-400 font-semibold">
                    {symbol}
                  </span>
                </>
              ) : (
                <span className="text-2xl text-muted-foreground">
                  Connect wallet to view balance
                </span>
              )}
            </div>

            {isConnected && address && (
              <p className="text-sm text-muted-foreground font-mono">
                {truncateAddress(address)}
              </p>
            )}
          </div>
        </GlassCard>

        {/* Mint Card */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              Mint Tokens
            </GlassCardTitle>
            <GlassCardDescription>
              Select an amount or enter a custom value (max 10,000 per mint)
            </GlassCardDescription>
          </GlassCardHeader>

          {/* Preset amounts */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className={cn(
                  'py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
                  'border',
                  mintAmount === amount.toString()
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-surface-overlay border-glass-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground',
                )}
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <Input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="Enter amount"
                min={1}
                max={10000}
                className="bg-surface-overlay border-glass-border focus:border-amber-500/50"
              />
            </div>
            <GlowButton
              variant="primary"
              glow
              onClick={handleMint}
              disabled={!isConnected || isMinting || !mintAmount}
              loading={isMinting}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {isMinting ? 'Minting...' : 'Mint'}
            </GlowButton>
          </div>

          {/* Status messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {showSuccess && lastTxHash && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Successfully minted {mintAmount} AURA!</span>
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
              >
                <span className="text-xs">View tx</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Not connected state */}
          {!isConnected && (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                Please connect your wallet to mint AURA tokens
              </p>
            </div>
          )}
        </GlassCard>

        {/* Info Card */}
        <GlassCard className="bg-amber-500/5 border-amber-500/20">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Testnet Tokens Only
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                These AURA tokens are for testing purposes on Base Sepolia
                testnet. They have no monetary value and cannot be transferred
                to mainnet.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://sepolia.basescan.org/token/${NEXT_PUBLIC_AURA_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  View token contract
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-muted-foreground/50">•</span>
                <a
                  href="https://www.alchemy.com/faucets/base-sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Get testnet ETH
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Token Details */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Token Details</GlassCardTitle>
          </GlassCardHeader>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-glass-border">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">Aura</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-glass-border">
              <span className="text-sm text-muted-foreground">Symbol</span>
              <span className="text-sm font-medium text-foreground">
                {symbol}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-glass-border">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm font-medium text-foreground">
                Base Sepolia
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Contract</span>
              <a
                href={`https://sepolia.basescan.org/token/${NEXT_PUBLIC_AURA_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                {truncateAddress(NEXT_PUBLIC_AURA_TOKEN_ADDRESS)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
