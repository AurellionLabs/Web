/**
 * Asset Test Fixtures
 *
 * These fixtures match the exact shape returned by PlatformRepository.
 * They serve as the single source of truth for test data shapes.
 *
 * IMPORTANT: These fixtures use the correct field names (tokenId, not tokenID)
 * to catch bugs where UI code uses the wrong field.
 */

import { Asset, AssetAttribute } from '@/domain/shared';

// =============================================================================
// ATTRIBUTE FIXTURES
// =============================================================================

export const weightAttribute: AssetAttribute = {
  name: 'Weight',
  values: ['25kg', '30kg', '35kg', '40kg'],
  description: 'Weight of the animal',
};

export const sexAttribute: AssetAttribute = {
  name: 'Sex',
  values: ['Male', 'Female'],
  description: 'Sex of the animal',
};

export const purityAttribute: AssetAttribute = {
  name: 'Purity',
  values: ['999', '995', '990'],
  description: 'Gold purity in parts per thousand',
};

// =============================================================================
// GOAT ASSET FIXTURES
// =============================================================================

/**
 * Single GOAT asset - matches PlatformRepository output
 */
export const singleGoatAsset: Asset = {
  assetClass: 'GOAT',
  tokenId: '112821530123456789012345678901234567890', // Large token ID as string
  name: 'AUGOAT',
  attributes: [weightAttribute, sexAttribute],
};

/**
 * Multiple GOAT assets with different token IDs
 * This is what getClassAssets('GOAT') returns
 */
export const goatAssets: Asset[] = [
  {
    assetClass: 'GOAT',
    tokenId: '112821530000000000000000000000000000001',
    name: 'AUGOAT',
    attributes: [
      { name: 'Weight', values: ['25kg'], description: 'Weight of the animal' },
      { name: 'Sex', values: ['Male'], description: 'Sex of the animal' },
    ],
  },
  {
    assetClass: 'GOAT',
    tokenId: '112821530000000000000000000000000000002',
    name: 'AUGOAT',
    attributes: [
      { name: 'Weight', values: ['30kg'], description: 'Weight of the animal' },
      { name: 'Sex', values: ['Female'], description: 'Sex of the animal' },
    ],
  },
  {
    assetClass: 'GOAT',
    tokenId: '112821530000000000000000000000000000003',
    name: 'AUGOAT',
    attributes: [
      { name: 'Weight', values: ['35kg'], description: 'Weight of the animal' },
      { name: 'Sex', values: ['Male'], description: 'Sex of the animal' },
    ],
  },
  {
    assetClass: 'GOAT',
    tokenId: '112821530000000000000000000000000000004',
    name: 'AUGOAT',
    attributes: [
      { name: 'Weight', values: ['40kg'], description: 'Weight of the animal' },
      { name: 'Sex', values: ['Female'], description: 'Sex of the animal' },
    ],
  },
];

/**
 * GOAT assets with different names (for asset type filtering)
 */
export const mixedGoatAssets: Asset[] = [
  {
    assetClass: 'GOAT',
    tokenId: '100001',
    name: 'Boer Goat',
    attributes: [weightAttribute],
  },
  {
    assetClass: 'GOAT',
    tokenId: '100002',
    name: 'Boer Goat',
    attributes: [weightAttribute],
  },
  {
    assetClass: 'GOAT',
    tokenId: '100003',
    name: 'Kiko Goat',
    attributes: [weightAttribute],
  },
  {
    assetClass: 'GOAT',
    tokenId: '100004',
    name: 'Nubian Goat',
    attributes: [weightAttribute],
  },
];

// =============================================================================
// PRECIOUS METALS FIXTURES
// =============================================================================

export const goldAssets: Asset[] = [
  {
    assetClass: 'Precious Metals',
    tokenId: '200001',
    name: 'Gold Bar 1oz',
    attributes: [purityAttribute],
  },
  {
    assetClass: 'Precious Metals',
    tokenId: '200002',
    name: 'Gold Bar 10oz',
    attributes: [purityAttribute],
  },
];

