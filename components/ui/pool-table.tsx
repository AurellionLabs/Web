import { PoolRow } from './pool-row'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

interface Pool {
  id: number
  token0: string
  token1: string
  tvl: string
  apr: string
  volume: string
  priceChange: string
}

interface PoolTableProps {
  pools: Pool[]
}

export function PoolTable({ pools }: PoolTableProps) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-gray-400 border-b border-gray-800">
              <th className="py-3 px-4 text-left">#</th>
              <th className="py-3 px-4 text-left">Pool</th>
              <th className="py-3 px-4 text-right">TVL</th>
              <th className="py-3 px-4 text-right">APR</th>
              <th className="py-3 px-4 text-right">Volume 24H</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool, index) => (
              <PoolRow key={pool.id} index={index + 1} {...pool} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-800">
        <Link 
          href="/pools/explore"
          className="text-amber-500 hover:text-amber-400 flex items-center gap-1 text-sm"
        >
          Explore more pools
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

