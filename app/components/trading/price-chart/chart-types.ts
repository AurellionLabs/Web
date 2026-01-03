/**
 * Chart Data Types for TradingView Lightweight Charts
 *
 * These interfaces define the data structures used for rendering
 * professional trading charts with candlestick and line support.
 */

/**
 * Time period options for chart display
 */
export type TimePeriod = '1h' | '1d' | '1w' | '1m' | '1y';

/**
 * Chart display mode
 */
export type ChartMode = 'candlestick' | 'line';

/**
 * OHLC Candlestick data point
 */
export interface CandlestickData {
  /** Unix timestamp in seconds */
  time: number;
  /** Opening price */
  open: number;
  /** Highest price in period */
  high: number;
  /** Lowest price in period */
  low: number;
  /** Closing price */
  close: number;
}

/**
 * Simple line chart data point
 */
export interface LineData {
  /** Unix timestamp in seconds */
  time: number;
  /** Price value */
  value: number;
}

/**
 * Volume data point
 */
export interface VolumeData {
  /** Unix timestamp in seconds */
  time: number;
  /** Volume amount */
  value: number;
  /** Color based on price direction */
  color: string;
}

/**
 * Complete chart data set
 */
export interface ChartDataSet {
  /** Candlestick/OHLC data */
  candles: CandlestickData[];
  /** Volume data (optional) */
  volume?: VolumeData[];
}

/**
 * Chart theme colors
 */
export interface ChartTheme {
  /** Background color */
  background: string;
  /** Text color */
  textColor: string;
  /** Grid line color */
  gridColor: string;
  /** Up candle color (green/bullish) */
  upColor: string;
  /** Down candle color (red/bearish) */
  downColor: string;
  /** Crosshair color */
  crosshairColor: string;
  /** Border color for candles */
  borderUpColor: string;
  borderDownColor: string;
  /** Wick colors */
  wickUpColor: string;
  wickDownColor: string;
}

/**
 * Props for the PriceChart component
 */
export interface PriceChartProps {
  /** Chart data (OHLC candles) */
  data: CandlestickData[];
  /** Current selected time period */
  timePeriod?: TimePeriod;
  /** Chart display mode */
  mode?: ChartMode;
  /** Chart height in pixels */
  height?: number;
  /** Show volume histogram */
  showVolume?: boolean;
  /** Callback when time period changes */
  onTimePeriodChange?: (period: TimePeriod) => void;
  /** Callback when mode changes */
  onModeChange?: (mode: ChartMode) => void;
  /** Optional className for container */
  className?: string;
  /** Asset name to display */
  assetName?: string;
  /** Current price for header */
  currentPrice?: number;
}
