'use client';

import { type ReactNode } from 'react';

/* ========================================
   NERV-AURELLION COMPONENT SYSTEM v3
   Evangelion + Greek Philosophy Hybrid
   Non-rectangular. Aggressive shapes.
   ======================================== */

/* ===== DECORATIVE: Greek Key border strip (Greek philosophy aligned) ===== */
export function GreekKeyStrip({
  width = 'full',
  color = 'gold',
}: {
  width?: string;
  color?: 'gold' | 'crimson';
}) {
  const c = color === 'gold' ? 'hsl(43 65% 62%)' : 'hsl(0 70% 38%)';
  return (
    <div
      className={`h-4 ${width === 'full' ? 'w-full' : `w-${width}`} overflow-hidden opacity-25`}
      aria-hidden="true"
    >
      <svg width="100%" height="16" preserveAspectRatio="none">
        <pattern
          id={`greek-key-${color}`}
          x="0"
          y="0"
          width="32"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 8h8v-8h8v16h8v-8h8"
            stroke={c}
            fill="none"
            strokeWidth="1.5"
          />
        </pattern>
        <rect width="100%" height="16" fill={`url(#greek-key-${color})`} />
      </svg>
    </div>
  );
}

/* ===== DECORATIVE: Floating system readout (EVA aligned) ===== */
export function EvaSystemReadout({
  lines,
  position = 'right',
}: {
  lines: string[];
  position?: 'left' | 'right';
}) {
  return (
    <div
      className={`absolute ${position === 'right' ? 'right-3' : 'left-3'} top-3 pointer-events-none opacity-20`}
      aria-hidden="true"
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className={`font-mono text-[9px] tracking-[0.2em] ${position === 'right' ? 'text-right' : 'text-left'} text-crimson leading-4`}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

/* ===== DECORATIVE: Honeycomb hex cluster (EVA aligned) ===== */
export function HexCluster({
  size = 'sm',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const s = size === 'sm' ? 12 : size === 'md' ? 18 : 24;
  const count = size === 'sm' ? 3 : size === 'md' ? 5 : 7;
  return (
    <div
      className={`flex items-center gap-[2px] opacity-15 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          width={s}
          height={s}
          viewBox="0 0 20 20"
          className={i % 2 === 0 ? 'translate-y-[3px]' : ''}
        >
          <polygon
            points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5"
            fill="none"
            stroke="hsl(43 65% 62%)"
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}

/* ===== DECORATIVE: Laurel accent (Greek philosophy aligned) ===== */
export function LaurelAccent({
  side = 'left',
  className = '',
}: {
  side?: 'left' | 'right';
  className?: string;
}) {
  return (
    <svg
      width="24"
      height="48"
      viewBox="0 0 24 48"
      className={`opacity-15 ${side === 'right' ? 'scale-x-[-1]' : ''} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M12 4 C6 8, 4 14, 6 20 C4 14, 6 8, 12 4Z"
        fill="hsl(43 65% 62%)"
      />
      <path
        d="M12 12 C6 16, 4 22, 6 28 C4 22, 6 16, 12 12Z"
        fill="hsl(43 65% 62%)"
      />
      <path
        d="M12 20 C6 24, 4 30, 6 36 C4 30, 6 24, 12 20Z"
        fill="hsl(43 65% 62%)"
      />
      <path
        d="M12 28 C6 32, 4 38, 6 44 C4 38, 6 32, 12 28Z"
        fill="hsl(43 65% 62%)"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="46"
        stroke="hsl(43 65% 62%)"
        strokeWidth="1"
      />
    </svg>
  );
}

/* ===== DECORATIVE: Diagonal data scatter (EVA aligned) ===== */
export function DataScatter({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute pointer-events-none opacity-[0.07] ${className}`}
      aria-hidden="true"
    >
      {[
        { x: '10%', y: '15%', r: -12 },
        { x: '85%', y: '25%', r: 8 },
        { x: '5%', y: '70%', r: -5 },
        { x: '92%', y: '80%', r: 15 },
        { x: '45%', y: '5%', r: -8 },
      ].map((item, i) => (
        <span
          key={i}
          className="absolute font-mono text-[8px] text-gold tracking-wider"
          style={{
            left: item.x,
            top: item.y,
            transform: `rotate(${item.r}deg)`,
          }}
        >
          {['AT-FIELD', 'SYNC:OK', 'LCL:99%', 'MAGI-02', 'EVA-01'][i]}
        </span>
      ))}
    </div>
  );
}

/* ===== DECORATIVE: Concentric target rings (EVA aligned) ===== */
export function TargetRings({
  size = 60,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className={`opacity-10 ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="30"
        cy="30"
        r="28"
        fill="none"
        stroke="hsl(0 70% 38%)"
        strokeWidth="0.5"
      />
      <circle
        cx="30"
        cy="30"
        r="20"
        fill="none"
        stroke="hsl(43 65% 62%)"
        strokeWidth="0.5"
      />
      <circle
        cx="30"
        cy="30"
        r="12"
        fill="none"
        stroke="hsl(0 70% 38%)"
        strokeWidth="0.5"
      />
      <circle
        cx="30"
        cy="30"
        r="4"
        fill="none"
        stroke="hsl(43 65% 62%)"
        strokeWidth="1"
      />
      <line
        x1="0"
        y1="30"
        x2="60"
        y2="30"
        stroke="hsl(0 70% 38%)"
        strokeWidth="0.3"
      />
      <line
        x1="30"
        y1="0"
        x2="30"
        y2="60"
        stroke="hsl(0 70% 38%)"
        strokeWidth="0.3"
      />
    </svg>
  );
}

/* ===== CLIPPED PANEL — notched corners, non-rectangular ===== */
export function EvaPanel({
  label,
  sublabel,
  sysId,
  children,
  status,
  className = '',
  noPadding = false,
  accent = 'gold',
}: {
  label: string;
  sublabel?: string;
  sysId?: string;
  children: ReactNode;
  status?: 'active' | 'pending' | 'warning' | 'offline';
  className?: string;
  noPadding?: boolean;
  accent?: 'gold' | 'crimson';
}) {
  const statusConfig = {
    active: { text: 'text-emerald-400', label: 'ACTIVE' },
    pending: { text: 'text-amber-400', label: 'STANDBY' },
    warning: { text: 'text-crimson', label: 'WARNING' },
    offline: { text: 'text-foreground/30', label: 'OFFLINE' },
  };

  return (
    <div
      className={`relative bg-card/60 ${className}`}
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
      }}
    >
      {/* Clipped corner lines (drawn on top) — EVA aligned */}
      <svg
        className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="0"
          x2="24"
          y2="24"
          stroke="hsl(0 70% 38%)"
          strokeWidth="1.5"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="0"
          x2="24"
          y2="24"
          stroke="hsl(43 65% 62% / 0.4)"
          strokeWidth="1"
        />
      </svg>

      {/* Left thick accent bar */}
      <div
        className={`absolute top-0 left-0 w-1 bottom-4 ${accent === 'gold' ? 'bg-gold/50' : 'bg-crimson/50'}`}
      />

      {/* Header bar */}
      <div className="relative border-b border-border/40">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Trapezoid label container — EVA aligned */}
            <div className="relative">
              <div
                className={`absolute inset-0 ${accent === 'gold' ? 'bg-gold/8' : 'bg-crimson/8'}`}
                style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)' }}
              />
              <div className="relative flex items-center gap-2.5 pr-5 pl-3 py-1.5">
                <div className="flex gap-[2px]">
                  <div
                    className={`w-1.5 h-4 ${accent === 'gold' ? 'bg-gold' : 'bg-crimson'}`}
                  />
                  <div
                    className={`w-1 h-4 ${accent === 'gold' ? 'bg-gold/40' : 'bg-crimson/40'}`}
                  />
                </div>
                <span className="font-mono text-sm font-bold tracking-[0.12em] uppercase text-foreground/90">
                  {label}
                </span>
              </div>
            </div>
            {sublabel && (
              <span className="font-mono text-[11px] tracking-[0.08em] text-foreground/35">
                {sublabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {sysId && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 bg-background/60 border border-border/25"
                style={{
                  clipPath:
                    'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                }}
              >
                <span className="font-mono text-[10px] tracking-[0.15em] text-crimson/50 uppercase px-1">
                  {sysId}
                </span>
              </div>
            )}
            {status && (
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-[2px] h-4">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={`w-[3px] transition-all ${
                        status === 'active'
                          ? bar <= 5
                            ? 'bg-emerald-500'
                            : 'bg-foreground/10'
                          : status === 'pending'
                            ? bar <= 3
                              ? 'bg-amber-500'
                              : 'bg-foreground/10'
                            : status === 'warning'
                              ? bar <= 2
                                ? 'bg-crimson'
                                : 'bg-foreground/10'
                              : 'bg-foreground/10'
                      }`}
                      style={{ height: `${bar * 3 + 2}px` }}
                    />
                  ))}
                </div>
                <span
                  className={`font-mono text-[11px] tracking-[0.12em] font-bold ${statusConfig[status]?.text}`}
                >
                  {statusConfig[status]?.label}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="h-[3px] eva-hazard" />
      </div>

      {/* Content */}
      <div className={`relative ${noPadding ? '' : 'p-5'}`}>
        <div className="absolute inset-0 eva-hex-pattern opacity-25 pointer-events-none" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

/* ===== HEX STAT CARD — hexagonal shape ===== */
export function HexStatCard({
  label,
  value,
  sub,
  color = 'gold',
  powerLevel = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'gold' | 'crimson' | 'emerald';
  powerLevel?: number;
}) {
  const colors = {
    gold: 'hsl(43 65% 62%)',
    crimson: 'hsl(0 70% 38%)',
    emerald: 'hsl(160 60% 45%)',
  };
  const textColors = {
    gold: 'text-gold',
    crimson: 'text-crimson',
    emerald: 'text-emerald-400',
  };
  return (
    <div className="relative group">
      {/* Hex background shape */}
      <div
        className="relative py-6 px-5"
        style={{
          clipPath:
            'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
        }}
      >
        <div
          className="absolute inset-0 bg-card/80 group-hover:bg-card transition-colors"
          style={{
            clipPath:
              'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
          }}
        />
        {/* Hex outline SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon
            points="12,0 calc(100%-12),0 100%,50% calc(100%-12),100% 12,100% 0,50%"
            fill="none"
            stroke={colors[color]}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            opacity="0.35"
          />
        </svg>
        <div className="absolute inset-0 eva-hex-pattern opacity-20 pointer-events-none" />
        {/* Data scatter — EVA aligned */}
        <span
          className="absolute top-2 right-5 font-mono text-[8px] text-crimson/15 tracking-wider"
          aria-hidden="true"
        >
          NERV
        </span>
        <div className="relative text-center">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-foreground/40 font-bold block mb-2">
            {label}
          </span>
          <span
            className={`font-mono text-3xl font-bold tabular-nums block ${textColors[color]}`}
          >
            {value}
          </span>
          {sub && (
            <span className="font-mono text-[11px] text-foreground/30 mt-1.5 block">
              {sub}
            </span>
          )}
          {powerLevel > 0 && (
            <div className="flex gap-[2px] mt-3 justify-center max-w-[80%] mx-auto">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 ${
                    i < powerLevel
                      ? powerLevel >= 8
                        ? 'bg-emerald-500'
                        : powerLevel >= 5
                          ? 'bg-gold'
                          : 'bg-crimson'
                      : 'bg-foreground/8'
                  }`}
                  style={{ opacity: i < powerLevel ? 0.4 + (i / 10) * 0.6 : 1 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== CHEVRON TABLE ROW — parallelogram shaped rows ===== */
export function ChevronTableRow({
  children,
  highlight = false,
  index = 0,
}: {
  children: ReactNode;
  highlight?: boolean;
  index?: number;
}) {
  return (
    <tr
      className={`relative group transition-all duration-200 ${highlight ? 'bg-gold/[0.04]' : 'hover:bg-gold/[0.02]'}`}
    >
      {/* Left chevron accent — EVA aligned */}
      <td className="w-0 p-0 relative">
        <div
          className={`absolute left-0 top-1 bottom-1 w-1 transition-colors ${highlight ? 'bg-gold/50' : 'bg-transparent group-hover:bg-gold/25'}`}
          style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
        />
      </td>
      {children}
      {/* Right side index number — EVA aligned */}
      <td className="w-0 p-0 relative">
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-foreground/10"
          aria-hidden="true"
        >
          {String(index).padStart(3, '0')}
        </span>
      </td>
    </tr>
  );
}

/* ===== SCAN TABLE — with chevron rows and decorative elements ===== */
export function ScanTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-x-auto">
      {/* Decorative corner hex — EVA aligned */}
      <HexCluster size="sm" className="absolute -top-2 right-4" />
      <table className="w-full">
        <thead>
          <tr>
            <th className="w-0" />
            {headers.map((h, i) => (
              <th
                key={h}
                className="text-left py-3 px-4 font-mono text-xs tracking-[0.2em] uppercase font-bold relative"
              >
                <div className="flex items-center gap-2">
                  {i === 0 && (
                    <div className="w-0 h-0 border-l-[5px] border-l-crimson/50 border-y-[4px] border-y-transparent" />
                  )}
                  <span className="text-gold/50">{h}</span>
                </div>
                {/* Bottom chevron line under each header */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, hsl(0 70% 38% / ${i === 0 ? 0.5 : 0.15}), hsl(43 65% 62% / 0.1))`,
                  }}
                />
              </th>
            ))}
            <th className="w-0" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10">{children}</tbody>
      </table>
    </div>
  );
}

/* ===== TRAPEZOID BUTTON ===== */
export function TrapButton({
  children,
  variant = 'gold',
  size = 'default',
  onClick,
  className = '',
}: {
  children: ReactNode;
  variant?: 'gold' | 'crimson' | 'emerald';
  size?: 'sm' | 'default' | 'lg';
  onClick?: () => void;
  className?: string;
}) {
  const bgColors = {
    gold: 'bg-gold/10 hover:bg-gold/20',
    crimson: 'bg-crimson/10 hover:bg-crimson/20',
    emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20',
  };
  const textColors = {
    gold: 'text-gold',
    crimson: 'text-crimson',
    emerald: 'text-emerald-400',
  };
  const borderColors = {
    gold: 'hsl(43 65% 62%)',
    crimson: 'hsl(0 70% 38%)',
    emerald: 'hsl(160 60% 45%)',
  };
  const sizes = {
    sm: 'px-4 py-1.5 text-[11px]',
    default: 'px-6 py-2.5 text-xs',
    lg: 'px-8 py-3 text-sm',
  };

  return (
    <button
      onClick={onClick}
      className={`relative font-mono tracking-[0.12em] uppercase font-bold transition-all duration-300 ${bgColors[variant]} ${textColors[variant]} ${sizes[size]} ${className}`}
      style={{
        clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
      }}
    >
      {/* Inner border line */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          stroke={borderColors[variant]}
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* ===== DIAMOND BUTTON — small action button ===== */
export function DiamondButton({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2 font-mono text-xs tracking-[0.1em] uppercase font-bold transition-all ${active ? 'text-gold' : 'text-foreground/35 hover:text-foreground/60'}`}
      style={{
        clipPath:
          'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)',
      }}
    >
      <div
        className={`absolute inset-0 transition-colors ${active ? 'bg-gold/12' : 'bg-card/60 hover:bg-card'}`}
        style={{
          clipPath:
            'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* ===== Eva Stat Block ===== */
export function EvaStat({
  label,
  value,
  unit,
  trend,
  powerLevel = 0,
  size = 'default',
}: {
  label: string;
  value: string;
  unit?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  powerLevel?: number;
  size?: 'default' | 'large';
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/50 font-bold">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={`font-mono font-bold text-gold tabular-nums ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-sm text-foreground/40 tracking-wider uppercase">
            {unit}
          </span>
        )}
      </div>
      {powerLevel > 0 && (
        <div className="flex gap-[2px] mt-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-[4px] flex-1 ${i < powerLevel ? (powerLevel >= 8 ? 'bg-emerald-500' : powerLevel >= 5 ? 'bg-gold' : 'bg-crimson') : 'bg-foreground/8'}`}
              style={{ opacity: i < powerLevel ? 0.4 + (i / 10) * 0.6 : 1 }}
            />
          ))}
        </div>
      )}
      {trend && (
        <span
          className={`font-mono text-sm tracking-wider font-bold ${trend.direction === 'up' ? 'text-emerald-400' : 'text-crimson'}`}
        >
          {trend.direction === 'up' ? '+' : ''}
          {trend.value}
        </span>
      )}
    </div>
  );
}

/* ===== Scan Line ===== */
export function EvaScanLine({
  variant = 'gold',
}: {
  variant?: 'gold' | 'crimson' | 'mixed';
}) {
  if (variant === 'mixed') {
    return (
      <div className="py-1 relative">
        <div className="h-[1px] bg-gold/20" />
        <div className="flex h-[3px] mt-[1px]">
          <div className="w-12 bg-crimson/50" />
          <div className="flex-1 bg-crimson/[0.06]" />
          <div className="w-32 bg-crimson/30" />
          <div className="flex-1 bg-crimson/[0.06]" />
          <div className="w-12 bg-crimson/50" />
        </div>
        <div className="h-[1px] mt-[1px] bg-gold/10" />
      </div>
    );
  }
  return (
    <div className="py-1">
      <div
        className={`h-[2px] ${variant === 'gold' ? 'bg-gold/15' : 'bg-crimson/15'}`}
      />
    </div>
  );
}

/* ===== Status Badge — skewed parallelogram ===== */
export function EvaStatusBadge({
  status,
  label,
}: {
  status: 'active' | 'pending' | 'processing' | 'completed' | 'created';
  label?: string;
}) {
  const config = {
    active: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
    },
    pending: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
    },
    processing: { bg: 'bg-gold/12', text: 'text-gold', bar: 'bg-gold' },
    completed: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
    },
    created: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
    },
  };
  const c = config[status];
  return (
    <div
      className="inline-block"
      style={{
        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
      }}
    >
      <div className={`relative flex items-center gap-2 px-4 py-1.5 ${c.bg}`}>
        <div className={`w-[3px] h-3 ${c.bar}`} />
        <span
          className={`font-mono text-[11px] tracking-[0.15em] uppercase font-bold ${c.text}`}
        >
          {label || status}
        </span>
      </div>
    </div>
  );
}

/* ===== Section Marker ===== */
export function EvaSectionMarker({
  section,
  label,
  variant = 'crimson',
}: {
  section: string;
  label?: string;
  variant?: 'crimson' | 'gold';
}) {
  return (
    <div className="flex items-center gap-4 px-4 md:px-8 py-5">
      {/* Chevron arrow — EVA aligned */}
      <div
        className="w-0 h-0 border-l-[8px] border-y-[6px] border-y-transparent"
        style={{
          borderLeftColor:
            variant === 'crimson' ? 'hsl(0 70% 38%)' : 'hsl(43 65% 62%)',
        }}
      />
      <div className="flex gap-[2px]">
        <div
          className={`w-1.5 h-6 ${variant === 'crimson' ? 'bg-crimson' : 'bg-gold'}`}
        />
        <div
          className={`w-1 h-6 ${variant === 'crimson' ? 'bg-crimson/40' : 'bg-gold/40'}`}
        />
        <div
          className={`w-0.5 h-6 ${variant === 'crimson' ? 'bg-crimson/20' : 'bg-gold/20'}`}
        />
      </div>
      <span
        className={`font-mono text-sm tracking-[0.3em] uppercase font-bold ${variant === 'crimson' ? 'text-crimson' : 'text-gold'}`}
      >
        {section}
      </span>
      {label && (
        <>
          <div
            className={`w-3 h-[2px] ${variant === 'crimson' ? 'bg-crimson/30' : 'bg-gold/30'}`}
          />
          <span className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40">
            {label}
          </span>
        </>
      )}
      <div className="flex-1 h-[1px] bg-border/20" />
      {/* Greek philosophy aligned — meander dots */}
      <div className="flex gap-1.5" aria-hidden="true">
        <div className="w-1.5 h-1.5 bg-gold/20 rotate-45" />
        <div className="w-1.5 h-1.5 bg-crimson/20 rotate-45" />
        <div className="w-1.5 h-1.5 bg-gold/20 rotate-45" />
      </div>
    </div>
  );
}

/* ===== Eva Button — with clipped corners ===== */
export function EvaButton({
  children,
  variant = 'gold',
  size = 'default',
  active = false,
  onClick,
  className = '',
}: {
  children: ReactNode;
  variant?: 'gold' | 'crimson' | 'emerald';
  size?: 'sm' | 'default' | 'lg';
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const colors = {
    gold: active
      ? 'bg-gold/15 text-gold'
      : 'text-gold/60 hover:bg-gold/8 hover:text-gold',
    crimson: active
      ? 'bg-crimson/15 text-crimson'
      : 'text-crimson/60 hover:bg-crimson/8 hover:text-crimson',
    emerald: active
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'text-emerald-400/60 hover:bg-emerald-500/8 hover:text-emerald-400',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-[11px]',
    default: 'px-5 py-2.5 text-xs',
    lg: 'px-6 py-3 text-sm',
  };
  const borderColors = {
    gold: 'hsl(43 65% 62% / 0.35)',
    crimson: 'hsl(0 70% 38% / 0.35)',
    emerald: 'hsl(160 60% 45% / 0.35)',
  };

  return (
    <button
      onClick={onClick}
      className={`relative font-mono tracking-[0.12em] uppercase font-bold transition-all duration-300 ${colors[variant]} ${sizes[size]} ${className}`}
      style={{
        clipPath:
          'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          stroke={borderColors[variant]}
          strokeWidth="1"
        />
      </svg>
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* ===== Eva Input ===== */
export function EvaInput({
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
        className="relative group"
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
      >
        <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background/80 border border-border/40 pl-4 pr-14 py-3 font-mono text-base text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-gold/50 transition-colors"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-foreground/30 tracking-wider uppercase">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ===== Eva Progress ===== */
export function EvaProgress({
  value,
  max = 100,
  color = 'gold',
  segments = 20,
}: {
  value: number;
  max?: number;
  color?: 'gold' | 'crimson' | 'emerald';
  segments?: number;
}) {
  const filled = Math.round((value / max) * segments);
  const colors = {
    gold: 'bg-gold',
    crimson: 'bg-crimson',
    emerald: 'bg-emerald-500',
  };
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 ${i < filled ? colors[color] : 'bg-foreground/8'}`}
          style={{
            opacity: i < filled ? 0.4 + (i / segments) * 0.6 : 1,
            clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
          }}
        />
      ))}
    </div>
  );
}

/* ===== BACKWARD COMPAT — old components still used in pages ===== */
export function EvaTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return <ScanTable headers={headers}>{children}</ScanTable>;
}
export function EvaTableRow({
  children,
  highlight = false,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <ChevronTableRow highlight={highlight} index={0}>
      {children}
    </ChevronTableRow>
  );
}
export function EvaDataRow({
  label,
  value,
  valueColor = 'gold',
}: {
  label: string;
  value: string;
  valueColor?: 'gold' | 'crimson' | 'emerald' | 'muted';
}) {
  const colorMap = {
    gold: 'text-gold',
    crimson: 'text-crimson',
    emerald: 'text-emerald-400',
    muted: 'text-foreground/55',
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/10">
      <span className="font-mono text-sm text-foreground/50">{label}</span>
      <span className={`font-mono text-sm font-bold ${colorMap[valueColor]}`}>
        {value}
      </span>
    </div>
  );
}
