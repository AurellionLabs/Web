'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AddLiquidityForm({ poolId }: { poolId: string }) {
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add liquidity logic here
    console.log(`Adding liquidity to pool ${poolId}: ${amount0} Token0, ${amount1} Token1`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount0">Amount Token0</Label>
        <Input
          type="number"
          id="amount0"
          value={amount0}
          onChange={(e) => setAmount0(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div>
        <Label htmlFor="amount1">Amount Token1</Label>
        <Input
          type="number"
          id="amount1"
          value={amount1}
          onChange={(e) => setAmount1(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Add Liquidity
      </Button>
    </form>
  )
}

