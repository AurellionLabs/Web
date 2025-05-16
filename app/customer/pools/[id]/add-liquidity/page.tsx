'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseUnits, formatUnits, ethers } from 'ethers';
import { ArrowLeft, HelpCircle, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { z } from 'zod';
import { usePools, StakingOperation } from '@/app/providers/pools.provider';
import { useWallet } from '@/hooks/useWallet';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';
import { toast } from 'sonner';

const getUserTokenBalance = async (
  tokenAddress?: string,
  walletAddress?: string,
): Promise<string> => {
  console.warn(
    '[AddLiquidityPage] getUserTokenBalance utility used as placeholder. Implement actual balance fetching for token:',
    tokenAddress,
    'wallet:',
    walletAddress,
  );
  if (tokenAddress && walletAddress)
    return ethers.parseUnits('1000', 18).toString();
  return '0';
};

const getTokenDecimals = async (tokenAddress?: string): Promise<number> => {
  console.warn(
    '[AddLiquidityPage] getTokenDecimals utility used as placeholder. Implement actual decimal fetching for token:',
    tokenAddress,
  );
  return 18;
};

const assetSchema = z.object({
  amount: z.string().refine(
    (val) => {
      if (val === '') return true;
      return /^\d+$/.test(val) && BigInt(val) >= BigInt(0);
    },
    { message: 'Please enter a valid whole number for asset quantity.' },
  ),
});

export default function AddLiquidity({ params }: { params: { id: string } }) {
  const router = useRouter();
  const {
    selectedPoolDetails,
    fetchPoolDetails,
    stakeTokens,
    loadingSelectedPool,
    loadingStakeAction,
    error: providerError,
  } = usePools();
  const { address: walletAddress, connected: isWalletConnected } = useWallet();

  const [assetAmount, setAssetAmount] = useState('');
  const [tokenAmountToStake, setTokenAmountToStake] = useState('0');
  const [validationError, setValidationError] = useState('');
  const [stakingDecimals, setStakingDecimals] = useState(18);
  const [userStakingTokenBalance, setUserStakingTokenBalance] =
    useState<string>('0');

  const operationId = params.id;

  useEffect(() => {
    if (operationId) {
      fetchPoolDetails(operationId);
    }
  }, [operationId, fetchPoolDetails]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedPoolDetails?.token) {
        try {
          const decimals = await getTokenDecimals(selectedPoolDetails.token);
          setStakingDecimals(decimals);
          if (walletAddress && isWalletConnected) {
            const balance = await getUserTokenBalance(
              selectedPoolDetails.token,
              walletAddress,
            );
            setUserStakingTokenBalance(balance);
          } else {
            setUserStakingTokenBalance('0');
          }
        } catch (err) {
          console.error(
            'Error fetching token details (decimals/balance):',
            err,
          );
          setStakingDecimals(18);
          setUserStakingTokenBalance('0');
        }
      }
    };
    fetchDetails();
  }, [selectedPoolDetails, walletAddress, isWalletConnected]);

  useEffect(() => {
    if (
      assetAmount &&
      selectedPoolDetails?.assetPrice &&
      selectedPoolDetails?.token
    ) {
      try {
        assetSchema.parse({ amount: assetAmount });
        const assetAmountBigInt = BigInt(assetAmount);
        const assetPriceInWei = BigInt(selectedPoolDetails.assetPrice);
        const calculatedTokenAmountInWei = assetAmountBigInt * assetPriceInWei;
        setTokenAmountToStake(calculatedTokenAmountInWei.toString());
        setValidationError('');
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationError(err.errors[0].message);
        } else {
          console.error('Error calculating token amount to stake:', err);
        }
        setTokenAmountToStake('0');
      }
    } else {
      setTokenAmountToStake('0');
      if (!assetAmount) setValidationError('');
    }
  }, [assetAmount, selectedPoolDetails]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setAssetAmount(value);
      try {
        assetSchema.parse({ amount: value });
        setValidationError('');
      } catch (err) {
        if (err instanceof z.ZodError) {
          setValidationError(err.errors[0].message);
        }
      }
    } else if (value !== '') {
      setValidationError(
        'Please enter a valid whole number for asset quantity.',
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWalletConnected || !walletAddress) {
      toast.error('Please connect your wallet.');
      return;
    }
    if (!selectedPoolDetails || !selectedPoolDetails.token) {
      toast.error('Pool details or token information is missing.');
      return;
    }
    if (validationError) {
      toast.error(`Input error: ${validationError}`);
      return;
    }

    const amountToStakeWei = BigInt(tokenAmountToStake);
    if (amountToStakeWei <= BigInt(0)) {
      toast.error('Amount to stake must be greater than zero.');
      return;
    }

    const balanceWei = BigInt(userStakingTokenBalance);
    if (amountToStakeWei > balanceWei) {
      toast.error('Insufficient token balance to stake this amount.');
      return;
    }

    toast.info(
      'Attempting to stake tokens... Please approve the transaction in your wallet. (Note: ERC20 token approval might be required separately if not already granted).',
    );

    try {
      const txReceipt = await stakeTokens(
        operationId,
        amountToStakeWei,
        selectedPoolDetails.token,
      );

      if (txReceipt) {
        toast.success('Successfully staked tokens!');
        router.push(`/customer/pools/${operationId}`);
      } else if (!loadingStakeAction) {
        const errorMessage =
          providerError?.message || 'Staking failed. Please try again.';
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error during handleSubmit for staking:', error);
      const message =
        error.code === 'ACTION_REJECTED'
          ? 'Transaction rejected by user'
          : error.message || 'Failed to add liquidity';
      toast.error(message);
    }
  };

  const handleSetMax = () => {
    if (
      !selectedPoolDetails?.assetPrice ||
      selectedPoolDetails.assetPrice === BigInt(0) ||
      !selectedPoolDetails.token
    ) {
      toast.warn(
        'Asset price or token information is not available to calculate max amount.',
      );
      return;
    }
    const balanceInWei = BigInt(userStakingTokenBalance);
    const assetPriceInWei = BigInt(selectedPoolDetails.assetPrice);

    if (assetPriceInWei === BigInt(0)) {
      toast.info(
        'Asset price is zero, cannot calculate max RWA quantity based on token balance.',
      );
      setAssetAmount('0');
      return;
    }

    const maxAssetsBigInt = balanceInWei / assetPriceInWei;
    setAssetAmount(maxAssetsBigInt.toString());
  };

  const isAmountAffordable = () => {
    if (!userStakingTokenBalance || !tokenAmountToStake) return true;
    try {
      return BigInt(tokenAmountToStake) <= BigInt(userStakingTokenBalance);
    } catch {
      return false;
    }
  };

  const poolStaticData = {
    name: selectedPoolDetails?.name || 'Loading pool...',
    assetRwaName: selectedPoolDetails?.rwaName || 'Asset',
    assetPriceDisplay:
      selectedPoolDetails?.assetPrice &&
      selectedPoolDetails?.token &&
      stakingDecimals
        ? `1 ${selectedPoolDetails.rwaName || 'RWA Unit'} = ${formatUnits(selectedPoolDetails.assetPrice, stakingDecimals)} ${selectedPoolDetails.tokenSymbol || 'Tokens'}`
        : 'N/A',
    supplyAPY: selectedPoolDetails?.reward
      ? `${(Number(selectedPoolDetails.reward) / 100).toFixed(2)}%`
      : 'N/A',
  };

  if (loadingSelectedPool && !selectedPoolDetails) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 flex justify-center items-center">
        Loading pool data...
      </div>
    );
  }

  const maxRwaQuantityDisplay = () => {
    if (
      !selectedPoolDetails?.assetPrice ||
      selectedPoolDetails.assetPrice === BigInt(0) ||
      !selectedPoolDetails.token ||
      !userStakingTokenBalance
    )
      return '0';
    const balanceInWei = BigInt(userStakingTokenBalance);
    const assetPriceInWei = BigInt(selectedPoolDetails.assetPrice);
    if (assetPriceInWei === BigInt(0)) return '0';
    return (balanceInWei / assetPriceInWei).toString();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/customer/pools/${operationId}`}>
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">
              Supply to {poolStaticData.name}
            </h1>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/customer/pools/${operationId}`}>
              <X className="h-6 w-6" />
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="assetAmountInput"
                    className="text-lg font-medium text-white"
                  >
                    Quantity of {poolStaticData.assetRwaName}
                  </label>
                  <p className="text-sm text-gray-400">
                    Enter the quantity of {poolStaticData.assetRwaName} you want
                    to provide liquidity for.
                  </p>
                  {isWalletConnected && selectedPoolDetails && (
                    <span className="text-sm text-gray-400 pt-4">
                      Max you can supply: {maxRwaQuantityDisplay()}{' '}
                      {poolStaticData.assetRwaName}(s) (Balance:{' '}
                      {formatUnits(userStakingTokenBalance, stakingDecimals)}{' '}
                      {selectedPoolDetails.tokenSymbol || 'Tokens'})
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  id="assetAmountInput"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={assetAmount}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 rounded-xl p-4 pr-20 text-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0"
                  disabled={loadingStakeAction || !selectedPoolDetails}
                />
                {isWalletConnected && selectedPoolDetails && (
                  <button
                    type="button"
                    onClick={handleSetMax}
                    disabled={loadingStakeAction}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-semibold hover:text-amber-400 disabled:text-gray-500"
                  >
                    MAX
                  </button>
                )}
              </div>
              {validationError && (
                <div className="mt-2 text-red-500 text-sm">
                  {validationError}
                </div>
              )}
              {!isAmountAffordable() &&
                assetAmount &&
                BigInt(tokenAmountToStake) > 0 && (
                  <div className="mt-2 text-red-500 text-sm">
                    Insufficient token balance to cover the required staking
                    amount.
                  </div>
                )}
            </div>

            <div className="space-y-3 bg-gray-900/50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Asset</span>
                <span className="text-sm font-medium">
                  {poolStaticData.assetRwaName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Price</span>
                <span className="text-sm font-medium">
                  {poolStaticData.assetPriceDisplay}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Supply APY</span>
                <span className="text-sm font-medium text-green-400">
                  {poolStaticData.supplyAPY}
                </span>
              </div>
              <div className="border-t border-gray-700 my-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">
                  You will stake
                </span>
                <span className="text-lg font-semibold text-amber-500">
                  {tokenAmountToStake !== '0'
                    ? formatUnits(tokenAmountToStake, stakingDecimals)
                    : '0.00'}{' '}
                  {selectedPoolDetails?.tokenSymbol || 'Tokens'}
                </span>
              </div>
            </div>

            {providerError && (
              <p className="text-red-500 text-sm text-center">
                Error: {providerError.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600"
              disabled={
                loadingStakeAction ||
                !isWalletConnected ||
                !selectedPoolDetails ||
                !!validationError ||
                !isAmountAffordable() ||
                BigInt(tokenAmountToStake) <= BigInt(0)
              }
            >
              {loadingStakeAction ? 'Processing Stake...' : 'Add Liquidity'}
            </Button>
            {!isWalletConnected && (
              <p className="text-center text-sm text-gray-400">
                Please connect your wallet to add liquidity.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
