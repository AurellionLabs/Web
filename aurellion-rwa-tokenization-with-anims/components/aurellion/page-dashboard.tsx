'use client';

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
} from './eva-panel';

export default function PageDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* DECORATIVE: Floating data scatter across entire page — EVA aligned */}
      <DataScatter className="inset-0 h-full w-full" />

      {/* Page header */}
      <div className="px-4 md:px-8 pt-6 pb-4 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            {/* DECORATIVE: Laurel wreath beside title — Greek philosophy aligned */}
            <LaurelAccent side="left" className="hidden md:block mt-1" />
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                Dashboard
              </h1>
              <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40 mt-1">
                Overview of your orders and trading activity
              </p>
              {/* DECORATIVE: Greek key underline — Greek philosophy aligned */}
              <GreekKeyStrip color="gold" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* DECORATIVE: Target rings near button — EVA aligned */}
            <TargetRings size={40} className="hidden lg:block" />
            <TrapButton variant="gold">Refresh</TrapButton>
          </div>
        </div>
      </div>

      <EvaScanLine variant="mixed" />

      {/* Stats — HEX CARDS instead of squares */}
      <div className="px-4 md:px-8 py-6 relative">
        {/* DECORATIVE: Hex cluster in corner — EVA aligned */}
        <HexCluster size="md" className="absolute top-2 right-8" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HexStatCard
            label="Total Spent"
            value="$24,850"
            sub="Across all assets"
            color="gold"
            powerLevel={7}
          />
          <HexStatCard
            label="In Progress"
            value="3"
            sub="+2 this week"
            color="crimson"
            powerLevel={3}
          />
          <HexStatCard
            label="Completed"
            value="12"
            sub="+8 this month"
            color="emerald"
            powerLevel={8}
          />
          <HexStatCard
            label="Pending"
            value="1"
            sub="Awaiting confirmation"
            color="gold"
            powerLevel={1}
          />
        </div>

        {/* DECORATIVE: Greek key strip below stats — Greek philosophy aligned */}
        <div className="mt-4">
          <GreekKeyStrip color="crimson" />
        </div>
      </div>

      <EvaSectionMarker section="SEC.01" label="Portfolio" variant="gold" />

      {/* My Assets */}
      <div className="px-4 md:px-8 relative">
        {/* DECORATIVE: Laurel on right side — Greek philosophy aligned */}
        <LaurelAccent
          side="right"
          className="absolute right-4 top-12 hidden xl:block"
        />

        <EvaPanel
          label="My Assets"
          sublabel="Tokenized assets you own"
          sysId="AST.SYS"
          status="active"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                units: '2',
                token: '66275870...37',
                type: 'AUGOAT',
                weight: 'S',
                sex: 'M',
                pct: 20,
              },
              {
                units: '98,520',
                token: '11202153...39',
                type: 'AUGOAT',
                weight: 'M',
                sex: 'M',
                pct: 95,
              },
              {
                units: '450',
                token: '88341922...51',
                type: 'AUGOLD',
                weight: '-',
                sex: '-',
                pct: 45,
              },
            ].map((asset, i) => (
              <div
                key={i}
                className="relative group overflow-hidden transition-all duration-300"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                }}
              >
                <div
                  className="absolute inset-0 bg-background/50 group-hover:bg-background/80 transition-colors"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                  }}
                />

                {/* Left accent */}
                <div
                  className={`absolute top-0 left-0 w-[3px] bottom-0 ${i === 0 ? 'bg-gold/40' : i === 1 ? 'bg-emerald-500/40' : 'bg-crimson/40'}`}
                />
                {/* DECORATIVE: Corner cut line — EVA aligned */}
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

                {/* DECORATIVE: Faint system ID — EVA aligned */}
                <span
                  className="absolute top-2 right-5 font-mono text-[8px] text-foreground/[0.07] tracking-wider"
                  aria-hidden="true"
                >
                  AST.{String(i + 1).padStart(3, '0')}
                </span>

                <div className="relative p-5 ml-[3px]">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <span className="font-mono text-4xl font-bold text-gold tabular-nums block leading-none">
                        {asset.units}
                      </span>
                      <span className="font-mono text-sm text-foreground/40 mt-1 block">
                        units
                      </span>
                    </div>
                    <EvaStatusBadge status="active" label="connected" />
                  </div>

                  <EvaProgress
                    value={asset.pct}
                    color={i === 1 ? 'emerald' : 'gold'}
                  />

                  <div className="mt-4 pt-3 border-t border-border/15">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/30 uppercase block mb-1">
                      Token
                    </span>
                    <span className="font-mono text-sm text-foreground/60">
                      {asset.token}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3 mb-5">
                    {/* Parallelogram tag — EVA aligned */}
                    <span
                      className="font-mono text-xs px-3 py-1 bg-gold/10 text-gold font-bold"
                      style={{
                        clipPath:
                          'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                      }}
                    >
                      {asset.type}
                    </span>
                    {asset.weight !== '-' && (
                      <>
                        <span
                          className="font-mono text-[11px] px-2.5 py-1 bg-crimson/8 text-crimson/70"
                          style={{
                            clipPath:
                              'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                          }}
                        >
                          wt: {asset.weight}
                        </span>
                        <span
                          className="font-mono text-[11px] px-2.5 py-1 bg-crimson/8 text-crimson/70"
                          style={{
                            clipPath:
                              'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                          }}
                        >
                          sx: {asset.sex}
                        </span>
                      </>
                    )}
                  </div>

                  <TrapButton variant="crimson" className="w-full text-center">
                    Redeem for Delivery
                  </TrapButton>
                </div>
              </div>
            ))}
          </div>
        </EvaPanel>
      </div>

      <EvaSectionMarker section="SEC.02" label="Orders" variant="crimson" />

      {/* Recent Orders */}
      <div className="px-4 md:px-8 pb-10 relative">
        {/* DECORATIVE: Target rings floating — EVA aligned */}
        <TargetRings
          size={50}
          className="absolute top-4 right-12 hidden lg:block"
        />

        <EvaPanel
          label="Recent Orders"
          sublabel="Your latest order activity"
          sysId="ORD.SYS"
        >
          <div className="flex items-center gap-4 mb-5">
            <div
              className="relative flex-1 max-w-xs group"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
            >
              <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors" />
              <input
                type="text"
                placeholder="Search by order ID..."
                className="w-full bg-background/80 border border-border/40 pl-4 pr-4 py-2.5 font-mono text-sm text-foreground/70 placeholder:text-foreground/25 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <TrapButton variant="gold" size="sm">
              Filter
            </TrapButton>
          </div>

          <ScanTable
            headers={['Order ID', 'Asset', 'Qty', 'Value', 'Status', 'Action']}
          >
            {[
              {
                id: '0xb10e2d...',
                type: 'P2P',
                asset: 'AUGOAT',
                qty: '100,000',
                value: '$1,000.00',
                status: 'created' as const,
              },
              {
                id: '0xa8f3c1...',
                type: 'P2P',
                asset: 'AUGOAT',
                qty: '500',
                value: '$45.00',
                status: 'completed' as const,
              },
              {
                id: '0x7d2e9b...',
                type: 'DEX',
                asset: 'AUGOLD',
                qty: '50',
                value: '$8,200.00',
                status: 'processing' as const,
              },
              {
                id: '0xc42f8a...',
                type: 'P2P',
                asset: 'AUGOAT',
                qty: '1,000',
                value: '$400.00',
                status: 'completed' as const,
              },
            ].map((order, i) => (
              <ChevronTableRow key={i} index={i + 1}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm text-foreground/65">
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
                <td className="py-4 px-4 font-mono text-sm text-foreground/60">
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
                  <button className="font-mono text-sm text-foreground/30 hover:text-gold transition-colors">
                    ...
                  </button>
                </td>
              </ChevronTableRow>
            ))}
          </ScanTable>
        </EvaPanel>
      </div>

      {/* DECORATIVE: Bottom Greek key strip — Greek philosophy aligned */}
      <div className="px-4 md:px-8 pb-4">
        <GreekKeyStrip color="gold" />
      </div>
    </div>
  );
}
