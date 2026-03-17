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

function upsertConstant(
  content: string,
  key: string,
  renderedValue: string,
): string {
  const exportRegex = new RegExp(
    String.raw`export const ${key}\s*=\s*[\s\S]*?;`,
    'm',
  );

  if (exportRegex.test(content)) {
    return content.replace(exportRegex, renderedValue);
  }

  return `${content.trimEnd()}\n\n${renderedValue}\n`;
}

export function ensureQuoteTokenRuntimeConfig(content: string): string {
  const quoteTokenAddressConst = `export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS || NEXT_PUBLIC_AURA_TOKEN_ADDRESS;`;
  let updated = upsertConstant(
    content,
    'NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS',
    quoteTokenAddressConst,
  );

  const quoteTokenDecimalsBlock = `// Quote token decimals - changes based on which token is used
// AURA = 18 decimals (testnet), USDC = 6 decimals (production)
const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const quoteTokenIsArbitrumUsdc =
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS.toLowerCase() === ARBITRUM_USDC_ADDRESS;

export const NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS = Number(
  process.env.NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS ||
    (quoteTokenIsArbitrumUsdc ? '6' : '18'),
);
export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL =
  process.env.NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL ||
  (quoteTokenIsArbitrumUsdc ? 'USDC' : 'AURA');`;

  const quoteTokenDecimalsRegex =
    /\/\/ Quote token decimals - changes based on which token is used[\s\S]*?export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL\s*=\s*[\s\S]*?;/m;

  if (quoteTokenDecimalsRegex.test(updated)) {
    updated = updated.replace(quoteTokenDecimalsRegex, quoteTokenDecimalsBlock);
  } else {
    updated = `${updated.trimEnd()}\n\n${quoteTokenDecimalsBlock}\n`;
  }

  return updated;
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
