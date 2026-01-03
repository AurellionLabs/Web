'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData as LWCandlestickData,
  LineData as LWLineData,
  HistogramData,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { GlassCard } from '../../ui/glass-card';
import {
  CandlestickData,
  TimePeriod,
  ChartMode,
  PriceChartProps,
} from './chart-types';
import {
  darkChartTheme,
  generateMockCandlestickData,
  generateVolumeData,
  calculatePriceChange,
  candlesToLineData,
} from './chart-utils';

/**
 * Time period options for the chart
 */
const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
];

/**
 * Chart mode options
 */
const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: 'candlestick', label: 'Candles' },
  { value: 'line', label: 'Line' },
];

/**
 * PriceChart - Professional trading chart using TradingView Lightweight Charts
 *
 * Features:
 * - Candlestick and line chart modes
 * - Time period selection (1H, 1D, 1W, 1M, 1Y)
 * - Volume histogram
 * - Crosshair with price tooltip
 * - Dark theme matching app aesthetic
 * - Responsive sizing
 *
 * @example
 * ```tsx
 * <PriceChart
 *   data={candlestickData}
 *   timePeriod="1d"
 *   mode="candlestick"
 *   height={400}
 *   showVolume={true}
 *   assetName="AUGOAT"
 *   currentPrice={100.50}
 * />
 * ```
 */
export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  timePeriod = '1d',
  mode = 'candlestick',
  height = 400,
  showVolume = true,
  onTimePeriodChange,
  onModeChange,
  className,
  assetName,
  currentPrice,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const [internalPeriod, setInternalPeriod] = useState<TimePeriod>(timePeriod);
  const [internalMode, setInternalMode] = useState<ChartMode>(mode);
  const [crosshairData, setCrosshairData] = useState<{
    time: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    value?: number;
  } | null>(null);

  // Memoize chart data
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data;
    }
    // Generate mock data if none provided
    const basePrice = currentPrice || 100;
    return generateMockCandlestickData(basePrice, internalPeriod);
  }, [data, currentPrice, internalPeriod]);

  // Calculate price change
  const priceChange = useMemo(
    () => calculatePriceChange(chartData),
    [chartData],
  );

  // Handle time period change
  const handlePeriodChange = useCallback(
    (period: TimePeriod) => {
      setInternalPeriod(period);
      onTimePeriodChange?.(period);
    },
    [onTimePeriodChange],
  );

  // Handle mode change
  const handleModeChange = useCallback(
    (newMode: ChartMode) => {
      setInternalMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange],
  );

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height - 60, // Account for header
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: darkChartTheme.textColor,
      },
      grid: {
        vertLines: { color: darkChartTheme.gridColor },
        horzLines: { color: darkChartTheme.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: darkChartTheme.crosshairColor,
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: 'rgba(245, 158, 11, 0.9)',
        },
        horzLine: {
          color: darkChartTheme.crosshairColor,
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(245, 158, 11, 0.9)',
        },
      },
      rightPriceScale: {
        borderColor: darkChartTheme.gridColor,
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: darkChartTheme.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    });

    chartRef.current = chart;

    // Add main series based on mode
    if (internalMode === 'candlestick') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: darkChartTheme.upColor,
        downColor: darkChartTheme.downColor,
        borderUpColor: darkChartTheme.borderUpColor,
        borderDownColor: darkChartTheme.borderDownColor,
        wickUpColor: darkChartTheme.wickUpColor,
        wickDownColor: darkChartTheme.wickDownColor,
      });

      // Transform data for lightweight-charts
      const lwData: LWCandlestickData[] = chartData.map((d) => ({
        time: d.time as LWCandlestickData['time'],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      candleSeries.setData(lwData);
      mainSeriesRef.current = candleSeries;
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b', // Amber/accent color
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#f59e0b',
        crosshairMarkerBackgroundColor: '#1a1a1a',
      });

      const lineData = candlesToLineData(chartData);
      const lwLineData: LWLineData[] = lineData.map((d) => ({
        time: d.time as LWLineData['time'],
        value: d.value,
      }));

      lineSeries.setData(lwLineData);
      mainSeriesRef.current = lineSeries;
    }

    // Add volume histogram if enabled
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.85,
          bottom: 0,
        },
      });

      const volumeData = generateVolumeData(chartData);
      const lwVolumeData: HistogramData[] = volumeData.map((d) => ({
        time: d.time as HistogramData['time'],
        value: d.value,
        color: d.color,
      }));

      volumeSeries.setData(lwVolumeData);
      volumeSeriesRef.current = volumeSeries;
    }

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setCrosshairData(null);
        return;
      }

      const mainData = param.seriesData.get(mainSeriesRef.current!);
      if (!mainData) {
        setCrosshairData(null);
        return;
      }

      const time = new Date((param.time as number) * 1000).toLocaleString();

      if (internalMode === 'candlestick' && 'open' in mainData) {
        setCrosshairData({
          time,
          open: mainData.open,
          high: mainData.high,
          low: mainData.low,
          close: mainData.close,
        });
      } else if ('value' in mainData) {
        setCrosshairData({
          time,
          value: mainData.value,
        });
      }
    });

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData, internalMode, showVolume, height]);

  // Get latest price display
  const displayPrice =
    currentPrice ?? chartData[chartData.length - 1]?.close ?? 0;

  return (
    <GlassCard className={cn('overflow-hidden', className)}>
      {/* Chart Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        {/* Asset info and price */}
        <div className="flex items-center gap-4">
          <div>
            {assetName && (
              <h3 className="text-lg font-semibold text-foreground capitalize">
                {assetName}
              </h3>
            )}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl md:text-3xl font-display font-bold text-foreground">
                ${displayPrice.toFixed(2)}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  priceChange.isPositive
                    ? 'text-trading-buy'
                    : 'text-trading-sell',
                )}
              >
                {priceChange.isPositive ? '+' : ''}
                {priceChange.change.toFixed(2)} (
                {priceChange.isPositive ? '+' : ''}
                {priceChange.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Chart mode toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay">
            {CHART_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleModeChange(m.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  internalMode === m.value
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Time period tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  internalPeriod === period.value
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Crosshair tooltip overlay */}
      {crosshairData && (
        <div className="absolute top-16 left-4 z-10 px-3 py-2 rounded-lg bg-surface-elevated/90 backdrop-blur-sm border border-glass-border text-xs font-mono">
          <div className="text-muted-foreground mb-1">{crosshairData.time}</div>
          {crosshairData.open !== undefined ? (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <span className="text-muted-foreground">O: </span>
                <span className="text-foreground">
                  {crosshairData.open?.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">H: </span>
                <span className="text-foreground">
                  {crosshairData.high?.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">L: </span>
                <span className="text-foreground">
                  {crosshairData.low?.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">C: </span>
                <span className="text-foreground">
                  {crosshairData.close?.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-muted-foreground">Price: </span>
              <span className="text-foreground">
                ${crosshairData.value?.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Chart container */}
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: `${height - 60}px` }}
      />
    </GlassCard>
  );
};

export default PriceChart;