export const silverAssets: Asset[] = [
  {
    assetClass: 'Precious Metals',
    tokenId: '300001',
    name: 'Silver Bar 1oz',
    attributes: [
      { name: 'Purity', values: ['999'], description: 'Silver purity' },
    ],
  },
];

// =============================================================================
// EMPTY / EDGE CASE FIXTURES
// =============================================================================

/**
 * Asset with no attributes
 */
export const assetWithNoAttributes: Asset = {
  assetClass: 'Simple',
  tokenId: '999999',
  name: 'Simple Asset',
  attributes: [],
};

/**
 * Asset with empty attribute values
 */
export const assetWithEmptyValues: Asset = {
  assetClass: 'Edge',
  tokenId: '888888',
  name: 'Edge Case Asset',
  attributes: [{ name: 'Empty', values: [], description: 'Has no values' }],
};

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a custom asset with specified tokenId
 * Useful for testing specific token ID display
 */
export function createAsset(
  tokenId: string,
  overrides: Partial<Omit<Asset, 'tokenId'>> = {},
): Asset {
  return {
    assetClass: 'GOAT',
    tokenId,
    name: 'Test Asset',
    attributes: [],
    ...overrides,
  };
}

/**
 * Create multiple assets with sequential token IDs
 */
export function createAssets(
  count: number,
  baseTokenId: number = 1000,
  overrides: Partial<Omit<Asset, 'tokenId'>> = {},
): Asset[] {
  return Array.from({ length: count }, (_, i) =>
    createAsset(String(baseTokenId + i), {
      name: `Asset ${i + 1}`,
      ...overrides,
    }),
  );
}

/**
 * Create assets that would expose tokenId vs tokenID bug
 * These have distinctive token IDs that should appear in the UI
 */
export function createTokenIdTestAssets(): Asset[] {
  return [
    createAsset('12345', { name: 'AUGOAT', assetClass: 'GOAT' }),
    createAsset('67890', { name: 'AUGOAT', assetClass: 'GOAT' }),
    createAsset('11111', { name: 'AUGOAT', assetClass: 'GOAT' }),
  ];
}

// =============================================================================
// ORDER FIXTURES (for orders page tests)
// =============================================================================

export interface OrderWithAssetFixture {
  id: string;
  buyer: string;
  seller: string;
  currentStatus: string;
  price: bigint;
  quantity: number;
  asset: Asset | null;
}

export const ordersWithAssets: OrderWithAssetFixture[] = [
  {
    id: '0xorder001',
    buyer: '0x1111111111111111111111111111111111111111',
    seller: '0x2222222222222222222222222222222222222222',
    currentStatus: 'pending',
    price: 1000000000000000000n,
    quantity: 10,
    asset: goatAssets[0],
  },
  {
    id: '0xorder002',
    buyer: '0x3333333333333333333333333333333333333333',
    seller: '0x2222222222222222222222222222222222222222',
    currentStatus: 'completed',
    price: 2000000000000000000n,
    quantity: 5,
    asset: goatAssets[1],
  },
  {
    id: '0xorder003',
    buyer: '0x1111111111111111111111111111111111111111',
    seller: '0x4444444444444444444444444444444444444444',
    currentStatus: 'pending',
    price: 500000000000000000n,
    quantity: 20,
    asset: goldAssets[0],
  },
];

// =============================================================================
// SUPPORTED CLASSES FIXTURE
// =============================================================================

export const supportedAssetClasses = ['GOAT', 'Precious Metals', 'Real Estate'];

export const assetClassDetails = [
  { name: 'GOAT', description: 'Tokenized goat assets' },
  { name: 'Precious Metals', description: 'Gold, Silver, Platinum' },
  { name: 'Real Estate', description: 'Property tokens' },
];
