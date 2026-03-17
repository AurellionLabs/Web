import Link from 'next/link';
import {
  GreekKeyStrip,
  HexCluster,
  HexStatCard,
  EvaPanel,
  EvaSectionMarker,
  EvaStatusBadge,
  DataScatter,
  TrapButton,
} from '@/app/components/eva/eva-components';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Layers,
  Zap,
  Users,
  GitBranch,
  Box,
  Settings,
  Globe,
} from 'lucide-react';

const categories = [
  {
    icon: <Zap size={16} />,
    title: 'Getting Started',
    subtitle: 'New to Aurellion? Begin here.',
    accent: 'gold' as const,
    href: '/docs/welcome',
    pages: ['Welcome', 'Glossary'],
  },
  {
    icon: <Layers size={16} />,
    title: 'Architecture',
    subtitle: 'Diamond proxy, data flow, services layer.',
    accent: 'crimson' as const,
    href: '/docs/architecture/system-overview',
    pages: ['System Overview', 'Diamond Proxy', 'Data Flow', 'Services Layer'],
  },
  {
    icon: <BookOpen size={16} />,
    title: 'Core Concepts',
    subtitle: 'RWA tokenisation, CLOB, staking, journeys.',
    accent: 'gold' as const,
    href: '/docs/core-concepts/real-world-asset-tokenisation',
    pages: ['RWA Tokenisation', 'CLOB Trading', 'RWY Staking', 'Node Network'],
  },
  {
    icon: <Cpu size={16} />,
    title: 'Smart Contracts',
    subtitle: '13 facets, 2 libraries — fully documented.',
    accent: 'crimson' as const,
    href: '/docs/smart-contracts/overview',
    pages: ['Overview', 'AssetsFacet', 'CLOBCoreFacet', 'RWYStakingFacet'],
  },
  {
    icon: <Users size={16} />,
    title: 'Roles',
    subtitle: 'Customer, node operator, driver guides.',
    accent: 'gold' as const,
    href: '/docs/roles/customer',
    pages: ['Customer', 'Node Operator', 'Driver'],
  },
  {
    icon: <Box size={16} />,
    title: 'Frontend',
    subtitle: 'Next.js app structure and providers.',
    accent: 'crimson' as const,
    href: '/docs/frontend/application-structure',
    pages: ['App Structure', 'Providers', 'Pages'],
  },
  {
    icon: <GitBranch size={16} />,
    title: 'Indexer',
    subtitle: 'Ponder event indexer — Docker + Bun.',
    accent: 'gold' as const,
    href: '/docs/indexer/ponder-setup',
    pages: ['Ponder Setup', 'Schema & Queries'],
  },
  {
    icon: <Globe size={16} />,
    title: 'Public API',
    subtitle: 'HTTP contract for public order and node lookups.',
    accent: 'gold' as const,
    href: '/docs/public-api/aurellion-core-api-contract',
    pages: ['Aurellion Core API Contract'],
  },
  {
    icon: <Settings size={16} />,
    title: 'Technical Reference',
    subtitle: 'Events, errors, deployment, gas, FAQ.',
    accent: 'crimson' as const,
    href: '/docs/technical-reference/developer-quickstart',
    pages: ['Quickstart', 'Deployment', 'Error Ref', 'FAQ'],
  },
];

