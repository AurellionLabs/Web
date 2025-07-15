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
} from 'chart.js';
import { GroupedStakes } from '@/dapp-connectors/staking-controller';

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
  groupedStakes?: GroupedStakes;
  timeRange?: string;
}

export default function Chart({ groupedStakes, timeRange = '1D' }: ChartProps) {
  const options = {
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
          label: (context: any) => {
            const value = context.parsed.y;
            if (value >= 1000000) {
              return `Volume: ${(value / 1000000).toFixed(2)}M tokens`;
            } else if (value >= 1000) {
              return `Volume: ${(value / 1000).toFixed(2)}K tokens`;
            } else {
              return `Volume: ${value.toFixed(2)} tokens`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true, // Changed to true
        grid: {
          display: false,
        },
      },
      y: {
        display: true, // Changed to true
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const getDataByTimeRange = () => {
    if (!groupedStakes) {
      return { labels: [], values: [] };
    }

    let dataPoints: { [key: string]: number } = {};
    switch (timeRange) {
      case '1H':
        dataPoints = groupedStakes.hourly || {};
        break;
      case '1D':
        dataPoints = groupedStakes.daily || {};
        break;
      case '1W':
        dataPoints = groupedStakes.weekly || {};
        break;
      case '1M':
        dataPoints = groupedStakes.monthly || {};
        break;
      case '1Y':
        dataPoints = groupedStakes.yearly || {};
        break;
      default:
        dataPoints = groupedStakes.daily || {};
    }

    // Sort keys by converting strings to dates first for proper chronological ordering
    const sortedKeys = Object.keys(dataPoints).sort((a, b) => {
      // For hourly format, append minutes and seconds before parsing
      const parseDate = (dateStr: string) => {
        if (timeRange === '1H') {
          // Append ':00:00' to make it a valid ISO datetime string
          return new Date(dateStr + ':00:00');
        }
        return new Date(dateStr);
      };

      const dateA = parseDate(a);
      const dateB = parseDate(b);
      return dateA.getTime() - dateB.getTime();
    });

    const values = sortedKeys.map((key) => {
      const value = dataPoints[key];
      // Convert string values to numbers (handles BigInt string conversion)
      if (typeof value === 'string') {
        // Convert from wei to token amount (divide by 10^18)
        return parseFloat(value) / 1e18;
      }
      return value;
    });

    // Format labels based on time range
    const formattedLabels = sortedKeys.map((key) => {
      if (timeRange === '1H') {
        // Add the missing time components before parsing
        const fullDate = new Date(key + ':00:00');
        // Format to show hour and minute
        return fullDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false, // Use 24-hour format for consistency
        });
      }
      return key;
    });

    // Handle single point case
    if (sortedKeys.length === 1) {
      const date = new Date(
        sortedKeys[0] + (timeRange === '1H' ? ':00:00' : ''),
      );
      if (timeRange === '1H') {
        date.setHours(date.getHours() - 1);
        formattedLabels.unshift(
          date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
        );
      } else {
        date.setDate(date.getDate() - 1);
        formattedLabels.unshift(date.toISOString().split('T')[0]);
      }
      values.unshift(0);
    }

    return {
      labels: formattedLabels,
      values,
    };
  };
  const { labels, values } = getDataByTimeRange();

  // Add fallback data if no data is available
  const finalLabels = labels.length > 0 ? labels : ['No data'];
  const finalValues = values.length > 0 ? values : [0];

  const data = {
    labels: finalLabels,
    datasets: [
      {
        fill: true,
        label: 'Volume',
        data: finalValues,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        pointRadius: 4, // Increased point size
        pointBackgroundColor: 'rgb(245, 158, 11)',
      },
    ],
  };

  return (
    <div style={{ width: '100%', height: '400px', padding: '20px' }}>
      <Line options={options} data={data} />
    </div>
  );
}
