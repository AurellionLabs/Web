'use client';
import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useTradeProvider } from '@/app/providers/trade.provider';
import { colors } from '@/lib/constants/colors';
import { TokenizedAssetTable } from '@/components/ui/tokenized-asset-table';
import { AssetClassFilter } from '@/components/ui/asset-class-filter';

type SortConfig = {
  key: 'quantity' | 'pricePerUnit' | 'totalValue' | null;
  direction: 'asc' | 'desc';
};

export default function TradingPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { assets, fetchAssets, isLoading } = useTradeProvider();
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });

  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  useEffect(() => {
    if (connected) {
      fetchAssets();
    }
  }, [connected, fetchAssets]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig((prevSort) => ({
      key,
      direction:
        prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Apply filtering and sorting
  const filteredAndSortedAssets = [...assets]
    .filter(
      (asset) =>
        selectedAssetClass === 'all' || asset.assetClass === selectedAssetClass,
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Trading</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Available Assets</h2>
          <AssetClassFilter
            selectedAssetClass={selectedAssetClass}
            onSelectAssetClass={setSelectedAssetClass}
          />
        </div>

        {assets.length > 0 ? (
          <TokenizedAssetTable
            assets={filteredAndSortedAssets}
            onSort={handleSort}
            sortConfig={sortConfig}
          />
        ) : (
          <div
            className={`bg-[${colors.background.secondary}] rounded-2xl p-6 text-center`}
          >
            <p className="text-gray-400">
              No tokenized assets available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
