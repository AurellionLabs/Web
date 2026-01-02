'use client';

import { Pool } from '@/domain/pool';
import { formatTokenAmount } from '@/lib/formatters';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PoolRowProps {
  pool: Pool;
  index: number;
}

export function PoolRow({ pool, index }: PoolRowProps) {
  // Mock data for demonstration
  const tvl = parseFloat(pool.totalValueLocked);
  const mockVolume24h = tvl * 0.05;
  const mockVolumeChange = Math.random() * 20 - 10;
  const isVolumePositive = mockVolumeChange > 0;

  return (
    <tr className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors cursor-pointer group">
      <td className="py-4 px-4 text-neutral-500 font-mono text-sm">{index}</td>
      <td className="py-4 px-4">
        <Link
          href={`/customer/pools/${pool.id}`}
          className="flex items-center gap-3"
        >
          {/* Pool icon with gold accent */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg group-hover:border-amber-500/50 group-hover:shadow-glow-sm transition-all duration-300">
            {pool.assetName.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-white group-hover:text-amber-400 transition-colors">
              {pool.name}
            </div>
            <div className="text-sm text-neutral-500">{pool.assetName}</div>
          </div>
        </Link>
      </td>
      <td className="py-4 px-4 text-right font-mono text-neutral-300">
        ${formatTokenAmount(tvl, 0, 2)}
      </td>
      <td className="py-4 px-4 text-right font-mono">
        <span
          className="text-amber-400"
          style={{
            textShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
          }}
        >
          {pool.rewardRate}%
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="flex flex-col items-end font-mono">
          <span className="text-neutral-300">
            ${formatTokenAmount(mockVolume24h, 0, 2)}
          </span>
          <span
            className={cn(
              'text-xs',
              isVolumePositive ? 'text-green-400' : 'text-red-400',
            )}
          >
            {isVolumePositive ? '+' : ''}
            {mockVolumeChange.toFixed(2)}%
          </span>
        </div>
      </td>
    </tr>
  );
}
