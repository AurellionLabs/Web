/**
 * DiamondP2PService Tests (Write Operations)
 *
 * Tests createOffer, acceptOffer, cancelOffer on the Diamond contract.
 * These are the actual transaction-sending methods that interact with AuSysFacet.
 */
import { ethers } from 'ethers';
import { DiamondP2PService } from '@/infrastructure/diamond/diamond-p2p-service';

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_INDEXER_URL: 'https://mock-indexer.test/graphql',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0x1235E39477752713902bCE541Fc02ADeb6FF465b',
}));

const SELLER = '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF';
const TOKEN = '0xb3090aBF81918FF50e921b166126aD6AB9a03944';
const TOKEN_ID =
  '0xb4ea2cef8a0db05f1d5db458b7e725abe12c5dea46810992eae76b8687876a40';
const OFFER_ID =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

function createMockContext(overrides: Record<string, any> = {}) {
  const mockTx = {
    hash: '0xtxhash',
    wait: vi.fn().mockResolvedValue({
      hash: '0xtxhash',
      blockNumber: 100,
      logs: overrides.logs ?? [
        {
          topics: ['0xevent'],
          data: '0x' + OFFER_ID.slice(2),
        },
      ],
    }),
  };

  const mockInterface = {
    parseLog: vi.fn().mockReturnValue({
      name: 'P2POfferCreated',
      args: { offerId: OFFER_ID },
    }),
  };

  const diamond = {
    createAuSysOrder: vi.fn().mockResolvedValue(mockTx),
    acceptP2POffer: vi.fn().mockResolvedValue(mockTx),
    cancelP2POffer: vi.fn().mockResolvedValue(mockTx),
    interface: mockInterface,
    ...overrides.diamond,
  };

  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getSignerAddress: vi.fn().mockResolvedValue(SELLER),
    getSigner: vi.fn(),
    getProvider: vi.fn(),
    _diamond: diamond,
    _mockTx: mockTx,
  } as any;
}

describe('DiamondP2PService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOffer', () => {
    it('should call createAuSysOrder with correct struct', async () => {
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: BigInt(100000),
        price: BigInt('10000000000000000000'),
        isSellOffer: true,
        expiresAt: 1700000000,
      });

      expect(context._diamond.createAuSysOrder).toHaveBeenCalledTimes(1);
      const orderArg = context._diamond.createAuSysOrder.mock.calls[0][0];

      // Verify key fields of the order struct
      expect(orderArg.token).toBe(TOKEN);
      expect(orderArg.tokenId).toBe(TOKEN_ID);
      expect(orderArg.tokenQuantity).toBe(BigInt(100000));
      expect(orderArg.price).toBe(BigInt('10000000000000000000'));
      expect(orderArg.isSellerInitiated).toBe(true);
      expect(orderArg.expiresAt).toBe(1700000000);
    });

    it('should set seller address for sell offers', async () => {
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: BigInt(100),
        price: BigInt(1000),
        isSellOffer: true,
      });

      const orderArg = context._diamond.createAuSysOrder.mock.calls[0][0];
      expect(orderArg.seller).toBe(SELLER);
      expect(orderArg.isSellerInitiated).toBe(true);
    });

    it('should set buyer address for buy offers', async () => {
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: BigInt(100),
        price: BigInt(1000),
        isSellOffer: false,
      });

      const orderArg = context._diamond.createAuSysOrder.mock.calls[0][0];
      expect(orderArg.buyer).toBe(SELLER); // Signer is the buyer
      expect(orderArg.isSellerInitiated).toBe(false);
    });

    it('should set targetCounterparty when provided', async () => {
      const target = '0x1111111111111111111111111111111111111111';
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: BigInt(100),
        price: BigInt(1000),
        isSellOffer: true,
        targetCounterparty: target,
      });

      const orderArg = context._diamond.createAuSysOrder.mock.calls[0][0];
      expect(orderArg.targetCounterparty).toBe(target);
    });

    it('should propagate contract errors', async () => {
      const context = createMockContext({
        diamond: {
          createAuSysOrder: vi
            .fn()
            .mockRejectedValue(new Error('Diamond: Function does not exist')),
        },
      });
      const service = new DiamondP2PService(context);

      await expect(
        service.createOffer({
          token: TOKEN,
          tokenId: TOKEN_ID,
          quantity: BigInt(100),
          price: BigInt(1000),
          isSellOffer: true,
        }),
      ).rejects.toThrow('Diamond: Function does not exist');
    });
  });

  describe('acceptOffer', () => {
    it('should call acceptP2POffer with correct offerId', async () => {
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.acceptOffer(OFFER_ID);

      expect(context._diamond.acceptP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });

    it('should wait for transaction confirmation', async () => {
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.acceptOffer(OFFER_ID);

      expect(context._mockTx.wait).toHaveBeenCalled();
    });

    it('should propagate contract errors', async () => {
      const context = createMockContext({
        diamond: {
          acceptP2POffer: vi
            .fn()
            .mockRejectedValue(new Error('ERC1155InsufficientBalance')),
        },
      });
      const service = new DiamondP2PService(context);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(
        'ERC1155InsufficientBalance',
      );
    });
  });

  describe('cancelOffer', () => {
    it('should call cancelP2POffer with correct offerId', async () => {
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.cancelOffer(OFFER_ID);

      expect(context._diamond.cancelP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });

    it('should propagate contract errors', async () => {
      const context = createMockContext({
        diamond: {
          cancelP2POffer: vi
            .fn()
            .mockRejectedValue(new Error('Only creator can cancel')),
        },
      });
      const service = new DiamondP2PService(context);

      await expect(service.cancelOffer(OFFER_ID)).rejects.toThrow(
        'Only creator can cancel',
      );
    });
  });
});
