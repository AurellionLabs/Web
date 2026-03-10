/**
 * P2P Logical Flow Tests
 *
 * These tests verify the COMPLETE lifecycle of P2P trades through the service
 * layer, ensuring every approval the contract requires is actually performed
 * by the frontend, in the correct order.
 *
 * Contract source of truth: contracts/diamond/facets/AuSysFacet.sol
 *
 * Sell offer flow:
 *   1. Seller: ERC1155 setApprovalForAll → createAuSysOrder (escrows ERC1155)
 *   2. Buyer: ERC20 approve(price+txFee) → acceptP2POffer (escrows ERC20)
 *   3. Buyer: ERC20 approve(bounty) → createOrderJourney (escrows bounty)
 *
 * Buy offer flow:
 *   1. Buyer: ERC20 approve(price+txFee) → createAuSysOrder (escrows ERC20)
 *   2. Seller: ERC1155 setApprovalForAll → acceptP2POfferWithPickupNode (escrows ERC1155 + persists pickup metadata)
 *   3. Buyer: ERC20 approve(bounty) → createOrderJourney (escrows bounty)
 */

import { ethers } from 'ethers';
import { DiamondP2PService } from '@/infrastructure/diamond/diamond-p2p-service';

// =============================================================================
// Constants
// =============================================================================

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'https://mock-indexer.test/graphql',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0xAuraAsset000000000000000000000000000000',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xQuoteToken0000000000000000000000000000',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamondAddr0000000000000000000000000000',
}));

const SELLER = '0xSeller00000000000000000000000000000000000';
const BUYER = '0xBuyer000000000000000000000000000000000000';
const TOKEN = '0xAuraAsset000000000000000000000000000000';
const TOKEN_ID = '0xaabbccdd';
const OFFER_ID =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const SELLER_PICKUP_NODE =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const PRICE = BigInt('40000000000000000000'); // 40 tokens
const TX_FEE = BigInt('800000000000000000'); // 0.8 tokens (2% of 40)
const QUANTITY = BigInt(100);
const BOUNTY = BigInt('500000000000000000'); // 0.5 tokens

// =============================================================================
// Mock Helpers
// =============================================================================

function makeMockTx(hash = '0xtxhash') {
  return {
    hash,
    wait: vi.fn().mockResolvedValue({
      hash,
      blockNumber: 100,
      status: 1,
      logs: [{ topics: ['0xevent'], data: '0x' + OFFER_ID.slice(2) }],
    }),
  };
}

function makeSellOrder() {
  return {
    id: OFFER_ID,
    token: TOKEN,
    tokenId: TOKEN_ID,
    tokenQuantity: QUANTITY,
    isSellerInitiated: true,
    price: PRICE,
    txFee: TX_FEE,
    buyer: ethers.ZeroAddress,
    seller: SELLER,
    targetCounterparty: ethers.ZeroAddress,
    nodes: [],
    locationData: {
      startLocation: { lat: '', lng: '' },
      endLocation: { lat: '', lng: '' },
      startName: '',
      endName: '',
    },
    currentStatus: 0,
  };
}

function makeBuyOrder() {
  return {
    ...makeSellOrder(),
    isSellerInitiated: false,
    buyer: BUYER,
    seller: ethers.ZeroAddress,
  };
}

function makeDeliveryDetails() {
  return {
    senderNodeAddress: '0xNodeSender000000000000000000000000000000',
    pickupNodeRef: SELLER_PICKUP_NODE,
    receiverAddress: BUYER,
    parcelData: {
      startLocation: { lat: '-26.2', lng: '28.0' },
      endLocation: { lat: '-33.9', lng: '18.4' },
      startName: 'Seller Location',
      endName: 'Buyer Location',
    },
    bountyWei: BOUNTY,
    etaTimestamp: BigInt(Math.floor(Date.now() / 1000) + 86400),
    tokenQuantity: QUANTITY,
    assetId: BigInt(1),
  };
}

interface MockContextOptions {
  signerAddress?: string;
  order?: ReturnType<typeof makeSellOrder>;
  erc20Allowance?: bigint;
  erc1155Approved?: boolean;
  acceptTxOverride?: any;
  journeyTxOverride?: any;
  createTxOverride?: any;
  cancelTxOverride?: any;
}

