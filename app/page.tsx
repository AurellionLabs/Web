'use client';

import { useState } from 'react';
import { ArrowDownIcon, Settings2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SwapScreen() {
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  const handleSwap = () => {
    console.log('Swap initiated');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Swap</CardTitle>
          <Button variant="ghost" size="icon">
            <Settings2Icon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label
                htmlFor="fromAmount"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                From
              </label>
              <span className="text-sm text-gray-500">Balance: 0.0</span>
            </div>
            <div className="flex space-x-2">
              <Input
                id="fromAmount"
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-grow"
              />
              <Select value={fromToken} onValueChange={setFromToken}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eth">ETH</SelectItem>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="dai">DAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFromToken(toToken);
                setToToken(fromToken);
                setFromAmount(toAmount);
                setToAmount(fromAmount);
              }}
            >
              <ArrowDownIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label
                htmlFor="toAmount"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                To
              </label>
              <span className="text-sm text-gray-500">Balance: 0.0</span>
            </div>
            <div className="flex space-x-2">
              <Input
                id="toAmount"
                type="number"
                placeholder="0.0"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                className="flex-grow"
              />
              <Select value={toToken} onValueChange={setToToken}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eth">ETH</SelectItem>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="dai">DAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSwap}>
            Swap
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
