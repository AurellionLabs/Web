// File: test/repositories/DriverRepository.test.ts
// Unit tests for DriverRepository — production GraphQL-based driver repository.

import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';
import { ethers } from 'ethers';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------
const graphqlRequestMock = vi.fn();

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: unknown[]) => graphqlRequestMock(...args),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL: 'https://indexer.test/graphql',
}));

vi.mock('@/utils/error-handler', () => ({
  handleContractError: vi.fn(),
}));

// extractPonderItems is re-exported from graph-queries — let it use real implementation
// by not mocking the graph-queries module (it's imported transitively)

import { DriverRepository } from '@/infrastructure/repositories/driver-repository';
import { DeliveryStatus } from '@/domain/driver/driver';

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------
const DRIVER_ADDRESS = '0xDriver1234'.toLowerCase();
const SENDER_ADDRESS = '0xSender5678';
const RECEIVER_ADDRESS = '0xReceiver9abc';

// -------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------
function makeJourneyCreatedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'jc-1',
    journey_id: '0xJourney1',
    sender: SENDER_ADDRESS,
    receiver: RECEIVER_ADDRESS,
    driver: ethers.ZeroAddress, // no driver yet
    bounty: '500000000000000000', // 0.5 ETH
    e_t_a: '1700200000',
    order_id: '0xOrder1',
    start_lat: '1.0',
    start_lng: '1.1',
    end_lat: '2.0',
    end_lng: '2.1',
    start_name: 'Start',
    end_name: 'End',
    block_number: '100',
    block_timestamp: '1700000000',
    transaction_hash: '0xTx1',
    ...overrides,
  };
}

function makeDriverAssignedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'da-1',
    journey_id: '0xJourney1',
    driver: DRIVER_ADDRESS,
    sender: SENDER_ADDRESS,
    receiver: RECEIVER_ADDRESS,
    bounty: '500000000000000000',
    e_t_a: '1700200000',
    start_lat: '1.0',
    start_lng: '1.1',
    end_lat: '2.0',
    end_lng: '2.1',
    start_name: 'Start',
    end_name: 'End',
    block_number: '150',
    block_timestamp: '1700050000',
    transaction_hash: '0xTx2',
    ...overrides,
  };
}

function makeStatusUpdateEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'su-1',
    journey_id: '0xJourney1',
    new_status: '1', // InTransit
    driver: DRIVER_ADDRESS,
    sender: SENDER_ADDRESS,
    receiver: RECEIVER_ADDRESS,
    block_number: '200',
    block_timestamp: '1700060000',
    transaction_hash: '0xTx3',
    ...overrides,
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------
describe('DriverRepository', () => {
  let repo: DriverRepository;

  const mockContract = {} as any;
  const mockProvider = {} as any;
  const mockSigner = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new DriverRepository(mockContract, mockProvider, mockSigner);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =====================================================================
  // Constructor
  // =====================================================================
  describe('constructor', () => {
    it('should throw if ausysContract is not provided', () => {
      expect(
        () => new DriverRepository(null as any, mockProvider, mockSigner),
      ).toThrow('Ausys contract instance is required');
    });
  });

  // =====================================================================
  // getAvailableDeliveries
  // =====================================================================
  describe('getAvailableDeliveries', () => {
    it('should return unclaimed journeys as available deliveries', async () => {
      const journey = makeJourneyCreatedEvent();

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getAvailableDeliveries();

      expect(deliveries.length).toBe(1);
      expect(deliveries[0].jobId).toBe('0xJourney1');
      expect(deliveries[0].currentStatus).toBe(DeliveryStatus.PENDING);
      expect(deliveries[0].customer).toBe(SENDER_ADDRESS);
    });

    it('should filter out journeys that have status updates (claimed)', async () => {
      const journey = makeJourneyCreatedEvent();
      const statusUpdate = makeStatusUpdateEvent({ journey_id: '0xJourney1' });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey] },
        statusUpdates: { items: [statusUpdate] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries.length).toBe(0);
    });

    it('should filter out journeys where a driver is assigned in status events', async () => {
      const journey = makeJourneyCreatedEvent();
      const statusUpdate = makeStatusUpdateEvent({
        journey_id: '0xJourney1',
        driver: '0xSomeDriver',
        new_status: '0',
      });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey] },
        statusUpdates: { items: [statusUpdate] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries.length).toBe(0);
    });

    it('should return empty when no journeys exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries).toEqual([]);
    });

    it('should deduplicate journeys by journey_id', async () => {
      const journey1 = makeJourneyCreatedEvent();
      const journey1Dup = makeJourneyCreatedEvent({
        id: 'jc-dup',
        block_timestamp: '1700001000',
      });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey1, journey1Dup] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries.length).toBe(1);
    });

    it('should format bounty as ETH (18 decimals)', async () => {
      const journey = makeJourneyCreatedEvent({
        bounty: '1000000000000000000', // 1 ETH
      });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries[0].fee).toBe(1);
    });

    it('should handle GraphQL errors gracefully', async () => {
      graphqlRequestMock.mockRejectedValue(new Error('Network error'));

      // handleContractError is mocked to not throw
      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries).toEqual([]);
    });

    it('should handle missing bounty gracefully', async () => {
      const journey = makeJourneyCreatedEvent({ bounty: null });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries[0].fee).toBe(0);
    });

    it('should keep multiple different available journeys', async () => {
      const j1 = makeJourneyCreatedEvent({ journey_id: '0xJA' });
      const j2 = makeJourneyCreatedEvent({
        id: 'jc-2',
        journey_id: '0xJB',
      });
      const claimed = makeStatusUpdateEvent({ journey_id: '0xJC' });
      const j3 = makeJourneyCreatedEvent({
        id: 'jc-3',
        journey_id: '0xJC', // this one is claimed
      });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [j1, j2, j3] },
        statusUpdates: { items: [claimed] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries.length).toBe(2);
      const ids = deliveries.map((d) => d.jobId);
      expect(ids).toContain('0xJA');
      expect(ids).toContain('0xJB');
      expect(ids).not.toContain('0xJC');
    });

    it('should use sender node address when pickup label is missing', async () => {
      const journey = makeJourneyCreatedEvent({ start_name: '   ' });

      graphqlRequestMock.mockResolvedValueOnce({
        journeys: { items: [journey] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getAvailableDeliveries();
      expect(deliveries[0].parcelData.startName).toBe(SENDER_ADDRESS);
    });
  });

  // =====================================================================
  // getMyDeliveries
  // =====================================================================
  describe('getMyDeliveries', () => {
    it('should return deliveries assigned to the driver', async () => {
      const assigned = makeDriverAssignedEvent();

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assigned] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);

      expect(deliveries.length).toBe(1);
      expect(deliveries[0].jobId).toBe('0xJourney1');
      expect(deliveries[0].currentStatus).toBe(DeliveryStatus.ACCEPTED);
    });

    it('should return empty array when driverWalletAddress is empty', async () => {
      const deliveries = await repo.getMyDeliveries('');
      expect(deliveries).toEqual([]);
      expect(graphqlRequestMock).not.toHaveBeenCalled();
    });

    it('should merge latest status update into delivery', async () => {
      const assigned = makeDriverAssignedEvent();
      const status = makeStatusUpdateEvent({
        new_status: '1', // InTransit
      });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assigned] },
        statusUpdates: { items: [status] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);

      expect(deliveries[0].currentStatus).toBe(DeliveryStatus.PICKED_UP);
    });

    it('should use latest status when multiple status updates exist', async () => {
      const assigned = makeDriverAssignedEvent();
      const statusOld = makeStatusUpdateEvent({
        id: 'su-old',
        new_status: '1', // InTransit
        block_timestamp: '1700060000',
      });
      const statusNew = makeStatusUpdateEvent({
        id: 'su-new',
        new_status: '2', // Delivered
        block_timestamp: '1700070000',
      });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assigned] },
        statusUpdates: { items: [statusOld, statusNew] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);

      expect(deliveries[0].currentStatus).toBe(DeliveryStatus.COMPLETED);
    });

    it('should deduplicate assignments by journey_id (keep latest)', async () => {
      const assignedOld = makeDriverAssignedEvent({
        id: 'da-old',
        block_timestamp: '1700050000',
      });
      const assignedNew = makeDriverAssignedEvent({
        id: 'da-new',
        block_timestamp: '1700055000',
      });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assignedOld, assignedNew] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);
      expect(deliveries.length).toBe(1);
    });

    it('should lowercase the driver address in the query', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [] },
        statusUpdates: { items: [] },
      });

      await repo.getMyDeliveries('0xDRIVER1234');

      const vars = graphqlRequestMock.mock.calls[0][2];
      expect(vars.driverAddress).toBe('0xdriver1234');
    });

    it('should handle GraphQL errors gracefully', async () => {
      graphqlRequestMock.mockRejectedValue(new Error('Network error'));

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);
      expect(deliveries).toEqual([]);
    });

    it('should map status 0 with driver as ACCEPTED', async () => {
      const assigned = makeDriverAssignedEvent();
      const status = makeStatusUpdateEvent({
        new_status: '0',
        driver: DRIVER_ADDRESS,
      });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assigned] },
        statusUpdates: { items: [status] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);
      // Status 0 with a real driver = ACCEPTED
      expect(deliveries[0].currentStatus).toBe(DeliveryStatus.ACCEPTED);
    });

    it('should map status 3 as CANCELED', async () => {
      const assigned = makeDriverAssignedEvent();
      const status = makeStatusUpdateEvent({
        new_status: '3',
      });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assigned] },
        statusUpdates: { items: [status] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);
      expect(deliveries[0].currentStatus).toBe(DeliveryStatus.CANCELED);
    });

    it('should handle multiple deliveries for different journeys', async () => {
      const a1 = makeDriverAssignedEvent({ journey_id: '0xJ1' });
      const a2 = makeDriverAssignedEvent({
        id: 'da-2',
        journey_id: '0xJ2',
        block_timestamp: '1700051000',
      });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [a1, a2] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);
      expect(deliveries.length).toBe(2);
      const ids = deliveries.map((d) => d.jobId);
      expect(ids).toContain('0xJ1');
      expect(ids).toContain('0xJ2');
    });

    it('should use sender node address when assigned pickup label is missing', async () => {
      const assigned = makeDriverAssignedEvent({ start_name: '' });

      graphqlRequestMock.mockResolvedValueOnce({
        assigned: { items: [assigned] },
        statusUpdates: { items: [] },
      });

      const deliveries = await repo.getMyDeliveries(DRIVER_ADDRESS);
      expect(deliveries[0].parcelData.startName).toBe(SENDER_ADDRESS);
    });
  });
});
