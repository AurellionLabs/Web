'use client';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';
import { getDecimal } from '@/dapp-connectors/staking-controller';
import { StakedEvent } from '@/typechain-types/contracts/AuStake';
import { useEffect, useState } from 'react';

interface Transaction {
  time: string;
  type: string;
  usdValue: string;
  token0Amount: string;
  token1Amount: string;
}
const formatDaysLeft = (deadline: number) => {
  const now = new Date(deadline * 1000);
  return now.toISOString().split('T')[0];
};
interface TransactionTableProps {
  transactions: StakedEvent.OutputObject[] | undefined;
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [decimals, setDecimals] = useState(0);
  useEffect(() => {
    console.log('Transactions object', transactions);
  }, []);
  useEffect(() => {
    const _getDecimal = async () => {
      setDecimals(Number(await getDecimal()));
    };
    _getDecimal();
  }, []);
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
              <th className="py-3 px-4 text-right">USD Value</th>
              <th className="py-3 px-4 text-right">Token Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions ? (
              transactions.map((tx, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-4 px-4 text-gray-400">
                    {formatDaysLeft(Number(tx.time))}
                  </td>
                  <td
                    className={`py-4 px-4 ${
                      tx.eType === 'Unstaked'
                        ? 'text-red-500'
                        : tx.eType === 'Staked'
                          ? 'text-green-500'
                          : 'text-gray-400'
                    }`}
                  >
                    {tx.eType}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {formatEthereumValue(tx.amount, 6)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {formatEthereumValue(tx.amount, 6)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4">No Transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
