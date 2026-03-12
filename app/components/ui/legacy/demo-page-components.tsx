'use client';

import { useState, useEffect } from 'react';
import {
  EvaPanel,
  EvaStat,
  EvaScanLine,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaButton,
  EvaTable,
  EvaTableRow,
  EvaDataRow,
  EvaInput,
  EvaProgress,
} from './eva-panel';

/* ========================================================
   AURELLION DESIGN SYSTEM v3 — NERV EDITION
   Hexagonal / Chevron / Clipped / Diagonal / Organic
   ======================================================== */

/* ===== HEXAGONAL STAT CELL — honeycomb shaped card ===== */
function HexCell({
  label,
  value,
  unit,
  color = 'gold',
}: {
  label: string;
  value: string;
  unit?: string;
  color?: 'gold' | 'crimson' | 'emerald';
}) {
  const colors = {
    gold: {
      border: 'stroke-gold/40',
      fill: 'fill-gold/[0.04]',
      text: 'text-gold',
      glow: 'drop-shadow(0 0 8px hsl(43 65% 62% / 0.15))',
    },
    crimson: {
      border: 'stroke-crimson/40',
      fill: 'fill-crimson/[0.04]',
      text: 'text-crimson',
      glow: 'drop-shadow(0 0 8px hsl(0 70% 38% / 0.15))',
    },
    emerald: {
      border: 'stroke-emerald-500/40',
      fill: 'fill-emerald-500/[0.04]',
      text: 'text-emerald-400',
      glow: 'drop-shadow(0 0 8px hsl(160 70% 40% / 0.15))',
    },
  };
  const c = colors[color];
  return (
    <div className="relative w-full aspect-[1.15/1] group">
      <svg
        viewBox="0 0 200 174"
        className="w-full h-full"
        style={{ filter: c.glow }}
      >
        <polygon
          points="100,2 195,44 195,130 100,172 5,130 5,44"
          className={`${c.fill} ${c.border} transition-all duration-500 group-hover:stroke-gold/60`}
          strokeWidth="1.5"
        />
        {/* Inner hex */}
        <polygon
          points="100,18 180,52 180,122 100,156 20,122 20,52"
          fill="none"
          className={c.border}
          strokeWidth="0.5"
          opacity="0.3"
        />
        {/* Honeycomb dots inside */}
        {[
          [60, 70],
          [80, 60],
          [100, 70],
          [120, 60],
          [140, 70],
          [70, 85],
          [90, 85],
          [110, 85],
          [130, 85],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2" className="fill-gold/10" />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pt-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-foreground/40 uppercase mb-1">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className={`font-mono text-2xl md:text-3xl font-bold ${c.text} tabular-nums`}
          >
            {value}
          </span>
          {unit && (
            <span className="font-mono text-xs text-foreground/35 uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== CHEVRON DATA BAR — diagonal angled status row ===== */
function ChevronBar({
  label,
  value,
  pct,
  color = 'gold',
  code,
}: {
  label: string;
  value: string;
  pct: number;
  color?: 'gold' | 'crimson' | 'emerald';
  code?: string;
}) {
  const colors = {
    gold: {
      bg: 'bg-gold',
      text: 'text-gold',
      glow: 'shadow-[inset_0_0_20px_hsl(43_65%_62%/0.08)]',
    },
    crimson: {
      bg: 'bg-crimson',
      text: 'text-crimson',
      glow: 'shadow-[inset_0_0_20px_hsl(0_70%_38%/0.08)]',
    },
    emerald: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-400',
      glow: 'shadow-[inset_0_0_20px_hsl(160_70%_40%/0.08)]',
    },
  };
  const c = colors[color];
  return (
    <div
      className={`relative h-12 overflow-hidden ${c.glow}`}
      style={{ clipPath: 'polygon(0 0, 97% 0, 100% 100%, 3% 100%)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-card/80 border-y border-border/15" />
      {/* Fill bar */}
      <div
        className={`absolute top-0 bottom-0 left-0 ${c.bg}/15 transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
      {/* Chevron stripes inside fill */}
      <div
        className="absolute top-0 bottom-0 left-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 w-[2px] ${c.bg}/20`}
            style={{ left: `${i * 9}%`, transform: 'skewX(-20deg)' }}
          />
        ))}
      </div>
      {/* Content */}
      <div className="relative h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {code && (
            <span
              className={`font-mono text-[10px] tracking-[0.2em] ${c.text}/50 uppercase`}
            >
              {code}
            </span>
          )}
          <span className="font-mono text-sm font-bold text-foreground/80 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`font-mono text-sm font-bold tabular-nums ${c.text}`}
          >
            {value}
          </span>
          <span className="font-mono text-[10px] text-foreground/30 tabular-nums">
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ===== TRAPEZOID BUTTON — angled clipped shape ===== */
function TrapButton({
  children,
  variant = 'gold',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  size,
}: {
  children: React.ReactNode;
  variant?: 'gold' | 'crimson' | 'emerald';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  size?: string;
}) {
  const colors = {
    gold: 'bg-gold/12 text-gold hover:bg-gold/20 border-gold/30',
    crimson: 'bg-crimson/12 text-crimson hover:bg-crimson/20 border-crimson/30',
    emerald:
      'bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative px-8 py-3 font-mono text-xs tracking-[0.15em] uppercase font-bold transition-all duration-300 border ${colors[variant]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)' }}
    >
      {children}
    </button>
  );
}

/* ===== DIAMOND BUTTON — rotated square ===== */
function DiamondButton({
  children,
  variant = 'gold',
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'gold' | 'crimson';
  onClick?: () => void;
}) {
  const c =
    variant === 'gold'
      ? 'border-gold/40 text-gold hover:bg-gold/10'
      : 'border-crimson/40 text-crimson hover:bg-crimson/10';
  return (
    <button
      onClick={onClick}
      className={`relative w-14 h-14 border rotate-45 flex items-center justify-center transition-all ${c}`}
    >
      <span className="-rotate-45 font-mono text-[10px] font-bold tracking-widest uppercase">
        {children}
      </span>
    </button>
  );
}

/* ===== CONCENTRIC GAUGE — circular power ring like Eva energy display ===== */
function ConcentricGauge({
  label,
  value,
  pct,
  color = 'gold',
}: {
  label: string;
  value: string;
  pct: number;
  color?: 'gold' | 'crimson' | 'emerald';
}) {
  const colors = {
    gold: { stroke: 'hsl(43 65% 62%)', text: 'text-gold' },
    crimson: { stroke: 'hsl(0 70% 38%)', text: 'text-crimson' },
    emerald: { stroke: 'hsl(160 70% 40%)', text: 'text-emerald-400' },
  };
  const c = colors[color];
  const r1 = 70,
    r2 = 58,
    r3 = 46;
  const circumference1 = 2 * Math.PI * r1;
  const circumference2 = 2 * Math.PI * r2;
  const circumference3 = 2 * Math.PI * r3;
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 180 180" className="w-40 h-40">
        {/* Outer ring background */}
        <circle
          cx="90"
          cy="90"
          r={r1}
          fill="none"
          stroke="hsl(0 0% 15%)"
          strokeWidth="4"
        />
        {/* Outer ring fill */}
        <circle
          cx="90"
          cy="90"
          r={r1}
          fill="none"
          stroke={c.stroke}
          strokeWidth="4"
          strokeOpacity="0.6"
          strokeDasharray={circumference1}
          strokeDashoffset={circumference1 - (pct / 100) * circumference1}
          strokeLinecap="butt"
          transform="rotate(-90 90 90)"
          className="transition-all duration-1000"
        />
        {/* Middle ring */}
        <circle
          cx="90"
          cy="90"
          r={r2}
          fill="none"
          stroke="hsl(0 0% 12%)"
          strokeWidth="3"
        />
        <circle
          cx="90"
          cy="90"
          r={r2}
          fill="none"
          stroke={c.stroke}
          strokeWidth="3"
          strokeOpacity="0.35"
          strokeDasharray={circumference2}
          strokeDashoffset={
            circumference2 - ((pct * 0.85) / 100) * circumference2
          }
          strokeLinecap="butt"
          transform="rotate(-90 90 90)"
          className="transition-all duration-1000"
        />
        {/* Inner ring */}
        <circle
          cx="90"
          cy="90"
          r={r3}
          fill="none"
          stroke="hsl(0 0% 10%)"
          strokeWidth="2"
        />
        <circle
          cx="90"
          cy="90"
          r={r3}
          fill="none"
          stroke={c.stroke}
          strokeWidth="2"
          strokeOpacity="0.2"
          strokeDasharray={circumference3}
          strokeDashoffset={
            circumference3 - ((pct * 0.7) / 100) * circumference3
          }
          strokeLinecap="butt"
          transform="rotate(-90 90 90)"
          className="transition-all duration-1000"
        />
        {/* Tick marks on outer ring */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 - 90) * (Math.PI / 180);
          const x1 = 90 + (r1 + 4) * Math.cos(angle);
          const y1 = 90 + (r1 + 4) * Math.sin(angle);
          const x2 = 90 + (r1 + 8) * Math.cos(angle);
          const y2 = 90 + (r1 + 8) * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={c.stroke}
              strokeWidth={i % 6 === 0 ? '1.5' : '0.5'}
              opacity={i % 6 === 0 ? 0.5 : 0.2}
            />
          );
        })}
        {/* Center dot */}
        <circle cx="90" cy="90" r="3" fill={c.stroke} opacity="0.3" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono text-2xl font-bold tabular-nums ${c.text}`}>
          {value}
        </span>
        <span className="font-mono text-[9px] tracking-[0.2em] text-foreground/30 uppercase mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ===== CLIPPED CORNER PANEL — notched rectangle ===== */
function ClippedPanel({
  label,
  children,
  accent = 'gold',
}: {
  label: string;
  children: React.ReactNode;
  accent?: 'gold' | 'crimson';
}) {
  const borderColor =
    accent === 'gold' ? 'rgba(197,165,90,0.25)' : 'rgba(139,26,26,0.25)';
  const accentColor =
    accent === 'gold' ? 'rgba(197,165,90,0.5)' : 'rgba(139,26,26,0.5)';
  return (
    <div className="relative">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          fill="none"
          stroke={borderColor}
          strokeWidth="1"
          rx="0"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))',
          }}
        />
      </svg>
      <div
        className="bg-card/40"
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))',
        }}
      >
        {/* Accent line on clipped corner */}
        <div
          className="absolute top-0 right-0 w-[34px] h-[1px] origin-top-right rotate-[-45deg]"
          style={{ background: accentColor }}
        />
        <div
          className="absolute bottom-0 left-0 w-[34px] h-[1px] origin-bottom-left rotate-[-45deg]"
          style={{ background: accentColor }}
        />
        {/* Header */}
        <div className="px-5 py-3 border-b border-border/20 flex items-center gap-3">
          <div className="w-1.5 h-4" style={{ background: accentColor }} />
          <span className="font-mono text-xs tracking-[0.2em] text-foreground/60 uppercase font-bold">
            {label}
          </span>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ===== HONEYCOMB DOT GRID — data visualization pattern ===== */
function HoneycombGrid({
  data,
  max,
}: {
  data: { label: string; value: number }[];
  max: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="font-mono text-xs text-foreground/40 w-20 tracking-wider uppercase truncate">
            {item.label}
          </span>
          <div className="flex-1 flex gap-[3px] flex-wrap">
            {Array.from({ length: 20 }).map((_, i) => {
              const filled = i < Math.round((item.value / max) * 20);
              return (
                <div key={i} className="relative w-3 h-3">
                  <svg viewBox="0 0 12 14" className="w-full h-full">
                    <polygon
                      points="6,0 12,3.5 12,10.5 6,14 0,10.5 0,3.5"
                      className={
                        filled
                          ? 'fill-gold/40 stroke-gold/50'
                          : 'fill-foreground/[0.03] stroke-foreground/10'
                      }
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
              );
            })}
          </div>
          <span className="font-mono text-xs font-bold text-gold tabular-nums w-14 text-right">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ===== DIAGONAL SLASH HEADER ===== */
function SlashHeader({
  title,
  subtitle,
  code,
}: {
  title: string;
  subtitle?: string;
  code?: string;
}) {
  return (
    <div className="relative overflow-hidden mb-6">
      <div className="flex items-end gap-4">
        {/* Diagonal slash block */}
        <div className="relative w-16 h-20 flex-shrink-0">
          <div
            className="absolute inset-0 bg-crimson/15"
            style={{ clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0% 100%)' }}
          />
          <div
            className="absolute inset-0 bg-gold/10"
            style={{ clipPath: 'polygon(50% 0, 100% 0, 50% 100%, 0% 100%)' }}
          />
          {code && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-gold/60 tracking-widest">
              {code}
            </span>
          )}
        </div>
        <div className="pb-1">
          {subtitle && (
            <span className="font-mono text-[10px] tracking-[0.3em] text-crimson/60 uppercase block mb-1">
              {subtitle}
            </span>
          )}
          <h2 className="font-serif text-2xl text-foreground">{title}</h2>
        </div>
      </div>
      <div className="mt-3 h-[2px] flex">
        <div className="w-16 bg-crimson/40" />
        <div
          className="w-4"
          style={{
            background:
              'linear-gradient(90deg, hsl(0 70% 38% / 0.4), transparent)',
          }}
        />
        <div className="flex-1 bg-gold/8" />
      </div>
    </div>
  );
}

/* ===== PARALLELOGRAM TAG ===== */
function ParaTag({
  label,
  variant = 'gold',
}: {
  label: string;
  variant?: 'gold' | 'crimson' | 'emerald' | 'amber';
}) {
  const c = {
    gold: 'bg-gold/15 text-gold border-gold/30',
    crimson: 'bg-crimson/15 text-crimson border-crimson/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  };
  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 border font-mono text-[11px] tracking-[0.12em] uppercase font-bold ${c[variant]}`}
      style={{ clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)' }}
    >
      {label}
    </span>
  );
}

