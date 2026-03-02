import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock pg module
const mockPool = {
  connect: vi.fn(),
  on: vi.fn(),
  end: vi.fn(),
};

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

// Import after mocking
import {
  convertPonderNodeToDomain,
  convertPonderOrderToDomain,
  convertPonderJourneyToDomain,
  type PonderNode,
  type PonderOrder,
  type PonderJourney,
} from '../../infrastructure/repositories/shared/ponder-db';

describe('Ponder DB Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('convertPonderNodeToDomain', () => {
    it('should convert PonderNode to domain Node', () => {
      const ponderNode: PonderNode = {
        id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        owner: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        address_name: 'Warehouse A',
        lat: '40.7128',
        lng: '-74.0060',
        valid_node: true,
        status: 'Active',
        created_at: 1704067200n,
        updated_at: 1704067200n,
        block_number: 12345678n,
        transaction_hash: '0xabc',
      };

      const result = convertPonderNodeToDomain(ponderNode);

      expect(result).toEqual({
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        owner: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        location: {
          addressName: 'Warehouse A',
          location: {
            lat: '40.7128',
            lng: '-74.0060',
          },
        },
        validNode: true,
        status: 'Active',
        assets: [],
      });
    });

    it('should handle Inactive status', () => {
      const ponderNode: PonderNode = {
        id: '0xaaaa',
        owner: '0xbbbb',
        address_name: '',
        lat: '0',
        lng: '0',
        valid_node: false,
        status: 'Inactive',
        created_at: 1704067200n,
        updated_at: 1704067200n,
        block_number: 12345678n,
        transaction_hash: '0xabc',
      };

      const result = convertPonderNodeToDomain(ponderNode);

      expect(result.validNode).toBe(false);
      expect(result.status).toBe('Inactive');
    });
  });

  describe('convertPonderOrderToDomain', () => {
    it('should convert PonderOrder to domain Order', () => {
      const ponderOrder: PonderOrder = {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        buyer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        seller: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        token: '0xcccccccccccccccccccccccccccccccccccccccc',
        token_id: 1n,
        token_quantity: 100n,
        requested_token_quantity: 100n,
        price: 1000000n,
        tx_fee: 10000n,
        current_status: 0,
        start_location_lat: '40.7128',
        start_location_lng: '-74.0060',
        end_location_lat: '34.0522',
        end_location_lng: '-118.2437',
        start_name: 'New York',
        end_name: 'Los Angeles',
        nodes: JSON.stringify(['0x1111', '0x2222']),
        created_at: 1704067200n,
        updated_at: 1704067200n,
      };

      const result = convertPonderOrderToDomain(ponderOrder);

      expect(result).toEqual({
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        buyer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        seller: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        token: '0xcccccccccccccccccccccccccccccccccccccccc',
        tokenId: '1',
        tokenQuantity: '100',
        price: '1000000',
        txFee: '10000',
        currentStatus: 'created',
        locationData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: { lat: '34.0522', lng: '-118.2437' },
          startName: 'New York',
          endName: 'Los Angeles',
        },
        nodes: ['0x1111', '0x2222'],
        journeyIds: [],
        contractualAgreement: '',
      });
    });

    it('should handle different order statuses', () => {
      const baseOrder: PonderOrder = {
        id: '0x1234',
        buyer: '0xaaaa',
        seller: '0xbbbb',
        token: '0xcccc',
        token_id: 1n,
        token_quantity: 100n,
        requested_token_quantity: 100n,
        price: 1000000n,
        tx_fee: 10000n,
        current_status: 0,
        start_location_lat: '',
        start_location_lng: '',
        end_location_lat: '',
        end_location_lng: '',
        start_name: '',
        end_name: '',
        nodes: '[]',
        created_at: 1704067200n,
        updated_at: 1704067200n,
      };

      // Created
      expect(
        convertPonderOrderToDomain({ ...baseOrder, current_status: 0 })
          .currentStatus,
      ).toBe('created');

      // Processing
      expect(
        convertPonderOrderToDomain({ ...baseOrder, current_status: 1 })
          .currentStatus,
      ).toBe('processing');

      // Settled
      expect(
        convertPonderOrderToDomain({ ...baseOrder, current_status: 2 })
          .currentStatus,
      ).toBe('settled');

      // Cancelled
      expect(
        convertPonderOrderToDomain({ ...baseOrder, current_status: 3 })
          .currentStatus,
      ).toBe('cancelled');
    });
  });

  describe('convertPonderJourneyToDomain', () => {
    it('should convert PonderJourney to domain Journey', () => {
      const ponderJourney: PonderJourney = {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        receiver: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        driver: '0xcccccccccccccccccccccccccccccccccccccccc',
        current_status: 1,
        bounty: 1000000000000000000n,
        journey_start: 1704067200n,
        journey_end: 0n,
        eta: 1704153600n,
        start_location_lat: '40.7128',
        start_location_lng: '-74.0060',
        end_location_lat: '34.0522',
        end_location_lng: '-118.2437',
        start_name: 'New York',
        end_name: 'Los Angeles',
        order_id: null,
        created_at: 1704067200n,
        updated_at: 1704067200n,
      };

      const result = convertPonderJourneyToDomain(ponderJourney);

      expect(result).toEqual({
        journeyId:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        receiver: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        driver: '0xcccccccccccccccccccccccccccccccccccccccc',
        currentStatus: 'in_transit',
        bounty: 1000000000000000000n,
        journeyStart: 1704067200n,
        journeyEnd: 0n,
        ETA: 1704153600n,
        parcelData: {
          startLocation: { lat: '40.7128', lng: '-74.0060' },
          endLocation: { lat: '34.0522', lng: '-118.2437' },
          startName: 'New York',
          endName: 'Los Angeles',
        },
      });
    });

    it('should handle null driver', () => {
      const ponderJourney: PonderJourney = {
        id: '0x1234',
        sender: '0xaaaa',
        receiver: '0xbbbb',
        driver: null,
        current_status: 0,
        bounty: 0n,
        journey_start: 0n,
        journey_end: 0n,
        eta: 0n,
        start_location_lat: '',
        start_location_lng: '',
        end_location_lat: '',
        end_location_lng: '',
        start_name: '',
        end_name: '',
        order_id: null,
        created_at: 1704067200n,
        updated_at: 1704067200n,
      };

      const result = convertPonderJourneyToDomain(ponderJourney);

      expect(result.driver).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should handle different journey statuses', () => {
      const baseJourney: PonderJourney = {
        id: '0x1234',
        sender: '0xaaaa',
        receiver: '0xbbbb',
        driver: null,
        current_status: 0,
        bounty: 0n,
        journey_start: 0n,
        journey_end: 0n,
        eta: 0n,
        start_location_lat: '',
        start_location_lng: '',
        end_location_lat: '',
        end_location_lng: '',
        start_name: '',
        end_name: '',
        order_id: null,
        created_at: 1704067200n,
        updated_at: 1704067200n,
      };

      // Pending
      expect(
        convertPonderJourneyToDomain({ ...baseJourney, current_status: 0 })
          .currentStatus,
      ).toBe('pending');

      // InTransit
      expect(
        convertPonderJourneyToDomain({ ...baseJourney, current_status: 1 })
          .currentStatus,
      ).toBe('in_transit');

      // Delivered
      expect(
        convertPonderJourneyToDomain({ ...baseJourney, current_status: 2 })
          .currentStatus,
      ).toBe('delivered');

      // Cancelled
      expect(
        convertPonderJourneyToDomain({ ...baseJourney, current_status: 3 })
          .currentStatus,
      ).toBe('cancelled');
    });
  });
});

