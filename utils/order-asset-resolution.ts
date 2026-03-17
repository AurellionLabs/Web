export function normalizeTokenId(value: string): string {
  const input = String(value || '').trim();
  if (!input) return '';

  try {
    return BigInt(input).toString(10);
  } catch {
    return input.toLowerCase();
  }
}

export function buildAssetNameLookup(
  entries: Array<{ tokenId?: string | null; name?: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>();

  entries.forEach((entry) => {
    const tokenId = normalizeTokenId(String(entry.tokenId || ''));
    const name = String(entry.name || '').trim();
    if (!tokenId || !name) return;
    map.set(tokenId, name);
  });

  return map;
}

export function resolveOrderAssetName(options: {
  tokenId: string;
  directName?: string | null;
  lookups?: Map<string, string>[];
  fallback?: string;
}): string {
  const directName = String(options.directName || '').trim();
  if (directName) return directName;

  const normalizedTokenId = normalizeTokenId(options.tokenId);
  const lookups = options.lookups || [];
  for (const lookup of lookups) {
    const match = lookup.get(normalizedTokenId);
    if (match) return match;
  }

  return options.fallback || 'Unknown Asset';
}
