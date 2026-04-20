import { describe, expect, it, vi } from 'vitest';

import { loadP2PStepTransactionMap } from '@/lib/p2p-step-transaction-loader';

describe('loadP2PStepTransactionMap', () => {
  it('loads and normalizes customer dashboard step transactions', async () => {
    const graphqlRequest = vi.fn(
      async (
        _url: string,
        query: string,
        variables?: Record<string, unknown>,
      ) => {
        if (query.includes('GetP2POfferByOrderId')) {
          return {
            diamondP2POfferCreatedEventss: {
              items: [
                {
                  id: 'created-1',
                  order_id: '0xorder1234567890',
                  creator: '0xbuyer',
                  is_seller_initiated: false,
                  token: '0xtoken',
                  token_id: '1',
                  token_quantity: '10',
                  price: '5000',
                  target_counterparty: '0xseller',
                  expires_at: '0',
                  block_number: '10',
                  block_timestamp: '100',
                  transaction_hash: '0xcreatedhash',
                },
              ],
            },
          };
        }

        if (query.includes('GetP2PAcceptedEventsByOrderId')) {
          return {
            diamondP2POfferAcceptedEventss: {
              items: [
                {
                  id: 'accepted-1',
                  order_id: '0xorder1234567890',
                  acceptor: '0xseller',
                  is_seller_initiated: false,
                  block_number: '11',
                  block_timestamp: '110',
                  transaction_hash: '0xacceptedhash',
                },
              ],
            },
          };
        }

        if (query.includes('GetAuSysOrderStatusUpdatesByOrderId')) {
          return {
            diamondAuSysOrderStatusUpdatedEventss: {
              items: [
                {
                  id: 'status-1',
                  order_id: '0xorder1234567890',
                  new_status: '1',
                  block_number: '12',
                  block_timestamp: '120',
                  transaction_hash: '0xprocessinghash',
                },
              ],
            },
          };
        }

        if (query.includes('GetP2PJourneysByOrderId')) {
          return {
            diamondJourneyCreatedEventss: {
              items: [
                {
                  id: 'journey-1',
                  journey_id: '0xjourney1',
                  sender: '0xsender',
                  receiver: '0xbuyer',
                  driver: '0xdriver',
                  bounty: '1',
                  e_t_a: '0',
                  order_id: '0xorder1234567890',
                  block_number: '13',
                  block_timestamp: '130',
                  transaction_hash: '0xjourneyhash',
                },
              ],
            },
          };
        }

        if (query.includes('GetJourneyStatusUpdatesByIds')) {
          expect(variables).toMatchObject({ journeyIds: ['0xjourney1'] });
          return {
            diamondAuSysJourneyStatusUpdatedEventss: { items: [] },
          };
        }

        if (query.includes('GetEmitSigEventsByJourney')) {
          expect(variables).toMatchObject({ journeyId: '0xjourney1' });
          return {
            diamondEmitSigEventss: { items: [] },
          };
        }

        throw new Error(`Unexpected query: ${query}`);
      },
    );

    const getJourney = vi.fn().mockResolvedValue({
      journeyStart: 123n,
      sender: '0xsender',
      receiver: '0xbuyer',
      driver: '0xdriver',
    });

    const stepTransactions = await loadP2PStepTransactionMap({
      order: {
        id: '0xorder1234567890',
        journeyIds: ['0xjourney1'],
      },
      indexerUrl: 'http://indexer.test',
      graphqlRequest,
      getJourney,
      logger: { warn: vi.fn() },
    });

    expect(graphqlRequest).toHaveBeenCalledTimes(6);
    expect(getJourney).toHaveBeenCalledTimes(1);
    expect(getJourney).toHaveBeenCalledWith('0xjourney1');
    expect(stepTransactions.accepted).toHaveLength(2);
    expect(stepTransactions['journey-pending']).toHaveLength(2);
  });
});
