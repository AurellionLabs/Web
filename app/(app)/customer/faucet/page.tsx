'use client';

import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import {
  EvaPanel,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  TargetRings,
  TrapButton,
} from '@/app/components/eva/eva-components';
import { BootSequence } from '@/app/components/eva/eva-animations';
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
        <div className="text-center mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden sm:block">
            <LaurelAccent side="left" />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden sm:block">
            <LaurelAccent side="right" />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 relative">
            <TargetRings size={64} />
            <Droplets className="w-6 h-6 text-gold absolute" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase text-foreground mb-2">
            AURA TOKEN FAUCET
          </h1>
          <p className="font-mono text-sm tracking-[0.08em] text-foreground/50 max-w-md mx-auto uppercase">
            Mint test AURA tokens for trading on Base Sepolia testnet. These
            tokens have no real value.
          </p>
        </div>

        <GreekKeyStrip color="gold" />

        {/* Balance Section */}
        <EvaSectionMarker
          section="BALANCE"
          label="WALLET STATUS"
          variant="gold"
        />

        <EvaPanel
          label="Your Balance"
          sysId="BAL-01"
          status={isConnected ? 'active' : 'offline'}
          accent="gold"
        >
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gold" />
                <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50">
                  Current Holdings
                </span>
              </div>
              <button
                onClick={refreshBalance}
                disabled={isLoadingBalance}
                className="p-2 hover:bg-gold/5 transition-colors disabled:opacity-50"
                title="Refresh balance"
              >
                <RefreshCw
                  className={cn(
                    'w-4 h-4 text-foreground/40',
                    isLoadingBalance && 'animate-spin',
                  )}
                />
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              {isConnected ? (
                <>
                  <span className="font-mono text-4xl font-bold tabular-nums text-gold">
                    {isLoadingBalance ? (
                      <span className="animate-pulse">---</span>
                    ) : (
                      (
                        parseFloat(balance.replace(/,/g, '')) || 0
                      ).toLocaleString()
                    )}
                  </span>
                  <span className="font-mono text-xl tracking-[0.15em] text-gold/60 font-semibold uppercase">
                    {symbol}
                  </span>
                </>
              ) : (
                <span className="font-mono text-lg tracking-[0.1em] text-foreground/40 uppercase">
                  Connect wallet to view balance
                </span>
              )}
            </div>

            {isConnected && address && (
              <p className="font-mono text-sm text-foreground/30 tracking-wider">
                {truncateAddress(address)}
              </p>
            )}
          </div>
        </EvaPanel>

        <EvaScanLine variant="mixed" />

        {/* Mint Section */}
        <EvaSectionMarker
          section="MINT"
          label="TOKEN GENERATION"
          variant="crimson"
        />

        <EvaPanel
          label="Mint Tokens"
          sublabel="TOKEN FAUCET"
          sysId="MINT-02"
          status={isMinting ? 'warning' : 'active'}
          accent="crimson"
        >
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-gold" />
            <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
              Select an amount or enter a custom value (max 10,000 per mint)
            </span>
          </div>

          {/* Preset amounts */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className={cn(
                  'py-2 px-3 text-sm font-mono font-bold tracking-[0.1em] transition-all duration-200',
                  mintAmount === amount.toString()
                    ? 'bg-gold/15 text-gold'
                    : 'bg-card/60 text-foreground/40 hover:text-gold hover:bg-gold/5',
                )}
                style={{
                  clipPath:
                    'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                }}
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
                className="bg-background/60 border-border/40 focus:border-gold/50 font-mono"
              />
            </div>
            <TrapButton
              variant="gold"
              onClick={handleMint}
              disabled={!isConnected || isMinting || !mintAmount}
            >
              <span className="flex items-center gap-2">
                {isMinting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isMinting ? 'MINTING...' : 'MINT'}
              </span>
            </TrapButton>
          </div>

          {/* Boot Sequence — shown when minting is in progress */}
          {isMinting && (
            <div className="mb-4">
              <BootSequence
                items={[
                  { label: 'CONNECT WALLET', code: 'WALLET.CONN' },
                  { label: 'APPROVE CONTRACT', code: 'CTR.APPROVE' },
                  { label: 'MINT TOKENS', code: 'TKN.MINT.EXE' },
                  { label: 'CONFIRM TRANSACTION', code: 'TX.CONFIRM' },
                ]}
              />
            </div>
          )}

          {/* Status messages */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 bg-crimson/10 border border-crimson/30 text-crimson text-sm mb-4"
              style={{
                clipPath:
                  'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-mono text-xs tracking-[0.1em] uppercase">
                {error}
              </span>
            </div>
          )}

          {showSuccess && lastTxHash && (
            <div
              className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-4"
              style={{
                clipPath:
                  'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-mono text-xs tracking-[0.1em] uppercase">
                  Successfully minted {mintAmount} AURA
                </span>
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase">
                  View TX
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Not connected state */}
          {!isConnected && (
            <div className="text-center py-4">
              <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                Please connect your wallet to mint AURA tokens
              </p>
            </div>
          )}
        </EvaPanel>

        <EvaScanLine variant="gold" />

        {/* Info Card */}
        <EvaPanel label="Notice" sysId="INFO-03" accent="gold" status="warning">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{
                  clipPath:
                    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  background: 'hsl(43 65% 62% / 0.1)',
                }}
              >
                <AlertCircle className="w-5 h-5 text-gold" />
              </div>
            </div>
            <div>
              <h4 className="font-mono text-sm font-bold tracking-[0.15em] uppercase text-foreground mb-1">
                Testnet Tokens Only
              </h4>
              <p className="font-mono text-xs tracking-[0.08em] text-foreground/40 mb-3 leading-relaxed">
                These AURA tokens are for testing purposes on Base Sepolia
                testnet. They have no monetary value and cannot be transferred
                to mainnet.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://sepolia.basescan.org/token/${NEXT_PUBLIC_AURA_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] uppercase text-gold hover:text-gold/80 transition-colors"
                >
                  View token contract
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-foreground/20">•</span>
                <a
                  href="https://www.alchemy.com/faucets/base-sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] uppercase text-gold hover:text-gold/80 transition-colors"
                >
                  Get testnet ETH
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </EvaPanel>

        <GreekKeyStrip color="crimson" />

        {/* Token Details */}
        <EvaSectionMarker
          section="DETAILS"
          label="CONTRACT DATA"
          variant="gold"
        />

        <EvaPanel label="Token Details" sysId="TKN-04" accent="gold">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/10">
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                Name
              </span>
              <span className="font-mono text-sm font-bold text-gold">
                Aura
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/10">
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                Symbol
              </span>
              <span className="font-mono text-sm font-bold text-gold">
                {symbol}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/10">
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                Network
              </span>
              <span className="font-mono text-sm font-bold text-gold">
                Base Sepolia
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                Contract
              </span>
              <a
                href={`https://sepolia.basescan.org/token/${NEXT_PUBLIC_AURA_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-gold hover:text-gold/80 transition-colors flex items-center gap-1"
              >
                {truncateAddress(NEXT_PUBLIC_AURA_TOKEN_ADDRESS)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </EvaPanel>

        <EvaScanLine variant="mixed" />
      </div>
    </div>
  );
}
