'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseUnits, formatUnits } from 'ethers';
import { ArrowLeft, HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import {
  getBalance,
  getDecimal,
  getOperation,
  OperationData,
  requestTokenAllowance,
  stake,
} from '@/dapp-connectors/staking-controller';
import { NEXT_PUBLIC_AURA_ADDRESS } from '@/chain-constants';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';

const assetSchema = z.object({
  amount: z.string().refine(
    (val) => {
      if (val === '') return true;
      return /^\d+$/.test(val) && Number(val) >= 0;
    },
    { message: 'Please enter a valid whole number' },
  ),
});

export default function AddLiquidity({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [assetAmount, setAssetAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [decimals, setDecimals] = useState(0);
  const [balance, setBalance] = useState<string>('0');
  const [operation, setOperation] = useState<OperationData>();
  // This would be fetched from your API/wallet
  const poolData = {
    name: operation?.name,
    assetPrice: operation?.assetPrice
      ? `1 ${operation.rwaName} = $${formatEthereumValue(operation.assetPrice, 18, 2)}`
      : '0',
    supplyAPY: operation?.reward
      ? `${(Number(operation.reward) / 100).toFixed(2)}%`
      : '0%',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValidationError('');

    try {
      assetSchema.parse({ amount: value });
      setAssetAmount(value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors[0].message);
      }
    }
  };

  // Calculate AURA amount when asset amount changes
  useEffect(() => {
    if (assetAmount && operation?.assetPrice) {
      try {
        const assetPriceInEther = formatUnits(operation.assetPrice, 18);
        const calculatedAura = (
          Number(assetAmount) * Number(assetPriceInEther)
        ).toFixed(18);
        setTokenAmount(calculatedAura);
      } catch (error) {
        console.error('Error calculating token amount:', error);
        setTokenAmount('');
      }
    } else {
      setTokenAmount('');
    }
  }, [assetAmount, operation?.assetPrice]);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const balanceValue = await getBalance();
        setBalance(balanceValue?.toString() || '0');
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0');
      }
    };
    fetchBalance();
  }, []);

  useEffect(() => {
    const _getOperation = async () => {
      setOperation(await getOperation(params.id));
    };
    _getOperation();
  }, []);

  useEffect(() => {
    const _getDecimal = async () => {
      setDecimals(Number(await getDecimal()));
    };
    _getDecimal();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert token amount  before sending to contract
      const amountBigNumberish = parseUnits(tokenAmount, decimals);
      await requestTokenAllowance(NEXT_PUBLIC_AURA_ADDRESS, amountBigNumberish);
      await stake(NEXT_PUBLIC_AURA_ADDRESS, params.id, amountBigNumberish);
      console.log('Successfully added liquidity');
      router.push(`/pools/${params.id}`);
    } catch (error: any) {
      setError(error.message || 'An error occurred when adding liquidity');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMax = () => {
    if (balance && operation?.assetPrice) {
      // Convert both balance and asset price from wei for calculation
      const balanceInEther = formatUnits(balance, 18);
      const assetPriceInEther = formatUnits(operation.assetPrice, 18);
      const maxAssets = Math.floor(
        Number(balanceInEther) / Number(assetPriceInEther),
      );
      console.log(maxAssets);
      setAssetAmount(maxAssets.toString());
    }
  };

  const isAmountValid = () => {
    try {
      if (!balance || !tokenAmount) return false;
      const balanceInEther = formatUnits(balance, decimals);
      return Number(tokenAmount) <= Number(balanceInEther);
    } catch (error) {
      console.error('Error checking amount validity:', error);
      return false;
    }
  };

  const getMaxQuantity = () => {
    console.log('in handle set max');
    try {
      if (!balance || !operation?.assetPrice) return '0';
      console.log('settng max');
      const balanceInEther = formatUnits(balance, decimals);
      const assetPriceInEther = formatUnits(operation.assetPrice, 18);
      console.log(
        `balanceInEther$ ${balanceInEther} assetPriceInEther${assetPriceInEther}`,
      );
      return Math.floor(
        Number(balanceInEther) / Number(assetPriceInEther),
      ).toString();
    } catch (error) {
      console.error('Error calculating max quantity:', error);
      return '0';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/pools/${params.id}`}>
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Supply {operation?.name}</h1>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/pools/${params.id}`}>
              <X className="h-6 w-6" />
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-lg font-medium text-white">
                    Quantity
                  </label>
                  <p className="text-sm text-gray-400">
                    Enter asset quantity you want to add to the pool
                  </p>
                  <span className="text-sm text-gray-400 pt-4">
                    Max quantity: {getMaxQuantity()} item(s)
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={assetAmount}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 rounded-xl p-4 pr-20 text-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-semibold hover:text-amber-400"
                >
                  MAX
                </button>
              </div>
              {validationError && (
                <div className="mt-2 text-red-500 text-sm">
                  {validationError}
                </div>
              )}
              {!isAmountValid() && tokenAmount && (
                <div className="mt-2 text-red-500 text-sm">
                  Insufficient token balance
                </div>
              )}
            </div>

            <div className="space-y-3 bg-gray-900/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Transaction Details
              </h3>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  Price per {operation?.rwaName}
                </div>
                <div className="text-sm">
                  {operation?.assetPrice
                    ? `1 ${operation.rwaName} = $${formatEthereumValue(operation.assetPrice, 18, 2)}`
                    : '0'}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  Total Cost
                </div>
                <div className="text-sm">
                  {tokenAmount ? `$${Number(tokenAmount).toFixed(2)}` : '$0'}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  APY
                </div>
                <div className="text-sm text-green-500">
                  {operation?.reward
                    ? `${(Number(operation.reward) / 100).toFixed(2)}%`
                    : '0%'}
                </div>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 text-lg font-medium"
              disabled={!tokenAmount || !isAmountValid() || loading}
            >
              {loading ? 'Processing...' : 'Add Liquidity'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
