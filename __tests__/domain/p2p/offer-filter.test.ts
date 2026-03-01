/**
 * P2P Offer Filter Tests
 *
 * Reproduces the production bug where GOAT P2P offers show "No Open Offers"
 * despite 10 on-chain offers existing and supportedAssets mapping correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  buildTokenIdToClassMap,
  isTokenInClass,
  filterOffersForMarket,
} from '@/domain/p2p/offer-filter';
import { P2POfferStatus } from '@/domain/p2p';
import type { P2POffer } from '@/domain/p2p';
import type { Asset } from '@/domain/shared';

// Production supported assets (from Base Sepolia, 2026-03-01)
const SUPPORTED_ASSETS: Asset[] = [
  {
    assetClass: 'GOAT',
    tokenId:
      '66275870803711922491366184789115531985779348432274432139286800263295401560003',
    name: 'AUGOAT',
    attributes: [],
  },
  {
    assetClass: 'GOAT',
    tokenId:
      '11202153737908116169202123534399034039068322729981838674062226574848113217109',
    name: 'AUGOAT',
    attributes: [],
  },
  {
    assetClass: 'GOAT',
    tokenId:
      '57945930255607318159603105946700134162444874503505598107919448384686533989738',
    name: 'AUGOAT',
    attributes: [],
  },
  {
    assetClass: 'GOAT',
    tokenId:
      '65468527670962572963077586055154555014716167673154572806449211967620189321868',
    name: 'AUGOAT',
    attributes: [],
  },
  {
    assetClass: 'GOAT',
    tokenId:
      '74597212514669134297886924312485944721455443667927137857810389050537970960510',
    name: 'AUGOAT',
    attributes: [],
  },
];

function makeOffer(overrides: Partial<P2POffer> = {}): P2POffer {
  return {
    id: '0x01',
    creator: '0x1111111111111111111111111111111111111111',
    targetCounterparty: null,
    token: '0x8ed92ff64dc6e833182a4743124fe3e48e2966a7',
    tokenId:
      '66275870803711922491366184789115531985779348432274432139286800263295401560003',
    quantity: 20n,
    price: 1000000000000000000n,
    txFee: 0n,
    isSellerInitiated: false,
    status: P2POfferStatus.CREATED,
    buyer: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
    seller: '0x0000000000000000000000000000000000000000',
    createdAt: 0,
    expiresAt: 0,
    nodes: [],
    ...overrides,
  };
}

// All 10 production offers from the contract
const PRODUCTION_OFFERS: P2POffer[] = [
  makeOffer({
    id: '0xc2575a0e',
    tokenId:
      '66275870803711922491366184789115531985779348432274432139286800263295401560003',
    quantity: 20n,
  }),
  makeOffer({
    id: '0xa66cc928',
    tokenId:
      '48276444969651763190568938950980567803300704378699447788206075935235168662411',
    quantity: 100n,
  }),
  makeOffer({
    id: '0xf3f7a9fe',
    tokenId:
      '110347019451665123422619017993376969286946341289692226916024872499063718984713',
    quantity: 100n,
  }),
  makeOffer({
    id: '0x6e154017',
    tokenId:
      '110347019451665123422619017993376969286946341289692226916024872499063718984713',
    quantity: 100n,
  }),
  makeOffer({
    id: '0xc65a7bb8',
    tokenId:
      '110347019451665123422619017993376969286946341289692226916024872499063718984713',
    quantity: 9888n,
  }),
  makeOffer({
    id: '0xdf6966c9',
    tokenId:
      '81830065092951331632343091669005481316001008977307838860593651642481550780992',
    quantity: 14n,
  }),
  makeOffer({
    id: '0xd833147d',
    tokenId:
      '11202153737908116169202123534399034039068322729981838674062226574848113217109',
    quantity: 2n,
  }),
  makeOffer({
    id: '0xc624b66c',
    tokenId:
      '66275870803711922491366184789115531985779348432274432139286800263295401560003',
    quantity: 2n,
    isSellerInitiated: true,
  }),
  makeOffer({
    id: '0x057c384a',
    tokenId:
      '11202153737908116169202123534399034039068322729981838674062226574848113217109',
    quantity: 1000n,
  }),
  makeOffer({
    id: '0x0e4562a1',
    tokenId:
      '57945930255607318159603105946700134162444874503505598107919448384686533989738',
    quantity: 1000n,
  }),
];

describe('buildTokenIdToClassMap', () => {
  it('creates map from supported assets', () => {
    const map = buildTokenIdToClassMap(SUPPORTED_ASSETS);
    expect(map.size).toBe(5);
    expect(
      map.get(
        '66275870803711922491366184789115531985779348432274432139286800263295401560003',
      ),
    ).toBe('GOAT');
  });

  it('normalizes hex tokenIds to decimal', () => {
    const assets: Asset[] = [
      {
        assetClass: 'GOAT',
        tokenId:
          '0xb4ea2cef8a0db05f1d5db458b7e725abe12c5dea46810992eae76b8687876a40',
        name: 'AUGOAT',
        attributes: [],
      },
    ];
    const map = buildTokenIdToClassMap(assets);
    expect(
      map.get(
        '81830065092951331632343091669005481316001008977307838860593651642481550780992',
      ),
    ).toBe('GOAT');
  });

  it('handles empty assets', () => {
    expect(buildTokenIdToClassMap([]).size).toBe(0);
  });
});

describe('isTokenInClass', () => {
  const tokenIdToClass = buildTokenIdToClassMap(SUPPORTED_ASSETS);

  it('returns true for tokenIds in supported assets', () => {
    expect(
      isTokenInClass(
        '66275870803711922491366184789115531985779348432274432139286800263295401560003',
        'GOAT',
        tokenIdToClass,
        new Map(),
      ),
    ).toBe(true);
  });

  it('is case insensitive on class name', () => {
    expect(
      isTokenInClass(
        '66275870803711922491366184789115531985779348432274432139286800263295401560003',
        'goat',
        tokenIdToClass,
        new Map(),
      ),
    ).toBe(true);
  });

  it('returns false for unknown tokenIds', () => {
    expect(
      isTokenInClass(
        '48276444969651763190568938950980567803300704378699447788206075935235168662411',
        'GOAT',
        tokenIdToClass,
        new Map(),
      ),
    ).toBe(false);
  });

  it('falls back to assetMetadataMap', () => {
    const metaMap = new Map<string, Asset>();
    metaMap.set(
      '81830065092951331632343091669005481316001008977307838860593651642481550780992',
      {
        assetClass: 'GOAT',
        tokenId: '0xb4ea',
        name: 'AUGOAT',
        attributes: [],
      },
    );
    expect(
      isTokenInClass(
        '81830065092951331632343091669005481316001008977307838860593651642481550780992',
        'GOAT',
        tokenIdToClass,
        metaMap,
      ),
    ).toBe(true);
  });

  it('returns false for wrong class', () => {
    expect(
      isTokenInClass(
        '66275870803711922491366184789115531985779348432274432139286800263295401560003',
        'SHEEP',
        tokenIdToClass,
        new Map(),
      ),
    ).toBe(false);
  });
});

describe('filterOffersForMarket — production bug reproduction', () => {
  const tokenIdToClass = buildTokenIdToClassMap(SUPPORTED_ASSETS);
  const emptyMetaMap = new Map<string, Asset>();
  const now = 1772384366;

  it('BUG REPRO: should return GOAT offers (not 0)', () => {
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'all',
      now,
    );
    // 5 offers have tokenIds matching GOAT supported assets
    expect(result.length).toBe(5);
  });

  it('should include both 66275870 offers', () => {
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'all',
      now,
    );
    const matching = result.filter((o) => o.tokenId.startsWith('6627587080'));
    expect(matching.length).toBe(2);
  });

  it('should exclude unknown tokenIds', () => {
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'all',
      now,
    );
    const unknown = result.filter(
      (o) =>
        o.tokenId ===
        '48276444969651763190568938950980567803300704378699447788206075935235168662411',
    );
    expect(unknown.length).toBe(0);
  });

  it('should include metaMap fallback offers', () => {
    const metaMap = new Map<string, Asset>();
    metaMap.set(
      '81830065092951331632343091669005481316001008977307838860593651642481550780992',
      {
        assetClass: 'GOAT',
        tokenId: '0xb4ea',
        name: 'AUGOAT',
        attributes: [],
      },
    );
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      tokenIdToClass,
      metaMap,
      'all',
      now,
    );
    expect(result.length).toBe(6);
  });

  it('should filter out expired offers', () => {
    const result = filterOffersForMarket(
      [makeOffer({ expiresAt: now - 100 })],
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'all',
      now,
    );
    expect(result.length).toBe(0);
  });

  it('should filter out settled/cancelled/expired status', () => {
    const offers = [
      makeOffer({ status: P2POfferStatus.SETTLED }),
      makeOffer({ status: P2POfferStatus.CANCELLED }),
      makeOffer({ status: P2POfferStatus.EXPIRED }),
    ];
    const result = filterOffersForMarket(
      offers,
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'all',
      now,
    );
    expect(result.length).toBe(0);
  });

  it('should filter by buy type', () => {
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'buy',
      now,
    );
    result.forEach((o) => expect(o.isSellerInitiated).toBe(false));
  });

  it('should filter by sell type', () => {
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'sell',
      now,
    );
    expect(result.length).toBe(1);
    expect(result[0].isSellerInitiated).toBe(true);
  });

  it('should treat expiresAt=0 as non-expiring', () => {
    const result = filterOffersForMarket(
      [makeOffer({ expiresAt: 0 })],
      'GOAT',
      tokenIdToClass,
      emptyMetaMap,
      'all',
      now,
    );
    expect(result.length).toBe(1);
  });

  it('should return 0 with empty supportedAssets and no metaMap', () => {
    const result = filterOffersForMarket(
      PRODUCTION_OFFERS,
      'GOAT',
      buildTokenIdToClassMap([]),
      emptyMetaMap,
      'all',
      now,
    );
    expect(result.length).toBe(0);
  });
});
