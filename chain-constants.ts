export const NEXT_PUBLIC_AUSTAKE_ADDRESS =
  '0xD3BCC97E95aAc74de1Daeb6bEd55a16D4CF7C6eD';
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0xBa94D518861a0461D4B9751dc875fB8bB26eC23B';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS =
  '0x2a04e043B7cEdE2902480D2b06e17028A62353Cc';
export const NEXT_PUBLIC_AUSYS_ADDRESS =
  '0x11BEd7709f1b1DE06C5769774174d4e052aE2cFC';
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS =
  '0x45ef184BfDd42cccF542754656dCAc2637012894';

// =============================================================================
// The Graph Subgraph URLs (legacy - to be deprecated)
// =============================================================================
export const NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/112596/aura-asset-base-sepolia/version/latest';
export const NEXT_PUBLIC_AUSTAKE_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/112596/austake-base-sepolia/version/latest';
export const NEXT_PUBLIC_AURUM_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/112596/aurum-base-sepolia/version/latest';
export const NEXT_PUBLIC_AUSYS_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/112596/ausys-base-sepolia/version/latest';

// =============================================================================
// Ponder Indexer Configuration (new - preferred)
// =============================================================================
export const PONDER_DATABASE_URL =
  process.env.PONDER_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ponder_indexer';

// Feature flag to switch between The Graph and Ponder
// Set to 'true' to use Ponder, 'false' to use The Graph
export const USE_PONDER_DATABASE = process.env.USE_PONDER_DATABASE === 'true';

// CLOB Contract Address (to be deployed)
export const NEXT_PUBLIC_CLOB_ADDRESS =
  process.env.NEXT_PUBLIC_CLOB_ADDRESS || '';
