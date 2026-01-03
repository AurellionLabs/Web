/**
 * Chart Utilities for generating and transforming chart data
 *
 * These utilities help generate mock OHLC data for development
 * and transform data between formats.
 */

import {
  CandlestickData,
  LineData,
  VolumeData,
  TimePeriod,
  ChartTheme,
} from './chart-types';

/**
 * Default dark theme for charts matching the app aesthetic
 */
export const darkChartTheme: ChartTheme = {
  background: 'transparent',
  textColor: 'rgba(255, 255, 255, 0.6)',
  gridColor: 'rgba(255, 255, 255, 0.05)',
  upColor: '#22c55e', // Green for bullish
  downColor: '#ef4444', // Red for bearish
  crosshairColor: 'rgba(255, 255, 255, 0.3)',
  borderUpColor: '#22c55e',
  borderDownColor: '#ef4444',
  wickUpColor: '#22c55e',
  wickDownColor: '#ef4444',
};

/**
 * Get the number of data points and interval based on time period
 */
export function getTimeConfig(period: TimePeriod): {
  points: number;
  intervalMs: number;
  intervalLabel: string;
} {
  switch (period) {
    case '1h':
      return { points: 60, intervalMs: 60 * 1000, intervalLabel: '1m' }; // 60 1-minute candles
    case '1d':
      return { points: 96, intervalMs: 15 * 60 * 1000, intervalLabel: '15m' }; // 96 15-minute candles
    case '1w':
      return { points: 168, intervalMs: 60 * 60 * 1000, intervalLabel: '1h' }; // 168 1-hour candles
    case '1m':
      return {
        points: 120,
        intervalMs: 6 * 60 * 60 * 1000,
        intervalLabel: '6h',
      }; // 120 6-hour candles
    case '1y':
      return {
        points: 365,
        intervalMs: 24 * 60 * 60 * 1000,
        intervalLabel: '1d',
      }; // 365 daily candles
    default:
      return { points: 96, intervalMs: 15 * 60 * 1000, intervalLabel: '15m' };
  }
}

/**
 * Generate mock OHLC candlestick data for development
 * Creates realistic-looking price movements with trends and volatility
 *
 * @param basePrice - Starting price
 * @param period - Time period to generate data for
 * @param volatility - Price volatility factor (0-1)
 * @returns Array of candlestick data
 */
export function generateMockCandlestickData(
  basePrice: number,
  period: TimePeriod,
  volatility: number = 0.02,
): CandlestickData[] {
  const { points, intervalMs } = getTimeConfig(period);
  const data: CandlestickData[] = [];

  const now = Math.floor(Date.now() / 1000);
  const startTime = now - (points * intervalMs) / 1000;

  let currentPrice = basePrice * (0.95 + Math.random() * 0.1); // Start slightly different from base

  // Add some trend bias
  const trendBias = (Math.random() - 0.5) * 0.001;

  for (let i = 0; i < points; i++) {
    const time = startTime + (i * intervalMs) / 1000;

    // Random price movement with trend
    const change = (Math.random() - 0.5 + trendBias) * volatility;
    const open = currentPrice;

    // Generate high, low, close with realistic relationships
    const maxMove = currentPrice * volatility;
    const closeChange = (Math.random() - 0.5) * maxMove * 2;
    const close = open + closeChange;

    // High and low extend beyond open/close
    const highExtend = Math.random() * maxMove * 0.5;
    const lowExtend = Math.random() * maxMove * 0.5;

    const high = Math.max(open, close) + highExtend;
    const low = Math.min(open, close) - lowExtend;

    data.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });

    currentPrice = close;
  }

  return data;
}

/**
 * Generate volume data based on candlestick data
 * Volume tends to be higher on larger price movements
 *
 * @param candles - Candlestick data
 * @param baseVolume - Base volume amount
 * @returns Array of volume data
 */
export function generateVolumeData(
  candles: CandlestickData[],
  baseVolume: number = 1000,
): VolumeData[] {
  return candles.map((candle) => {
    const priceMove = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;

    // Higher volume on larger moves
    const volumeMultiplier =
      0.5 + (priceMove / range || 0) + Math.random() * 0.5;
    const volume = baseVolume * volumeMultiplier;

    const isBullish = candle.close >= candle.open;

    return {
      time: candle.time,
      value: parseFloat(volume.toFixed(0)),
      color: isBullish ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    };
  });
}

/**
 * Convert candlestick data to line data (using close prices)
 *
 * @param candles - Candlestick data
 * @returns Array of line data points
 */
export function candlesToLineData(candles: CandlestickData[]): LineData[] {
  return candles.map((candle) => ({
    time: candle.time,
    value: candle.close,
  }));
}

/**
 * Calculate price change and percentage from candlestick data
 *
 * @param candles - Candlestick data
 * @returns Price change info
 */
export function calculatePriceChange(candles: CandlestickData[]): {
  change: number;
  changePercent: number;
  isPositive: boolean;
} {
  if (candles.length < 2) {
    return { change: 0, changePercent: 0, isPositive: true };
  }

  const firstPrice = candles[0].open;
  const lastPrice = candles[candles.length - 1].close;
  const change = lastPrice - firstPrice;
  const changePercent = (change / firstPrice) * 100;

  return {
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    isPositive: change >= 0,
  };
}

/**
 * Format timestamp for display
 *
 * @param timestamp - Unix timestamp in seconds
 * @param period - Time period for appropriate formatting
 * @returns Formatted date string
 */
export function formatChartTime(timestamp: number, period: TimePeriod): string {
  const date = new Date(timestamp * 1000);

  switch (period) {
    case '1h':
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '1d':
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '1w':
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
    case '1m':
    case '1y':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Get the latest price from candlestick data
 *
 * @param candles - Candlestick data
 * @returns Latest close price or null
 */
export function getLatestPrice(candles: CandlestickData[]): number | null {
  if (candles.length === 0) return null;
  return candles[candles.length - 1].close;
}
