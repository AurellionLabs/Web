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
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xQuoteToken0000000000000000000000000000',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamondAddr0000000000000000000000000000',
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

  // Default: a buy offer (acceptor is seller → no ERC20 approval needed)
  const defaultOrder = {
    id: OFFER_ID,
    isSellerInitiated: false,
    price: BigInt('1000000000000000000'),
    tokenQuantity: BigInt(1),
    txFee: BigInt(0),
  };

  const diamond = {
    createAuSysOrder: vi.fn().mockResolvedValue(mockTx),
    acceptP2POffer: vi.fn().mockResolvedValue(mockTx),
    cancelP2POffer: vi.fn().mockResolvedValue(mockTx),
    getAuSysOrder: vi.fn().mockResolvedValue(defaultOrder),
    interface: mockInterface,
    ...overrides.diamond,
  };

  // Default mock quote token (no allowance needed for buy offer defaults)
  const mockQuoteToken = overrides.quoteToken ?? {
    allowance: vi.fn().mockResolvedValue(BigInt('999999999999999999999999')),
    approve: vi.fn(),
  };

  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getSignerAddress: vi.fn().mockResolvedValue(SELLER),
    getSigner: vi.fn(),
    getProvider: vi.fn(),
    getQuoteTokenContract: vi.fn().mockReturnValue(mockQuoteToken),
    _diamond: diamond,
    _mockTx: mockTx,
    _mockQuoteToken: mockQuoteToken,
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

    it('should fetch the offer and check ERC20 allowance before accepting a sell offer (buyer pays)', async () => {
      // When accepting a sell offer, acceptor is the buyer who must pay ERC20
      const mockApproveTx = {
        hash: '0xapprove',
        wait: vi.fn().mockResolvedValue({}),
      };
      const mockQuoteToken = {
        allowance: vi.fn().mockResolvedValue(0n), // Insufficient
        approve: vi.fn().mockResolvedValue(mockApproveTx),
      };

      const context = createMockContext({
        diamond: {
          getAuSysOrder: vi.fn().mockResolvedValue({
            id: OFFER_ID,
            isSellerInitiated: true, // Sell offer → acceptor is buyer
            price: BigInt('5000000000000000000'),
            tokenQuantity: BigInt(10),
            txFee: BigInt('100000000000000000'),
          }),
        },
        quoteToken: mockQuoteToken,
      });

      const service = new DiamondP2PService(context);
      await service.acceptOffer(OFFER_ID);

      // Should have fetched the offer first
      expect(context._diamond.getAuSysOrder).toHaveBeenCalledWith(OFFER_ID);
      // Should have checked allowance
      expect(mockQuoteToken.allowance).toHaveBeenCalled();
      // Should have approved since allowance was 0
      expect(mockQuoteToken.approve).toHaveBeenCalled();
    });

    it('should skip ERC20 approval when accepting a buy offer (acceptor is seller)', async () => {
      // Default mock context has isSellerInitiated: false (buy offer)
      const context = createMockContext();
      const service = new DiamondP2PService(context);

      await service.acceptOffer(OFFER_ID);

      // Should NOT check allowance for seller accepting a buy offer
      expect(context._mockQuoteToken.allowance).not.toHaveBeenCalled();
    });

    it('should skip ERC20 approval when allowance is already sufficient', async () => {
      const mockQuoteToken = {
        allowance: vi.fn().mockResolvedValue(BigInt('999999999999999999999')),
        approve: vi.fn(),
      };

      const context = createMockContext({
        diamond: {
          getAuSysOrder: vi.fn().mockResolvedValue({
            id: OFFER_ID,
            isSellerInitiated: true,
            price: BigInt('5000000000000000000'),
            tokenQuantity: BigInt(10),
            txFee: BigInt('100000000000000000'),
          }),
        },
        quoteToken: mockQuoteToken,
      });

      const service = new DiamondP2PService(context);
      await service.acceptOffer(OFFER_ID);

      // Should check allowance
      expect(mockQuoteToken.allowance).toHaveBeenCalled();
      // Should NOT approve (already sufficient)
      expect(mockQuoteToken.approve).not.toHaveBeenCalled();
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