/* ===== NERV SEGMENTED TABS — chunky block tabs ===== */
function NervBlockTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: string[];
  active: string;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="flex gap-[2px]">
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className={`relative px-5 py-3 font-mono text-xs tracking-[0.12em] uppercase font-bold transition-all duration-200 ${
              isActive
                ? 'bg-gold/12 text-gold'
                : 'bg-card/40 text-foreground/30 hover:text-foreground/50 hover:bg-card/60'
            }`}
            style={{ clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)' }}
          >
            {isActive && (
              <div className="absolute top-0 left-[6%] right-0 h-[2px] bg-gold/70" />
            )}
            {tab}
          </button>
        );
      })}
    </div>
  );
}

/* ===== MAGI MODAL v2 — hexagonal frame ===== */
function MagiModalV2({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg animate-fade-in-up">
        <div
          className="bg-card overflow-hidden"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          }}
        >
          {/* Corner slash accents */}
          <div className="absolute top-0 right-0 w-[29px] h-[1px] origin-top-right rotate-[-45deg] bg-crimson/60" />
          <div className="absolute bottom-0 left-0 w-[29px] h-[1px] origin-bottom-left rotate-[-45deg] bg-gold/40" />

          {/* Top bar segments */}
          <div className="h-1 flex">
            <div className="w-4 bg-crimson" />
            <div className="w-20 bg-crimson/40" />
            <div className="flex-1 bg-gold/10" />
            <div className="w-4 bg-gold/30" />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <svg viewBox="0 0 32 32" className="w-full h-full">
                  <polygon
                    points="16,2 30,9 30,23 16,30 2,23 2,9"
                    fill="none"
                    stroke="hsl(0 70% 38% / 0.5)"
                    strokeWidth="1"
                  />
                  <polygon
                    points="16,6 26,11 26,21 16,26 6,21 6,11"
                    fill="hsl(0 70% 38% / 0.1)"
                    stroke="hsl(0 70% 38% / 0.3)"
                    strokeWidth="0.5"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] font-bold text-crimson/70">
                  !
                </span>
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold tracking-[0.12em] uppercase text-foreground">
                  MAGI Authorization
                </h3>
                <span className="font-mono text-[10px] text-crimson/60 tracking-[0.15em] uppercase">
                  Confirm Transaction
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 border border-crimson/30 hover:border-crimson/60 flex items-center justify-center text-crimson/50 hover:text-crimson transition-colors font-mono text-xs"
            >
              X
            </button>
          </div>

          {/* MAGI triad — hexagonal vote cells */}
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['MELCHIOR', 'BALTHASAR', 'CASPER'].map((name, i) => (
                <div
                  key={name}
                  className="relative flex flex-col items-center py-4"
                >
                  <svg viewBox="0 0 80 70" className="w-20 h-16 mb-2">
                    <polygon
                      points="40,2 78,19 78,53 40,70 2,53 2,19"
                      fill="hsl(160 70% 40% / 0.05)"
                      stroke="hsl(160 70% 40% / 0.3)"
                      strokeWidth="1"
                    />
                  </svg>
                  <span className="absolute top-6 font-mono text-lg font-bold text-emerald-400">
                    0{i + 1}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.2em] text-foreground/35 uppercase">
                    {name}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400/70 tracking-widest mt-0.5">
                    APPROVE
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              <EvaDataRow
                label="Action"
                value="DEPOSIT TO POOL"
                valueColor="gold"
              />
              <EvaDataRow
                label="Amount"
                value="1,000 AUGOAT"
                valueColor="gold"
              />
              <EvaDataRow label="Est. APY" value="12.5%" valueColor="emerald" />
              <EvaDataRow
                label="Network Fee"
                value="0.0042 ETH"
                valueColor="muted"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 font-mono text-xs tracking-[0.12em] uppercase font-bold bg-crimson/12 text-crimson border border-crimson/30 hover:bg-crimson/20 transition-all"
                style={{
                  clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
                }}
              >
                Reject
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 font-mono text-xs tracking-[0.12em] uppercase font-bold bg-emerald-500/12 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                style={{
                  clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
                }}
              >
                Authorize
              </button>
            </div>
          </div>

          {/* Bottom hazard */}
          <div className="h-1 eva-hazard" />
        </div>
      </div>
    </div>
  );
}

