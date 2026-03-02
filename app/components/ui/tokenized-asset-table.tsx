import { Button } from './button';
import { ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { formatTokenAmount } from '@/lib/formatters';

type SortConfig = {
  key: 'name' | 'class' | 'amount' | 'price' | 'totalValue' | null;
  direction: 'asc' | 'desc';
};

interface TokenizedAssetTableProps {
  assets: TokenizedAssetUI[];
  onSort: (key: SortConfig['key']) => void;
  sortConfig: SortConfig;
}

export function TokenizedAssetTable({
  assets,
  onSort,
  sortConfig,
}: TokenizedAssetTableProps) {
  const router = useRouter();

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-gray-400 border-b border-gray-800">
              <th className="h-12 px-4 text-left">Node</th>
              <th className="h-12 px-4 text-left">
                Asset Name
                <Button
                  variant="ghost"
                  onClick={() => onSort('name')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </th>
              <th className="h-12 px-4 text-left">
                Asset Class
                <Button
                  variant="ghost"
                  onClick={() => onSort('class')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </th>
              <th className="h-12 px-4 text-left">
                Quantity
                <Button
                  variant="ghost"
                  onClick={() => onSort('amount')}
                  className="h-8 px-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </th>
              <th className="h-12 px-4 text-left">
                Price per Unit
                <Button
                  variant="ghost"
                  onClick={() => onSort('price')}
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
                key={asset.nodeAddress}
                onClick={() => router.push(`/customer/trading/${asset.id}`)}
                className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium">
                      {asset.nodeLocation.addressName}
                    </div>
                    <div className="text-sm text-gray-400">
                      {asset.nodeAddress}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="font-medium">{asset.name}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="capitalize">{asset.class}</span>
                </td>
                <td className="py-4 px-4">{parseInt(asset.capacity)}</td>
                <td className="py-4 px-4">
                  ${formatTokenAmount(asset.price, 0, 2)}
                </td>
                <td className="py-4 px-4">
                  ${formatTokenAmount(String(asset.totalValue), 0, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
