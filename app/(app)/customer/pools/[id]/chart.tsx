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
  TooltipItem,
} from 'chart.js';
import { GroupedStakes } from '@/domain/pool';

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
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y ?? 0;
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
        ticks: {
          callback: function (value: number | string) {
            const numValue = Number(value);
            if (numValue === 0) return '0';

            // Handle very small numbers
            if (numValue < 0.001) {
              return numValue.toExponential(2);
            }

            // Handle normal formatting
            if (numValue >= 1000000) {
              return `${(numValue / 1000000).toFixed(2)}M`;
            } else if (numValue >= 1000) {
              return `${(numValue / 1000).toFixed(2)}K`;
            } else if (numValue >= 1) {
              return numValue.toFixed(2);
            } else {
              return numValue.toFixed(4);
            }
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

  const getDataByTimeRange = () => {
    if (!groupedStakes) {
      return { labels: [], values: [] };
    }

    const toNumericMap = (
      raw: { [k: string]: string } | undefined,
    ): { [key: string]: number } => {
      if (!raw) return {};
      return Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, Number(v)]),
      );
    };

    let dataPoints: { [key: string]: number } = {};
    switch (timeRange) {
      case '1H':
        dataPoints = toNumericMap(groupedStakes.hourly);
        break;
      case '1D':
        dataPoints = toNumericMap(groupedStakes.daily);
        break;
      case '1W':
        dataPoints = toNumericMap(groupedStakes.weekly);
        break;
      case '1M':
        dataPoints = toNumericMap(groupedStakes.monthly);
        break;
      case '1Y':
        dataPoints = toNumericMap(groupedStakes.yearly);
        break;
      default:
        dataPoints = toNumericMap(groupedStakes.daily);
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
        const rawValue = parseFloat(value);
        const convertedValue = rawValue / 1e18;

        // Debug logging to help identify the issue

        // Convert from wei to token amount (divide by 10^18)
        return convertedValue;
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
