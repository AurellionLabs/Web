'use client';

import { useState } from 'react';
import {
  EvaPanel,
  EvaScanLine,
  EvaStatusBadge,
  EvaInput,
  EvaProgress,
  TrapButton,
  DiamondButton,
  GreekKeyStrip,
  HexCluster,
  TargetRings,
  LaurelAccent,
  EvaSystemReadout,
} from './eva-panel';

export default function PageTrading() {
  const [chartMode, setChartMode] = useState<'candles' | 'line'>('candles');
  const [timeframe, setTimeframe] = useState('1D');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [selectedAsset] = useState('AUGOAT');

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Breadcrumb */}
      <div className="px-4 md:px-8 pt-4 pb-2">
        <div className="flex items-center gap-3">
          {/* DECORATIVE: Chevron breadcrumb arrow — EVA aligned */}
          <div
            className="w-0 h-0 border-l-[5px] border-l-gold/40 border-y-[4px] border-y-transparent"
            aria-hidden="true"
          />
          <span className="font-mono text-sm tracking-[0.12em] text-foreground/40 hover:text-gold cursor-pointer transition-colors uppercase">
            Trading
          </span>
          <span className="font-mono text-foreground/15">/</span>
          <span className="font-mono text-sm tracking-[0.12em] text-gold uppercase font-bold">
            GOAT
          </span>
        </div>
      </div>

      {/* Title bar */}
      <div className="px-4 md:px-8 pb-3 flex items-center justify-between relative">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            {/* DECORATIVE: Laurel beside heading — Greek philosophy aligned */}
            <LaurelAccent side="left" className="hidden md:block" />
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">
              GOAT
            </h1>
          </div>
          <div
            className="hidden md:flex items-center gap-3 ml-2 py-1.5 px-4"
            style={{
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              background: 'hsl(0 0% 8% / 0.6)',
            }}
          >
            <span className="font-mono text-sm text-foreground/40">
              37 assets
            </span>
            <div className="w-[2px] h-3 bg-border/20" />
            <span className="font-mono text-sm text-foreground/40">1 type</span>
          </div>
        </div>
        <EvaStatusBadge status="active" label="live" />
      </div>

      <EvaScanLine variant="mixed" />

      {/* Main 3-column layout */}
      <div className="px-4 md:px-8 pb-10 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT - Asset Selector */}
          <div className="lg:col-span-3 relative">
            {/* DECORATIVE: Target rings top-left — EVA aligned */}
            <TargetRings size={36} className="absolute -top-3 -left-3" />

            <EvaPanel
              label="Asset Types"
              sublabel="Select asset to view data"
              sysId="AST.SEL"
              accent="gold"
            >
              <div className="space-y-3">
                {/* Selected asset */}
                <button
                  className="w-full text-left relative overflow-hidden transition-all duration-300"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  }}
                >
                  <div
                    className="absolute inset-0 bg-gold/[0.06] border border-gold/30"
                    style={{
                      clipPath:
                        'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                    }}
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold" />
                  <div className="p-4 ml-[3px] relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gold rotate-45" />
                        <span className="font-mono text-base text-foreground/90 font-bold">
                          AUGOAT
                        </span>
                      </div>
                      <span className="font-mono text-sm text-gold font-bold">
                        37
                      </span>
                    </div>
                    <EvaProgress
                      value={37}
                      max={50}
                      color="gold"
                      segments={15}
                    />
                  </div>
                </button>

                <button className="font-mono text-xs text-foreground/30 hover:text-foreground/50 transition-colors uppercase tracking-wider">
                  Clear selection
                </button>
              </div>

              {/* DECORATIVE: Greek key divider — Greek philosophy aligned */}
              <GreekKeyStrip color="crimson" />

              {/* Filters */}
              <div className="mb-5 mt-3">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-0 h-0 border-l-[5px] border-l-crimson/50 border-y-[3px] border-y-transparent"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs tracking-[0.2em] uppercase text-crimson/60 font-bold">
                    Filters
                  </span>
                </div>
                <div className="space-y-2">
                  {['Weight', 'Sex'].map((filter) => (
                    <button
                      key={filter}
                      className="w-full flex items-center justify-between p-3 border border-border/30 hover:border-gold/25 transition-colors group"
                      style={{
                        clipPath:
                          'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                      }}
                    >
                      <span className="font-mono text-sm text-foreground/55 group-hover:text-foreground/80 transition-colors">
                        {filter}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 8 8"
                        className="text-foreground/30"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 3l2 2 2-2"
                          stroke="currentColor"
                          fill="none"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* DECORATIVE: Greek key divider — Greek philosophy aligned */}
              <GreekKeyStrip color="gold" />

              {/* Matching assets */}
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-0 h-0 border-l-[5px] border-l-gold/50 border-y-[3px] border-y-transparent"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs tracking-[0.2em] uppercase text-gold/60 font-bold">
                    Matching Assets (37)
                  </span>
                </div>
                <div className="space-y-[2px] max-h-52 overflow-y-auto">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="relative flex items-center justify-between p-3 bg-background/40 hover:bg-card/60 transition-all cursor-pointer group"
                    >
                      <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-gold/0 group-hover:bg-gold/40 transition-colors" />
                      <div className="pl-2">
                        <span className="font-mono text-sm text-foreground/60 group-hover:text-gold transition-colors block font-bold">
                          AUGOAT
                        </span>
                        <span className="font-mono text-[11px] text-foreground/25 block mt-0.5">
                          Token #{String(i + 1).padStart(4, '0')}
                        </span>
                      </div>
                      <span
                        className="font-mono text-xs text-foreground/25 bg-background/40 px-2 py-0.5"
                        style={{
                          clipPath:
                            'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                        }}
                      >
                        {['S/M', 'M/M', 'L/F', 'M/F', 'S/F', 'XL/M'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </EvaPanel>
          </div>

          {/* CENTER - Chart */}
          <div className="lg:col-span-6 relative">
            {/* DECORATIVE: Hex cluster — EVA aligned */}
            <HexCluster size="lg" className="absolute -top-3 right-8 z-10" />

            <EvaPanel
              label={selectedAsset}
              sublabel="Trading Pair"
              sysId="CHT.SYS"
              accent="crimson"
            >
              {/* Price header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-5xl font-bold text-gold tabular-nums">
                    $79.00
                  </span>
                  <span className="font-mono text-base text-emerald-400 font-bold">
                    +0.00 (+0.00%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Diamond chart type buttons */}
                  <div className="flex">
                    {(['candles', 'line'] as const).map((mode) => (
                      <DiamondButton
                        key={mode}
                        active={chartMode === mode}
                        onClick={() => setChartMode(mode)}
                      >
                        {mode}
                      </DiamondButton>
                    ))}
                  </div>
                  <div className="w-px h-5 bg-border/20 mx-1" />
                  {/* Timeframe */}
                  <div className="flex">
                    {['1H', '1D', '1W', '1M', '1Y'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`relative px-3 py-2 font-mono text-xs font-bold transition-all ${
                          timeframe === tf
                            ? 'bg-crimson/12 text-crimson'
                            : 'text-foreground/25 hover:text-foreground/45'
                        }`}
                        style={
                          timeframe === tf
                            ? {
                                clipPath:
                                  'polygon(4px 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0 50%)',
                              }
                            : undefined
                        }
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart area */}
              <div
                className="relative h-72 md:h-80 bg-background/50 overflow-hidden"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                }}
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-crimson/20" />
                <div className="absolute inset-0 eva-hex-pattern opacity-25 pointer-events-none" />
                <div className="absolute inset-0 eva-scanlines pointer-events-none" />

                {/* DECORATIVE: System readout — EVA aligned */}
                <EvaSystemReadout
                  lines={[
                    'MAGI-01:OK',
                    'SYNC:98.7%',
                    'AT-FIELD:STABLE',
                    'LCL:NOMINAL',
                  ]}
                  position="left"
                />

                {/* Grid lines */}
                <div className="absolute inset-0 ml-[3px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`h${i}`}
                      className="absolute left-0 right-0 h-[1px] bg-border/10"
                      style={{ top: `${(i + 1) * 16.6}%` }}
                    />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`v${i}`}
                      className="absolute top-0 bottom-0 w-[1px] bg-border/10"
                      style={{ left: `${(i + 1) * 12.5}%` }}
                    />
                  ))}
                </div>

                {/* Y-axis */}
                <div className="absolute top-0 right-0 bottom-0 w-14 flex flex-col justify-between py-4 bg-background/40 border-l border-border/10">
                  {['$82', '$81', '$80', '$79', '$78', '$77'].map((p) => (
                    <span
                      key={p}
                      className="font-mono text-xs text-foreground/30 text-right pr-3 tabular-nums"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* Candles */}
                <div className="absolute inset-0 flex items-end justify-center px-16 pb-6">
                  <div className="flex items-end gap-[4px] h-full pt-8">
                    {[
                      45, 52, 48, 55, 60, 58, 62, 57, 65, 70, 68, 72, 64, 60,
                      63, 58, 55, 62, 67, 70, 73, 68, 65, 62, 58, 55, 52, 48,
                      51, 56, 60, 64,
                    ].map((h, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-[1px]"
                      >
                        <div className="w-[1px] h-2 bg-foreground/[0.08]" />
                        <div
                          className={`w-[5px] transition-colors hover:opacity-100 ${i % 3 === 0 ? 'bg-crimson/70 hover:bg-crimson' : 'bg-gold/50 hover:bg-gold'}`}
                          style={{ height: `${h * 0.4}%` }}
                        />
                        <div className="w-[1px] h-1.5 bg-foreground/[0.05]" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current price crosshair */}
                <div className="absolute left-[3px] right-14 top-[48%] border-t border-dashed border-gold/15" />
                <div
                  className="absolute right-14 top-[48%] -translate-y-1/2"
                  style={{
                    clipPath:
                      'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    background: 'hsl(43 65% 62%)',
                  }}
                >
                  <span className="font-mono text-[11px] text-background font-bold px-3 py-0.5">
                    $79.00
                  </span>
                </div>

                {/* DECORATIVE: Corner target — EVA aligned */}
                <TargetRings size={30} className="absolute bottom-3 left-5" />
              </div>
            </EvaPanel>
          </div>

          {/* RIGHT - Order Book + Place Order */}
          <div className="lg:col-span-3 space-y-4">
            {/* Order Book */}
            <EvaPanel
              label="Order Book"
              sublabel="Mid: $79.00"
              sysId="OB.SYS"
              accent="crimson"
            >
              <div className="space-y-[3px]">
                <div className="flex items-center justify-between py-2 border-b-2 border-crimson/15">
                  <span className="font-mono text-xs tracking-[0.15em] text-foreground/40 w-1/3 font-bold uppercase">
                    Price
                  </span>
                  <span className="font-mono text-xs tracking-[0.15em] text-foreground/40 w-1/3 text-center font-bold uppercase">
                    Size
                  </span>
                  <span className="font-mono text-xs tracking-[0.15em] text-foreground/40 w-1/3 text-right font-bold uppercase">
                    Total
                  </span>
                </div>
                {/* Asks */}
                {[
                  { price: '82.50', size: '120', total: '9,900', depth: 24 },
                  { price: '81.00', size: '350', total: '28,350', depth: 56 },
                  { price: '80.00', size: '500', total: '40,000', depth: 80 },
                ].map((row) => (
                  <div
                    key={row.price}
                    className="flex items-center justify-between py-2 relative"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-crimson/[0.08]"
                      style={{ width: `${row.depth}%` }}
                    />
                    <span className="font-mono text-sm text-crimson font-bold w-1/3 relative z-10 tabular-nums">
                      {row.price}
                    </span>
                    <span className="font-mono text-sm text-foreground/50 w-1/3 text-center relative z-10 tabular-nums">
                      {row.size}
                    </span>
                    <span className="font-mono text-sm text-foreground/35 w-1/3 text-right relative z-10 tabular-nums">
                      {row.total}
                    </span>
                  </div>
                ))}
                {/* Spread */}
                <div
                  className="py-3 text-center my-1 relative"
                  style={{
                    clipPath:
                      'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 6px 100%)',
                  }}
                >
                  <div
                    className="absolute inset-0 bg-gold/[0.05] border-y-2 border-gold/20"
                    style={{
                      clipPath:
                        'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 6px 100%)',
                    }}
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold" />
                  <span className="font-mono text-2xl font-bold text-gold relative z-10">
                    $79.00
                  </span>
                </div>
                {/* Bids */}
                {[
                  { price: '78.50', size: '280', total: '21,980', depth: 45 },
                  { price: '77.00', size: '450', total: '34,650', depth: 72 },
                  { price: '76.00', size: '200', total: '15,200', depth: 32 },
                ].map((row) => (
                  <div
                    key={row.price}
                    className="flex items-center justify-between py-2 relative"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/[0.08]"
                      style={{ width: `${row.depth}%` }}
                    />
                    <span className="font-mono text-sm text-emerald-400 font-bold w-1/3 relative z-10 tabular-nums">
                      {row.price}
                    </span>
                    <span className="font-mono text-sm text-foreground/50 w-1/3 text-center relative z-10 tabular-nums">
                      {row.size}
                    </span>
                    <span className="font-mono text-sm text-foreground/35 w-1/3 text-right relative z-10 tabular-nums">
                      {row.total}
                    </span>
                  </div>
                ))}
              </div>
            </EvaPanel>

            {/* Place Order */}
            <EvaPanel
              label="Place Order"
              sublabel={selectedAsset}
              sysId="ORD.EXE"
              accent="gold"
            >
              {/* Buy/Sell toggle — trapezoid shaped */}
              <div className="grid grid-cols-2 gap-[3px] mb-5">
                <button
                  onClick={() => setOrderSide('buy')}
                  className={`relative py-3 font-mono text-sm tracking-[0.12em] uppercase font-bold transition-all duration-300 ${
                    orderSide === 'buy'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-foreground/25 hover:text-foreground/40'
                  }`}
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 6px) 0, 100% 100%, 0 100%)',
                  }}
                >
                  {orderSide === 'buy' && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                  )}
                  Buy
                </button>
                <button
                  onClick={() => setOrderSide('sell')}
                  className={`relative py-3 font-mono text-sm tracking-[0.12em] uppercase font-bold transition-all duration-300 ${
                    orderSide === 'sell'
                      ? 'bg-crimson/15 text-crimson'
                      : 'text-foreground/25 hover:text-foreground/40'
                  }`}
                  style={{
                    clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%)',
                  }}
                >
                  {orderSide === 'sell' && (
                    <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-crimson" />
                  )}
                  Sell
                </button>
              </div>

              {/* Order type */}
              <div className="flex items-center gap-4 mb-5">
                <span className="font-mono text-xs tracking-[0.15em] text-foreground/40 uppercase font-bold w-12">
                  Type
                </span>
                <div className="flex gap-[2px]">
                  {(['limit', 'market'] as const).map((t) => (
                    <DiamondButton
                      key={t}
                      active={orderType === t}
                      onClick={() => setOrderType(t)}
                    >
                      {t}
                    </DiamondButton>
                  ))}
                </div>
              </div>

              <EvaInput label="Price" value="79" suffix="USD" />
              <EvaInput label="Quantity" value="0" suffix="AUGOAT" />

              {/* Percentage buttons */}
              <div className="grid grid-cols-4 gap-[2px] mb-5">
                {['25%', '50%', '75%', '100%'].map((pct) => (
                  <button
                    key={pct}
                    className="relative py-2 font-mono text-xs text-foreground/35 hover:text-gold transition-all font-bold"
                    style={{
                      clipPath:
                        'polygon(4px 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0 50%)',
                    }}
                  >
                    <div
                      className="absolute inset-0 border border-border/25 hover:border-gold/30 hover:bg-gold/[0.04] transition-all"
                      style={{
                        clipPath:
                          'polygon(4px 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0 50%)',
                      }}
                    />
                    <span className="relative z-10">{pct}</span>
                  </button>
                ))}
              </div>

              {/* DECORATIVE: Greek key divider — Greek philosophy aligned */}
              <GreekKeyStrip color="gold" />

              {/* Summary */}
              <div className="space-y-2 mb-5 mt-4">
                <div className="flex justify-between py-1">
                  <span className="font-mono text-sm text-foreground/40">
                    Order Value
                  </span>
                  <span className="font-mono text-sm text-foreground/55 tabular-nums">
                    $0.00
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-mono text-sm text-foreground/40">
                    Fee (0.1%)
                  </span>
                  <span className="font-mono text-sm text-foreground/55 tabular-nums">
                    $0.0000
                  </span>
                </div>
                <div className="border-t-2 border-gold/15 pt-2 mt-1 flex justify-between">
                  <span className="font-mono text-base font-bold text-foreground/55">
                    Total
                  </span>
                  <span className="font-mono text-xl font-bold text-gold tabular-nums">
                    $0.00
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                className={`relative w-full py-3.5 font-mono text-sm tracking-[0.15em] uppercase font-bold transition-all duration-300 ${
                  orderSide === 'buy'
                    ? 'bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-crimson/12 text-crimson hover:bg-crimson/20'
                }`}
                style={{
                  clipPath:
                    'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                }}
              >
                {orderSide === 'buy' ? 'Buy' : 'Sell'} AUGOAT
              </button>
            </EvaPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
