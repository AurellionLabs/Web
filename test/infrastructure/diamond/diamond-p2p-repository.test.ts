/**
 * DiamondP2PRepository Tests
 *
 * Tests for the P2P offer read operations. This catches:
 * - "Diamond: Function does not exist" errors (facet not installed)
 * - Status mapping bugs
 * - Empty/null offer handling
 * - User offer filtering
 */
import { ethers } from 'ethers';
import { DiamondP2PRepository } from '@/infrastructure/diamond/diamond-p2p-service';

// Mock chain-constants (needed transitively)
vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_INDEXER_URL: 'https://mock-indexer.test/graphql',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
}));

const SELLER = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
const BUYER = '0x1111111111111111111111111111111111111111';
const TOKEN = '0xb3090aBF81918FF50e921b166126aD6AB9a03944';
const TOKEN_ID = BigInt(
  '0xb4ea2cef8a0db05f1d5db458b7e725abe12c5dea46810992eae76b8687876a40',
);

/** Make a mock on-chain order */
function makeMockOrder(
  overrides: Partial<{
    id: string;
    seller: string;
    buyer: string;
    targetCounterparty: string;
    token: string;
    tokenId: bigint;
    tokenQuantity: bigint;
    price: bigint;
    txFee: bigint;
    isSellerInitiated: boolean;
    currentStatus: number;
    expiresAt: number;
    locationData: string;
    nodes: string[];
  }> = {},
) {
  return {
    id: overrides.id ?? ethers.hexlify(ethers.randomBytes(32)),
    seller: overrides.seller ?? SELLER,
    buyer: overrides.buyer ?? ethers.ZeroAddress,
    targetCounterparty: overrides.targetCounterparty ?? ethers.ZeroAddress,
    token: overrides.token ?? TOKEN,
    tokenId: overrides.tokenId ?? TOKEN_ID,
    tokenQuantity: overrides.tokenQuantity ?? BigInt(100000),
    price: overrides.price ?? BigInt('10000000000000000000'),
    txFee: overrides.txFee ?? BigInt(0),
    isSellerInitiated: overrides.isSellerInitiated ?? true,
    currentStatus: overrides.currentStatus ?? 1, // 1 = Open
    expiresAt: overrides.expiresAt ?? Math.floor(Date.now() / 1000) + 86400,
    locationData: overrides.locationData ?? '',
    nodes: overrides.nodes ?? [],
  };
}

function createMockContext(
  overrides: {
    openOfferIds?: string[];
    userOfferIds?: string[];
    orders?: Record<string, ReturnType<typeof makeMockOrder>>;
    getOpenError?: Error;
    getOrderError?: Error;
  } = {},
) {
  const orders = overrides.orders ?? {};

  const diamond = {
    getOpenP2POffers: overrides.getOpenError
      ? vi.fn().mockRejectedValue(overrides.getOpenError)
      : vi.fn().mockResolvedValue(overrides.openOfferIds ?? []),
    getUserP2POffers: vi.fn().mockResolvedValue(overrides.userOfferIds ?? []),
    getAuSysOrder: overrides.getOrderError
      ? vi.fn().mockRejectedValue(overrides.getOrderError)
      : vi.fn().mockImplementation((id: string) => {
          return Promise.resolve(orders[id] ?? { id: ethers.ZeroHash });
        }),
  };

  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getProvider: vi.fn(),
    getSigner: vi.fn(),
    getSignerAddress: vi.fn(),
    _diamond: diamond,
  } as any;
}

