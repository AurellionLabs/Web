'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { useDiamond } from '@/app/providers/diamond.provider';
import { useWallet } from '@/hooks/useWallet';
import {
  Loader2,
  ArrowRight,
  Wallet,
  Building2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';

interface DepositForTradingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: string;
  tokenName: string;
  nodeHash: string;
  walletBalance: bigint;
  nodeBalance: bigint;
  requiredAmount: bigint;
  onDepositComplete: () => void;
}

type Step = 'info' | 'approve' | 'deposit' | 'success';

export function DepositForTradingModal({
  open,
  onOpenChange,
  tokenId,
  tokenName,
  nodeHash,
  walletBalance,
  nodeBalance,
  requiredAmount,
  onDepositComplete,
}: DepositForTradingModalProps) {
  const { depositTokensToNode, getNodeTokenBalance } = useDiamond();
  const { address, repository } = useWallet();

  const [step, setStep] = useState<Step>('info');
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('info');
      setDepositAmount(requiredAmount.toString());
      setError(null);
      setIsApproved(false);
    }
  }, [open, requiredAmount]);

  // Check if Diamond is approved to transfer user's tokens
  const checkApproval = useCallback(async () => {
    if (!repository || !address) return false;

    try {
      const approved = await repository.isApprovedForAll(
        address,
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        NEXT_PUBLIC_DIAMOND_ADDRESS,
      );
      setIsApproved(approved);
      return approved;
    } catch (err) {
      console.error('Error checking approval:', err);
      return false;
    }
  }, [repository, address]);

  useEffect(() => {
    if (open && step === 'info') {
      checkApproval();
    }
  }, [open, step, checkApproval]);

  const handleApprove = async () => {
    if (!repository || !address) return;

    setIsProcessing(true);
    setError(null);

    try {
      const tx = await repository.setApprovalForAll(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        true,
        NEXT_PUBLIC_DIAMOND_ADDRESS,
      );
      await tx.wait();

      setIsApproved(true);
      setStep('deposit');
    } catch (err: any) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || BigInt(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = BigInt(depositAmount);
    if (amount > walletBalance) {
      setError('Insufficient wallet balance');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await depositTokensToNode(nodeHash, tokenId, amount);
      setStep('success');
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    onDepositComplete();
    onOpenChange(false);
  };

  const handleContinue = () => {
    if (!isApproved) {
      setStep('approve');
    } else {
      setStep('deposit');
    }
  };

  const formatAmount = (amount: bigint) => {
    return amount.toString();
  };

  const shortfall =
    requiredAmount > nodeBalance ? requiredAmount - nodeBalance : BigInt(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Deposit Complete
              </>
            ) : (
              <>
                <Building2 className="h-5 w-5 text-primary" />
                Deposit Assets for Trading
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'info' && (
              <>
                To sell assets on the CLOB, you need to deposit them to your
                node first. This allows the Diamond contract to transfer them to
                buyers.
              </>
            )}
            {step === 'approve' && (
              <>Approve the Diamond contract to transfer your assets.</>
            )}
            {step === 'deposit' && (
              <>Deposit your assets to your node for trading.</>
            )}
            {step === 'success' && (
              <>Your assets have been deposited and are ready for trading.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Asset Info */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface-overlay border border-border/30">
            <div>
              <p className="text-sm text-muted-foreground">Asset</p>
              <p className="font-semibold">{tokenName}</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              ID: {tokenId.slice(0, 8)}...
            </Badge>
          </div>

          {step === 'info' && (
            <>
              {/* Balance Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-surface-overlay border border-border/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Wallet className="h-4 w-4" />
                    Your Wallet
                  </div>
                  <p className="text-lg font-semibold">
                    {formatAmount(walletBalance)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-overlay border border-border/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    Node Balance
                  </div>
                  <p className="text-lg font-semibold">
                    {formatAmount(nodeBalance)}
                  </p>
                </div>
              </div>

              {/* Shortfall Warning */}
              {shortfall > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">
                      Deposit Required
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You need to deposit at least{' '}
                      <span className="font-semibold text-foreground">
                        {formatAmount(shortfall)}
                      </span>{' '}
                      more tokens to your node to place this sell order.
                    </p>
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  How it works
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    1
                  </div>
                  <span className="text-muted-foreground">
                    Approve Diamond to transfer your tokens
                  </span>
                  {isApproved && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    2
                  </div>
                  <span className="text-muted-foreground">
                    Deposit tokens to your node
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    3
                  </div>
                  <span className="text-muted-foreground">
                    Place your sell order on the CLOB
                  </span>
                </div>
              </div>
            </>
          )}

          {step === 'approve' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
              <p className="text-center text-muted-foreground">
                This approval allows the Diamond contract to transfer your
                AuraAsset tokens when you deposit them to your node.
              </p>
            </div>
          )}

          {step === 'deposit' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Deposit</Label>
                <Input
                  id="amount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="font-mono"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Available: {formatAmount(walletBalance)}
                  </span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setDepositAmount(walletBalance.toString())}
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Transfer visualization */}
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-overlay border border-border/30 mb-2">
                      <Wallet className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Wallet</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span className="text-xs font-mono text-primary mt-1">
                      {depositAmount || '0'}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/30 mb-2">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Node</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Deposit Successful!</p>
                <p className="text-muted-foreground">
                  Your tokens are now available for trading on the CLOB.
                </p>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'info' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={walletBalance <= 0}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'approve' && (
            <>
              <Button variant="outline" onClick={() => setStep('info')}>
                Back
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve'
                )}
              </Button>
            </>
          )}

          {step === 'deposit' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(isApproved ? 'info' : 'approve')}
              >
                Back
              </Button>
              <Button onClick={handleDeposit} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Depositing...
                  </>
                ) : (
                  'Deposit'
                )}
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={handleComplete} className="w-full">
              Continue to Trading
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
