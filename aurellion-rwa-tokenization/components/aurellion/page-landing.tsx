'use client';

import { useEffect, useState } from 'react';

export default function PageLanding({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Parallax background */}
        <div
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        >
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-k8MgYEMT9xtq3bQNq1CzDbIUyRVqWH.png"
            alt=""
            className="w-full h-[130%] object-cover opacity-25"
          />
          <div className="absolute inset-0 eva-scanlines" />
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />

        {/* Grid overlay */}
        <div className="absolute inset-0 eva-grid opacity-50" />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col min-h-screen pt-20">
          {/* Top system bar */}
          <div className="flex items-center justify-between px-6 md:px-16 pt-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-[1px] bg-crimson/50" />
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-crimson/60">
                Protocol Status: Live
              </span>
            </div>
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-foreground/30">
              EST. MMXXIV
            </span>
          </div>

          {/* Main hero layout */}
          <div className="flex-1 flex items-center px-6 md:px-16 lg:px-24">
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left column - editorial text */}
              <div
                className={`lg:col-span-7 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              >
                {/* Section tag */}
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-[3px] h-5 bg-crimson/60" />
                  <span className="font-mono text-xs tracking-[0.3em] uppercase text-crimson/70">
                    Real World Asset Tokenization
                  </span>
                </div>

                {/* Main headline */}
                <h1 className="font-serif text-5xl md:text-7xl xl:text-8xl leading-[0.85] tracking-tight mb-10">
                  <span className="text-gold block text-balance">The New</span>
                  <span className="text-foreground block text-balance">
                    Agora of
                  </span>
                  <span className="italic text-crimson block">Value</span>
                </h1>

                {/* Description with left rule */}
                <div className="flex gap-4 mb-12 max-w-lg">
                  <div className="w-[1px] bg-gold/30 shrink-0 mt-1" />
                  <p className="font-sans text-base leading-relaxed text-foreground/60">
                    Where ancient wisdom meets modern finance. Tokenize
                    real-world assets with the precision of philosophy and the
                    power of blockchain. Every asset undergoes rigorous
                    compliance, legal structuring, and custodial verification.
                  </p>
                </div>

                {/* CTA buttons */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="relative group px-8 py-4 bg-gold/[0.08] border border-gold/50 hover:border-gold hover:bg-gold/[0.15] transition-all duration-500"
                  >
                    <div className="absolute top-0 left-0 w-3 h-[1px] bg-crimson" />
                    <div className="absolute top-0 left-0 w-[1px] h-3 bg-crimson" />
                    <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-crimson" />
                    <div className="absolute bottom-0 right-0 w-[1px] h-3 bg-crimson" />
                    <span className="font-mono text-sm tracking-[0.2em] uppercase text-gold">
                      Launch App
                    </span>
                  </button>
                  <button className="px-8 py-4 border border-border/40 hover:border-foreground/30 transition-colors duration-500">
                    <span className="font-mono text-sm tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground/80">
                      Read Protocol
                    </span>
                  </button>
                </div>
              </div>

              {/* Right column - data readout panel */}
              <div
                className={`lg:col-span-5 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              >
                <div className="relative border border-border/60 bg-card/60 backdrop-blur-sm">
                  {/* Panel corners */}
                  <div className="absolute -top-px -left-px w-5 h-[1px] bg-crimson" />
                  <div className="absolute -top-px -left-px w-[1px] h-5 bg-crimson" />
                  <div className="absolute -top-px -right-px w-5 h-[1px] bg-gold/40" />
                  <div className="absolute -top-px -right-px w-[1px] h-5 bg-gold/40" />
                  <div className="absolute -bottom-px -left-px w-5 h-[1px] bg-gold/40" />
                  <div className="absolute -bottom-px -left-px w-[1px] h-5 bg-gold/40" />
                  <div className="absolute -bottom-px -right-px w-5 h-[1px] bg-crimson" />
                  <div className="absolute -bottom-px -right-px w-[1px] h-5 bg-crimson" />

                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-[3px] h-4 bg-gold/70" />
                      <span className="font-mono text-xs tracking-[0.15em] uppercase text-gold">
                        Protocol Overview
                      </span>
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.15em] text-crimson/45">
                      SYS.001
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2">
                    {[
                      {
                        label: 'Total Value Locked',
                        value: '$2.4B',
                        sub: '+12.3% 30d',
                      },
                      {
                        label: 'Assets Tokenized',
                        value: '847',
                        sub: '+23 this week',
                      },
                      {
                        label: 'Active Holders',
                        value: '12,419',
                        sub: '94% retention',
                      },
                      {
                        label: 'Compliance Rate',
                        value: '99.8%',
                        sub: 'All jurisdictions',
                      },
                    ].map((stat, i) => (
                      <div
                        key={stat.label}
                        className={`p-5 ${i < 2 ? 'border-b border-border/25' : ''} ${i % 2 === 0 ? 'border-r border-border/25' : ''}`}
                      >
                        <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-foreground/40 block mb-2">
                          {stat.label}
                        </span>
                        <span className="font-mono text-2xl font-bold text-gold block">
                          {stat.value}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-400 mt-1.5 block">
                          {stat.sub}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom status bar */}
                  <div className="px-4 py-2.5 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-30" />
                      </div>
                      <span className="font-mono text-[11px] tracking-[0.15em] text-emerald-400">
                        ALL SYSTEMS NOMINAL
                      </span>
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.1em] text-foreground/25">
                      BLK 19,847,293
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom asset ticker */}
          <div className="border-t border-border/30 bg-card/30 backdrop-blur-sm">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Real Estate', val: '$890M' },
                { label: 'Commodities', val: '$620M' },
                { label: 'Private Credit', val: '$540M' },
                { label: 'Fine Art', val: '$350M' },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`px-6 py-4 flex items-center justify-between ${i < 3 ? 'border-r border-border/15' : ''}`}
                >
                  <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-foreground/40">
                    {item.label}
                  </span>
                  <span className="font-mono text-base text-gold">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 02: Featured Assets ===== */}
      <section className="relative border-t border-border/20">
        <div className="flex items-center gap-3 px-6 md:px-16 pt-16 mb-12">
          <div className="w-[3px] h-5 bg-crimson/60" />
          <span className="font-mono text-xs tracking-[0.3em] uppercase text-crimson/55">
            Section 02
          </span>
          <span className="font-mono text-xs text-foreground/20">/</span>
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/30">
            Featured Classes
          </span>
          <div className="flex-1 h-[1px] bg-border/20" />
        </div>

        <div className="px-6 md:px-16 lg:px-24 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Section header */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
              <div className="lg:col-span-6">
                <h2 className="font-serif text-3xl md:text-5xl leading-tight text-balance">
                  <span className="text-gold">Featured</span>{' '}
                  <span className="text-foreground/80">Asset Classes</span>
                </h2>
              </div>
              <div className="lg:col-span-6 flex items-end lg:justify-end">
                <p className="font-sans text-base text-foreground/45 leading-relaxed max-w-md">
                  Each asset undergoes rigorous compliance vetting, legal
                  structuring, and custodial verification before tokenization.
                </p>
              </div>
            </div>

            {/* Asset cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-border/15">
              {[
                {
                  name: 'Manhattan RE Fund IV',
                  type: 'Real Estate',
                  apy: '8.2%',
                  tvl: '$420M',
                  id: 'RE-0041',
                },
                {
                  name: 'Sovereign Gold Reserve',
                  type: 'Commodities',
                  apy: '4.1%',
                  tvl: '$180M',
                  id: 'CM-0017',
                },
                {
                  name: 'Renaissance Art Trust',
                  type: 'Fine Art',
                  apy: '12.7%',
                  tvl: '$95M',
                  id: 'FA-0008',
                },
              ].map((asset) => (
                <div
                  key={asset.id}
                  className="relative bg-card/60 group cursor-pointer hover:bg-card transition-colors duration-500"
                >
                  <div className="h-[2px] bg-gold/10 group-hover:bg-gold/30 transition-colors duration-500" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-mono text-[11px] tracking-[0.15em] text-crimson/50">
                        {asset.id}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-mono text-[11px] tracking-[0.15em] text-emerald-400 uppercase">
                          Live
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-crimson/45 block mb-1">
                      {asset.type}
                    </span>

                    <h3 className="font-serif text-xl text-foreground/80 group-hover:text-gold transition-colors duration-500 mb-8">
                      {asset.name}
                    </h3>

                    <div className="border-t border-border/25 pt-4 flex justify-between items-end">
                      <div>
                        <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/30 block mb-1">
                          APY
                        </span>
                        <span className="font-mono text-2xl font-bold text-gold">
                          {asset.apy}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/30 block mb-1">
                          TVL
                        </span>
                        <span className="font-mono text-base text-foreground/60">
                          {asset.tvl}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 03: Workflow ===== */}
      <section className="relative border-t border-border/20 bg-card/20">
        <div className="absolute inset-0 eva-hex-pattern" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 px-6 md:px-16 pt-16 mb-12">
            <div className="w-[3px] h-5 bg-gold/60" />
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-gold/50">
              Section 03
            </span>
            <span className="font-mono text-xs text-foreground/20">/</span>
            <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/30">
              Process
            </span>
            <div className="flex-1 h-[1px] bg-border/20" />
          </div>

          <div className="px-6 md:px-16 lg:px-24 pb-24">
            <div className="max-w-7xl mx-auto">
              <h2 className="font-serif text-3xl md:text-5xl leading-tight mb-20 text-balance">
                Tokenization{' '}
                <span className="italic text-crimson">Workflow</span>
              </h2>

              {/* 5-step process */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-[1px]">
                {[
                  {
                    step: '01',
                    label: 'Asset Intake',
                    desc: 'Due diligence, valuations, and legal review of the underlying asset',
                  },
                  {
                    step: '02',
                    label: 'Compliance',
                    desc: 'KYC/AML verification and regulatory framework alignment',
                  },
                  {
                    step: '03',
                    label: 'Structuring',
                    desc: 'Fractional pools, custodial setup, and legal wrappers',
                  },
                  {
                    step: '04',
                    label: 'Tokenization',
                    desc: 'On-chain issuance with audited smart contracts',
                  },
                  {
                    step: '05',
                    label: 'Market Access',
                    desc: 'Secondary trading, liquidity pools, and settlement',
                  },
                ].map((s) => (
                  <div key={s.step} className="group">
                    <div className="border border-border/25 bg-background/80 p-5 h-full hover:border-gold/30 transition-colors duration-500">
                      <div className="flex items-center gap-2 mb-5">
                        <span className="font-mono text-sm font-bold text-crimson/60 group-hover:text-crimson transition-colors">
                          {s.step}
                        </span>
                        <div className="flex-1 h-[1px] bg-border/20 group-hover:bg-gold/20 transition-colors" />
                      </div>
                      <h3 className="font-mono text-sm tracking-[0.1em] uppercase text-gold group-hover:text-gold-light transition-colors mb-3">
                        {s.label}
                      </h3>
                      <p className="font-sans text-sm text-foreground/45 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 04: Philosophy quote ===== */}
      <section className="border-t border-border/20 py-24 md:py-32">
        <div className="px-6 md:px-16 lg:px-24 max-w-4xl mx-auto text-center">
          <div className="w-10 h-[1px] bg-gold/30 mx-auto mb-8" />
          <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl italic text-foreground/50 leading-relaxed mb-8 text-pretty">
            {
              '"The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane."'
            }
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-[1px] bg-crimson/30" />
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-crimson/50">
              Marcus Aurelius
            </span>
            <div className="w-8 h-[1px] bg-crimson/30" />
          </div>
        </div>
      </section>

      {/* ===== SECTION 05: CTA ===== */}
      <section className="border-t border-border/20">
        <div className="px-6 md:px-16 lg:px-24 py-24">
          <div className="max-w-7xl mx-auto text-center">
            <span className="font-mono text-xs tracking-[0.4em] uppercase text-crimson/50 block mb-8">
              Join the Agora
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-gold mb-5">
              Begin Tokenizing
            </h2>
            <p className="font-sans text-base text-foreground/45 max-w-md mx-auto mb-12">
              Connect your wallet and explore the marketplace of tokenized
              real-world assets.
            </p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="relative px-10 py-4 bg-gold/[0.08] border border-gold/40 hover:border-gold hover:bg-gold/[0.15] transition-all duration-500"
            >
              <div className="absolute top-0 left-0 w-3 h-[1px] bg-crimson" />
              <div className="absolute top-0 left-0 w-[1px] h-3 bg-crimson" />
              <div className="absolute bottom-0 right-0 w-3 h-[1px] bg-crimson" />
              <div className="absolute bottom-0 right-0 w-[1px] h-3 bg-crimson" />
              <span className="font-mono text-sm tracking-[0.2em] uppercase text-gold">
                Enter Platform
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/20 px-6 md:px-16 py-5 flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/25">
            AURELLION PROTOCOL / MMXXIV
          </span>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Docs'].map((item) => (
              <span
                key={item}
                className="font-mono text-[11px] tracking-[0.15em] text-foreground/25 hover:text-foreground/50 cursor-pointer transition-colors"
              >
                {item}
              </span>
            ))}
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/25">
            BUILT ON ETHEREUM
          </span>
        </div>
      </section>

      {/* Bottom marquee */}
      <div className="border-t border-border/10 py-3 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="font-mono text-xs tracking-[0.3em] uppercase text-gold/[0.08] mx-4"
            >
              Real Estate &middot; Gold &middot; Art &middot; Bonds &middot;
              Carbon Credits &middot; Infrastructure &middot; Commodities
              &middot; Private Equity &middot;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
