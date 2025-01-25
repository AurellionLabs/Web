'use client';
import Link from 'next/link';
import { colors } from '@/lib/constants/colors';
import { OperationData } from '@/dapp-connectors/staking-controller';
import { useState, useEffect } from 'react';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';
import { usePoolsProvider } from '@/app/providers/pools.provider';

interface PoolRowProps {
  operation: OperationData;
  index: number;
}

export function PoolRow({ operation, index }: PoolRowProps) {
  const { setSelectedPool } = usePoolsProvider();
  const [formattedValues, setFormattedValues] = useState({
    tokenTvl: '0',
    reward: '0',
    lengthInDays: '0',
  });

  const handleClick = () => {
    setSelectedPool(operation);
  };
  useEffect(() => {
    setFormattedValues({
      tokenTvl: formatEthereumValue(operation.tokenTvl),
      reward: formatEthereumValue(operation.reward),
      lengthInDays: operation.lengthInDays?.toString() || '0',
    });
  }, [operation]);

  return (
    <tr
      className={`border-b border-[${colors.neutral[800]}] hover:bg-[${colors.neutral[800]}]/50 transition-colors`}
    >
      <td className={`py-4 px-4 text-[${colors.text.secondary}]`}>{index}</td>
      <td className="py-4 px-4">
        <Link
          href={`/pools/${operation.id}`}
          className={`flex items-center gap-2 hover:text-[${colors.primary[500]}]`}
          onClick={handleClick}
        >
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-900" />
            <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-gray-900" />
          </div>
          <span>{operation.name}</span>
          <span className="text-green-500 text-sm">
            {formattedValues.reward}%
          </span>
        </Link>
      </td>
      <td className="py-4 px-4 text-right">{formattedValues.tokenTvl}</td>
      <td className="py-4 px-4 text-right text-green-500">
        {formattedValues.reward}%
      </td>
      <td className="py-4 px-4 text-right">{formattedValues.tokenTvl}</td>
    </tr>
  );
}
