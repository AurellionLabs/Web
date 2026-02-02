'use client';

import { PoolRow } from './pool-row';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Pool } from '@/domain/pool';
import { GlassCard } from './glass-card';

interface PoolTableProps {
  pools: Pool[];
}

export function PoolTable({ pools }: PoolTableProps) {
  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-neutral-500 border-b border-neutral-800/50">
              <th className="py-3 px-4 text-left font-medium">#</th>
              <th className="py-3 px-4 text-left font-medium">Pool</th>
              <th className="py-3 px-4 text-right font-medium">TVL</th>
              <th className="py-3 px-4 text-right font-medium">APR</th>
              <th className="py-3 px-4 text-right font-medium">Collateral</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool, index) => (
              <PoolRow key={pool.id} index={index + 1} pool={pool} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-neutral-800/50">
        <Link
          href="/customer/pools/explore"
          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm transition-colors"
        >
          Explore more pools
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </GlassCard>
  );
}
