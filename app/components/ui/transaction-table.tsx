'use client';

import { StakeEvent } from '@/domain/pool';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { useEffect } from 'react';
import { formatTokenAmount, formatAddress } from '@/lib/formatters';

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
            <tr className="text-sm text-white/80">
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
                  <td className="py-4 px-4 text-white/80">
                    {formatDateTime(tx.timestamp)}
                  </td>
                  <td className="py-4 px-4 text-green-500">Staked</td>
                  <td className="py-4 px-4 text-white font-mono text-sm">
                    {formatAddress(tx.stakerAddress)}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold">
                    ${formatTokenAmount(tx.amount, 18, 2)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {formatTransactionHash(tx.transactionHash) ? (
                      <a
                        href={`https://sepolia.basescan.org/tx/${tx.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                      >
                        {formatTransactionHash(tx.transactionHash)}...
                      </a>
                    ) : (
                      <span className="text-white/70">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-white/70">
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
