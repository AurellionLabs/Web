'use client';
import Link from 'next/link';
import { colors } from '@/lib/constants/colors';
import { Pool } from '@/domain/pool';
import { useState, useEffect } from 'react';
import { usePoolsProvider } from '@/app/providers/pools.provider';

interface PoolRowProps {
  pool: Pool;
  index: number;
}

const formatDaysLeft = (startDate: number, durationDays: number) => {
  const now = Math.floor(Date.now() / 1000);
  const endDate = startDate + durationDays * 24 * 60 * 60;
  const daysLeft = Math.max(0, Math.floor((endDate - now) / 86400));
  return daysLeft.toString();
};

import { formatWeiToCurrency } from '@/lib/utils';

export function PoolRow({ pool, index }: PoolRowProps) {
  const { selectPool } = usePoolsProvider();
  const [formattedValues, setFormattedValues] = useState({
    tvl: '0',
    reward: '0',
    daysLeft: '0',
  });

  const handleClick = () => {
    selectPool(pool);
  };

  useEffect(() => {
    setFormattedValues({
      tvl: formatWeiToCurrency(pool.totalValueLocked),
      reward: pool.rewardRate.toFixed(2),
      daysLeft: formatDaysLeft(pool.startDate, pool.durationDays),
    });
  }, [pool]);

  return (
    <tr
      className={`border-b border-[${colors.neutral[800]}] hover:bg-[${colors.neutral[800]}]/50 transition-colors`}
    >
      <td className={`py-4 px-4 text-[${colors.text.secondary}]`}>{index}</td>
      <td className="py-4 px-4">
        <Link
          href={`/customer/pools/${pool.id}`}
          className={`flex items-center gap-2 hover:text-[${colors.primary[500]}]`}
          onClick={handleClick}
        >
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-amber-600 border-2 border-gray-900" />
            <div className="w-6 h-6 rounded-full bg-red-700 border-2 border-gray-900" />
          </div>
          <span>{pool.name}</span>
          <span className="text-green-500 text-sm">
            {formattedValues.reward}%
          </span>
        </Link>
      </td>
      <td className="py-4 px-4 text-right">{formattedValues.tvl}</td>
      <td className="py-4 px-4 text-right text-green-500">
        {formattedValues.reward}%
      </td>
      <td className="py-4 px-4 text-right">{formattedValues.tvl}</td>
    </tr>
  );
}