describe('DiamondP2PRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOpenOffers', () => {
    it('should return empty array when no open offers', async () => {
      const context = createMockContext({ openOfferIds: [] });
      const repo = new DiamondP2PRepository(context);
      const offers = await repo.getOpenOffers();
      expect(offers).toEqual([]);
    });

    it('should fetch and map all open offers', async () => {
      const orderId1 = ethers.hexlify(ethers.randomBytes(32));
      const orderId2 = ethers.hexlify(ethers.randomBytes(32));

      const order1 = makeMockOrder({ id: orderId1, isSellerInitiated: true });
      const order2 = makeMockOrder({
        id: orderId2,
        isSellerInitiated: false,
        buyer: BUYER,
      });

      const context = createMockContext({
        openOfferIds: [orderId1, orderId2],
        orders: { [orderId1]: order1, [orderId2]: order2 },
      });

      const repo = new DiamondP2PRepository(context);
      const offers = await repo.getOpenOffers();

      expect(offers).toHaveLength(2);
      expect(offers[0].id).toBe(orderId1);
      expect(offers[0].isSellerInitiated).toBe(true);
      expect(offers[0].creator).toBe(SELLER);
      expect(offers[1].id).toBe(orderId2);
      expect(offers[1].isSellerInitiated).toBe(false);
      expect(offers[1].creator).toBe(BUYER);
    });

    it('should return empty array when diamond contract call fails', async () => {
      const context = createMockContext({
        getOpenError: new Error('Diamond: Function does not exist'),
      });

      const repo = new DiamondP2PRepository(context);
      const offers = await repo.getOpenOffers();

      // Should NOT throw, should return []
      expect(offers).toEqual([]);
    });

    it('should filter out null offers (non-existent order IDs)', async () => {
      const orderId1 = ethers.hexlify(ethers.randomBytes(32));
      const orderId2 = ethers.hexlify(ethers.randomBytes(32));

      const order1 = makeMockOrder({ id: orderId1 });
      // orderId2 not in orders map -> will return ZeroHash -> null

      const context = createMockContext({
        openOfferIds: [orderId1, orderId2],
        orders: { [orderId1]: order1 },
      });

      const repo = new DiamondP2PRepository(context);
      const offers = await repo.getOpenOffers();

      expect(offers).toHaveLength(1);
      expect(offers[0].id).toBe(orderId1);
    });
  });

  describe('getOffer', () => {
    it('should return null for non-existent offer (ZeroHash id)', async () => {
      const context = createMockContext();
      const repo = new DiamondP2PRepository(context);
      const offer = await repo.getOffer('0xdeadbeef');

      expect(offer).toBeNull();
    });

    it('should map all contract fields correctly', async () => {
      const orderId = ethers.hexlify(ethers.randomBytes(32));
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const order = makeMockOrder({
        id: orderId,
        seller: SELLER,
        buyer: BUYER,
        targetCounterparty: BUYER,
        token: TOKEN,
        tokenId: TOKEN_ID,
        tokenQuantity: BigInt(50000),
        price: BigInt('5000000000000000000'),
        txFee: BigInt('100000000000000000'),
        isSellerInitiated: true,
        currentStatus: 1,
        expiresAt,
      });

      const context = createMockContext({
        orders: { [orderId]: order },
      });

      const repo = new DiamondP2PRepository(context);
      const offer = await repo.getOffer(orderId);

      expect(offer).not.toBeNull();
      expect(offer!.id).toBe(orderId);
      expect(offer!.creator).toBe(SELLER); // isSellerInitiated -> creator is seller
      expect(offer!.targetCounterparty).toBe(BUYER);
      expect(offer!.token).toBe(TOKEN);
      expect(offer!.tokenId).toBe(TOKEN_ID.toString());
      expect(offer!.quantity).toBe(BigInt(50000));
      expect(offer!.price).toBe(BigInt('5000000000000000000'));
      expect(offer!.txFee).toBe(BigInt('100000000000000000'));
      expect(offer!.isSellerInitiated).toBe(true);
      expect(offer!.expiresAt).toBe(expiresAt);
    });

    it('should set targetCounterparty to null when ZeroAddress', async () => {
      const orderId = ethers.hexlify(ethers.randomBytes(32));
      const order = makeMockOrder({
        id: orderId,
        targetCounterparty: ethers.ZeroAddress,
      });

      const context = createMockContext({
        orders: { [orderId]: order },
      });

      const repo = new DiamondP2PRepository(context);
      const offer = await repo.getOffer(orderId);

      expect(offer!.targetCounterparty).toBeNull();
    });

    it('should return null on contract error (not throw)', async () => {
      const context = createMockContext({
        getOrderError: new Error('execution reverted'),
      });

      const repo = new DiamondP2PRepository(context);
      const offer = await repo.getOffer('0xbadid');

      expect(offer).toBeNull();
    });
  });

  describe('getUserOffers', () => {
    it('should return offers for a specific user', async () => {
      const orderId = ethers.hexlify(ethers.randomBytes(32));
      const order = makeMockOrder({ id: orderId, seller: SELLER });

      const context = createMockContext({
        userOfferIds: [orderId],
        orders: { [orderId]: order },
      });

      const repo = new DiamondP2PRepository(context);
      const offers = await repo.getUserOffers(SELLER);

      expect(context._diamond.getUserP2POffers).toHaveBeenCalledWith(SELLER);
      expect(offers).toHaveLength(1);
      expect(offers[0].creator).toBe(SELLER);
    });
  });

  describe('getOffersByAsset', () => {
    it('should filter open offers by token and tokenId', async () => {
      const id1 = ethers.hexlify(ethers.randomBytes(32));
      const id2 = ethers.hexlify(ethers.randomBytes(32));
      const otherTokenId = BigInt(999);

      const order1 = makeMockOrder({
        id: id1,
        token: TOKEN,
        tokenId: TOKEN_ID,
      });
      const order2 = makeMockOrder({
        id: id2,
        token: TOKEN,
        tokenId: otherTokenId,
      });

      const context = createMockContext({
        openOfferIds: [id1, id2],
        orders: { [id1]: order1, [id2]: order2 },
      });

      const repo = new DiamondP2PRepository(context);
      const filtered = await repo.getOffersByAsset(TOKEN, TOKEN_ID.toString());

      expect(filtered).toHaveLength(1);
      expect(filtered[0].tokenId).toBe(TOKEN_ID.toString());
    });
  });

  describe('getBuyOffers / getSellOffers', () => {
    it('should separate buy and sell offers', async () => {
      const sellId = ethers.hexlify(ethers.randomBytes(32));
      const buyId = ethers.hexlify(ethers.randomBytes(32));

      const sellOrder = makeMockOrder({ id: sellId, isSellerInitiated: true });
      const buyOrder = makeMockOrder({
        id: buyId,
        isSellerInitiated: false,
        buyer: BUYER,
      });

      const context = createMockContext({
        openOfferIds: [sellId, buyId],
        orders: { [sellId]: sellOrder, [buyId]: buyOrder },
      });

      const repo = new DiamondP2PRepository(context);
      const sells = await repo.getSellOffers();
      const buys = await repo.getBuyOffers();

      expect(sells).toHaveLength(1);
      expect(sells[0].isSellerInitiated).toBe(true);
      expect(buys).toHaveLength(1);
      expect(buys[0].isSellerInitiated).toBe(false);
    });
  });
});
