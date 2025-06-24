'use client';

import { StakeEvent } from '@/domain/pool';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { useEffect } from 'react';

const formatDateTime = (timestamp: number) => {
  if (!timestamp || isNaN(timestamp)) {
    return 'Invalid Date';
  }

  try {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const formatAmount = (amount: string) => {
  if (!amount || amount === '0') return '0';

  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';

    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toFixed(2);
    }
  } catch (error) {
    console.error('Error formatting amount:', error);
    return '0';
  }
};

const formatAddress = (address: string | undefined) => {
  if (!address || typeof address !== 'string' || address.length < 10) {
    return 'Unknown';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatTransactionHash = (hash: string | undefined) => {
  if (!hash || typeof hash !== 'string' || hash.length < 8) {
    return null;
  }
  return hash.slice(0, 8);
};

interface TransactionTableProps {
  poolId?: string;
  transactions?: StakeEvent[];
}

export function TransactionTable({
  poolId,
  transactions,
}: TransactionTableProps) {
  const { stakeHistory, loadStakeHistory } = usePoolsProvider();

  // Use provided transactions or load from provider
  const displayTransactions = transactions || stakeHistory;

  useEffect(() => {
    if (poolId && !transactions) {
      loadStakeHistory(poolId);
    }
  }, [poolId, transactions, loadStakeHistory]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Transactions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-gray-400">
              <th className="py-3 px-4 text-left">Time</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Staker</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-right">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {displayTransactions && displayTransactions.length > 0 ? (
              displayTransactions.map((tx, index) => (
                <tr
                  key={`${tx.poolId}-${tx.timestamp}-${index}`}
                  className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-4 px-4 text-gray-400">
                    {formatDateTime(tx.timestamp)}
                  </td>
                  <td className="py-4 px-4 text-green-500">Staked</td>
                  <td className="py-4 px-4 text-gray-300 font-mono text-sm">
                    {formatAddress(tx.stakerAddress)}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold">
                    ${formatAmount(tx.amount)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {formatTransactionHash(tx.transactionHash) ? (
                      <a
                        href={`https://etherscan.io/tx/${tx.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                      >
                        {formatTransactionHash(tx.transactionHash)}...
                      </a>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