/* ===== VERTICAL CHEVRON PROGRESS — stacked V shapes ===== */
function ChevronProgress({
  label,
  level,
  max = 10,
  color = 'gold',
}: {
  label: string;
  level: number;
  max?: number;
  color?: 'gold' | 'crimson' | 'emerald';
}) {
  const colors = {
    gold: {
      active: 'fill-gold/50 stroke-gold/60',
      inactive: 'fill-foreground/[0.03] stroke-foreground/10',
    },
    crimson: {
      active: 'fill-crimson/50 stroke-crimson/60',
      inactive: 'fill-foreground/[0.03] stroke-foreground/10',
    },
    emerald: {
      active: 'fill-emerald-500/50 stroke-emerald-500/60',
      inactive: 'fill-foreground/[0.03] stroke-foreground/10',
    },
  };
  const textColor = {
    gold: 'text-gold',
    crimson: 'text-crimson',
    emerald: 'text-emerald-400',
  };
  const c = colors[color];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col-reverse gap-[2px]">
        {Array.from({ length: max }).map((_, i) => (
          <svg key={i} viewBox="0 0 40 12" className="w-10 h-3">
            <polygon
              points="0,0 40,0 32,12 8,12"
              className={`${i < level ? c.active : c.inactive} transition-all duration-300`}
              strokeWidth="0.5"
            />
          </svg>
        ))}
      </div>
      <span
        className={`font-mono text-lg font-bold tabular-nums ${textColor[color]}`}
      >
        {level}/{max}
      </span>
      <span className="font-mono text-[9px] tracking-[0.25em] text-foreground/35 uppercase">
        {label}
      </span>
    </div>
  );
}

