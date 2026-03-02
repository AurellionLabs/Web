'use client';

import { PoolRow } from './pool-row';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Pool } from '@/domain/pool';
import { EvaPanel } from '@/app/components/eva/eva-components';

interface PoolTableProps {
  pools: Pool[];
}

export function PoolTable({ pools }: PoolTableProps) {
  return (
    <EvaPanel label="Liquidity Pools" noPadding>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20">
              <th className="py-3 px-4 text-left font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gold/50">
                #
              </th>
              <th className="py-3 px-4 text-left font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gold/50">
                Pool
              </th>
              <th className="py-3 px-4 text-right font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gold/50">
                TVL
              </th>
              <th className="py-3 px-4 text-right font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gold/50">
                APR
              </th>
              <th className="py-3 px-4 text-right font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-gold/50">
                Collateral
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {pools.map((pool, index) => (
              <PoolRow key={pool.id} index={index + 1} pool={pool} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-border/20">
        <Link
          href="/customer/pools/explore"
          className="text-gold hover:text-gold/80 flex items-center gap-1 font-mono text-xs tracking-[0.12em] uppercase font-bold transition-colors"
        >
          Explore more pools
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </EvaPanel>
  );
}
