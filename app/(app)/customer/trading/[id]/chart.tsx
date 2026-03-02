'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  ChartOptions,
  Scale,
  Tick,
  TooltipItem,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
);

interface ChartProps {
  priceData: {
    dates: string[];
    prices: number[];
  };
  timeRange: string;
}

export default function Chart({ priceData, timeRange = '1D' }: ChartProps) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            return `Price: $${(context.parsed.y ?? 0).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        beginAtZero: true,
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
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Handle single point case
  if (priceData.dates.length === 1) {
    const date = new Date(priceData.dates[0]);
    if (timeRange === '1H') {
      date.setHours(date.getHours() - 1);
      priceData.dates.unshift(
        date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );
    } else {
      date.setDate(date.getDate() - 1);
      priceData.dates.unshift(date.toISOString().split('T')[0]);
    }
    priceData.prices.unshift(priceData.prices[0] * 0.98); // Start slightly lower
  }

  const data = {
    labels: priceData.dates,
    datasets: [
      {
        fill: true,
        label: 'Price',
        data: priceData.prices,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(245, 158, 11)',
      },
    ],
  };

  return (
    <div style={{ width: '100%', height: '100%', padding: '20px' }}>
      <Line options={options} data={data} />
    </div>
  );
}
