import { describe, expect, it } from 'vitest';

import { buildP2PStepTransactionMap } from '@/app/components/p2p/p2p-order-step-transactions';

describe('buildP2PStepTransactionMap', () => {
  it('splits pickup and delivery signatures using journeyStart', () => {
    const result = buildP2PStepTransactionMap({
      createdEvents: [],
      acceptedEvents: [],
      orderStatusUpdates: [],
      journeyEvents: [],
      journeyStatusUpdates: [],
      emitSigEventsByJourney: {
        '0xjourney': [
          {
            id: 'sig-1',
            user: '0xsender',
            event_id: '0xjourney',
            block_number: '10',
            block_timestamp: '100',
            transaction_hash: '0xpickup',
          },
          {
            id: 'sig-2',
            user: '0xreceiver',
            event_id: '0xjourney',
            block_number: '20',
            block_timestamp: '250',
            transaction_hash: '0xdelivery',
          },
        ],
      },
      journeyContexts: {
        '0xjourney': {
          journeyStart: 200,
          sender: '0xsender',
          receiver: '0xreceiver',
          driver: '0xdriver',
        },
      },
    });

    expect(result['journey-pending']).toEqual([
      {
        txHash: '0xpickup',
        timestamp: 100,
        blockNumber: 10,
        eventLabels: ['Pickup Signed'],
        actorLabels: ['Sender'],
        journeyId: '0xjourney',
      },
    ]);
    expect(result['awaiting-confirmation']).toEqual([
      {
        txHash: '0xdelivery',
        timestamp: 250,
        blockNumber: 20,
        eventLabels: ['Delivery Signed'],
        actorLabels: ['Customer'],
        journeyId: '0xjourney',
      },
    ]);
  });

  it('groups same-step transactions by tx hash and merges labels', () => {
    const result = buildP2PStepTransactionMap({
      createdEvents: [],
      acceptedEvents: [],
      orderStatusUpdates: [],
      journeyEvents: [],
      journeyStatusUpdates: [
        {
          id: 'status-1',
          journey_id: '0xjourney',
          new_status: '2',
          sender: '0xsender',
          receiver: '0xreceiver',
          driver: '0xdriver',
          block_number: '50',
          block_timestamp: '500',
          transaction_hash: '0xshared',
        },
      ],
      emitSigEventsByJourney: {
        '0xjourney': [
          {
            id: 'sig-1',
            user: '0xdriver',
            event_id: '0xjourney',
            block_number: '50',
            block_timestamp: '510',
            transaction_hash: '0xshared',
          },
        ],
      },
      journeyContexts: {
        '0xjourney': {
          journeyStart: 400,
          sender: '0xsender',
          receiver: '0xreceiver',
          driver: '0xdriver',
        },
      },
    });

    expect(result['awaiting-confirmation']).toEqual([
      {
        txHash: '0xshared',
        timestamp: 500,
        blockNumber: 50,
        eventLabels: ['Journey Delivered', 'Delivery Signed'],
        actorLabels: ['Driver'],
        journeyId: '0xjourney',
      },
    ]);
  });
});