export default function DocsHomePage() {
  return (
    <div className="relative px-6 md:px-10 py-10 max-w-5xl">
      {/* Subtle ambient scatter — same as rest of site */}
      <DataScatter className="absolute inset-0 pointer-events-none" />

      {/* ── HERO ── */}
      <div className="relative mb-12">
        <div className="flex items-center gap-3 mb-6">
          <HexCluster size="sm" />
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-crimson/50">
            Protocol Documentation
          </span>
        </div>

        <h1
          className="text-5xl md:text-6xl text-foreground mb-4 leading-none"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Aurellion
          <br />
          <span className="gradient-text-red-gold">Protocol Docs</span>
        </h1>

        <p className="text-white/75 max-w-xl leading-relaxed text-sm mb-8">
          Complete technical reference. Real-world asset tokenisation, CLOB
          order matching, logistics journeys, and RWY yield staking — all built
          on a Diamond proxy on Base.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/docs/welcome">
            <TrapButton variant="gold" size="default">
              <span className="flex items-center gap-2">
                Start Here
                <ArrowRight size={12} />
              </span>
            </TrapButton>
          </Link>
          <Link href="/docs/technical-reference/developer-quickstart">
            <TrapButton variant="crimson" size="default">
              Developer Quickstart
            </TrapButton>
          </Link>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        {[
          {
            label: 'Diamond Facets',
            value: '13',
            sub: 'fully documented',
            color: 'gold' as const,
          },
          {
            label: 'Doc Pages',
            value: '55',
            sub: 'across 9 sections',
            color: 'crimson' as const,
          },
          {
            label: 'Lines of Docs',
            value: '12k+',
            sub: 'of technical detail',
            color: 'gold' as const,
          },
          {
            label: 'Events Indexed',
            value: '~20',
            sub: 'by Ponder indexer',
            color: 'crimson' as const,
          },
        ].map((s) => (
          <HexStatCard
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            color={s.color}
          />
        ))}
      </div>

      {/* ── SECTION LABEL ── */}
      <EvaSectionMarker
        section="01"
        label="Documentation Sections"
        variant="gold"
      />

      {/* ── CATEGORY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
        {categories.map((cat) => {
          const isGold = cat.accent === 'gold';
          return (
            <Link
              key={cat.title}
              href={cat.href}
              className="group relative flex flex-col p-5 border transition-all duration-300 overflow-hidden hover:border-gold/20"
              style={{
                borderColor: 'hsl(43 18% 16%)',
                background: 'hsl(0 0% 7%)',
                clipPath:
                  'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              }}
            >
              {/* Cut-corner crimson lines */}
              <svg
                className="absolute top-0 right-0 w-5 h-5 pointer-events-none"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="20"
                  y2="20"
                  stroke={isGold ? 'hsl(0 70% 38%)' : 'hsl(43 65% 62%)'}
                  strokeWidth="1"
                  opacity="0.4"
                />
              </svg>

              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: isGold
                    ? 'radial-gradient(ellipse at 0% 0%, hsl(43 65% 62% / 0.04) 0%, transparent 70%)'
                    : 'radial-gradient(ellipse at 0% 0%, hsl(0 70% 38% / 0.05) 0%, transparent 70%)',
                }}
              />

              <div className="relative flex items-start gap-3">
                <div
                  className="mt-0.5 shrink-0"
                  style={{
                    color: isGold
                      ? 'hsl(43 65% 62% / 0.6)'
                      : 'hsl(0 70% 38% / 0.7)',
                  }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono text-sm tracking-[0.08em] uppercase mb-1 text-foreground/80 group-hover:text-foreground transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-white/70 mb-3 leading-relaxed">
                    {cat.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.pages.map((page) => (
                      <span
                        key={page}
                        className="font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 border text-white/60"
                        style={{
                          borderColor: isGold
                            ? 'hsl(43 18% 20%)'
                            : 'hsl(0 18% 20%)',
                        }}
                      >
                        {page}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight
                  size={13}
                  className="text-foreground/20 group-hover:text-foreground/60 group-hover:translate-x-1 transition-all duration-200 shrink-0 mt-0.5"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── CONTRACT PANEL ── */}
      <EvaSectionMarker
        section="02"
        label="Live Contract Reference"
        variant="crimson"
      />

      <EvaPanel
        label="DEPLOYED CONTRACTS"
        sublabel="Base Sepolia Testnet"
        sysId="CHAIN-84532"
        status="active"
        accent="gold"
        className="mb-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'Diamond Proxy',
              value: '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7',
              note: 'block 37798377',
            },
            {
              label: 'AURA Quote Token',
              value: '0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6',
              note: 'block 36423435',
            },
            {
              label: 'Indexer GraphQL',
              value: 'indexer.aurellionlabs.com/graphql',
              note: 'port 42069',
            },
          ].map((item) => (
            <div key={item.label}>
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/60 mb-1.5">
                {item.label}
              </div>
              <div className="font-mono text-[11px] text-gold/70 break-all leading-relaxed">
                {item.value}
              </div>
              <div className="font-mono text-[9px] text-white/55 mt-1">
                {item.note}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-glass flex items-center gap-3">
          <EvaStatusBadge status="active" label="LIVE ON TESTNET" />
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/25">
            13 FACETS · DIAMOND EIP-2535 · BASE SEPOLIA
          </span>
        </div>
      </EvaPanel>

      {/* ── GREEK KEY FOOTER ── */}
      <GreekKeyStrip color="gold" />
    </div>
  );
}
