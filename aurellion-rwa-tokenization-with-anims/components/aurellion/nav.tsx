'use client';

import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', id: 'dashboard' },
  { label: 'P2P', id: 'p2p' },
  { label: 'Node', id: 'node' },
  { label: 'Components', id: 'components' },
  { label: 'Animations', id: 'animations' },
];

// Hide trading, yield, faucet on production
const isProd = process.env.NODE_ENV === 'production';
const devOnlyItems = [
  { label: 'Yield', id: 'yield' },
  { label: 'Trading', id: 'trading' },
  { label: 'Faucet', id: 'faucet' },
];
const visibleNavItems = isProd ? navItems : [...navItems, ...devOnlyItems];

export default function AurellionNav({
  activePage,
  onNavigate,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative z-40">
      {/* Top system ticker */}
      <div className="h-7 bg-background border-b border-border/25 overflow-hidden flex items-center relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-crimson/10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-crimson/10" />
        <div className="flex items-center animate-ticker-fast whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="font-mono text-[11px] tracking-[0.15em] uppercase text-foreground/25 mx-8"
            >
              AURELLION PROTOCOL v2.1 &middot; MAINNET &middot; BLOCK 19,847,293
              &middot; GAS 12 GWEI &middot; ETH $3,842.17 &middot; TVL $2.4B
              &middot; 847 ASSETS TOKENIZED &middot;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* Main nav */}
      <nav className="relative flex items-center justify-between px-4 md:px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border/35">
        {/* Left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/25" />

        {/* Logo */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 group"
        >
          <div className="relative w-10 h-10 bg-card/80 border border-gold/40 group-hover:border-gold/70 transition-colors duration-300 overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-2.5 h-[2px] bg-crimson" />
            <div className="absolute top-0 left-0 w-[2px] h-2.5 bg-crimson" />
            <div className="absolute bottom-0 right-0 w-2.5 h-[2px] bg-crimson/50" />
            <div className="absolute bottom-0 right-0 w-[2px] h-2.5 bg-crimson/50" />
            {/* Hex bg */}
            <div className="absolute inset-0 eva-hex-pattern opacity-30" />
            <span className="absolute inset-0 flex items-center justify-center font-serif text-base text-gold font-bold">
              A
            </span>
          </div>
          <div className="hidden md:block">
            <span className="font-serif text-lg tracking-wide text-foreground block leading-none">
              Aurellion
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-crimson/70 font-bold">
              Protocol v2.1
            </span>
          </div>
        </button>

        {/* Nav items */}
        <div className="flex items-center gap-[2px]">
          {visibleNavItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`relative px-4 py-2.5 font-mono text-sm tracking-[0.12em] uppercase transition-all duration-300 font-bold ${
                  isActive
                    ? 'text-gold'
                    : 'text-foreground/40 hover:text-foreground/75'
                }`}
              >
                {isActive && (
                  <>
                    <div className="absolute inset-0 border border-gold/30 bg-gold/[0.04]" />
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gold/70" />
                    <div className="absolute top-0 left-0 w-2 h-[2px] bg-crimson" />
                    <div className="absolute top-0 left-0 w-[2px] h-2 bg-crimson" />
                    <div className="absolute top-0 right-0 w-2 h-[2px] bg-crimson" />
                  </>
                )}
                {hoveredItem === item.id && !isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-foreground/20" />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* System time */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 bg-card/50 border border-border/30">
            <div className="flex gap-[2px]">
              <div className="w-1 h-3 bg-crimson/40" />
              <div className="w-0.5 h-3 bg-crimson/20" />
            </div>
            <span className="font-mono text-[11px] tracking-[0.08em] text-crimson/60 uppercase font-bold">
              SYS
            </span>
            <span className="font-mono text-sm tabular-nums text-foreground/50 font-bold">
              {time}
            </span>
          </div>

          {/* Network */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-2 border border-emerald-500/25 bg-emerald-500/[0.04]">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-30" />
            </div>
            <span className="font-mono text-sm tracking-[0.12em] uppercase text-emerald-400 font-bold">
              Mainnet
            </span>
          </div>

          {/* Wallet */}
          <button className="relative flex items-center gap-2.5 border border-gold/30 hover:border-gold/60 px-4 py-2 transition-colors duration-300 group">
            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/30 group-hover:bg-gold/60 transition-colors" />
            <div className="w-2.5 h-2.5 bg-gold/60 group-hover:bg-gold rotate-45 transition-colors" />
            <span className="font-mono text-sm tracking-[0.08em] text-gold/80 group-hover:text-gold transition-colors font-bold">
              0xFdE9...BbaF
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom accent — Eva hazard style */}
      <div className="flex h-[3px]">
        <div className="w-12 bg-crimson/50" />
        <div className="flex-1 eva-hazard" />
        <div className="w-32 bg-crimson/25" />
        <div className="flex-1 eva-hazard" />
        <div className="w-12 bg-crimson/50" />
      </div>
    </header>
  );
}
