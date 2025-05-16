'use client';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { PoolTable } from '@/app/components/ui/pool-table';
import { Button } from '@/app/components/ui/button';
import { colors } from '@/lib/constants/colors';
// import {
//   getOperation,
//   getOperationList,
//   OperationData,
// } from '@/dapp-connectors/staking-controller';
// import { getCurrentWalletAddress as walletAddress } from '@/dapp-connectors/base-controller';
import { useEffect } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePools } from '@/app/providers/pools.provider';

export default function PoolsPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  // const [operations, setOperations] = useState<OperationData[]>(); // Replaced by context
  const {
    allPools,
    fetchAllPools,
    loadingPools,
    error: poolsError,
  } = usePools(); // Use the new hook

  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  useEffect(() => {
    if (connected) {
      fetchAllPools();
    }
    // else {
    // operations will be empty or previous state, loading will be false.
    // console.log('Wallet not connected, not fetching pools.');
    // setAllPools([]); // Or clear pools from context if desired
    // }
  }, [connected, fetchAllPools]);

  // Display loading and error states
  if (loadingPools) {
    return (
      <div
        className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6 flex justify-center items-center`}
      >
        Loading pools...
      </div>
    );
  }

  if (poolsError) {
    return (
      <div
        className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6 flex flex-col justify-center items-center`}
      >
        <p>Error fetching pools: {poolsError.message}</p>
        <Button onClick={() => fetchAllPools()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Pools</h1>
          <div className="flex items-center gap-4">
            <Button
              asChild
              className={`bg-amber-500 hover:bg-[${colors.primary[600]}]`}
            >
              <Link href="/customer/pools/create-pool">
                <Plus className="w-4 h-4 mr-2" />
                Create Pool
              </Link>
            </Button>
          </div>
        </div>
        {/* <div
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
        </div> */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Top pools by TVL</h2>
        </div>
        {allPools && allPools.length > 0 ? (
          <>
            <PoolTable operations={allPools} />
          </>
        ) : (
          !loadingPools && <p>No pools available or wallet not connected.</p>
        )}
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
