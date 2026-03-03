'use client';

import { Pool } from '@/domain/pool';
import { formatTokenAmount } from '@/lib/formatters';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Shield, Coins } from 'lucide-react';

interface PoolRowProps {
  pool: Pool;
  index: number;
}

export function PoolRow({ pool, index }: PoolRowProps) {
  // Format TVL from wei (18 decimals) to display value
  const tvlFormatted = formatTokenAmount(pool.totalValueLocked || '0', 18, 2);
  const tvlValue = parseFloat(tvlFormatted);

  // Format collateral amount
  const collateralFormatted = pool.collateralAmount
    ? formatTokenAmount(pool.collateralAmount, 18, 2)
    : '0';
  const hasCollateral =
    pool.collateralAmount && parseFloat(pool.collateralAmount) > 0;

  // Check if pool is insured
  const isInsured = pool.insurance?.isInsured === true;

  // Calculate mock volume as 5% of TVL for demonstration
  const mockVolume24h = tvlValue * 0.05;
  const mockVolumeChange = Math.random() * 20 - 10;
  const isVolumePositive = mockVolumeChange > 0;

  return (
    <tr className="border-b border-neutral-800/50 hover:bg-neutral-900/50 transition-colors cursor-pointer group">
      <td className="py-4 px-4 text-white/70 font-mono text-sm">{index}</td>
      <td className="py-4 px-4">
        <Link
          href={`/customer/pools/${pool.id}`}
          className="flex items-center gap-3"
        >
          {/* Pool icon with gold accent */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg group-hover:border-amber-500/50 group-hover:shadow-glow-sm transition-all duration-300">
              {pool.assetName.charAt(0)}
            </div>
            {/* Insurance badge */}
            {isInsured && (
              <div
                className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                title="Insured Pool"
              >
                <Shield className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
              {pool.name}
              {isInsured && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  Insured
                </span>
              )}
            </div>
            <div className="text-sm text-white/70">{pool.assetName}</div>
          </div>
        </Link>
      </td>
      <td className="py-4 px-4 text-right font-mono text-white">
        ${tvlFormatted}
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
        <div className="flex flex-col items-end">
          {/* Collateral display */}
          <div className="flex items-center gap-1 text-sm">
            <Coins
              className={cn(
                'w-3 h-3',
                hasCollateral ? 'text-amber-400' : 'text-white/60',
              )}
            />
            <span
              className={cn(
                'font-mono',
                hasCollateral ? 'text-white' : 'text-white/60',
              )}
            >
              {hasCollateral ? `$${collateralFormatted}` : 'None'}
            </span>
          </div>
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