function createFlowContext(opts: MockContextOptions = {}) {
  const createTx = opts.createTxOverride ?? makeMockTx('0xcreatehash');
  const acceptTx = opts.acceptTxOverride ?? makeMockTx('0xaccepthash');
  const journeyTx = opts.journeyTxOverride ?? makeMockTx('0xjourneyhash');
  const cancelTx = opts.cancelTxOverride ?? makeMockTx('0xcancelhash');

  const diamond = {
    createAuSysOrder: vi.fn().mockResolvedValue(createTx),
    acceptP2POffer: vi.fn().mockResolvedValue(acceptTx),
    acceptP2POfferWithPickupNode: vi.fn().mockResolvedValue(acceptTx),
    cancelP2POffer: vi.fn().mockResolvedValue(cancelTx),
    createOrderJourney: vi.fn().mockResolvedValue(journeyTx),
    getOwnerNodes: vi.fn().mockResolvedValue([SELLER_PICKUP_NODE]),
    getNode: vi.fn().mockResolvedValue({
      lat: '-26.2041',
      lng: '28.0473',
      addressName: 'Seller Node',
    }),
    getAuSysOrder: vi.fn().mockResolvedValue(opts.order ?? makeSellOrder()),
    getPayToken: vi
      .fn()
      .mockResolvedValue('0xQuoteToken0000000000000000000000000000'),
    interface: {
      parseLog: vi.fn().mockReturnValue({
        name: 'P2POfferCreated',
        args: { orderId: OFFER_ID, 0: OFFER_ID },
      }),
    },
  };

  const approveTx = makeMockTx('0xapprovehash');
  const erc1155ApproveTx = makeMockTx('0xerc1155approvehash');
  const configuredErc20Allowance = opts.erc20Allowance ?? BigInt(0);

  const mockQuoteToken = {
    allowance:
      configuredErc20Allowance === BigInt(0)
        ? vi
            .fn()
            .mockResolvedValueOnce(BigInt(0))
            .mockResolvedValue(ethers.MaxUint256)
        : vi.fn().mockResolvedValue(configuredErc20Allowance),
    approve: vi.fn().mockResolvedValue(approveTx),
  };

  const erc1155ApprovedValue = opts.erc1155Approved ?? true;
  const mockERC1155 = {
    isApprovedForAll: erc1155ApprovedValue
      ? vi.fn().mockResolvedValue(true)
      : vi
          .fn()
          .mockResolvedValueOnce(false) // initial check
          .mockResolvedValueOnce(true), // verification after approval
    setApprovalForAll: vi.fn().mockResolvedValue(erc1155ApproveTx),
  };

  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getSignerAddress: vi.fn().mockResolvedValue(opts.signerAddress ?? SELLER),
    getSigner: vi.fn(),
    getProvider: vi.fn(),
    getQuoteTokenContract: vi.fn().mockReturnValue(mockQuoteToken),
    getERC1155Contract: vi.fn().mockReturnValue(mockERC1155),
    // Exposed for assertions
    _diamond: diamond,
    _quoteToken: mockQuoteToken,
    _erc1155: mockERC1155,
    _createTx: createTx,
    _acceptTx: acceptTx,
    _journeyTx: journeyTx,
    _cancelTx: cancelTx,
  } as any;
}

// =============================================================================
// Tests
// =============================================================================

