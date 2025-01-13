'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, HelpCircle, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function AddLiquidity({ params }: { params: { id: string } }) {
  const [amount, setAmount] = useState('')

  // This would be fetched from your API/wallet
  const poolData = {
    name: 'AURA/USDC Pool',
    exchangeRate: '1 AURA = 2.5 USDC',
    auraBalance: '101.85',
    healthFactor: '1.91',
    supplyAPY: '6.74',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add liquidity logic here
    console.log('Adding liquidity:', amount)
  }

  const isAmountValid = Number(amount) <= Number(poolData.auraBalance)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/pools/${params.id}`}>
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Supply {poolData.name}</h1>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/pools/${params.id}`}>
              <X className="h-6 w-6" />
            </Link>
          </Button>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  Amount
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Amount of AURA to supply to the pool</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <div className="text-sm text-gray-400">
                  Wallet balance: {poolData.auraBalance} AURA
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-800 rounded-xl p-4 pr-20 text-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => setAmount(poolData.auraBalance)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-semibold hover:text-amber-400"
                >
                  MAX
                </button>
              </div>
              {!isAmountValid && amount && (
                <div className="mt-2 text-red-500 text-sm">
                  Amount exceeds available balance
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transaction overview</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    Exchange Rate
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Current exchange rate between AURA and USDC</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div>{poolData.exchangeRate}</div>
                </div>

                <div className="flex justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    Supply APY
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Annual Percentage Yield for supplying liquidity</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-green-500">{poolData.supplyAPY}%</div>
                </div>

                <div className="flex justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    Health factor
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Liquidation occurs at {'<'}1.0</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-yellow-500">{poolData.healthFactor}</div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 text-lg"
              disabled={!amount || !isAmountValid}
            >
              Supply
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

