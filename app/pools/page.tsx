'use client';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { PoolTable } from '@/components/ui/pool-table';
import { Button } from '@/components/ui/button';
import { colors } from '@/lib/constants/colors';
import {
  getOperation,
  getOperationList,
  OperationData,
  walletAddress,
} from '@/dapp-connectors/staking-controller';
import { useEffect, useState } from 'react';
import { useChainProvider } from '@/app/providers/main.provider';

export default function PoolsPage() {
  const [operations, setOperations] = useState<OperationData[]>();
  const { setConnected, connected } = useChainProvider();
  useEffect(() => {
    if (connected) {
      console.log('fetching operations...');
      const fetchOperations = async () => {
        const ids = await getOperationList(); // Fetch list of IDs
        console.log(ids);
        if (ids) {
          const operationsData = await Promise.all(
            ids.map((id) => getOperation(id)),
          );
          setOperations(operationsData); // Update with completed data
          console.log("these are your operations",operations)
        }
      };
      if (walletAddress) {
        fetchOperations();
      }
    } else {
      console.log('Wallet not connected');
    }
  }, [connected]);
  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Your positions</h1>
          <Button
            asChild
            className={`bg-[${colors.primary[500]}] hover:bg-[${colors.primary[600]}]`}
          >
            <Link href="/create-pool">
              <Plus className="w-4 h-4 mr-2" />
              Create Pool
            </Link>
          </Button>
        </div>
        <div
          className={`bg-[${colors.background.secondary}] rounded-2xl p-4 sm:p-6 border border-[${colors.neutral[800]}] mb-8`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 bg-[${colors.primary[500]}]/20 rounded-full flex items-center justify-center`}
            >
              <div
                className={`w-4 h-4 bg-[${colors.primary[500]}] rounded-full`}
              />
            </div>
            <div>
              <h3 className="font-medium">Welcome to your positions</h3>
              <p className="text-sm text-gray-400">
                Connect your wallet to view your current positions.
              </p>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Top pools by TVL</h2>
        </div>
        {operations && (
          <>
            {console.log('PoolTable triggered with operations:', operations)}
            <PoolTable operations={operations} />
          </>
        )}{' '}
        <div className="mt-8">
          <div
            className={`bg-[${colors.background.secondary}] rounded-2xl p-4 sm:p-6 border border-[${colors.neutral[800]}]`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 bg-[${colors.primary[500]}]/20 rounded-xl flex items-center justify-center`}
              >
                <div
                  className={`w-6 h-6 bg-[${colors.primary[500]}] rounded-lg`}
                />
              </div>
              <div>
                <h3 className="font-medium mb-1">
                  Learn about liquidity provision
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Providing liquidity on different protocols.
                </p>
                <Link
                  href="/learn"
                  className={`text-[${colors.primary[500]}] hover:text-[${colors.primary[400]}] flex items-center gap-1 text-sm`}
                >
                  Learn more
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