describe('P2P Logical Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. SELL OFFER COMPLETE FLOW
  // ===========================================================================

  describe('Sell Offer Flow (seller creates, buyer accepts)', () => {
    it('Step 1: seller creates sell offer — checks ERC1155 approval, then calls createAuSysOrder', async () => {
      const ctx = createFlowContext({
        signerAddress: SELLER,
        erc1155Approved: false, // needs approval
      });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: true,
        pickupNodeRef: SELLER_PICKUP_NODE,
      });

      // Must check ERC1155 approval
      expect(ctx._erc1155.isApprovedForAll).toHaveBeenCalled();
      // Must request approval since not approved
      expect(ctx._erc1155.setApprovalForAll).toHaveBeenCalled();
      // Must NOT check ERC20 (seller doesn't pay quote token on creation)
      expect(ctx._quoteToken.allowance).not.toHaveBeenCalled();
      // Must call createAuSysOrder
      expect(ctx._diamond.createAuSysOrder).toHaveBeenCalledTimes(1);
      const orderArg = ctx._diamond.createAuSysOrder.mock.calls[0][0];
      expect(orderArg.isSellerInitiated).toBe(true);
      expect(orderArg.seller).toBe(SELLER);
    });

    it('Step 2: buyer accepts sell offer — checks ERC20 approval, then calls acceptP2POffer', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: BigInt(0), // needs approval
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOffer(OFFER_ID);

      // Must fetch the offer first to determine approval needs
      expect(ctx._diamond.getAuSysOrder).toHaveBeenCalledWith(OFFER_ID);
      // Must check and request ERC20 approval (buyer pays)
      expect(ctx._quoteToken.allowance).toHaveBeenCalled();
      expect(ctx._quoteToken.approve).toHaveBeenCalled();
      // Must NOT check ERC1155 (buyer doesn't transfer tokens)
      expect(ctx._erc1155.isApprovedForAll).not.toHaveBeenCalled();
      // Must call acceptP2POffer
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });

    it('Step 2+3: buyer accepts sell offer with delivery — ERC20 covers price+txFee+bounty, then accept+journey', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: BigInt(0), // needs approval
      });
      const service = new DiamondP2PService(ctx);
      const delivery = makeDeliveryDetails();

      await service.acceptOfferWithDelivery(OFFER_ID, delivery);

      // ERC20 approval must be checked (combined amount)
      expect(ctx._quoteToken.allowance).toHaveBeenCalled();
      expect(ctx._quoteToken.approve).toHaveBeenCalled();
      // Accept then journey
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalledWith(OFFER_ID);
      expect(ctx._diamond.createOrderJourney).toHaveBeenCalledTimes(1);
    });

    it('sell offer accept: ERC20 approval amount = price + txFee (not price * quantity)', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        // Allowance is exactly price + txFee — should be sufficient
        erc20Allowance: PRICE + TX_FEE,
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOffer(OFFER_ID);

      // Allowance >= required → no approve call
      expect(ctx._quoteToken.approve).not.toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. BUY OFFER COMPLETE FLOW — EXPOSES APPROVAL GAPS
  // ===========================================================================

  describe('Buy Offer Flow (buyer creates, seller accepts)', () => {
    it('Step 1: buyer creates buy offer — MUST check ERC20 approval before createAuSysOrder', async () => {
      // Contract: createAuSysOrder escrows ERC20 (price+txFee) from buyer
      // Frontend MUST ensure ERC20 approval before calling createAuSysOrder
      const ctx = createFlowContext({
        signerAddress: BUYER,
        erc20Allowance: BigInt(0), // needs approval
      });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: false, // BUY offer
      });

      // MUST check ERC20 approval (buyer pays quote token on creation)
      expect(ctx._quoteToken.allowance).toHaveBeenCalled();
      expect(ctx._quoteToken.approve).toHaveBeenCalled();
      // MUST NOT check ERC1155 (buyer doesn't own tokens to escrow)
      expect(ctx._erc1155.isApprovedForAll).not.toHaveBeenCalled();
      // Must still call createAuSysOrder
      expect(ctx._diamond.createAuSysOrder).toHaveBeenCalledTimes(1);
      const orderArg = ctx._diamond.createAuSysOrder.mock.calls[0][0];
      expect(orderArg.isSellerInitiated).toBe(false);
      expect(orderArg.buyer).toBe(BUYER);
    });

    it('Step 1: buyer creates buy offer — skips ERC20 approval when allowance is sufficient', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        // txFee = price * 2 / 100 = 40 * 0.02 = 0.8
        // Total needed = price + txFee = 40.8
        erc20Allowance: PRICE + TX_FEE + BigInt(1), // more than enough
      });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: false,
      });

      // Should check allowance but NOT call approve
      expect(ctx._quoteToken.allowance).toHaveBeenCalled();
      expect(ctx._quoteToken.approve).not.toHaveBeenCalled();
    });

    it('Step 2: seller accepts buy offer — MUST check ERC1155 approval before acceptP2POfferWithPickupNode', async () => {
      // Contract: acceptP2POfferWithPickupNode escrows ERC1155 from seller
      // and persists selected-node pickup metadata.
      const ctx = createFlowContext({
        signerAddress: SELLER,
        order: makeBuyOrder(), // buy offer — acceptor is seller
        erc1155Approved: false, // needs approval
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOfferWithPickupNode(OFFER_ID, SELLER_PICKUP_NODE);

      // MUST check ERC1155 approval (seller transfers tokens)
      expect(ctx._erc1155.isApprovedForAll).toHaveBeenCalled();
      expect(ctx._erc1155.setApprovalForAll).toHaveBeenCalled();
      // MUST NOT check ERC20 (seller doesn't pay quote token)
      expect(ctx._quoteToken.allowance).not.toHaveBeenCalled();
      // Must call pickup-aware accept
      expect(ctx._diamond.acceptP2POfferWithPickupNode).toHaveBeenCalledWith(
        OFFER_ID,
        SELLER_PICKUP_NODE,
      );
    });

    it('Step 2: seller accepts buy offer — skips ERC1155 approval when already approved', async () => {
      const ctx = createFlowContext({
        signerAddress: SELLER,
        order: makeBuyOrder(),
        erc1155Approved: true, // already approved
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOfferWithPickupNode(OFFER_ID, SELLER_PICKUP_NODE);

      expect(ctx._erc1155.isApprovedForAll).toHaveBeenCalled();
      expect(ctx._erc1155.setApprovalForAll).not.toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POfferWithPickupNode).toHaveBeenCalledWith(
        OFFER_ID,
        SELLER_PICKUP_NODE,
      );
    });
  });

  // ===========================================================================
  // 3. APPROVAL MATRIX — every combination
  // ===========================================================================

  describe('Approval Matrix', () => {
    it('create sell offer + no ERC1155 approval → requests approval → creates order', async () => {
      const ctx = createFlowContext({ erc1155Approved: false });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: true,
        pickupNodeRef: SELLER_PICKUP_NODE,
      });

      expect(ctx._erc1155.setApprovalForAll).toHaveBeenCalled();
      expect(ctx._diamond.createAuSysOrder).toHaveBeenCalled();
    });

    it('create sell offer + has ERC1155 approval → skips approval → creates order', async () => {
      const ctx = createFlowContext({ erc1155Approved: true });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: true,
        pickupNodeRef: SELLER_PICKUP_NODE,
      });

      expect(ctx._erc1155.setApprovalForAll).not.toHaveBeenCalled();
      expect(ctx._diamond.createAuSysOrder).toHaveBeenCalled();
    });

    it('create buy offer + no ERC20 approval → requests approval → creates order', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        erc20Allowance: BigInt(0),
      });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: false,
      });

      expect(ctx._quoteToken.approve).toHaveBeenCalled();
      expect(ctx._diamond.createAuSysOrder).toHaveBeenCalled();
    });

    it('create buy offer + has ERC20 approval → skips approval → creates order', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        erc20Allowance: PRICE + TX_FEE + BigInt(1),
      });
      const service = new DiamondP2PService(ctx);

      await service.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: false,
      });

      expect(ctx._quoteToken.approve).not.toHaveBeenCalled();
      expect(ctx._diamond.createAuSysOrder).toHaveBeenCalled();
    });

    it('accept sell offer + no ERC20 approval → requests approval → accepts', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: BigInt(0),
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOffer(OFFER_ID);

      expect(ctx._quoteToken.approve).toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalled();
    });

    it('accept sell offer + sufficient ERC20 allowance → skips approval → accepts', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOffer(OFFER_ID);

      expect(ctx._quoteToken.approve).not.toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalled();
    });

    it('accept buy offer + no ERC1155 approval → requests approval → accepts with pickup node', async () => {
      const ctx = createFlowContext({
        signerAddress: SELLER,
        order: makeBuyOrder(),
        erc1155Approved: false,
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOfferWithPickupNode(OFFER_ID, SELLER_PICKUP_NODE);

      expect(ctx._erc1155.setApprovalForAll).toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POfferWithPickupNode).toHaveBeenCalledWith(
        OFFER_ID,
        SELLER_PICKUP_NODE,
      );
    });

    it('accept buy offer + has ERC1155 approval → skips approval → accepts with pickup node', async () => {
      const ctx = createFlowContext({
        signerAddress: SELLER,
        order: makeBuyOrder(),
        erc1155Approved: true,
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOfferWithPickupNode(OFFER_ID, SELLER_PICKUP_NODE);

      expect(ctx._erc1155.setApprovalForAll).not.toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POfferWithPickupNode).toHaveBeenCalledWith(
        OFFER_ID,
        SELLER_PICKUP_NODE,
      );
    });
  });

  // ===========================================================================
  // 4. CANCELLATION FLOWS
  // ===========================================================================

  describe('Cancellation Flows', () => {
    it('creator cancels open sell offer → cancelP2POffer succeeds', async () => {
      const ctx = createFlowContext({ signerAddress: SELLER });
      const service = new DiamondP2PService(ctx);

      await service.cancelOffer(OFFER_ID);

      expect(ctx._diamond.cancelP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });

    it('creator cancels open buy offer → cancelP2POffer succeeds', async () => {
      const ctx = createFlowContext({ signerAddress: BUYER });
      const service = new DiamondP2PService(ctx);

      await service.cancelOffer(OFFER_ID);

      expect(ctx._diamond.cancelP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });

    it('non-creator cancel → contract error propagated (OnlyCreatorCanCancel)', async () => {
      const ctx = createFlowContext({
        cancelTxOverride: 'WILL_BE_REJECTED',
      });
      ctx._diamond.cancelP2POffer.mockRejectedValue({
        data: '0x6035cb58', // OnlyCreatorCanCancel
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.cancelOffer(OFFER_ID)).rejects.toThrow(
        /only the offer creator/i,
      );
    });

    it('cancel already-accepted offer → contract error propagated (OfferNotOpen)', async () => {
      const ctx = createFlowContext();
      ctx._diamond.cancelP2POffer.mockRejectedValue({
        data: '0x2b8b1d43', // OfferNotOpen
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.cancelOffer(OFFER_ID)).rejects.toThrow(
        /no longer open/i,
      );
    });
  });

  // ===========================================================================
  // 5. TARGETED OFFER RESTRICTIONS
  // ===========================================================================

  describe('Targeted Offer Restrictions', () => {
    it('targeted offer: correct counterparty accepts → succeeds', async () => {
      const targetedSellOrder = {
        ...makeSellOrder(),
        targetCounterparty: BUYER,
      };
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: targetedSellOrder,
        erc20Allowance: PRICE + TX_FEE,
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOffer(OFFER_ID);

      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });

    it('targeted offer: wrong counterparty → contract error (TargetedToDifferentCounterparty)', async () => {
      const ctx = createFlowContext({
        signerAddress: '0xWrongAddr0000000000000000000000000000000',
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      // Contract rejects at acceptP2POffer
      ctx._diamond.acceptP2POffer.mockRejectedValue({
        data: '0xcb6036a0', // TargetedToDifferentCounterparty
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(
        /targeted to a different counterparty/i,
      );
    });

    it('open offer (no target): any address accepts → succeeds', async () => {
      const openOrder = {
        ...makeSellOrder(),
        targetCounterparty: ethers.ZeroAddress,
      };
      const ctx = createFlowContext({
        signerAddress: '0xRandomBuyer00000000000000000000000000000',
        order: openOrder,
        erc20Allowance: PRICE + TX_FEE,
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOffer(OFFER_ID);

      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalledWith(OFFER_ID);
    });
  });

  // ===========================================================================
  // 6. EXPIRATION
  // ===========================================================================

  describe('Expiration', () => {
    it('expired offer: acceptP2POffer → contract error (OfferExpired)', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      ctx._diamond.acceptP2POffer.mockRejectedValue({
        data: '0x9cb13087', // OfferExpired
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(/expired/i);
    });
  });

  // ===========================================================================
  // 7. ACCEPT + JOURNEY COMBINED FLOW
  // ===========================================================================

  describe('Accept + Journey Combined Flow', () => {
    it('sell offer: acceptOfferWithDelivery executes accept → wait → journey → wait in order', async () => {
      const callOrder: string[] = [];
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE + BOUNTY,
      });

      ctx._diamond.acceptP2POffer.mockImplementation(() => {
        callOrder.push('accept');
        return Promise.resolve({
          hash: '0xaccepthash',
          wait: () => {
            callOrder.push('accept-confirmed');
            return Promise.resolve({
              hash: '0xaccepthash',
              status: 1,
              logs: [],
            });
          },
        });
      });

      ctx._diamond.createOrderJourney.mockImplementation(() => {
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

      const service = new DiamondP2PService(ctx);
      await service.acceptOfferWithDelivery(OFFER_ID, makeDeliveryDetails());

      expect(callOrder).toEqual([
        'accept',
        'accept-confirmed',
        'journey',
        'journey-confirmed',
      ]);
    });

    it('sell offer: acceptOfferWithDelivery approval covers price + txFee + bounty', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: BigInt(0), // needs approval
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOfferWithDelivery(OFFER_ID, makeDeliveryDetails());

      // Must have checked and approved
      expect(ctx._quoteToken.allowance).toHaveBeenCalled();
      expect(ctx._quoteToken.approve).toHaveBeenCalled();
    });

    it('sell offer: acceptOfferWithDelivery skips approval when allowance covers total', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE + BOUNTY, // exact amount
      });
      const service = new DiamondP2PService(ctx);

      await service.acceptOfferWithDelivery(OFFER_ID, makeDeliveryDetails());

      expect(ctx._quoteToken.approve).not.toHaveBeenCalled();
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalled();
      expect(ctx._diamond.createOrderJourney).toHaveBeenCalled();
    });

    it('accept fails → journey NOT created', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE + BOUNTY,
      });
      ctx._diamond.acceptP2POffer.mockRejectedValue(new Error('OfferNotOpen'));
      const service = new DiamondP2PService(ctx);

      await expect(
        service.acceptOfferWithDelivery(OFFER_ID, makeDeliveryDetails()),
      ).rejects.toThrow();

      expect(ctx._diamond.createOrderJourney).not.toHaveBeenCalled();
    });

    it('accept succeeds, journey fails → error propagated', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE + BOUNTY,
      });
      ctx._diamond.createOrderJourney.mockRejectedValue(
        new Error('InvalidETA'),
      );
      const service = new DiamondP2PService(ctx);

      await expect(
        service.acceptOfferWithDelivery(OFFER_ID, makeDeliveryDetails()),
      ).rejects.toThrow('InvalidETA');

      // Accept was still called
      expect(ctx._diamond.acceptP2POffer).toHaveBeenCalled();
    });

    it('createOrderJourney receives correct parameters', async () => {
      const ctx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE + BOUNTY,
      });
      const service = new DiamondP2PService(ctx);
      const delivery = makeDeliveryDetails();

      await service.acceptOfferWithDelivery(OFFER_ID, delivery);

      expect(ctx._diamond.createOrderJourney).toHaveBeenCalledWith(
        OFFER_ID,
        SELLER,
        delivery.receiverAddress,
        delivery.parcelData,
        delivery.bountyWei,
        delivery.etaTimestamp,
        delivery.tokenQuantity,
        delivery.assetId,
      );
    });

    it('buy offer: acceptOfferWithDelivery is rejected (buy uses selected-node accept first)', async () => {
      const ctx = createFlowContext({
        signerAddress: SELLER,
        order: makeBuyOrder(),
      });
      const service = new DiamondP2PService(ctx);

      await expect(
        service.acceptOfferWithDelivery(OFFER_ID, makeDeliveryDetails()),
      ).rejects.toThrow(/selected fulfillment node/i);
      expect(ctx._diamond.acceptP2POffer).not.toHaveBeenCalled();
      expect(ctx._diamond.createOrderJourney).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 8. ERROR DECODE IN FLOW CONTEXT
  // ===========================================================================

  describe('Error Decode in Flow Context', () => {
    it('OfferNotFound during accept → user-friendly message', async () => {
      const ctx = createFlowContext({
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      ctx._diamond.acceptP2POffer.mockRejectedValue({
        data: '0x6df5846d',
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(/not found/i);
    });

    it('CannotAcceptOwnOffer during accept → user-friendly message', async () => {
      const ctx = createFlowContext({
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      ctx._diamond.acceptP2POffer.mockRejectedValue({
        data: '0x520e449f',
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(
        /cannot accept your own/i,
      );
    });

    it('ERC1155MissingApprovalForAll during create → user-friendly message', async () => {
      const ctx = createFlowContext({ erc1155Approved: true });
      // Approval succeeds but contract still rejects
      ctx._diamond.createAuSysOrder.mockRejectedValue({
        data: '0xe237d922',
        message: 'execution reverted',
      });
      const service = new DiamondP2PService(ctx);

      await expect(
        service.createOffer({
          token: TOKEN,
          tokenId: TOKEN_ID,
          quantity: QUANTITY,
          price: PRICE,
          isSellOffer: true,
          pickupNodeRef: SELLER_PICKUP_NODE,
        }),
      ).rejects.toThrow(); // The error should propagate
    });

    it('nested provider error is decoded correctly', async () => {
      const ctx = createFlowContext({
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      ctx._diamond.acceptP2POffer.mockRejectedValue({
        error: { data: '0x9cb13087' }, // nested OfferExpired
        message: 'call revert exception',
      });
      const service = new DiamondP2PService(ctx);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(/expired/i);
    });

    it('unknown error falls through gracefully', async () => {
      const ctx = createFlowContext({
        order: makeSellOrder(),
        erc20Allowance: PRICE + TX_FEE,
      });
      ctx._diamond.acceptP2POffer.mockRejectedValue(
        new Error('unexpected network error'),
      );
      const service = new DiamondP2PService(ctx);

      await expect(service.acceptOffer(OFFER_ID)).rejects.toThrow(
        'unexpected network error',
      );
    });
  });

  // ===========================================================================
  // 9. CROSS-FLOW VALIDATION
  // ===========================================================================

  describe('Cross-Flow Validation', () => {
    it('sell offer: seller does NOT need ERC20, buyer does NOT need ERC1155', async () => {
      // Create as seller
      const createCtx = createFlowContext({
        signerAddress: SELLER,
        erc1155Approved: true,
      });
      const createService = new DiamondP2PService(createCtx);

      await createService.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: true,
        pickupNodeRef: SELLER_PICKUP_NODE,
      });

      expect(createCtx._quoteToken.allowance).not.toHaveBeenCalled();
      expect(createCtx._quoteToken.approve).not.toHaveBeenCalled();

      // Accept as buyer
      const acceptCtx = createFlowContext({
        signerAddress: BUYER,
        order: makeSellOrder(),
        erc20Allowance: BigInt(0),
      });
      const acceptService = new DiamondP2PService(acceptCtx);

      await acceptService.acceptOffer(OFFER_ID);

      expect(acceptCtx._erc1155.isApprovedForAll).not.toHaveBeenCalled();
      expect(acceptCtx._erc1155.setApprovalForAll).not.toHaveBeenCalled();
    });

    it('buy offer: buyer does NOT need ERC1155, seller does NOT need ERC20', async () => {
      // Create as buyer
      const createCtx = createFlowContext({
        signerAddress: BUYER,
        erc20Allowance: BigInt(0),
      });
      const createService = new DiamondP2PService(createCtx);

      await createService.createOffer({
        token: TOKEN,
        tokenId: TOKEN_ID,
        quantity: QUANTITY,
        price: PRICE,
        isSellOffer: false,
      });

      expect(createCtx._erc1155.isApprovedForAll).not.toHaveBeenCalled();

      // Accept as seller
      const acceptCtx = createFlowContext({
        signerAddress: SELLER,
        order: makeBuyOrder(),
        erc1155Approved: false,
      });
      const acceptService = new DiamondP2PService(acceptCtx);

      await acceptService.acceptOfferWithPickupNode(
        OFFER_ID,
        SELLER_PICKUP_NODE,
      );

      expect(acceptCtx._quoteToken.allowance).not.toHaveBeenCalled();
      expect(acceptCtx._diamond.acceptP2POfferWithPickupNode).toHaveBeenCalled();
    });
  });
});
