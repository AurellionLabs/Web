'use client';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { PoolTable } from '@/app/components/ui/pool-table';
import { Button } from '@/app/components/ui/button';
import { colors } from '@/lib/constants/colors';
import { useEffect } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { Pool } from '@/domain/pool';

export default function PoolsPage() {
  const { setCurrentUserRole } = useMainProvider();
  const { pools, loading, error, loadAllPools } = usePoolsProvider();
  const { connected } = useMainProvider();

  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  useEffect(() => {
    if (connected) {
      loadAllPools();
    } else {
      console.log('Wallet not connected');
    }
  }, [connected, loadAllPools]);

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Real World Asset Pools</h1>
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

        <div className="mb-4">
          <h2 className="text-xl font-semibold">Top pools by TVL</h2>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-400">Loading pools...</div>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center py-8">
            <div className="text-red-400">
              Error loading pools: {error.message}
            </div>
          </div>
        )}

        {pools && pools.length > 0 ? (
          <PoolTable pools={pools} />
        ) : (
          !loading &&
          !error && (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-400">No pools available</div>
            </div>
          )
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
