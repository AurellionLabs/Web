import Link from 'next/link'
import { colors } from '@/lib/constants/colors'

interface PoolRowProps {
  id: number
  index: number
  token0: string
  token1: string
  tvl: string
  apr: string
  volume: string
  priceChange: string
}

export function PoolRow({ id, index, token0, token1, tvl, apr, volume, priceChange }: PoolRowProps) {
  return (
    <tr className={`border-b border-[${colors.neutral[800]}] hover:bg-[${colors.neutral[800]}]/50 transition-colors`}>
      <td className={`py-4 px-4 text-[${colors.text.secondary}]`}>{index}</td>
      <td className="py-4 px-4">
        <Link 
          href={`/pools/${id}`}
          className={`flex items-center gap-2 hover:text-[${colors.primary[500]}]`}
        >
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-900" />
            <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-gray-900" />
          </div>
          <span>{token0}/{token1}</span>
          <span className="text-green-500 text-sm">
            {priceChange}%
          </span>
        </Link>
      </td>
      <td className="py-4 px-4 text-right">{tvl}</td>
      <td className="py-4 px-4 text-right text-green-500">
        {apr}%
      </td>
      <td className="py-4 px-4 text-right">{volume}</td>
    </tr>
  )
}