/* ===== SCAN ROW TABLE — diagonal-clipped rows ===== */
function ScanTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: { cells: string[]; status?: 'active' | 'pending' | 'completed' }[];
}) {
  const statusColors = {
    active: 'bg-emerald-500 text-emerald-400',
    pending: 'bg-amber-500 text-amber-400',
    completed: 'bg-gold text-gold',
  };
  return (
    <div className="space-y-[2px]">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-3 bg-crimson/[0.06] border-y border-crimson/15"
        style={{ clipPath: 'polygon(0 0, 98% 0, 100% 100%, 2% 100%)' }}
      >
        {headers.map((h, i) => (
          <span
            key={h}
            className={`font-mono text-[10px] tracking-[0.2em] text-gold/50 uppercase font-bold ${i === 0 ? 'w-20' : 'flex-1'}`}
          >
            {h}
          </span>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="flex items-center gap-4 px-6 py-3.5 bg-card/30 hover:bg-card/60 transition-all cursor-pointer group border-b border-border/8"
          style={{ clipPath: 'polygon(0 0, 99% 0, 100% 100%, 1% 100%)' }}
        >
          {row.cells.map((cell, ci) => (
            <span
              key={ci}
              className={`font-mono text-sm ${ci === 0 ? 'w-20 text-foreground/30 tabular-nums' : 'flex-1 text-foreground/70'} ${ci === row.cells.length - 1 ? 'font-bold text-gold' : ''}`}
            >
              {cell}
            </span>
          ))}
          {row.status && (
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-4 ${statusColors[row.status].split(' ')[0]}/60`}
              />
              <span
                className={`font-mono text-[10px] tracking-[0.15em] uppercase font-bold ${statusColors[row.status].split(' ')[1]}`}
              >
                {row.status}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ===== PHILOSOPHER INSCRIPTION — etched stone style ===== */
function Inscription({
  quote,
  author,
  era,
}: {
  quote: string;
  author: string;
  era: string;
}) {
  return (
    <div className="relative py-8 px-6">
      {/* Stone texture overlay via pattern */}
      <div
        className="absolute inset-0 bg-card/20"
        style={{
          clipPath:
            'polygon(2% 0, 98% 0, 100% 4%, 100% 96%, 98% 100%, 2% 100%, 0 96%, 0 4%)',
        }}
      />
      {/* Top ornamental line */}
      <div className="flex items-center gap-2 mb-4 relative">
        <div className="h-[1px] w-8 bg-gold/30" />
        <svg viewBox="0 0 20 20" className="w-4 h-4">
          <polygon
            points="10,0 20,10 10,20 0,10"
            fill="none"
            stroke="hsl(43 65% 62% / 0.3)"
            strokeWidth="1"
          />
          <polygon
            points="10,4 16,10 10,16 4,10"
            fill="hsl(43 65% 62% / 0.08)"
            stroke="none"
          />
        </svg>
        <div className="h-[1px] flex-1 bg-gold/15" />
        <svg viewBox="0 0 20 20" className="w-4 h-4">
          <polygon
            points="10,0 20,10 10,20 0,10"
            fill="none"
            stroke="hsl(43 65% 62% / 0.3)"
            strokeWidth="1"
          />
          <polygon
            points="10,4 16,10 10,16 4,10"
            fill="hsl(43 65% 62% / 0.08)"
            stroke="none"
          />
        </svg>
        <div className="h-[1px] w-8 bg-gold/30" />
      </div>
      <p className="font-serif text-xl text-foreground/75 leading-relaxed text-center italic relative">
        {`"${quote}"`}
      </p>
      <div className="flex items-center justify-center gap-4 mt-4 relative">
        <div className="w-12 h-[1px] bg-gold/20" />
        <span className="font-serif text-sm text-gold">{author}</span>
        <span className="font-mono text-[9px] text-foreground/25 tracking-[0.25em] uppercase">
          {era}
        </span>
        <div className="w-12 h-[1px] bg-gold/20" />
      </div>
    </div>
  );
}

/* ===== GREEK KEY BORDER DIVIDER v2 ===== */
function MeanderDivider() {
  return (
    <div className="py-8 flex items-center gap-3">
      <div className="h-[1px] flex-1 bg-gold/8" />
      <div className="flex gap-[2px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-4 h-4 relative">
            <svg viewBox="0 0 16 16" className="w-full h-full">
              <path
                d={
                  i % 2 === 0
                    ? 'M0,8 L8,0 L16,8 L8,16 Z'
                    : 'M4,4 L12,4 L12,12 L4,12 Z'
                }
                fill="none"
                stroke={
                  i % 3 === 0
                    ? 'hsl(0 70% 38% / 0.2)'
                    : 'hsl(43 65% 62% / 0.15)'
                }
                strokeWidth="0.5"
              />
            </svg>
          </div>
        ))}
      </div>
      <div className="h-[1px] flex-1 bg-gold/8" />
    </div>
  );
}

/* ===== COUNTDOWN v2 — segmented display ===== */
function SegmentCountdown({ label, time }: { label: string; time: string }) {
  const segments = time.split(':');
  return (
    <div
      className="relative overflow-hidden"
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
      }}
    >
      <div className="bg-card/60 border border-border/20 p-4">
        <span className="font-mono text-[10px] tracking-[0.3em] text-crimson/60 uppercase block mb-3 font-bold">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="bg-background/80 border border-crimson/20 px-4 py-2"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                }}
              >
                <span className="font-mono text-3xl font-bold text-crimson tabular-nums">
                  {seg}
                </span>
              </div>
              {i < segments.length - 1 && (
                <span className="font-mono text-xl text-crimson/30 animate-eva-pulse">
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== NOTCHED INPUT ===== */
function NotchedInput({
  label,
  value,
  suffix,
  onChange,
  placeholder,
}: {
  label?: string;
  value?: string;
  suffix?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-4">
      {label && (
        <span className="font-mono text-xs tracking-[0.2em] text-foreground/45 uppercase block mb-2 font-bold">
          {label}
        </span>
      )}
      <div
        className="relative"
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background/80 border border-border/40 pl-4 pr-14 py-3.5 font-mono text-base text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-gold/50 transition-colors"
        />
        {suffix && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 font-mono text-xs text-foreground/30 tracking-wider uppercase">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ===== LIVE TICKER — auto scrolling ===== */
function LiveTicker() {
  const items = [
    'AUGOAT $79.00 +2.4%',
    'AUGLD $1,842.30 -0.8%',
    'AURE $245.00 +5.1%',
    'AUCC $12.40 +1.2%',
    'POOL:FEB9 TVL $191.90',
    'GAS 12 GWEI',
    'BLOCK 19,847,293',
    'SYNC 99.8%',
    'NERV SYS: NOMINAL',
    'AT FIELD: STABLE',
  ];
  return (
    <div className="relative overflow-hidden h-8 bg-card/40 border-y border-border/15">
      <div
        className="absolute left-0 top-0 bottom-0 w-8 z-10"
        style={{
          background: 'linear-gradient(90deg, hsl(0 0% 5%), transparent)',
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-8 z-10"
        style={{
          background: 'linear-gradient(270deg, hsl(0 0% 5%), transparent)',
        }}
      />
      <div className="flex items-center h-full animate-ticker whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="font-mono text-[10px] tracking-[0.12em] text-foreground/30 mx-6"
          >
            {item.includes('+') ? (
              <span className="text-emerald-400/50">{item}</span>
            ) : item.includes('-') ? (
              <span className="text-crimson/50">{item}</span>
            ) : (
              item
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===== MAIN SHOWCASE PAGE ===== */
export default function PageComponents() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All Assets');
  const [inputVal, setInputVal] = useState('1,000');

  return (
    <div className="min-h-screen pb-24">
      {/* Page header */}
      <div className="px-4 md:px-8 pt-8">
        <SlashHeader
          title="Component Library"
          subtitle="NERV-AURELLION DESIGN SYSTEM v3"
          code="SYS"
        />
        <p className="font-mono text-sm text-foreground/40 max-w-xl leading-relaxed">
          Interface primitives built for the Aurellion protocol. Hexagonal
          cells, chevron bars, clipped panels, concentric gauges, and diagonal
          layouts drawn from NERV tactical displays and Greek classical forms.
        </p>
      </div>

      <LiveTicker />

      {/* ===== SECTION 01: Hex Cells ===== */}
      <EvaSectionMarker
        section="01"
        label="Hexagonal Stat Cells"
        variant="crimson"
      />
      <div className="px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <HexCell label="Total Value" value="$191.9" unit="USD" color="gold" />
          <HexCell label="24h Volume" value="$2.4M" color="emerald" />
          <HexCell label="Avg APY" value="10.0" unit="%" color="gold" />
          <HexCell label="Active Pools" value="847" color="crimson" />
        </div>
      </div>

      <MeanderDivider />

      {/* ===== SECTION 02: Chevron Bars ===== */}
      <EvaSectionMarker section="02" label="Chevron Data Bars" variant="gold" />
      <div className="px-4 md:px-8 space-y-[3px]">
        <ChevronBar
          label="AUGOAT"
          value="3,437 units"
          pct={68}
          color="gold"
          code="A0133"
        />
        <ChevronBar
          label="Gold Bullion"
          value="1,200 oz"
          pct={45}
          color="gold"
          code="A0134"
        />
        <ChevronBar
          label="Real Estate"
          value="$4.1M"
          pct={82}
          color="emerald"
          code="A0135"
        />
        <ChevronBar
          label="Carbon Credit"
          value="800 tons"
          pct={24}
          color="crimson"
          code="A0136"
        />
        <ChevronBar
          label="Treasury Bond"
          value="$12.8M"
          pct={91}
          color="emerald"
          code="A0137"
        />
      </div>

      <MeanderDivider />

      {/* ===== SECTION 03: Buttons ===== */}
      <EvaSectionMarker
        section="03"
        label="Buttons & Controls"
        variant="crimson"
      />
      <div className="px-4 md:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ClippedPanel label="Trapezoid Buttons" accent="gold">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <TrapButton variant="gold">Launch Protocol</TrapButton>
                <TrapButton variant="crimson">Emergency Stop</TrapButton>
                <TrapButton variant="emerald">Connected</TrapButton>
              </div>
              <div className="flex flex-wrap gap-3">
                <EvaButton variant="gold" size="lg">
                  Standard Gold
                </EvaButton>
                <EvaButton variant="crimson" size="lg">
                  Standard Red
                </EvaButton>
                <EvaButton variant="emerald" size="lg" active>
                  Active
                </EvaButton>
              </div>
            </div>
          </ClippedPanel>

          <ClippedPanel label="Diamond Nav & Tags" accent="crimson">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <DiamondButton variant="gold">BUY</DiamondButton>
                <DiamondButton variant="crimson">SELL</DiamondButton>
                <DiamondButton variant="gold">P2P</DiamondButton>
                <DiamondButton variant="crimson">NODE</DiamondButton>
              </div>
              <div className="flex flex-wrap gap-2">
                <ParaTag label="RWA" variant="gold" />
                <ParaTag label="DeFi" variant="crimson" />
                <ParaTag label="Verified" variant="emerald" />
                <ParaTag label="Pending" variant="amber" />
                <ParaTag label="Mainnet" variant="gold" />
                <ParaTag label="Audit" variant="emerald" />
              </div>
            </div>
          </ClippedPanel>
        </div>

        {/* Block tabs */}
        <NervBlockTabs
          tabs={['All Assets', 'Insured', 'Collateralized', 'No Collateral']}
          active={activeTab}
          onSelect={setActiveTab}
        />
      </div>

      <MeanderDivider />

      {/* ===== SECTION 04: Gauges ===== */}
      <EvaSectionMarker
        section="04"
        label="Gauges & Power Levels"
        variant="gold"
      />
      <div className="px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ClippedPanel label="Concentric Ring Gauges" accent="gold">
            <div className="flex justify-around">
              <ConcentricGauge
                label="Sync Rate"
                value="99.8%"
                pct={99.8}
                color="emerald"
              />
              <ConcentricGauge
                label="AT Field"
                value="72%"
                pct={72}
                color="gold"
              />
              <ConcentricGauge
                label="Alert"
                value="24%"
                pct={24}
                color="crimson"
              />
            </div>
          </ClippedPanel>

          <ClippedPanel label="Chevron Power Levels" accent="crimson">
            <div className="flex justify-around">
              <ChevronProgress label="Energy" level={8} color="emerald" />
              <ChevronProgress label="Shield" level={6} color="gold" />
              <ChevronProgress label="Threat" level={3} color="crimson" />
            </div>
          </ClippedPanel>
        </div>
      </div>

      <MeanderDivider />

      {/* ===== SECTION 05: Honeycomb Grid ===== */}
      <EvaSectionMarker
        section="05"
        label="Honeycomb Data Grid"
        variant="crimson"
      />
      <div className="px-4 md:px-8">
        <ClippedPanel label="Asset Allocation Honeycomb" accent="gold">
          <HoneycombGrid
            max={5000}
            data={[
              { label: 'AUGOAT', value: 3437 },
              { label: 'Gold', value: 1200 },
              { label: 'Real Estate', value: 4100 },
              { label: 'Carbon', value: 800 },
              { label: 'Bonds', value: 2900 },
            ]}
          />
        </ClippedPanel>
      </div>

      <MeanderDivider />

      {/* ===== SECTION 06: Scan Table ===== */}
      <EvaSectionMarker section="06" label="Scan Row Tables" variant="gold" />
      <div className="px-4 md:px-8">
        <ScanTable
          headers={['ID', 'Pool', 'TVL', 'APR', 'Status']}
          rows={[
            {
              cells: ['001', 'Feb 9th Pool', '$191.90', '10%'],
              status: 'active',
            },
            {
              cells: ['002', 'Goat Pool Alpha', '$0.00', '10%'],
              status: 'pending',
            },
            {
              cells: ['003', 'Goat Pool Beta', '$0.00', '3%'],
              status: 'active',
            },
            {
              cells: ['004', 'Test Pool', '$0.00', '12.5%'],
              status: 'pending',
            },
            {
              cells: ['005', 'Gold Bullion LP', '$0.00', '15%'],
              status: 'completed',
            },
          ]}
        />
      </div>

      <MeanderDivider />

      {/* ===== SECTION 07: Inputs ===== */}
      <EvaSectionMarker section="07" label="Form Elements" variant="crimson" />
      <div className="px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ClippedPanel label="Notched Inputs" accent="gold">
            <NotchedInput
              label="Amount"
              value={inputVal}
              onChange={setInputVal}
              suffix="AUGOAT"
            />
            <NotchedInput label="Price" value="79.00" suffix="USD" />
            <NotchedInput label="Recipient" placeholder="0x..." />
          </ClippedPanel>

          <ClippedPanel label="Countdowns & Progress" accent="crimson">
            <SegmentCountdown label="Next Epoch" time="04:23:17" />
            <div className="mt-4 space-y-3">
              <div>
                <span className="font-mono text-xs text-foreground/35 tracking-wider uppercase block mb-2">
                  Sync Progress
                </span>
                <EvaProgress value={85} color="gold" />
              </div>
              <div>
                <span className="font-mono text-xs text-foreground/35 tracking-wider uppercase block mb-2">
                  Pool Utilization
                </span>
                <EvaProgress value={72} color="emerald" />
              </div>
            </div>
          </ClippedPanel>
        </div>
      </div>

      <MeanderDivider />

      {/* ===== SECTION 08: Status & Badges ===== */}
      <EvaSectionMarker section="08" label="Status Indicators" variant="gold" />
      <div className="px-4 md:px-8">
        <ClippedPanel label="System Badges" accent="gold">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <EvaStatusBadge status="active" label="Active" />
              <EvaStatusBadge status="pending" label="Pending" />
              <EvaStatusBadge status="processing" label="Processing" />
              <EvaStatusBadge status="completed" label="Completed" />
            </div>
            <EvaScanLine variant="mixed" />
            <div className="flex flex-wrap gap-2">
              <ParaTag label="weight: M" variant="gold" />
              <ParaTag label="sex: M" variant="crimson" />
              <ParaTag label="RWA Asset" variant="gold" />
              <ParaTag label="Testnet" variant="amber" />
            </div>
          </div>
        </ClippedPanel>
      </div>

      <MeanderDivider />

      {/* ===== SECTION 09: Philosophy ===== */}
      <EvaSectionMarker
        section="09"
        label="Philosophy & Typography"
        variant="gold"
      />
      <div className="px-4 md:px-8 space-y-4">
        <Inscription
          quote="The soul becomes dyed with the colour of its thoughts."
          author="Marcus Aurelius"
          era="121-180 AD"
        />
        <Inscription
          quote="We are what we repeatedly do. Excellence then is not an act but a habit."
          author="Aristotle"
          era="384-322 BC"
        />
      </div>

      <MeanderDivider />

      {/* ===== SECTION 10: Modal ===== */}
      <EvaSectionMarker
        section="10"
        label="Modals & Overlays"
        variant="crimson"
      />
      <div className="px-4 md:px-8">
        <ClippedPanel label="MAGI Authorization" accent="crimson">
          <TrapButton variant="crimson" onClick={() => setModalOpen(true)}>
            Open MAGI Modal
          </TrapButton>
        </ClippedPanel>
      </div>

      <MagiModalV2 open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Bottom system line */}
      <div className="mt-16 px-4 md:px-8">
        <EvaScanLine variant="mixed" />
        <div className="flex items-center justify-between py-4">
          <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/20 uppercase">
            AURELLION DESIGN SYSTEM v3.0
          </span>
          <div className="flex gap-[3px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <svg key={i} viewBox="0 0 8 10" className="w-2 h-2.5">
                <polygon
                  points="4,0 8,2.5 8,7.5 4,10 0,7.5 0,2.5"
                  className={i < 4 ? 'fill-gold/20' : 'fill-crimson/15'}
                />
              </svg>
            ))}
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/20 uppercase">
            END OF LIBRARY
          </span>
        </div>
      </div>
    </div>
  );
}
