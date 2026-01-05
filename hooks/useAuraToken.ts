'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { useWallet } from './useWallet';
import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '@/chain-constants';

/**
 * AURA Token ABI - minimal interface for balance and minting
 */
const AURA_TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function mintTokenToTreasury(uint256 amount) external',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
];

/**
 * State returned by the useAuraToken hook
 */
export interface UseAuraTokenReturn {
  /** User's AURA balance in human-readable format */
  balance: string;
  /** User's AURA balance as raw bigint */
  balanceRaw: bigint;
  /** Whether balance is currently loading */
  isLoadingBalance: boolean;
  /** Whether a mint transaction is in progress */
  isMinting: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Last transaction hash from mint */
  lastTxHash: string | null;
  /** Refresh the balance */
  refreshBalance: () => Promise<void>;
  /** Mint AURA tokens to connected wallet */
  mintTokens: (amount: number) => Promise<boolean>;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
}

/**
 * Maximum amount that can be minted at once (10,000 AURA)
 */
const MAX_MINT_AMOUNT = 10000;

/**
 * Hook for interacting with the AURA token contract
 *
 * Features:
 * - Check AURA balance for connected wallet
 * - Mint test AURA tokens (testnet only)
 * - Auto-refresh balance after minting
 *
 * @example
 * ```tsx
 * const { balance, mintTokens, isMinting, error } = useAuraToken();
 *
 * const handleMint = async () => {
 *   const success = await mintTokens(1000);
 *   if (success) {
 *     console.log('Minted 1000 AURA!');
 *   }
 * };
 * ```
 */
export function useAuraToken(): UseAuraTokenReturn {
  const { address, connectedWallet, isConnected } = useWallet();

  const [balance, setBalance] = useState<string>('0');
  const [balanceRaw, setBalanceRaw] = useState<bigint>(0n);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>('AURA');
  const [decimals, setDecimals] = useState<number>(18);

  /**
   * Get ethers provider from connected wallet
   */
  const getProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    if (!connectedWallet) return null;

    try {
      const ethereumProvider = await connectedWallet.getEthereumProvider();
      return new BrowserProvider(ethereumProvider);
    } catch (err) {
      console.error('[useAuraToken] Failed to get provider:', err);
      return null;
    }
  }, [connectedWallet]);

  /**
   * Get AURA token contract instance
   */
  const getContract = useCallback(
    async (withSigner = false): Promise<Contract | null> => {
      const provider = await getProvider();
      if (!provider) return null;

      try {
        if (withSigner) {
          const signer = await provider.getSigner();
          return new Contract(
            NEXT_PUBLIC_AURA_TOKEN_ADDRESS,
            AURA_TOKEN_ABI,
            signer,
          );
        }
        return new Contract(
          NEXT_PUBLIC_AURA_TOKEN_ADDRESS,
          AURA_TOKEN_ABI,
          provider,
        );
      } catch (err) {
        console.error('[useAuraToken] Failed to get contract:', err);
        return null;
      }
    },
    [getProvider],
  );

  /**
   * Fetch user's AURA balance
   */
  const refreshBalance = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance('0');
      setBalanceRaw(0n);
      return;
    }

    setIsLoadingBalance(true);
    setError(null);

    try {
      const contract = await getContract(false);
      if (!contract) {
        throw new Error('Failed to connect to AURA contract');
      }

      const [rawBalance, tokenDecimals, tokenSymbol] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
        contract.symbol(),
      ]);

      setBalanceRaw(rawBalance);
      setDecimals(Number(tokenDecimals));
      setSymbol(tokenSymbol);

      // Format balance for display
      const formatted = ethers.formatUnits(rawBalance, tokenDecimals);
      // Round to 2 decimal places for display
      const rounded = parseFloat(formatted).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      setBalance(rounded);
    } catch (err) {
      console.error('[useAuraToken] Failed to fetch balance:', err);
      setError('Failed to fetch AURA balance');
      setBalance('0');
      setBalanceRaw(0n);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, isConnected, getContract]);

  /**
   * Mint AURA tokens to the connected wallet
   *
   * @param amount - Number of AURA tokens to mint (max 10,000)
   * @returns true if successful, false otherwise
   */
  const mintTokens = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!address || !isConnected) {
        setError('Please connect your wallet first');
        return false;
      }

      if (amount <= 0) {
        setError('Amount must be greater than 0');
        return false;
      }

      if (amount > MAX_MINT_AMOUNT) {
        setError(
          `Maximum mint amount is ${MAX_MINT_AMOUNT.toLocaleString()} AURA`,
        );
        return false;
      }

      setIsMinting(true);
      setError(null);
      setLastTxHash(null);

      try {
        const contract = await getContract(true);
        if (!contract) {
          throw new Error('Failed to connect to AURA contract');
        }

        console.log(`[useAuraToken] Minting ${amount} AURA tokens...`);

        // The contract multiplies by 10^18 internally
        const tx = await contract.mintTokenToTreasury(amount);
        console.log('[useAuraToken] Transaction sent:', tx.hash);
        setLastTxHash(tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('[useAuraToken] Transaction confirmed:', receipt.hash);

        // Refresh balance after successful mint
        await refreshBalance();

        return true;
      } catch (err: any) {
        console.error('[useAuraToken] Failed to mint tokens:', err);

        // Parse common errors
        if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
          setError('Transaction was rejected by user');
        } else if (err.message?.includes('insufficient funds')) {
          setError('Insufficient ETH for gas fees');
        } else {
          setError(err.message || 'Failed to mint tokens');
        }

        return false;
      } finally {
        setIsMinting(false);
      }
    },
    [address, isConnected, getContract, refreshBalance],
  );

  // Fetch balance when wallet connects or address changes
  useEffect(() => {
    if (isConnected && address) {
      refreshBalance();
    } else {
      setBalance('0');
      setBalanceRaw(0n);
    }
  }, [isConnected, address, refreshBalance]);

  return {
    balance,
    balanceRaw,
    isLoadingBalance,
    isMinting,
    error,
    lastTxHash,
    refreshBalance,
    mintTokens,
    symbol,
    decimals,
  };
}

export default useAuraToken;
