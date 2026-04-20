import { describe, expect, it, vi } from 'vitest';

import { loadP2PSignatureState } from '@/lib/p2p-signature-state';

describe('loadP2PSignatureState', () => {
  it('returns pickup signatures for pending journeys', async () => {
    const graphqlRequest = vi.fn().mockResolvedValue({
      diamondEmitSigEventss: {
        items: [
          {
            id: 'sig-1',
            user: '0xsender',
            event_id: 'pickup-1',
            block_number: '10',
            block_timestamp: '100',
            transaction_hash: '0xhash1',
          },
          {
            id: 'sig-2',
            user: '0xdriver',
            event_id: 'pickup-2',
            block_number: '11',
            block_timestamp: '110',
            transaction_hash: '0xhash2',
          },
        ],
      },
    });
    const getJourney = vi.fn().mockResolvedValue({
      currentStatus: 0,
      journeyStart: 0,
      sender: '0xsender',
      receiver: '0xbuyer',
      driver: '0xdriver',
    });

    const result = await loadP2PSignatureState({
      journeyId: '0xjourney1',
      indexerUrl: 'http://indexer.test',
      graphqlRequest,
      getJourney,
      logger: { warn: vi.fn() },
    });

    expect(result).toEqual({
      buyerSigned: false,
      driverDeliverySigned: false,
      senderPickupSigned: true,
      driverPickupSigned: true,
      roleConflict: false,
      roleConflictReason: undefined,
    });
  });

  it('uses only post-pickup signatures for in-transit delivery state', async () => {
    const graphqlRequest = vi.fn().mockResolvedValue({
      diamondEmitSigEventss: {
        items: [
          {
            id: 'sig-1',
            user: '0xdriver',
            event_id: 'pickup-driver',
            block_number: '10',
            block_timestamp: '100',
            transaction_hash: '0xhash1',
          },
          {
            id: 'sig-2',
            user: '0xbuyer',
            event_id: 'too-early-buyer',
            block_number: '11',
            block_timestamp: '101',
            transaction_hash: '0xhash2',
          },
          {
            id: 'sig-3',
            user: '0xdriver',
            event_id: 'delivery-driver',
            block_number: '12',
            block_timestamp: '201',
            transaction_hash: '0xhash3',
          },
          {
            id: 'sig-4',
            user: '0xbuyer',
            event_id: 'delivery-buyer',
            block_number: '13',
            block_timestamp: '202',
            transaction_hash: '0xhash4',
          },
        ],
      },
    });
    const getJourney = vi.fn().mockResolvedValue({
      currentStatus: 1,
      journeyStart: 200,
      sender: '0xsender',
      receiver: '0xbuyer',
      driver: '0xdriver',
    });

    const result = await loadP2PSignatureState({
      journeyId: '0xjourney1',
      indexerUrl: 'http://indexer.test',
      graphqlRequest,
      getJourney,
      logger: { warn: vi.fn() },
    });

    expect(result).toEqual({
      buyerSigned: true,
      driverDeliverySigned: true,
      senderPickupSigned: true,
      driverPickupSigned: true,
      roleConflict: false,
      roleConflictReason: undefined,
    });
  });

  it('short-circuits settled journeys without querying the indexer', async () => {
    const graphqlRequest = vi.fn();
    const getJourney = vi.fn().mockResolvedValue({
      currentStatus: 2,
      journeyStart: 200,
      sender: '0xsender',
      receiver: '0xbuyer',
      driver: '0xdriver',
    });

    const result = await loadP2PSignatureState({
      journeyId: '0xjourney1',
      indexerUrl: 'http://indexer.test',
      graphqlRequest,
      getJourney,
      logger: { warn: vi.fn() },
    });

    expect(graphqlRequest).not.toHaveBeenCalled();
    expect(result).toEqual({
      buyerSigned: true,
      driverDeliverySigned: true,
      senderPickupSigned: true,
      driverPickupSigned: true,
      roleConflict: false,
    });
  });
});
