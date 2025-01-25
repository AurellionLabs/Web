import Link from 'next/link';
import { Button } from './button';

interface PoolCardProps {
  id: string;
  token0: string;
  token1: string;
  tvl: string;
  apy: string;
  volume: string;
  priceChange: string;
}

export function PoolCard({
  id,
  token0,
  token1,
  tvl,
  apy,
  volume,
  priceChange,
}: PoolCardProps) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-1">
          <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-900" />
          <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-gray-900" />
        </div>
        <h3 className="text-lg font-semibold">
          {token0}/{token1}
        </h3>
        <span className="text-green-500 text-sm">{priceChange}%</span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-400">TVL</span>
          <span className="font-semibold">{tvl}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">APY</span>
          <span className="font-semibold text-green-500">{apy}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Volume 24H</span>
          <span className="font-semibold">{volume}</span>
        </div>
      </div>
      <Link href={`/pools/${id}`} className="block w-full">
        <Button className="w-full">View Details</Button>
      </Link>
    </div>
  );
}
