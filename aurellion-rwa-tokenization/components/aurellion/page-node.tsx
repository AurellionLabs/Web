'use client';

import { useState, useEffect } from 'react';
import {
  EvaPanel,
  EvaScanLine,
  EvaStatusBadge,
  EvaSectionMarker,
  TrapButton,
  ScanTable,
  ChevronTableRow,
  EvaProgress,
  HexStatCard,
  GreekKeyStrip,
  DataScatter,
  TargetRings,
  LaurelAccent,
  HexCluster,
  EvaSystemReadout,
} from './eva-panel';

function AnimatedValue({ value, label }: { value: string; label: string }) {
  const [display, setDisplay] = useState('---');
  useEffect(() => {
    const timeout = setTimeout(
      () => setDisplay(value),
      400 + Math.random() * 600,
    );
    return () => clearTimeout(timeout);
  }, [value]);
  return (
    <div>
      <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/45 block mb-2 font-bold">
        {label}
      </span>
      <span
        className={`font-mono text-3xl font-bold block transition-colors duration-300 tabular-nums ${display === '---' ? 'text-foreground/20' : 'text-gold'}`}
      >
        {display}
      </span>
    </div>
  );
}

export default function PageNode() {
  const [expandedDoc, setExpandedDoc] = useState(false);
  const [mapPulse, setMapPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMapPulse(true);
      setTimeout(() => setMapPulse(false), 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* DECORATIVE: Floating data scatter — EVA aligned */}
      <DataScatter className="inset-0 h-full w-full" />

      {/* Page header */}
      <div className="px-4 md:px-8 pt-6 pb-4 flex items-start justify-between relative">
        <div className="flex items-start gap-5">
          {/* DECORATIVE: Laurel wreath — Greek philosophy aligned */}
          <LaurelAccent side="left" className="hidden md:block mt-1" />
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">
              Node Dashboard
            </h1>
            <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40 mt-1">
              Manage your node and its assets
            </p>
            {/* DECORATIVE: Greek key underline — Greek philosophy aligned */}
            <GreekKeyStrip color="crimson" />
          </div>
        </div>
        <TrapButton variant="crimson">+ Add Asset</TrapButton>
      </div>

      <EvaScanLine variant="mixed" />

      {/* Top stats — HEX CARDS */}
      <div className="px-4 md:px-8 py-6 relative">
        {/* DECORATIVE: Hex cluster — EVA aligned */}
        <HexCluster size="md" className="absolute top-2 right-8" />

        <div className="grid grid-cols-12 gap-3">
          {/* Node Status — large notched card */}
          <div
            className="col-span-12 md:col-span-5 relative overflow-hidden"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
            }}
          >
            <div
              className="absolute inset-0 bg-card/70"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
              }}
            />
            <div className="absolute top-0 left-0 w-1 bottom-4 bg-emerald-500/40" />
            <div className="absolute inset-0 eva-hex-pattern opacity-20 pointer-events-none" />
            {/* DECORATIVE: System readout — EVA aligned */}
            <EvaSystemReadout
              lines={['NODE.CTRL', 'UPTIME:OK', 'SYNC:100%']}
              position="right"
            />
            {/* DECORATIVE: Corner cut line — EVA aligned */}
            <svg
              className="absolute top-0 right-0 w-5 h-5 pointer-events-none"
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="0"
                x2="20"
                y2="20"
                stroke="hsl(0 70% 38% / 0.4)"
                strokeWidth="1.5"
              />
            </svg>
            <div className="relative p-6 ml-1">
              <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/45 block mb-3 font-bold">
                Node Status
              </span>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                  <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping opacity-30" />
                </div>
                <span className="font-mono text-4xl font-bold text-emerald-400">
                  Active
                </span>
              </div>
              <EvaProgress value={99} color="emerald" />
              <div className="mt-4 pt-3 border-t border-border/15 flex items-center justify-between">
                <span className="font-mono text-sm text-foreground/35 uppercase tracking-wider">
                  Uptime
                </span>
                <span className="font-mono text-lg font-bold text-gold tabular-nums">
                  99.97%
                </span>
              </div>
            </div>
          </div>

          {/* Hex stat cards */}
          <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-3">
            <HexStatCard
              label="Supported Assets"
              value="3"
              sub="Total assets tokenized"
              color="gold"
              powerLevel={3}
            />
            <HexStatCard
              label="Total Quantity"
              value="3,437"
              sub="Total tokenized units"
              color="gold"
              powerLevel={7}
            />
          </div>
        </div>

        {/* DECORATIVE: Greek key below stats — Greek philosophy aligned */}
        <div className="mt-4">
          <GreekKeyStrip color="gold" />
        </div>
      </div>

      <EvaSectionMarker
        section="SEC.01"
        label="Asset Registry"
        variant="gold"
      />

      {/* Tokenized Assets Summary */}
      <div className="px-4 md:px-8 relative">
        {/* DECORATIVE: Target rings — EVA aligned */}
        <TargetRings
          size={44}
          className="absolute top-6 right-12 hidden lg:block"
        />

        <EvaPanel
          label="Tokenized Assets"
          sublabel="Summary by class"
          sysId="REG.001"
          status="active"
          accent="gold"
        >
          <ScanTable headers={['Asset Class', 'Quantity', 'Status']}>
            <ChevronTableRow highlight index={1}>
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gold rotate-45" />
                  <span className="font-mono text-base text-foreground/85 font-bold">
                    GOAT
                  </span>
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <span className="font-mono text-xl font-bold text-gold tabular-nums">
                  3,437
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                <EvaStatusBadge status="active" />
              </td>
            </ChevronTableRow>
          </ScanTable>
        </EvaPanel>
      </div>

      <EvaScanLine variant="crimson" />

      {/* Asset Details */}
      <div className="px-4 md:px-8">
        <EvaPanel
          label="Asset Details"
          sublabel="Capacity and attributes"
          sysId="AST.DTL"
          accent="crimson"
        >
          <ScanTable headers={['ID', 'Asset', 'Class', 'Quantity', 'Trading']}>
            {[
              {
                id: '1120215373...',
                asset: 'AUGOAT',
                cls: 'GOAT',
                qty: '3,434',
                trading: 'Set via trading',
                weight: 'M',
                sex: 'M',
              },
              {
                id: '6627587080...',
                asset: 'AUGOAT',
                cls: 'GOAT',
                qty: '2',
                trading: 'Set via trading',
                weight: 'S',
                sex: 'M',
              },
              {
                id: '6627587080...',
                asset: 'AUGOAT',
                cls: 'GOAT',
                qty: '1',
                trading: 'Set via trading',
                weight: 'S',
                sex: 'M',
              },
            ].map((row, i) => (
              <ChevronTableRow key={i} highlight={i === 0} index={i + 1}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[3px] h-4 ${i === 0 ? 'bg-gold' : 'bg-border/25'}`}
                    />
                    <span className="font-mono text-sm text-foreground/60 tabular-nums">
                      {row.id}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-sm text-foreground/65 font-bold">
                  {row.asset}
                </td>
                <td className="py-4 px-4">
                  <span
                    className="font-mono text-xs px-3 py-1 bg-gold/10 text-gold font-bold"
                    style={{
                      clipPath:
                        'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  >
                    {row.cls}
                  </span>
                </td>
                <td className="py-4 px-4 font-mono text-lg font-bold text-gold tabular-nums">
                  {row.qty}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-sm text-foreground/40">
                      {row.trading}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs px-2.5 py-0.5 bg-gold/8 text-gold/70 font-bold"
                        style={{
                          clipPath:
                            'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                        }}
                      >
                        wt: {row.weight}
                      </span>
                      <span
                        className="font-mono text-xs px-2.5 py-0.5 bg-crimson/8 text-crimson/70 font-bold"
                        style={{
                          clipPath:
                            'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                        }}
                      >
                        sx: {row.sex}
                      </span>
                    </div>
                  </div>
                </td>
              </ChevronTableRow>
            ))}
          </ScanTable>
        </EvaPanel>
      </div>

      <EvaSectionMarker section="SEC.02" label="Orders" variant="crimson" />

      {/* Orders */}
      <div className="px-4 md:px-8 relative">
        {/* DECORATIVE: Laurel on right — Greek philosophy aligned */}
        <LaurelAccent
          side="right"
          className="absolute right-4 top-12 hidden xl:block"
        />

        <EvaPanel
          label="Orders"
          sublabel="Track accepted orders"
          sysId="ORD.TRK"
          accent="crimson"
        >
          <div className="flex items-center justify-end mb-4">
            <TrapButton variant="gold" size="sm">
              View All Orders
            </TrapButton>
          </div>
          <ScanTable
            headers={[
              'Order ID',
              'Customer',
              'Asset',
              'Qty',
              'Value',
              'Status',
              'Action',
            ]}
          >
            {[
              {
                id: '0x8a35ac...',
                type: 'P2P',
                customer: '0x16a1e1...',
                asset: 'AUGOAT',
                qty: '140',
                value: '$100.00',
                status: 'completed' as const,
                action: 'Completed',
              },
              {
                id: '0xc2575a...',
                type: 'P2P',
                customer: '0x16a1e1...',
                asset: 'AUGOAT',
                qty: '100',
                value: '$40.00',
                status: 'completed' as const,
                action: 'Completed',
              },
              {
                id: '0x405787...',
                type: 'P2P',
                customer: '0x16a1e1...',
                asset: 'AUGOAT',
                qty: '1,000',
                value: '$400.00',
                status: 'processing' as const,
                action: 'In Transit',
              },
              {
                id: '0xb10e2d...',
                type: 'P2P',
                customer: '0xfde934...',
                asset: 'AUGOAT',
                qty: '100,000',
                value: '$1,000.00',
                status: 'created' as const,
                action: 'Pending',
              },
            ].map((order, i) => (
              <ChevronTableRow key={i} index={i + 1}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm text-foreground/60 tabular-nums">
                      {order.id}
                    </span>
                    <span
                      className="font-mono text-[11px] px-2.5 py-0.5 bg-crimson/10 text-crimson/80 font-bold"
                      style={{
                        clipPath:
                          'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                      }}
                    >
                      {order.type}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-sm text-foreground/45 tabular-nums">
                  {order.customer}
                </td>
                <td className="py-4 px-4 font-mono text-sm text-foreground/65 font-bold">
                  {order.asset}
                </td>
                <td className="py-4 px-4 font-mono text-sm text-foreground/55 tabular-nums">
                  {order.qty}
                </td>
                <td className="py-4 px-4 font-mono text-base font-bold text-gold tabular-nums">
                  {order.value}
                </td>
                <td className="py-4 px-4">
                  <EvaStatusBadge status={order.status} />
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`font-mono text-sm font-bold ${
                      order.action === 'Completed'
                        ? 'text-emerald-400'
                        : order.action === 'In Transit'
                          ? 'text-gold'
                          : 'text-foreground/35'
                    }`}
                  >
                    {order.action}
                  </span>
                </td>
              </ChevronTableRow>
            ))}
          </ScanTable>
        </EvaPanel>
      </div>

      <EvaSectionMarker section="SEC.03" label="Geography" variant="gold" />

      {/* Node Location */}
      <div className="px-4 md:px-8 relative">
        {/* DECORATIVE: Hex cluster — EVA aligned */}
        <HexCluster
          size="lg"
          className="absolute top-4 left-12 hidden lg:block"
        />

        <EvaPanel
          label="Node Location"
          sublabel="Physical node in network"
          sysId="GEO.SYS"
          status="active"
          accent="gold"
        >
          <div
            className="relative h-72 md:h-80 bg-background/40 overflow-hidden"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold/20" />
            <div className="absolute inset-0 eva-hex-pattern opacity-30 pointer-events-none" />
            <div className="absolute inset-0 eva-scanlines pointer-events-none" />

            {/* DECORATIVE: System readout — EVA aligned */}
            <EvaSystemReadout
              lines={['GEO.CTRL', 'SAT:LOCK', 'COORD:OK', 'NET:STABLE']}
              position="right"
            />

            {/* Grid */}
            <div className="absolute inset-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute left-0 right-0 h-[1px] bg-gold/[0.06]"
                  style={{ top: `${(i + 1) * 10}%` }}
                />
              ))}
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute top-0 bottom-0 w-[1px] bg-gold/[0.06]"
                  style={{ left: `${(i + 1) * 6.25}%` }}
                />
              ))}
            </div>

            {/* Coord labels */}
            <div className="absolute top-3 left-0 right-0 flex justify-between px-5">
              {['121.5W', '121.3W', '121.1W', '120.9W'].map((coord) => (
                <span
                  key={coord}
                  className="font-mono text-[11px] text-foreground/20"
                >
                  {coord}
                </span>
              ))}
            </div>

            {/* Node marker */}
            <div className="absolute top-1/2 left-[55%] -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex items-center justify-center">
                <div
                  className={`absolute w-24 h-24 border-2 rounded-full transition-all duration-1000 ${mapPulse ? 'border-crimson/35 scale-110' : 'border-crimson/12 scale-100'}`}
                />
                <div className="absolute w-14 h-14 border border-gold/20 rounded-full" />
                <div className="absolute w-7 h-7 border border-gold/30 rounded-full" />
                <div className="relative">
                  <div className="w-4 h-4 bg-crimson rounded-full" />
                  <div className="absolute inset-0 w-4 h-4 bg-crimson rounded-full animate-ping opacity-40" />
                </div>
                <div className="absolute w-32 h-[1px] bg-crimson/15" />
                <div className="absolute h-32 w-[1px] bg-crimson/15" />
              </div>
            </div>

            {/* Secondary nodes */}
            {[
              { top: '30%', left: '25%', size: 7 },
              { top: '65%', left: '35%', size: 5 },
              { top: '40%', left: '75%', size: 7 },
              { top: '70%', left: '80%', size: 5 },
            ].map((node, i) => (
              <div
                key={i}
                className="absolute"
                style={{ top: node.top, left: node.left }}
              >
                <div
                  className="bg-gold/30 rounded-full"
                  style={{ width: `${node.size}px`, height: `${node.size}px` }}
                />
              </div>
            ))}

            {/* Connection lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <line
                x1="55%"
                y1="50%"
                x2="25%"
                y2="30%"
                stroke="hsl(43 65% 62% / 0.1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="55%"
                y1="50%"
                x2="35%"
                y2="65%"
                stroke="hsl(43 65% 62% / 0.1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="55%"
                y1="50%"
                x2="75%"
                y2="40%"
                stroke="hsl(43 65% 62% / 0.1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="55%"
                y1="50%"
                x2="80%"
                y2="70%"
                stroke="hsl(43 65% 62% / 0.1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </svg>

            {/* Location info overlay */}
            <div
              className="absolute bottom-3 left-4 backdrop-blur-sm"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
              }}
            >
              <div
                className="bg-card/95 border border-border/50"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                }}
              >
                <div className="absolute left-0 top-0 bottom-4 w-[3px] bg-crimson/50" />
                <div className="px-4 py-3 border-b border-border/25 ml-[3px]">
                  <span className="font-mono text-base text-foreground/85 font-bold block">
                    El Dorado Hills, CA
                  </span>
                  <span className="font-mono text-sm text-foreground/40 block mt-0.5">
                    United States of America
                  </span>
                </div>
                <div className="px-4 py-2.5 ml-[3px] flex items-center gap-5">
                  <div>
                    <span className="font-mono text-[11px] text-foreground/25 uppercase block">
                      LAT
                    </span>
                    <span className="font-mono text-sm text-gold tabular-nums font-bold">
                      38.6857
                    </span>
                  </div>
                  <div className="w-[2px] h-5 bg-border/20" />
                  <div>
                    <span className="font-mono text-[11px] text-foreground/25 uppercase block">
                      LNG
                    </span>
                    <span className="font-mono text-sm text-gold tabular-nums font-bold">
                      -121.082
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </EvaPanel>
      </div>

      <EvaSectionMarker
        section="SEC.04"
        label="Documentation"
        variant="crimson"
      />

      {/* Supporting Documents */}
      <div className="px-4 md:px-8 pb-2 relative">
        {/* DECORATIVE: Laurel — Greek philosophy aligned */}
        <LaurelAccent
          side="right"
          className="absolute right-4 top-10 hidden xl:block"
        />

        <EvaPanel
          label="Supporting Documents"
          sublabel="Certifications and audits"
          sysId="DOC.SYS"
          accent="crimson"
        >
          <div className="flex items-center justify-end mb-4">
            <TrapButton variant="gold" size="sm">
              <span className="flex items-center gap-2">
                <span className="text-crimson">+</span> Add Document
              </span>
            </TrapButton>
          </div>

          {/* Active document */}
          <div
            className="relative overflow-hidden group hover:bg-background/70 transition-all duration-300"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
            }}
          >
            <div
              className="absolute inset-0 bg-background/50"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
              }}
            />
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold/40" />
            <svg
              className="absolute top-0 right-0 w-4 h-4 pointer-events-none"
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="0"
                x2="16"
                y2="16"
                stroke="hsl(0 70% 38% / 0.3)"
                strokeWidth="1"
              />
            </svg>
            <div className="px-5 py-4 ml-[3px] flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="font-mono text-base text-foreground/85 font-bold">
                    Altura Audit
                  </span>
                  <span
                    className="font-mono text-xs px-3 py-0.5 bg-gold/10 text-gold font-bold tracking-wider uppercase"
                    style={{
                      clipPath:
                        'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  >
                    Audit
                  </span>
                </div>
                <span className="font-mono text-sm text-foreground/40">
                  Predeposit Audit
                </span>
              </div>
              <div className="flex items-center gap-3">
                <EvaStatusBadge status="completed" label="verified" />
              </div>
            </div>
            <div className="px-5 pb-3 ml-[3px] border-t border-border/15 pt-3 relative">
              <a
                href="#"
                className="font-mono text-sm text-gold/70 hover:text-gold transition-colors underline underline-offset-2 decoration-gold/20 hover:decoration-gold/50"
              >
                https://github.com/AlturaTrade/docs/blob..
              </a>
              <span className="font-mono text-xs text-foreground/25 block mt-2">
                Added 04/02/2024 by 0xFdE9...BbaF
              </span>
            </div>
          </div>

          {/* Removed docs toggle */}
          <button
            onClick={() => setExpandedDoc(!expandedDoc)}
            className="mt-3 flex items-center gap-2 font-mono text-sm text-foreground/35 hover:text-foreground/55 transition-colors group"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 8 8"
              className={`transition-transform duration-200 ${expandedDoc ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <path
                d="M2 1l4 3-4 3"
                stroke="currentColor"
                fill="none"
                strokeWidth="1.2"
              />
            </svg>
            <span>{expandedDoc ? 'Hide' : 'View'} 1 removed document</span>
          </button>

          {expandedDoc && (
            <div className="mt-2 relative bg-background/20 opacity-50">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-foreground/8" />
              <div className="px-5 py-4 ml-[3px]">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm text-foreground/35 line-through">
                    Initial Assessment
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 bg-foreground/[0.04] border border-foreground/10 text-foreground/25 tracking-wider uppercase font-bold">
                    Removed
                  </span>
                </div>
                <span className="font-mono text-xs text-foreground/20">
                  Superseded by Altura Audit
                </span>
              </div>
            </div>
          )}
        </EvaPanel>
      </div>

      {/* DECORATIVE: Bottom Greek key strip — Greek philosophy aligned */}
      <div className="px-4 md:px-8 py-3">
        <GreekKeyStrip color="gold" />
      </div>

      {/* Bottom system bar */}
      <div className="border-t-2 border-border/20 px-4 md:px-8 py-4 flex items-center justify-between bg-card/30 relative">
        {/* DECORATIVE: Hex cluster bottom right — EVA aligned */}
        <HexCluster size="sm" className="absolute right-28 bottom-2" />
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-30" />
            </div>
            <span className="font-mono text-sm tracking-[0.12em] text-emerald-400 uppercase font-bold">
              Node Online
            </span>
          </div>
          <div className="w-[2px] h-4 bg-border/20" />
          <span className="font-mono text-sm text-foreground/30">
            Last sync: 2 min ago
          </span>
        </div>
        <div className="flex items-center gap-3">
          <EvaProgress value={99} max={100} color="emerald" segments={8} />
          <span className="font-mono text-sm tracking-[0.1em] text-foreground/25 uppercase">
            NODE.SYS v2.1.0
          </span>
        </div>
      </div>
    </div>
  );
}
