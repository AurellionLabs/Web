export function replaceChainConstant(
  content: string,
  key: string,
  value: string,
): string {
  const envFallbackRegex = new RegExp(
    String.raw`export const ${key}\s*=\s*\n\s*process\.env\.${key}\s*\|\|\s*\n\s*['"][^'"]*['"];?[^\n]*`,
    'm',
  );

  if (envFallbackRegex.test(content)) {
    return content.replace(
      envFallbackRegex,
      `export const ${key} =\n  process.env.${key} ||\n  '${value}';`,
    );
  }

  const simpleRegex = new RegExp(
    String.raw`export const ${key}\s*=\s*\n?\s*['"][^'"]*['"];?[^\n]*`,
    'm',
  );

  if (simpleRegex.test(content)) {
    return content.replace(simpleRegex, `export const ${key} =\n  '${value}';`);
  }

  return content;
}

export function renderIndexerDiamondConstants({
  address,
  blockNumber,
  timestamp,
}: {
  address: string;
  blockNumber: number;
  timestamp: string;
}): string {
  return `// Diamond contract constants for the Ponder indexer
// Auto-updated by unified-deploy.ts script
// Last updated: ${timestamp}

export const DIAMOND_ADDRESS: \`0x\${string}\` =
  '${address}';

export const DIAMOND_DEPLOY_BLOCK = ${blockNumber};

// Chain configuration
export const CHAIN_ID = Number(process.env.CHAIN_ID || 84532); // Default: Base Sepolia (84532), Prod: Arbitrum One (42161)
export const CHAIN_NAME = process.env.CHAIN_NAME || 'baseSepolia'; // Default: baseSepolia, Prod: arbitrumOne
`;
}
