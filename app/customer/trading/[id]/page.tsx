'use client';

import { FC, useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useTrade } from '@/app/providers/trade.provider';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { colors } from '@/lib/constants/colors';
import { ArrowLeft, Share2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useNode } from '@/app/providers/node.provider';
import { TokenizedAssetAttribute } from '@/domain/node';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const Chart = dynamic(() => import('./chart'), { ssr: false });

interface PageProps {
  params: {
    id: string;
  };
}

const TIME_PERIODS = [
  { label: '1H', value: '1h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '1Y', value: '1y' },
] as const;

type TimePeriod = (typeof TIME_PERIODS)[number]['value'];

const TradingPoolPage: FC<PageProps> = ({ params }) => {
  const { assets } = useTrade();
  const { getAssetAttributes } = useNode();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');
  const [assetAttributes, setAssetAttributes] = useState<
    TokenizedAssetAttribute[]
  >([]);
  const router = useRouter();

  const asset = assets.find((a) => a.nodeId === params.id);

  useEffect(() => {
    const fetchAssetAttributes = async () => {
      const attributes = await getAssetAttributes(asset?.fileHash || '');
      setAssetAttributes(attributes);
      console.log('[TradingPoolPage] Asset attributes>>>>>:', attributes);
    };
    fetchAssetAttributes();
  }, [asset?.fileHash, getAssetAttributes]);

  // Generate mock price history data based on selected period
  const generatePriceHistory = () => {
    const basePrice = asset?.pricePerUnit || 0;
    let points = 7;
    switch (selectedPeriod) {
      case '1h':
        points = 12;
        break; // 5-minute intervals
      case '1d':
        points = 24;
        break; // hourly
      case '1w':
        points = 7;
        break; // daily
      case '1m':
        points = 30;
        break; // daily
      case '1y':
        points = 12;
        break; // monthly
    }

    const dates = Array.from({ length: points }, (_, i) => {
      const date = new Date();
      if (selectedPeriod === '1h')
        date.setMinutes(date.getMinutes() - (points - 1 - i) * 5);
      else if (selectedPeriod === '1d')
        date.setHours(date.getHours() - (points - 1 - i));
      else if (selectedPeriod === '1w')
        date.setDate(date.getDate() - (points - 1 - i));
      else if (selectedPeriod === '1m')
        date.setDate(date.getDate() - (points - 1 - i));
      else date.setMonth(date.getMonth() - (points - 1 - i));

      return date.toLocaleDateString('en-US', {
        month: selectedPeriod === '1y' ? 'short' : undefined,
        day: selectedPeriod !== '1y' ? 'numeric' : undefined,
        hour:
          selectedPeriod === '1h' || selectedPeriod === '1d'
            ? 'numeric'
            : undefined,
        minute: selectedPeriod === '1h' ? 'numeric' : undefined,
      });
    });

    const prices = Array.from({ length: points }, (_, i) => {
      const variation = (Math.random() - 0.5) * 0.1;
      return basePrice * (1 + variation);
    });

    return { dates, prices };
  };

  const priceHistory = generatePriceHistory();

  const chartData = {
    labels: priceHistory.dates,
    datasets: [
      {
        label: 'Price History',
        data: priceHistory.prices,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: function (tickValue: string | number) {
            const value =
              typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            return `$${value.toFixed(2)}`;
          },
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  };

  if (!asset) {
    return (
      <div
        className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
      >
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Asset Not Found</h1>
        </div>
      </div>
    );
  }

  const totalPrice = quantity * asset.pricePerUnit;

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap">
          <Link href="/explore" className="text-gray-400 hover:text-white">
            Explore
          </Link>
          <span className="text-gray-600">/</span>
          <Link
            href="/customer/trading"
            className="text-gray-400 hover:text-white"
          >
            Trading
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">
            {asset.nodeLocation.addressName}
          </span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{asset.assetName}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden sm:flex"
            >
              <Link href="/customer/trading">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-gray-900" />
                <div className="w-8 h-8 rounded-full bg-red-700 border-2 border-gray-900" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {asset.assetName}
                </h1>
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
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium flex-grow sm:flex-grow-0"
              onClick={() =>
                router.push(`/customer/trading/${params.id}/order`)
              }
            >
              Place Order
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Price and chart */}
            <div
              className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}
            >
              <div className="mb-6">
                <div className="text-2xl sm:text-3xl font-bold mb-1">
                  ${asset.pricePerUnit.toFixed(2)}
                </div>
                <p className="text-sm text-gray-400">Current Price</p>
              </div>
              <div className="h-[200px] sm:h-[300px]">
                <Chart priceData={priceHistory} timeRange={selectedPeriod} />
              </div>
              <div className="flex items-center gap-2 mt-4 overflow-x-auto">
                {TIME_PERIODS.map((range) => (
                  <Button
                    key={range.value}
                    variant={
                      selectedPeriod === range.value ? 'secondary' : 'ghost'
                    }
                    size="sm"
                    onClick={() => setSelectedPeriod(range.value)}
                    className="text-sm"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Transaction History */}
            <div
              className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}
            >
              <h2 className="text-lg font-semibold mb-4">Transactions</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-gray-400">
                      <th className="text-left pb-4">Time</th>
                      <th className="text-left pb-4">Type</th>
                      <th className="text-right pb-4">USD Value</th>
                      <th className="text-right pb-4">Token Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[${colors.neutral[800]}]">
                      <td className="py-4">2024-02-26</td>
                      <td className="py-4 text-green-500">Purchased</td>
                      <td className="py-4 text-right">
                        ${(asset.pricePerUnit * 2).toFixed(2)}
                      </td>
                      <td className="py-4 text-right">2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <div
              className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}
            >
              <h2 className="text-lg font-semibold mb-6">Stats</h2>
              <div className="space-y-6">
                <div className="flex-col items-center justify-between">
                  <div className="mb-2">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Asset Name
                    </h3>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
                      {asset.assetName.charAt(0).toUpperCase() +
                        asset.assetName.slice(1)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Asset Class
                    </h3>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
                      {asset.assetClass.charAt(0).toUpperCase() +
                        asset.assetClass.slice(1)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Available Quantity
                    </h3>
                    <p className="text-2xl font-semibold">{asset.quantity}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Total Pool Value
                    </h3>
                    <p className="text-2xl font-semibold">
                      ${asset.totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[${colors.neutral[800]}] pt-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">
                    Node Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400">Name</div>
                      <div className="font-medium">
                        {asset.nodeLocation.addressName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">ID</div>
                      <div className="font-mono text-sm bg-gray-800/50 p-2 rounded-lg break-all">
                        {asset.nodeId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asset Attributes */}
                {assetAttributes.length > 0 && (
                  <div className="border-t border-[${colors.neutral[800]}] pt-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">
                      Asset Attributes
                    </h3>
                    <div className="space-y-3">
                      {assetAttributes.map((attribute, index) => (
                        <div key={index}>
                          <div className="text-sm text-gray-400">
                            {attribute.name}
                          </div>
                          <div className="font-medium">{attribute.value}</div>
                          {attribute.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {attribute.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingPoolPage;
