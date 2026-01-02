// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-01-01T23:43:02.813Z
// Chain ID: 84532

export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "0xd41b6Dc779558bbe674B13F6996BFD5679f75074";
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "0x838Cb08335Ab4121CE4f438F38A002C9A62F69C1";
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = "0xc50F6505BcBb00Af8f1086d9121525695Bf09D30";
export const NEXT_PUBLIC_AUSYS_ADDRESS = "0x84dC0BB1098aE6F4777C33F1C6221f11725EEfde";
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS = "0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8";
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = "0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8"; // AuraAsset is the GOAT contract
export const NEXT_PUBLIC_CLOB_ADDRESS = "0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc";

// Indexer GraphQL endpoint (Ponder indexer replaces The Graph subgraphs)
// All subgraphs point to the same indexer GraphQL endpoint
// Can be overridden via NEXT_PUBLIC_INDEXER_URL environment variable
const INDEXER_BASE_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_INDEXER_URL) || "http://localhost:42069";
export const NEXT_PUBLIC_AURUM_SUBGRAPH_URL = `${INDEXER_BASE_URL}/graphql`;
export const NEXT_PUBLIC_AUSYS_SUBGRAPH_URL = `${INDEXER_BASE_URL}/graphql`;
export const NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL = `${INDEXER_BASE_URL}/graphql`;
export const NEXT_PUBLIC_AUSTAKE_SUBGRAPH_URL = `${INDEXER_BASE_URL}/graphql`;

// Deployment blocks (for indexer configuration)
export const DEPLOYMENT_BLOCKS = {
  auraToken: 35771316,
  auSys: 35771321,
  aurumNodeManager: 35771324,
  auStake: 35771327,
  auraAsset: 35771330,
  clob: 35771333,
};
