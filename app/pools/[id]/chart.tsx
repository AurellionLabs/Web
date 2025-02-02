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
            return `Volume: ${context.parsed.y.toFixed(2)}`;
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
    console.log('GroupedStakes:', groupedStakes);

    if (!groupedStakes) {
      return { labels: [], values: [] };
    }

    let dataPoints: { [key: string]: number } = {};

    switch (timeRange) {
      case '1D':
        dataPoints = groupedStakes.daily;
        break;
      case '1W':
        dataPoints = groupedStakes.weekly;
        break;
      case '1M':
        dataPoints = groupedStakes.monthly;
        break;
      case '1Y':
        dataPoints = groupedStakes.yearly;
        break;
      default:
        dataPoints = groupedStakes.daily;
    }

    const sortedKeys = Object.keys(dataPoints).sort();
    const values = sortedKeys.map((key) => dataPoints[key]);

    // If we only have one point, add a zero point before it to make the line visible
    if (sortedKeys.length === 1) {
      const date = new Date(sortedKeys[0]);
      date.setDate(date.getDate() - 1);
      sortedKeys.unshift(date.toISOString().split('T')[0]);
      values.unshift(0);
    }

    console.log('Chart Labels:', sortedKeys);
    console.log('Chart Values:', values);

    return {
      labels: sortedKeys,
      values,
    };
  };

  const { labels, values } = getDataByTimeRange();

  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Volume',
        data: values,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        pointRadius: 4, // Increased point size
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
