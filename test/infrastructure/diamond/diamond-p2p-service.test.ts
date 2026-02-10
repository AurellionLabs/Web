/**
 * DiamondP2PService Tests (Write Operations)
 *
 * Tests createOffer, acceptOffer, cancelOffer on the Diamond contract.
 * These are the actual transaction-sending methods that interact with AuSysFacet.
 */
import { ethers } from 'ethers';
import {
  DiamondP2PService,
  decodeP2PError,
} from '@/infrastructure/diamond/diamond-p2p-service';

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

    it('should propagate contract errors with decoded message', async () => {
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

    it('should decode OfferNotOpen custom error to user-friendly message', async () => {
      // 0x2b8b1d43 is the selector for OfferNotOpen()
      const contractError = {
        code: 'CALL_EXCEPTION',
        data: '0x2b8b1d43',
        message: 'execution reverted (unknown custom error)',
      };
      const context = createMockContext({
        diamond: {
          acceptP2POffer: vi.fn().mockRejectedValue(contractError),
        },
      });
      const service = new DiamondP2PService(context);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(
        /no longer open/,
      );
    });

    it('should calculate totalCost as price + txFee (not price * qty)', async () => {
      // Verify the approval amount is price + txFee (contract's formula)
      const mockApproveTx = {
        hash: '0xapprove',
        wait: vi.fn().mockResolvedValue({}),
      };
      const mockQuoteToken = {
        allowance: vi.fn().mockResolvedValue(0n),
        approve: vi.fn().mockResolvedValue(mockApproveTx),
      };

      const price = BigInt('5000000000000000000'); // 5 tokens
      const txFee = BigInt('100000000000000000'); // 0.1 tokens
      const tokenQuantity = BigInt(10);

      const context = createMockContext({
        diamond: {
          getAuSysOrder: vi.fn().mockResolvedValue({
            id: OFFER_ID,
            isSellerInitiated: true,
            price,
            tokenQuantity,
            txFee,
          }),
        },
        quoteToken: mockQuoteToken,
      });

      const service = new DiamondP2PService(context);
      await service.acceptOffer(OFFER_ID);

      // Allowance check should use price + txFee = 5.1 tokens
      // NOT price * tokenQuantity + txFee = 50.1 tokens
      const expectedTotal = price + txFee; // 5100000000000000000n
      expect(mockQuoteToken.allowance).toHaveBeenCalled();

      // Since allowance was 0, approve was called. The ensureQuoteTokenApproval
      // checks `currentAllowance < amount`, where amount = price + txFee
      // We verify by checking that with an allowance just above price + txFee,
      // approve is NOT called (proving the formula is price + txFee)
      mockQuoteToken.allowance.mockResolvedValue(expectedTotal);
      mockQuoteToken.approve.mockClear();

      await service.acceptOffer(OFFER_ID);
      expect(mockQuoteToken.approve).not.toHaveBeenCalled();
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

    it('should propagate contract errors with decoded message', async () => {
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

    it('should decode OnlyCreatorCanCancel custom error', async () => {
      // 0x6035cb58 is the selector for OnlyCreatorCanCancel()
      const contractError = {
        code: 'CALL_EXCEPTION',
        data: '0x6035cb58',
        message: 'execution reverted (unknown custom error)',
      };
      const context = createMockContext({
        diamond: {
          cancelP2POffer: vi.fn().mockRejectedValue(contractError),
        },
      });
      const service = new DiamondP2PService(context);

      await expect(service.cancelOffer(OFFER_ID)).rejects.toThrow(
        /only the offer creator/i,
      );
    });
  });
});

// =============================================================================
// decodeP2PError unit tests
// =============================================================================

describe('decodeP2PError', () => {
  it('should decode OfferNotOpen selector (0x2b8b1d43)', () => {
    const error = { data: '0x2b8b1d43', message: 'revert' };
    expect(decodeP2PError(error)).toContain('no longer open');
  });

  it('should decode OfferNotFound selector (0x6df5846d)', () => {
    const error = { data: '0x6df5846d', message: 'revert' };
    expect(decodeP2PError(error)).toContain('not found');
  });

  it('should decode OfferExpired selector (0x9cb13087)', () => {
    const error = { data: '0x9cb13087', message: 'revert' };
    expect(decodeP2PError(error)).toContain('expired');
  });

  it('should decode CannotAcceptOwnOffer selector (0x520e449f)', () => {
    const error = { data: '0x520e449f', message: 'revert' };
    expect(decodeP2PError(error)).toContain('cannot accept your own');
  });

  it('should fall back to reason string if present', () => {
    const error = { reason: 'ERC20: insufficient allowance' };
    expect(decodeP2PError(error)).toBe('ERC20: insufficient allowance');
  });

  it('should fall back to error message for unknown errors', () => {
    const error = new Error('something unexpected');
    expect(decodeP2PError(error)).toBe('something unexpected');
  });

  it('should extract selector from data inside error.error (nested provider error)', () => {
    const error = {
      error: { data: '0x2b8b1d43' },
      message: 'call revert exception',
    };
    expect(decodeP2PError(error)).toContain('no longer open');
  });

  it('should extract selector from message body as fallback', () => {
    const error = {
      message:
        'execution reverted (unknown custom error) (action="estimateGas", data="0x2b8b1d43")',
    };
    expect(decodeP2PError(error)).toContain('no longer open');
  });

  it('should handle non-object errors', () => {
    expect(decodeP2PError('plain string error')).toBe('plain string error');
    expect(decodeP2PError(42)).toBe('42');
    expect(decodeP2PError(null)).toBe('null');
  });
});

// ============================================================================
// acceptOfferWithDelivery (combined accept + journey creation)
// ============================================================================

describe('acceptOfferWithDelivery', () => {
  const DELIVERY_DETAILS = {
    senderNodeAddress: '0xNodeSender000000000000000000000000000000',
    receiverAddress: '0xBuyerAddr0000000000000000000000000000000',
    parcelData: {
      startLocation: { lat: '-26.2', lng: '28.0' },
      endLocation: { lat: '-33.9', lng: '18.4' },
      startName: 'Seller Farm',
      endName: 'Buyer Location',
    },
    bountyWei: BigInt('500000000000000000'), // 0.5 USDT
    etaTimestamp: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24h from now
    tokenQuantity: BigInt(1000),
    assetId: BigInt(100),
  };

  function createAcceptWithDeliveryContext() {
    const acceptTx = {
      hash: '0xaccepthash',
      wait: vi.fn().mockResolvedValue({
        hash: '0xaccepthash',
        blockNumber: 100,
        logs: [],
      }),
    };

    const journeyTx = {
      hash: '0xjourneyhash',
      wait: vi.fn().mockResolvedValue({
        hash: '0xjourneyhash',
        blockNumber: 101,
        status: 1,
        logs: [
          {
            topics: ['0xJourneyCreated'],
            data: '0x',
          },
        ],
      }),
    };

    const mockInterface = {
      parseLog: vi.fn().mockReturnValue({
        name: 'JourneyCreated',
        args: { journeyId: '0xjourney123' },
      }),
    };

    const sellOrder = {
      id: OFFER_ID,
      isSellerInitiated: true,
      price: BigInt('1000000000000000000'), // 1 USDT
      tokenQuantity: BigInt(1000),
      txFee: BigInt('20000000000000000'), // 0.02 USDT
    };

    const mockQuoteToken = {
      allowance: vi.fn().mockResolvedValue(BigInt('999999999999999999999999')),
      approve: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({}),
      }),
    };

    const diamond = {
      createAuSysOrder: vi.fn(),
      acceptP2POffer: vi.fn().mockResolvedValue(acceptTx),
      cancelP2POffer: vi.fn(),
      getAuSysOrder: vi.fn().mockResolvedValue(sellOrder),
      createOrderJourney: vi.fn().mockResolvedValue(journeyTx),
      interface: mockInterface,
    };

    return {
      getDiamond: vi.fn().mockReturnValue(diamond),
      getSignerAddress: vi.fn().mockResolvedValue(SELLER),
      getSigner: vi.fn(),
      getProvider: vi.fn(),
      getQuoteTokenContract: vi.fn().mockReturnValue(mockQuoteToken),
      _diamond: diamond,
      _acceptTx: acceptTx,
      _journeyTx: journeyTx,
      _mockQuoteToken: mockQuoteToken,
    } as any;
  }

  it('should call acceptP2POffer then createOrderJourney in sequence', async () => {
    const context = createAcceptWithDeliveryContext();
    const service = new DiamondP2PService(context);

    await service.acceptOfferWithDelivery(OFFER_ID, DELIVERY_DETAILS);

    // Accept must be called first
    expect(context._diamond.acceptP2POffer).toHaveBeenCalledWith(OFFER_ID);
    expect(context._diamond.acceptP2POffer).toHaveBeenCalledTimes(1);

    // Then createOrderJourney
    expect(context._diamond.createOrderJourney).toHaveBeenCalledTimes(1);
    expect(context._diamond.createOrderJourney).toHaveBeenCalledWith(
      OFFER_ID,
      DELIVERY_DETAILS.senderNodeAddress,
      DELIVERY_DETAILS.receiverAddress,
      DELIVERY_DETAILS.parcelData,
      DELIVERY_DETAILS.bountyWei,
      DELIVERY_DETAILS.etaTimestamp,
      DELIVERY_DETAILS.tokenQuantity,
      DELIVERY_DETAILS.assetId,
    );
  });

  it('should ensure ERC20 approval covers price + txFee + bounty', async () => {
    // Set allowance to 0 so approval is needed
    const context = createAcceptWithDeliveryContext();
    context._mockQuoteToken.allowance.mockResolvedValue(BigInt(0));
    context._mockQuoteToken.approve.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });

    const service = new DiamondP2PService(context);

    await service.acceptOfferWithDelivery(OFFER_ID, DELIVERY_DETAILS);

    // Should have called approve (since allowance was 0)
    expect(context._mockQuoteToken.approve).toHaveBeenCalled();
  });

  it('should not call createOrderJourney if acceptP2POffer fails', async () => {
    const context = createAcceptWithDeliveryContext();
    context._diamond.acceptP2POffer.mockRejectedValue(
      new Error('OfferNotOpen'),
    );

    const service = new DiamondP2PService(context);

    await expect(
      service.acceptOfferWithDelivery(OFFER_ID, DELIVERY_DETAILS),
    ).rejects.toThrow();

    expect(context._diamond.createOrderJourney).not.toHaveBeenCalled();
  });

  it('should wait for accept transaction before creating journey', async () => {
    const context = createAcceptWithDeliveryContext();
    const callOrder: string[] = [];

    context._diamond.acceptP2POffer.mockImplementation(() => {
      callOrder.push('accept');
      return Promise.resolve({
        hash: '0xaccepthash',
        wait: () => {
          callOrder.push('accept-confirmed');
          return Promise.resolve({ hash: '0xaccepthash', logs: [] });
        },
      });
    });

    context._diamond.createOrderJourney.mockImplementation(() => {
      callOrder.push('journey');
      return Promise.resolve({
        hash: '0xjourneyhash',
        wait: () => {
          callOrder.push('journey-confirmed');
          return Promise.resolve({
            hash: '0xjourneyhash',
            status: 1,
            logs: [],
          });
        },
      });
    });

    const service = new DiamondP2PService(context);
    await service.acceptOfferWithDelivery(OFFER_ID, DELIVERY_DETAILS);

    expect(callOrder).toEqual([
      'accept',
      'accept-confirmed',
      'journey',
      'journey-confirmed',
    ]);
  });

  it('should propagate decoded error from accept phase', async () => {
    const context = createAcceptWithDeliveryContext();
    context._diamond.acceptP2POffer.mockRejectedValue({
      data: '0x2b8b1d43', // OfferNotOpen
      message: 'execution reverted',
    });

    const service = new DiamondP2PService(context);

    await expect(
      service.acceptOfferWithDelivery(OFFER_ID, DELIVERY_DETAILS),
    ).rejects.toThrow(/no longer open/);
  });

  it('should propagate error from journey creation phase', async () => {
    const context = createAcceptWithDeliveryContext();
    context._diamond.createOrderJourney.mockRejectedValue(
      new Error('InvalidETA'),
    );

    const service = new DiamondP2PService(context);

    await expect(
      service.acceptOfferWithDelivery(OFFER_ID, DELIVERY_DETAILS),
    ).rejects.toThrow('InvalidETA');
  });
});
