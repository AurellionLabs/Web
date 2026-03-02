'use client';

import { useState, useEffect, useRef } from 'react';
import { EvaSectionMarker, GreekKeyStrip } from './eva-panel';

/* =====================================================
   AURELLION ANIMATIONS SHOWCASE
   Brand motion language reference
   EVA aligned + Greek philosophy aligned
   ===================================================== */

/* ===== Helper: animated number counter ===== */
function useCounter(target: number, duration = 2000, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setVal(target);
        clearInterval(id);
      } else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return val;
}

export default function PageAnimations() {
  const [bootPhase, setBootPhase] = useState(0);
  const [magiVotes, setMagiVotes] = useState([false, false, false]);
  const [atFieldStrength, setAtFieldStrength] = useState(0);
  const [selectedQuote, setSelectedQuote] = useState(0);
  const [syncRate, setSyncRate] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Boot sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => setBootPhase(1), 400),
      setTimeout(() => setBootPhase(2), 1200),
      setTimeout(() => setBootPhase(3), 2000),
      setTimeout(() => setBootPhase(4), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // AT Field ramp
  useEffect(() => {
    const id = setInterval(() => {
      setAtFieldStrength((p) => (p >= 100 ? 0 : p + 1));
    }, 50);
    return () => clearInterval(id);
  }, []);

  // Sync rate oscillation
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 0.03;
      setSyncRate(Math.floor(72 + Math.sin(t) * 15 + Math.sin(t * 3) * 5));
    }, 60);
    return () => clearInterval(id);
  }, []);

  // Waveform canvas (EVA aligned -- entry plug psychograph)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let animId: number;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(13,13,13, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // Gold waveform
      ctx.beginPath();
      ctx.strokeStyle = 'hsl(43 65% 62% / 0.8)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x++) {
        const y =
          h / 2 +
          Math.sin((x + frame) * 0.02) * 25 +
          Math.sin((x + frame) * 0.05) * 10 +
          Math.sin((x + frame * 2) * 0.01) * 15;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Crimson waveform
      ctx.beginPath();
      ctx.strokeStyle = 'hsl(0 70% 38% / 0.5)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x++) {
        const y =
          h / 2 +
          Math.cos((x + frame) * 0.025) * 20 +
          Math.sin((x + frame * 1.5) * 0.04) * 12;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Scan line
      const scanX = (frame * 2) % w;
      ctx.beginPath();
      ctx.strokeStyle = 'hsl(43 65% 62% / 0.15)';
      ctx.lineWidth = 1;
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, h);
      ctx.stroke();

      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const tvl = useCounter(2847392, 3000);
  const assets = useCounter(847, 2000);
  const nodes = useCounter(342, 2500);

  const quotes = [
    {
      text: 'The unexamined portfolio is not worth holding.',
      author: 'Socrates of the Chain',
    },
    {
      text: 'We are what we repeatedly tokenize. Excellence, then, is not an act, but a habit.',
      author: 'Aristotle',
    },
    {
      text: 'The measure of an asset is what it does with its liquidity.',
      author: 'Plato',
    },
  ];

  // Cycle quotes
  useEffect(() => {
    const id = setInterval(
      () => setSelectedQuote((p) => (p + 1) % quotes.length),
      5000,
    );
    return () => clearInterval(id);
  }, [quotes.length]);

  return (
    <div className="min-h-screen pt-4 pb-20">
      {/* ===== SECTION 1: BOOT SEQUENCE (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.00"
        label="System Initialization"
        variant="crimson"
      />
      <div className="px-4 md:px-8 mt-4">
        <div
          className="relative bg-card/60 border border-border/30 overflow-hidden"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          }}
        >
          <div className="absolute inset-0 eva-hex-pattern opacity-10 pointer-events-none" />
          <div className="p-6 md:p-8">
            <div className="font-mono text-xs tracking-[0.2em] text-crimson/60 uppercase mb-4">
              NERV-AURELLION SYSTEM BOOT
            </div>
            <div className="space-y-3">
              {[
                {
                  label: 'MAGI CORE INITIALIZATION',
                  delay: 0,
                  code: 'SYS.MAGI.INIT',
                },
                {
                  label: 'AT FIELD GENERATOR ONLINE',
                  delay: 1,
                  code: 'AT.FIELD.GEN',
                },
                {
                  label: 'BLOCKCHAIN SYNC PROTOCOL',
                  delay: 2,
                  code: 'CHAIN.SYNC.V2',
                },
                {
                  label: 'TOKENIZATION ENGINE READY',
                  delay: 3,
                  code: 'TKN.ENGINE.OK',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 transition-all duration-700 ${bootPhase > item.delay ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
                >
                  {/* Status indicator */}
                  <div
                    className={`relative w-6 h-6 flex items-center justify-center transition-all duration-500 ${bootPhase > item.delay ? '' : ''}`}
                  >
                    {bootPhase > item.delay ? (
                      <div
                        className="w-full h-full bg-emerald-500/15 flex items-center justify-center"
                        style={{
                          clipPath:
                            'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        }}
                      >
                        <div
                          className="w-2 h-2 bg-emerald-500 animate-pulse"
                          style={{
                            clipPath:
                              'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-full h-full border border-foreground/10 animate-pulse"
                        style={{
                          clipPath:
                            'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        }}
                      />
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-foreground/80 font-bold">
                        {item.label}
                      </span>
                      <span className="font-mono text-[10px] text-crimson/40 tracking-widest">
                        {item.code}
                      </span>
                    </div>
                    <div
                      className="h-2 bg-background/60 overflow-hidden"
                      style={{
                        clipPath:
                          'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                      }}
                    >
                      <div
                        className={`h-full bg-emerald-500/70 transition-all ease-out ${bootPhase > item.delay ? 'w-full duration-1000' : 'w-0 duration-0'}`}
                        style={{
                          clipPath:
                            'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                        }}
                      />
                    </div>
                  </div>
                  {/* Status text */}
                  <span
                    className={`font-mono text-xs tracking-[0.15em] font-bold transition-all duration-300 ${bootPhase > item.delay ? 'text-emerald-400' : 'text-foreground/20'}`}
                  >
                    {bootPhase > item.delay ? 'ONLINE' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
            {/* Overall status */}
            <div
              className={`mt-6 pt-4 border-t border-border/20 flex items-center gap-4 transition-all duration-700 ${bootPhase >= 4 ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="w-3 h-3 bg-emerald-500 animate-pulse rotate-45" />
              <span className="font-mono text-base text-emerald-400 font-bold tracking-[0.2em]">
                ALL SYSTEMS OPERATIONAL
              </span>
              <span className="font-mono text-xs text-foreground/25 tracking-widest">
                UPTIME: 99.97%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: LIVE WAVEFORM (EVA aligned -- entry plug psychograph) ===== */}
      <EvaSectionMarker
        section="SEC.01"
        label="Psychograph Waveform"
        variant="crimson"
      />
      <div className="px-4 md:px-8 mt-4">
        <div
          className="relative bg-card/40 border border-border/25 overflow-hidden"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          }}
        >
          {/* Corner marks */}
          <div
            className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
            aria-hidden="true"
          >
            <svg width="24" height="24">
              <line
                x1="0"
                y1="0"
                x2="24"
                y2="24"
                stroke="hsl(0 70% 38%)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-[2px]">
                  <div className="w-1.5 h-4 bg-gold" />
                  <div className="w-1 h-4 bg-gold/40" />
                </div>
                <span className="font-mono text-xs tracking-[0.2em] text-foreground/60 uppercase font-bold">
                  Realtime Sensor Data Feed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-crimson animate-pulse rounded-full" />
                <span className="font-mono text-xs text-crimson/80 tracking-wider font-bold">
                  LIVE
                </span>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={900}
              height={120}
              className="w-full h-[120px] bg-background/40"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[10px] text-foreground/25 tracking-widest">
                TARGET: AT FIELD / PATTERN BLUE
              </span>
              <span className="font-mono text-[10px] text-gold/40 tracking-widest">
                ENERGY ORIGIN: EVA-01 CORE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: SPINNING TARGET RETICLE + SYNC RATE (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.02"
        label="Sync Rate Monitor"
        variant="gold"
      />
      <div className="px-4 md:px-8 mt-4">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Spinning target reticle */}
          <div className="relative w-64 h-64 mx-auto md:mx-0 flex-shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Outer ring -- slow spin */}
              <g
                className="origin-center"
                style={{
                  animation: 'spin 20s linear infinite',
                  transformOrigin: '100px 100px',
                }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="hsl(0 70% 38% / 0.25)"
                  strokeWidth="1"
                  strokeDasharray="8 4"
                />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line
                    key={angle}
                    x1="100"
                    y1="10"
                    x2="100"
                    y2="20"
                    stroke="hsl(43 65% 62% / 0.4)"
                    strokeWidth="1.5"
                    transform={`rotate(${angle} 100 100)`}
                  />
                ))}
              </g>
              {/* Middle ring -- reverse spin */}
              <g
                style={{
                  animation: 'spin 12s linear infinite reverse',
                  transformOrigin: '100px 100px',
                }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="65"
                  fill="none"
                  stroke="hsl(43 65% 62% / 0.2)"
                  strokeWidth="0.75"
                  strokeDasharray="4 8"
                />
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <polygon
                    key={angle}
                    points="100,35 103,42 97,42"
                    fill="hsl(43 65% 62% / 0.3)"
                    transform={`rotate(${angle} 100 100)`}
                  />
                ))}
              </g>
              {/* Inner ring -- fast spin */}
              <g
                style={{
                  animation: 'spin 6s linear infinite',
                  transformOrigin: '100px 100px',
                }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="40"
                  fill="none"
                  stroke="hsl(0 70% 38% / 0.35)"
                  strokeWidth="1"
                />
                <line
                  x1="60"
                  y1="100"
                  x2="72"
                  y2="100"
                  stroke="hsl(0 70% 38% / 0.6)"
                  strokeWidth="1.5"
                />
                <line
                  x1="128"
                  y1="100"
                  x2="140"
                  y2="100"
                  stroke="hsl(0 70% 38% / 0.6)"
                  strokeWidth="1.5"
                />
                <line
                  x1="100"
                  y1="60"
                  x2="100"
                  y2="72"
                  stroke="hsl(0 70% 38% / 0.6)"
                  strokeWidth="1.5"
                />
                <line
                  x1="100"
                  y1="128"
                  x2="100"
                  y2="140"
                  stroke="hsl(0 70% 38% / 0.6)"
                  strokeWidth="1.5"
                />
              </g>
              {/* Center dot */}
              <circle cx="100" cy="100" r="6" fill="hsl(0 70% 38% / 0.5)" />
              <circle cx="100" cy="100" r="3" fill="hsl(43 65% 62%)" />
              {/* Crosshairs */}
              <line
                x1="0"
                y1="100"
                x2="200"
                y2="100"
                stroke="hsl(43 65% 62% / 0.06)"
                strokeWidth="0.5"
              />
              <line
                x1="100"
                y1="0"
                x2="100"
                y2="200"
                stroke="hsl(43 65% 62% / 0.06)"
                strokeWidth="0.5"
              />
            </svg>
            {/* Sync percentage overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="font-mono text-4xl font-bold text-gold tabular-nums">
                  {syncRate}
                </span>
                <span className="font-mono text-lg text-gold/50">%</span>
                <div className="font-mono text-[9px] text-crimson/50 tracking-[0.3em] mt-1">
                  SYNC RATE
                </div>
              </div>
            </div>
          </div>

          {/* Sync data panel */}
          <div className="flex-1 space-y-4">
            <div
              className="bg-card/40 border border-border/20 p-5"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
              }}
            >
              <span className="font-mono text-xs text-foreground/40 tracking-[0.2em] uppercase font-bold block mb-3">
                Pilot Neural Connection
              </span>
              {[
                'Harmonics',
                'Neural Depth',
                'Contamination',
                'LCL Pressure',
                'Ego Border',
              ].map((label, i) => {
                const values = [
                  syncRate,
                  Math.max(0, syncRate - 8),
                  0.02,
                  1.0,
                  syncRate + 5,
                ];
                const maxes = [100, 100, 1, 2, 120];
                const fill = (values[i] / maxes[i]) * 100;
                return (
                  <div key={label} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] text-foreground/50">
                        {label}
                      </span>
                      <span className="font-mono text-[11px] text-gold tabular-nums font-bold">
                        {typeof values[i] === 'number' && values[i] % 1 !== 0
                          ? values[i].toFixed(2)
                          : values[i]}
                      </span>
                    </div>
                    <div className="h-1.5 bg-background/60 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${fill > 80 ? 'bg-emerald-500/70' : fill > 50 ? 'bg-gold/70' : 'bg-crimson/70'}`}
                        style={{ width: `${Math.min(100, fill)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 4: MAGI VOTING ANIMATION (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.03"
        label="MAGI Authorization Protocol"
        variant="crimson"
      />
      <div className="px-4 md:px-8 mt-4">
        <div
          className="relative bg-card/50 border border-border/25 p-6 md:p-8"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          }}
        >
          <div className="text-center mb-6">
            <span className="font-mono text-sm text-crimson/70 tracking-[0.3em] uppercase font-bold">
              Proposal: Deploy Tokenization Contract
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                name: 'MELCHIOR-1',
                role: 'Scientific Analysis',
                color: 'gold',
              },
              {
                name: 'BALTHASAR-2',
                role: 'Ethical Judgment',
                color: 'crimson',
              },
              { name: 'CASPER-3', role: 'Maternal Instinct', color: 'gold' },
            ].map((magi, i) => (
              <button
                key={magi.name}
                onClick={() =>
                  setMagiVotes((p) => {
                    const n = [...p];
                    n[i] = !n[i];
                    return n;
                  })
                }
                className="group relative cursor-pointer"
              >
                <div
                  className={`relative py-8 px-6 border transition-all duration-500 ${magiVotes[i] ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : 'border-border/30 bg-card/30 hover:bg-card/50'}`}
                  style={{
                    clipPath:
                      'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                >
                  <div className="text-center">
                    <div className="font-mono text-base font-bold tracking-[0.15em] text-foreground/80 mb-1">
                      {magi.name}
                    </div>
                    <div className="font-mono text-[10px] text-foreground/30 tracking-wider mb-4">
                      {magi.role}
                    </div>
                    {/* Vote indicator */}
                    <div
                      className={`w-10 h-10 mx-auto flex items-center justify-center transition-all duration-500 ${magiVotes[i] ? 'bg-emerald-500/20' : 'bg-foreground/5'}`}
                      style={{
                        clipPath:
                          'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      }}
                    >
                      {magiVotes[i] ? (
                        <span className="font-mono text-xl text-emerald-400 font-bold">
                          OK
                        </span>
                      ) : (
                        <div className="w-3 h-3 border border-foreground/15 rotate-45" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Result bar */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-foreground/40 tracking-wider">
              RESULT:
            </span>
            <div
              className="flex-1 h-3 bg-background/60 overflow-hidden"
              style={{
                clipPath:
                  'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              }}
            >
              <div
                className={`h-full transition-all duration-700 ${magiVotes.filter(Boolean).length >= 2 ? 'bg-emerald-500/70' : magiVotes.filter(Boolean).length === 1 ? 'bg-amber-500/70' : 'bg-crimson/40'}`}
                style={{
                  width: `${(magiVotes.filter(Boolean).length / 3) * 100}%`,
                  clipPath:
                    'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                }}
              />
            </div>
            <span
              className={`font-mono text-sm font-bold tracking-[0.15em] ${magiVotes.filter(Boolean).length >= 2 ? 'text-emerald-400' : magiVotes.filter(Boolean).length === 1 ? 'text-amber-400' : 'text-crimson/50'}`}
            >
              {magiVotes.filter(Boolean).length >= 2
                ? 'APPROVED'
                : magiVotes.filter(Boolean).length === 1
                  ? 'PENDING'
                  : 'AWAITING'}
            </span>
          </div>
        </div>
      </div>

      {/* ===== SECTION 5: AT FIELD STRENGTH GAUGE (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.04"
        label="AT Field Barrier"
        variant="gold"
      />
      <div className="px-4 md:px-8 mt-4">
        <div
          className="relative bg-card/40 border border-border/20 overflow-hidden"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-sm text-foreground/60 tracking-[0.15em] uppercase font-bold">
                A.T. Field In Operation
              </span>
              <span className="font-mono text-sm text-gold tabular-nums font-bold">
                {atFieldStrength}%
              </span>
            </div>
            {/* Honeycomb hex grid that fills with AT Field energy */}
            <div
              className="grid grid-cols-20 gap-[3px]"
              style={{ gridTemplateColumns: 'repeat(20, 1fr)' }}
            >
              {Array.from({ length: 80 }).map((_, i) => {
                const fillThreshold = (i / 80) * 100;
                const isFilled = atFieldStrength > fillThreshold;
                return (
                  <div
                    key={i}
                    className={`aspect-square transition-all duration-150 ${isFilled ? (atFieldStrength > 80 ? 'bg-crimson/60' : atFieldStrength > 50 ? 'bg-gold/50' : 'bg-emerald-500/40') : 'bg-foreground/[0.03]'}`}
                    style={{
                      clipPath:
                        'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="font-mono text-[10px] text-foreground/25 tracking-widest">
                FIELD STRENGTH AT{' '}
                {atFieldStrength > 80
                  ? 'MAXIMUM'
                  : atFieldStrength > 50
                    ? 'NOMINAL'
                    : 'BUILDING'}
              </span>
              {atFieldStrength > 80 && (
                <span className="font-mono text-[10px] text-crimson animate-pulse tracking-widest font-bold">
                  ABSOLUTE TERRITORY
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 6: PHILOSOPHER QUOTE CAROUSEL (Greek philosophy aligned) ===== */}
      <EvaSectionMarker
        section="SEC.05"
        label="Oracle Transmissions"
        variant="gold"
      />
      <div className="px-4 md:px-8 mt-4">
        <GreekKeyStrip color="gold" />
        <div className="relative bg-card/30 border-x border-b border-border/15 py-12 px-8 text-center overflow-hidden">
          {/* Laurel wreath decoration -- Greek philosophy aligned */}
          <svg
            className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-16 opacity-10"
            viewBox="0 0 120 50"
            aria-hidden="true"
          >
            <path
              d="M60 45 C40 40, 20 30, 10 5 C20 15, 35 25, 60 30"
              fill="none"
              stroke="hsl(43 65% 62%)"
              strokeWidth="1"
            />
            <path
              d="M60 45 C80 40, 100 30, 110 5 C100 15, 85 25, 60 30"
              fill="none"
              stroke="hsl(43 65% 62%)"
              strokeWidth="1"
            />
            {[15, 25, 35, 45].map((x) => (
              <ellipse
                key={x}
                cx={x}
                cy={35 - x * 0.4}
                rx="4"
                ry="8"
                fill="none"
                stroke="hsl(43 65% 62%)"
                strokeWidth="0.5"
                transform={`rotate(-${20 + x * 0.5} ${x} ${35 - x * 0.4})`}
              />
            ))}
            {[75, 85, 95, 105].map((x) => (
              <ellipse
                key={x}
                cx={x}
                cy={35 - (120 - x) * 0.4}
                rx="4"
                ry="8"
                fill="none"
                stroke="hsl(43 65% 62%)"
                strokeWidth="0.5"
                transform={`rotate(${20 + (120 - x) * 0.5} ${x} ${35 - (120 - x) * 0.4})`}
              />
            ))}
          </svg>
          {/* Animated quote */}
          <div className="relative">
            {quotes.map((q, i) => (
              <div
                key={i}
                className={`transition-all duration-1000 ${selectedQuote === i ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 translate-y-4'}`}
              >
                <span className="font-serif text-2xl md:text-3xl text-gold/80 italic leading-relaxed block max-w-2xl mx-auto">
                  {`"${q.text}"`}
                </span>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <div className="w-8 h-[1px] bg-gold/25" />
                  <span className="font-mono text-xs text-foreground/35 tracking-[0.2em] uppercase">
                    {q.author}
                  </span>
                  <div className="w-8 h-[1px] bg-gold/25" />
                </div>
              </div>
            ))}
          </div>
          {/* Quote indicators */}
          <div className="flex items-center justify-center gap-3 mt-8">
            {quotes.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedQuote(i)}
                className={`w-2 h-2 rotate-45 transition-all duration-500 ${selectedQuote === i ? 'bg-gold scale-125' : 'bg-foreground/15 hover:bg-foreground/25'}`}
              />
            ))}
          </div>
        </div>
        <GreekKeyStrip color="gold" />
      </div>

      {/* ===== SECTION 7: COUNTER ANIMATIONS (Greek philosophy aligned) ===== */}
      <EvaSectionMarker
        section="SEC.06"
        label="Protocol Metrics"
        variant="gold"
      />
      <div className="px-4 md:px-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'Total Value Locked',
              value: tvl,
              prefix: '$',
              suffix: '',
              format: true,
            },
            {
              label: 'Assets Tokenized',
              value: assets,
              prefix: '',
              suffix: '',
              format: false,
            },
            {
              label: 'Active Nodes',
              value: nodes,
              prefix: '',
              suffix: '',
              format: false,
            },
          ].map((item, i) => (
            <div key={i} className="relative group">
              <div
                className="relative py-8 px-6 bg-card/50 border border-border/20 text-center transition-all duration-300 hover:border-gold/25"
                style={{
                  clipPath:
                    i === 1
                      ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                      : 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
                }}
              >
                {/* Decorative hex pattern */}
                <div className="absolute inset-0 eva-hex-pattern opacity-15 pointer-events-none" />
                <span className="font-mono text-xs tracking-[0.25em] uppercase text-foreground/40 block mb-3">
                  {item.label}
                </span>
                <span className="font-mono text-4xl font-bold text-gold tabular-nums">
                  {item.prefix}
                  {item.format ? item.value.toLocaleString() : item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== SECTION 8: ANIMATED CHEVRON DATA STREAM (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.07"
        label="Active Data Stream"
        variant="crimson"
      />
      <div className="px-4 md:px-8 mt-4">
        <div
          className="relative h-16 bg-card/30 border border-border/15 overflow-hidden"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
          }}
        >
          {/* Scrolling chevrons */}
          <div
            className="absolute inset-0 flex items-center"
            style={{ animation: 'ticker 4s linear infinite' }}
          >
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 mx-1">
                <svg width="24" height="40" viewBox="0 0 24 40">
                  <polygon
                    points="0,0 20,0 24,20 20,40 0,40 4,20"
                    fill={
                      i % 3 === 0
                        ? 'hsl(0 70% 38% / 0.2)'
                        : 'hsl(43 65% 62% / 0.12)'
                    }
                    stroke={
                      i % 3 === 0
                        ? 'hsl(0 70% 38% / 0.3)'
                        : 'hsl(43 65% 62% / 0.15)'
                    }
                    strokeWidth="0.5"
                  />
                </svg>
              </div>
            ))}
          </div>
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <span className="font-mono text-sm text-foreground/50 tracking-[0.4em] uppercase font-bold">
              Processing Blocks
            </span>
          </div>
        </div>
      </div>

      {/* ===== SECTION 9: PULSING HEX NETWORK (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.08"
        label="Network Topology"
        variant="gold"
      />
      <div className="px-4 md:px-8 mt-4">
        <div
          className="relative h-64 bg-card/20 border border-border/15 overflow-hidden"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          }}
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 800 256"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            {Array.from({ length: 20 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * 42}
                y1="0"
                x2={i * 42}
                y2="256"
                stroke="hsl(43 65% 62% / 0.04)"
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1="0"
                y1={i * 36}
                x2="800"
                y2="256"
                stroke="hsl(43 65% 62% / 0.04)"
                strokeWidth="0.5"
              />
            ))}
            {/* Node hexagons with animated pulse */}
            {[
              { cx: 120, cy: 80 },
              { cx: 300, cy: 140 },
              { cx: 450, cy: 60 },
              { cx: 550, cy: 180 },
              { cx: 680, cy: 100 },
              { cx: 200, cy: 200 },
              { cx: 400, cy: 130 },
            ].map((node, i) => (
              <g key={i}>
                {/* Connection lines */}
                {i > 0 && (
                  <line
                    x1={[120, 300, 450, 550, 680, 200, 400][i - 1]}
                    y1={[80, 140, 60, 180, 100, 200, 130][i - 1]}
                    x2={node.cx}
                    y2={node.cy}
                    stroke="hsl(43 65% 62% / 0.1)"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                )}
                {/* Pulse ring */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="20"
                  fill="none"
                  stroke="hsl(43 65% 62% / 0.15)"
                  strokeWidth="0.5"
                >
                  <animate
                    attributeName="r"
                    values="15;30;15"
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0;0.3"
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Hex node */}
                <polygon
                  points={`${node.cx},${node.cy - 10} ${node.cx + 9},${node.cy - 5} ${node.cx + 9},${node.cy + 5} ${node.cx},${node.cy + 10} ${node.cx - 9},${node.cy + 5} ${node.cx - 9},${node.cy - 5}`}
                  fill={
                    i === 3 ? 'hsl(0 70% 38% / 0.3)' : 'hsl(43 65% 62% / 0.2)'
                  }
                  stroke={
                    i === 3 ? 'hsl(0 70% 38% / 0.6)' : 'hsl(43 65% 62% / 0.4)'
                  }
                  strokeWidth="1"
                />
                {/* Center dot */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="2"
                  fill={i === 3 ? 'hsl(0 70% 38%)' : 'hsl(43 65% 62%)'}
                >
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${i * 0.3}s`}
                  />
                </circle>
                {/* Label */}
                <text
                  x={node.cx}
                  y={node.cy + 22}
                  textAnchor="middle"
                  fill="hsl(43 65% 62% / 0.3)"
                  fontSize="7"
                  fontFamily="monospace"
                  letterSpacing="2"
                >
                  {`NODE-${String(i + 1).padStart(2, '0')}`}
                </text>
              </g>
            ))}
          </svg>
          {/* Legend */}
          <div className="absolute bottom-3 right-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 bg-gold/50"
                style={{
                  clipPath:
                    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="font-mono text-[9px] text-foreground/25 tracking-wider">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 bg-crimson/50"
                style={{
                  clipPath:
                    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              />
              <span className="font-mono text-[9px] text-foreground/25 tracking-wider">
                SYNCING
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 10: CASCADING LOAD BARS (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.09"
        label="Entry Plug Loading"
        variant="crimson"
      />
      <div className="px-4 md:px-8 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'LCL FILL',
            'PLUG DEPTH',
            'A10 NERVE',
            'NEURAL LINK',
            'CORE TEMP',
            'SYNC NOISE',
            'EGO WALL',
            'S2 ENGINE',
          ].map((label, i) => (
            <CascadeBar key={label} label={label} delay={i * 200} index={i} />
          ))}
        </div>
      </div>

      {/* ===== SECTION 11: TYPING CONSOLE (EVA aligned) ===== */}
      <EvaSectionMarker
        section="SEC.10"
        label="Terminal Output"
        variant="crimson"
      />
      <div className="px-4 md:px-8 mt-4 mb-12">
        <TerminalOutput />
      </div>
    </div>
  );
}

/* ===== Cascading Bar Component ===== */
function CascadeBar({
  label,
  delay,
  index,
}: {
  label: string;
  delay: number;
  index: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const target = 40 + Math.random() * 55;
    const timeout = setTimeout(() => {
      const id = setInterval(() => {
        setWidth((p) => {
          if (p >= target) {
            clearInterval(id);
            return target;
          }
          return p + 2;
        });
      }, 30);
      return () => clearInterval(id);
    }, delay + 800);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      className="bg-card/40 border border-border/15 p-3"
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-foreground/40 tracking-wider">
          {label}
        </span>
        <span className="font-mono text-xs text-gold tabular-nums font-bold">
          {Math.round(width)}%
        </span>
      </div>
      <div
        className="h-2 bg-background/60 overflow-hidden"
        style={{
          clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
        }}
      >
        <div
          className={`h-full transition-all duration-100 ${width > 80 ? 'bg-emerald-500/60' : width > 50 ? 'bg-gold/60' : 'bg-crimson/50'}`}
          style={{
            width: `${width}%`,
            clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
          }}
        />
      </div>
      {/* Mini hex indicators */}
      <div className="flex gap-[2px] mt-2">
        {Array.from({ length: 8 }).map((_, j) => (
          <div
            key={j}
            className={`w-2 h-2 transition-all ${(j / 8) * 100 < width ? (index % 2 === 0 ? 'bg-gold/30' : 'bg-crimson/25') : 'bg-foreground/[0.04]'}`}
            style={{
              clipPath:
                'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ===== Terminal Output Component (EVA aligned) ===== */
function TerminalOutput() {
  const [lines, setLines] = useState<string[]>([]);
  const allLines = [
    '> INITIALIZING AURELLION PROTOCOL v2.1.7...',
    '> CONNECTING TO ETHEREUM MAINNET...',
    '> BLOCK: 19,847,293 | GAS: 12 GWEI',
    '> MAGI SYSTEM CHECK: MELCHIOR [OK] BALTHASAR [OK] CASPER [OK]',
    '> AT FIELD GENERATOR: ONLINE',
    '> TOKENIZATION ENGINE: LOADED',
    '> LOADING ASSET REGISTRY...',
    '> FOUND 847 REGISTERED ASSETS',
    '> SYNC RATE: 78.4% | STATUS: NOMINAL',
    '> COMPLIANCE MODULE: ACTIVE (18 JURISDICTIONS)',
    '> ORACLE FEED: CONNECTED',
    '> "The beginning of wisdom is the definition of terms." - Socrates',
    '> SYSTEM READY. AWAITING OPERATOR INPUT.',
    '> _',
  ];

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (i < allLines.length) {
        setLines((p) => [...p, allLines[i]]);
        i++;
      } else {
        i = 0;
        setLines([]);
      }
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative bg-background border border-border/30 overflow-hidden"
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
      }}
    >
      {/* Corner accent */}
      <svg
        className="absolute top-0 right-0 w-5 h-5 pointer-events-none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="0"
          x2="20"
          y2="20"
          stroke="hsl(0 70% 38%)"
          strokeWidth="1.5"
        />
      </svg>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/20 bg-card/30">
        <div className="flex gap-[2px]">
          <div className="w-1.5 h-3 bg-crimson" />
          <div className="w-1 h-3 bg-crimson/40" />
        </div>
        <span className="font-mono text-xs text-foreground/50 tracking-[0.15em] uppercase font-bold">
          NERV Terminal
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-mono text-[10px] text-emerald-500/60 tracking-wider">
            ACTIVE
          </span>
        </div>
      </div>
      {/* Output */}
      <div className="p-4 h-[280px] overflow-y-auto font-mono text-sm leading-6">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${line.startsWith('> "') ? 'text-gold/60 italic' : line.includes('[OK]') ? 'text-emerald-400/80' : line === '> _' ? 'text-gold animate-pulse' : 'text-foreground/50'}`}
          >
            {line}
          </div>
        ))}
      </div>
      {/* Scanline overlay */}
      <div className="absolute inset-0 eva-scanlines pointer-events-none" />
    </div>
  );
}
