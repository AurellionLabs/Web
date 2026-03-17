/**
 * docs-nav.ts — Client-safe nav structure (no Node.js imports)
 * Imported by DocsSidebar (client component) and server pages alike.
 */

export interface NavItem {
  title: string;
  slug?: string[];
  children?: NavItem[];
  icon?: string;
}

export const NAV_STRUCTURE: NavItem[] = [
  {
    title: 'Getting Started',
    icon: '◈',
    children: [
      { title: 'Welcome',  slug: ['welcome'] },
      { title: 'Home',     slug: ['home'] },
      { title: 'Glossary', slug: ['glossary'] },
    ],
  },
  {
    title: 'Architecture',
    icon: '⬡',
    children: [
      { title: 'System Overview',       slug: ['architecture', 'system-overview'] },
      { title: 'Diamond Proxy Pattern', slug: ['architecture', 'diamond-proxy-pattern'] },
      { title: 'Data Flow',             slug: ['architecture', 'data-flow'] },
      { title: 'Indexer Architecture',  slug: ['architecture', 'indexer-architecture'] },
      { title: 'Repository Pattern',    slug: ['architecture', 'repository-pattern'] },
      { title: 'Services Layer',        slug: ['architecture', 'services-layer'] },
    ],
  },
  {
    title: 'Core Concepts',
    icon: '◎',
    children: [
      { title: 'RWA Tokenisation',    slug: ['core-concepts', 'real-world-asset-tokenisation'] },
      { title: 'CLOB Trading',        slug: ['core-concepts', 'clob-trading'] },
      { title: 'Order Lifecycle',     slug: ['core-concepts', 'order-lifecycle'] },
      { title: 'Journey & Logistics', slug: ['core-concepts', 'journey-and-logistics'] },
      { title: 'Node Network',        slug: ['core-concepts', 'node-network'] },
      { title: 'RWY Staking',         slug: ['core-concepts', 'rwy-staking'] },
      { title: 'P2P Trading',         slug: ['core-concepts', 'p2p-trading'] },
      { title: 'AMM Liquidity Pools', slug: ['core-concepts', 'amm-liquidity-pools'] },
    ],
  },
  {
    title: 'Smart Contracts',
    icon: '⬢',
    children: [
      { title: 'Overview', slug: ['smart-contracts', 'overview'] },
      {
        title: 'Facets',
        children: [
          { title: 'AssetsFacet',        slug: ['smart-contracts', 'facets', 'assetsfacet'] },
          { title: 'CLOBCoreFacet',      slug: ['smart-contracts', 'facets', 'clobcorefacet'] },
          { title: 'CLOBMatchingFacet',  slug: ['smart-contracts', 'facets', 'clobmatchingfacet'] },
          { title: 'CLOBViewFacet',      slug: ['smart-contracts', 'facets', 'clobviewfacet'] },
          { title: 'CLOBMEVFacet',       slug: ['smart-contracts', 'facets', 'clobmevfacet'] },
          { title: 'CLOBAdminFacet',     slug: ['smart-contracts', 'facets', 'clobadminfacet'] },
          { title: 'CLOBLogisticsFacet', slug: ['smart-contracts', 'facets', 'cloblogisticsfacet'] },
          { title: 'OrderRouterFacet',   slug: ['smart-contracts', 'facets', 'orderrouterfacet'] },
          { title: 'NodesFacet',         slug: ['smart-contracts', 'facets', 'nodesfacet'] },
          { title: 'AuSysFacet',         slug: ['smart-contracts', 'facets', 'ausysfacet'] },
          { title: 'BridgeFacet',        slug: ['smart-contracts', 'facets', 'bridgefacet'] },
          { title: 'RWYStakingFacet',    slug: ['smart-contracts', 'facets', 'rwystakingfacet'] },
          { title: 'OperatorFacet',      slug: ['smart-contracts', 'facets', 'operatorfacet'] },
        ],
      },
      {
        title: 'Libraries',
        children: [
          { title: 'DiamondStorage', slug: ['smart-contracts', 'libraries', 'diamondstorage'] },
          { title: 'CLOBLib',        slug: ['smart-contracts', 'libraries', 'cloblib'] },
        ],
      },
    ],
  },
  {
    title: 'Roles',
    icon: '◇',
    children: [
      { title: 'Customer',      slug: ['roles', 'customer'] },
      { title: 'Node Operator', slug: ['roles', 'node-operator'] },
      { title: 'Driver',        slug: ['roles', 'driver'] },
    ],
  },
  {
    title: 'Frontend',
    icon: '▣',
    children: [
      { title: 'Application Structure', slug: ['frontend', 'application-structure'] },
      { title: 'Providers',             slug: ['frontend', 'providers'] },
      { title: 'Pages Reference',       slug: ['frontend', 'pages-reference'] },
    ],
  },
  {
    title: 'Indexer',
    icon: '◈',
    children: [
      { title: 'Ponder Setup',     slug: ['indexer', 'ponder-setup'] },
      { title: 'Schema & Queries', slug: ['indexer', 'schema-and-queries'] },
    ],
  },
  {
    title: 'Public API',
    icon: '◉',
    children: [
      { title: 'Aurellion Core API Contract', slug: ['public-api', 'aurellion-core-api-contract'] },
    ],
  },
  {
    title: 'Technical Reference',
    icon: '⊞',
    children: [
      { title: 'Developer Quickstart',   slug: ['technical-reference', 'developer-quickstart'] },
      { title: 'Deployment',             slug: ['technical-reference', 'deployment'] },
      { title: 'Fee Structure',          slug: ['technical-reference', 'fee-structure'] },
      { title: 'Events Reference',       slug: ['technical-reference', 'events-reference'] },
      { title: 'Error Reference',        slug: ['technical-reference', 'error-reference'] },
      { title: 'Order Status Reference', slug: ['technical-reference', 'order-status-reference'] },
      { title: 'Contract ABIs',          slug: ['technical-reference', 'contract-abis'] },
      { title: 'Security Model',         slug: ['technical-reference', 'security-model'] },
      { title: 'Upgrading Facets',       slug: ['technical-reference', 'upgrading-facets'] },
      { title: 'Gas Optimisation',       slug: ['technical-reference', 'gas-optimisation'] },
      { title: 'Testing Guide',          slug: ['technical-reference', 'testing-guide'] },
      { title: 'Troubleshooting',        slug: ['technical-reference', 'troubleshooting'] },
      { title: 'FAQ',                    slug: ['technical-reference', 'faq'] },
    ],
  },
];
