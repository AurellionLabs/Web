import { colors } from '@/lib/constants/colors';
import { Button } from './button';
import { ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTrade } from '@/app/providers/trade.provider';

interface TokenizedAsset {
  id: string;
  nodeId: string;
  nodeName: string;
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

type SortConfig = {
  key: 'quantity' | 'pricePerUnit' | 'totalValue' | null;
  direction: 'asc' | 'desc';
};

interface TokenizedAssetTableProps {
  assets: TokenizedAsset[];
  onSort: (key: SortConfig['key']) => void;
  sortConfig: SortConfig;
}

export function TokenizedAssetTable({
  assets,
  onSort,
  sortConfig,
}: TokenizedAssetTableProps) {
  const router = useRouter();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-gray-400 border-b border-gray-800">
              <th className="h-12 px-4 text-left">Node</th>
              <th className="h-12 px-4 text-left">Asset Class</th>
              <th className="h-12 px-4 text-left">
                Quantity
                <Button
                  variant="ghost"
                  onClick={() => onSort('quantity')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </th>
              <th className="h-12 px-4 text-left">
                Price per Unit
                <Button
                  variant="ghost"
                  onClick={() => onSort('pricePerUnit')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </th>
              <th className="h-12 px-4 text-left">
                Total Value
                <Button
                  variant="ghost"
                  onClick={() => onSort('totalValue')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                onClick={() => router.push(`/customer/trading/${asset.id}`)}
                className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium">{asset.nodeName}</div>
                    <div className="text-sm text-gray-400">{asset.nodeId}</div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="capitalize">{asset.assetClass}</span>
                </td>
                <td className="py-4 px-4">{asset.quantity}</td>
                <td className="py-4 px-4">
                  {formatCurrency(asset.pricePerUnit)}
                </td>
                <td className="py-4 px-4">
                  {formatCurrency(asset.totalValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
