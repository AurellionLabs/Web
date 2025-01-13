'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Share2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { TransactionTable } from "@/components/ui/transaction-table"
import { PoolBalance } from "@/components/ui/pool-balance"
import { Progress } from "@/components/ui/progress"
import { colors } from '@/lib/constants/colors'
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('./chart'), { ssr: false })

export default function PoolDetails({ params }: { params: { id: string } }) {
  const [timeRange, setTimeRange] = useState('1D')
  const [operationProgress, setOperationProgress] = useState(0)
  const [isOperationComplete, setIsOperationComplete] = useState(false)
  
  const poolData = {
    token0: 'WBTC',
    token1: 'USDC',
    price: '53.17M',
    priceChange: '-0.3',
    tvl: '$138.6M',
    tvlChange: '+0.26%',
    volume24h: '$29.1M',
    volumeChange: '-74.02%',
    fees24h: '$87.3K',
    token0Balance: '1.3K WBTC',
    token1Balance: '16.1M USDC',
    lockupPeriod: 7 * 24 * 60 * 60 * 1000,
    transactions: [
      {
        time: '2m ago',
        type: 'Remove',
        usdValue: '$6,832.74',
        token0Amount: '0.04274',
        token1Amount: '2,800.14',
      },
      {
        time: '33m ago',
        type: 'Buy WBTC',
        usdValue: '$456.33',
        token0Amount: '0.00484',
        token1Amount: '456.663',
      },
    ]
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setOperationProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(interval)
          setIsOperationComplete(true)
          return 100
        }
        return prevProgress + 1
      })
    }, poolData.lockupPeriod / 100)

    return () => clearInterval(interval)
  }, [poolData.lockupPeriod])

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const days = Math.floor(seconds / (3600 * 24))
    const hours = Math.floor((seconds % (3600 * 24)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  return (
    <div className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap">
          <Link href="/explore" className="text-gray-400 hover:text-white">
            Explore
          </Link>
          <span className="text-gray-600">/</span>
          <Link href="/pools" className="text-gray-400 hover:text-white">
            Pools
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{poolData.token0}/{poolData.token1}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
              <Link href="/pools">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-gray-900" />
                <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-gray-900" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {poolData.token0}/{poolData.token1}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">v3</span>
                  <span className="text-gray-400">0.3%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="icon" className="sm:hidden">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button className={`bg-[${colors.primary[500]}] hover:bg-[${colors.primary[600]}] flex-grow sm:flex-grow-0`}>
              Swap
            </Button>
            <Button 
              variant="outline" 
              className={`border-[${colors.neutral[800]}] hover:bg-[${colors.neutral[800]}] flex-grow sm:flex-grow-0`}
              asChild
            >
              <Link href={`/pools/${params.id}/add-liquidity`}>
                Add liquidity
              </Link>
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Price and chart */}
            <div className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}>
              <div className="mb-6">
                <div className="text-2xl sm:text-3xl font-bold mb-1">${poolData.price}</div>
                <div className="text-red-500">{poolData.priceChange}%</div>
              </div>
              <div className="h-[200px] sm:h-[300px]">
                <Chart />
              </div>
              <div className="flex items-center gap-2 mt-4 overflow-x-auto">
                {['1H', '1D', '1W', '1M', '1Y'].map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="text-sm"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Operation Time */}
            <div className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}>
              <h2 className="text-lg font-semibold mb-4">Operation Time</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{operationProgress.toFixed(2)}%</span>
                </div>
                <Progress value={operationProgress} className="w-full" />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Time remaining</span>
                  <span>{formatTime((100 - operationProgress) * poolData.lockupPeriod / 100)}</span>
                </div>
              </div>
              <Button 
                className="w-full mt-4" 
                disabled={!isOperationComplete}
              >
                {isOperationComplete ? 'Withdraw' : 'Withdraw (Locked)'}
              </Button>
            </div>

            {/* Transactions */}
            <TransactionTable transactions={poolData.transactions} />
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <div className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}>
              <h2 className="text-lg font-semibold mb-4">Stats</h2>
              <div className="space-y-6">
                <PoolBalance 
                  token0Balance={poolData.token0Balance}
                  token1Balance={poolData.token1Balance}
                />
                <div className="space-y-4">
                  <StatCard
                    title="TVL"
                    value={poolData.tvl}
                    change={poolData.tvlChange}
                  />
                  <StatCard
                    title="24h volume"
                    value={poolData.volume24h}
                    change={poolData.volumeChange}
                  />
                  <StatCard
                    title="24h fees"
                    value={poolData.fees24h}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