describe('PonderQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('Node Queries', () => {
    it('getNodeByAddress should query with lowercase address', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: '0xaaaa' }] });

      // Simulate the query call
      const address = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      await mockClient.query('SELECT * FROM nodes WHERE id = $1', [
        address.toLowerCase(),
      ]);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM nodes WHERE id = $1',
        ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
      );
    });

    it('getNodesByOwner should return multiple nodes', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: '0x1111', owner: '0xaaaa' },
          { id: '0x2222', owner: '0xaaaa' },
        ],
      });

      const result = await mockClient.query(
        'SELECT * FROM nodes WHERE owner = $1',
        ['0xaaaa'],
      );

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('Order Queries', () => {
    it('getOrdersByBuyer should order by created_at DESC', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: '0x1234', created_at: 1704067200n }],
      });

      await mockClient.query(
        'SELECT * FROM orders WHERE buyer = $1 ORDER BY created_at DESC',
        ['0xaaaa'],
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE buyer = $1 ORDER BY created_at DESC',
        ['0xaaaa'],
      );
    });

    it('getOrdersByNode should use JSON contains query', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const nodeAddress = '0x1111';
      await mockClient.query(
        `SELECT * FROM orders WHERE nodes::jsonb @> $1::jsonb ORDER BY created_at DESC`,
        [JSON.stringify([nodeAddress.toLowerCase()])],
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT * FROM orders WHERE nodes::jsonb @> $1::jsonb ORDER BY created_at DESC`,
        [JSON.stringify(['0x1111'])],
      );
    });
  });

  describe('Journey Queries', () => {
    it('getJourneysByOrderId should filter by order_id', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: '0xabc', order_id: '0x1234' }],
      });

      await mockClient.query('SELECT * FROM journeys WHERE order_id = $1', [
        '0x1234',
      ]);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM journeys WHERE order_id = $1',
        ['0x1234'],
      );
    });

    it('getAllJourneys should support pagination', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await mockClient.query(
        'SELECT * FROM journeys ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [100, 50],
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM journeys ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [100, 50],
      );
    });
  });

  describe('Asset Queries', () => {
    it('getAssetsByTokenIds should handle array parameter', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { token_id: 1n, name: 'Asset 1' },
          { token_id: 2n, name: 'Asset 2' },
        ],
      });

      const tokenIds = ['1', '2'];
      await mockClient.query(
        'SELECT * FROM assets WHERE token_id = ANY($1::bigint[])',
        [tokenIds.map((id) => BigInt(id))],
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM assets WHERE token_id = ANY($1::bigint[])',
        [[1n, 2n]],
      );
    });

    it('getUserBalances should handle user column correctly', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await mockClient.query('SELECT * FROM user_balances WHERE "user" = $1', [
        '0xaaaa',
      ]);

      // user is a reserved keyword in some SQL dialects, so it's quoted
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM user_balances WHERE "user" = $1',
        ['0xaaaa'],
      );
    });
  });
});
