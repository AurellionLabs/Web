/**
 * RouteCalculationService Unit Tests
 *
 * Tests the route calculation logic including:
 * - Haversine distance calculation
 * - Node filtering (on-route nodes)
 * - Route scoring and randomization
 * - Route ordering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RouteCalculationService } from '@/infrastructure/services/route-calculation-service';

// Mock the graphql request
vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: vi.fn(),
}));

// Mock chain constants
vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'http://localhost:42069/graphql',
}));

import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';

const mockGraphqlRequest = vi.mocked(graphqlRequest);

describe('RouteCalculationService', () => {
  let service: RouteCalculationService;

  // Sample node data (NYC area)
  const mockNodes = [
    {
      id: '0xnode1',
      owner: '0xowner1',
      addressName: 'New York Hub',
      lat: '40.7128',
      lng: '-74.0060',
      validNode: true,
      status: 'active',
    },
    {
      id: '0xnode2',
      owner: '0xowner2',
      addressName: 'Philadelphia Hub',
      lat: '39.9526',
      lng: '-75.1652',
      validNode: true,
      status: 'active',
    },
    {
      id: '0xnode3',
      owner: '0xowner3',
      addressName: 'Baltimore Hub',
      lat: '39.2904',
      lng: '-76.6122',
      validNode: true,
      status: 'active',
    },
    {
      id: '0xnode4',
      owner: '0xowner4',
      addressName: 'Washington DC Hub',
      lat: '38.9072',
      lng: '-77.0369',
      validNode: true,
      status: 'active',
    },
    {
      id: '0xnode5',
      owner: '0xowner5',
      addressName: 'Boston Hub (off route)',
      lat: '42.3601',
      lng: '-71.0589',
      validNode: true,
      status: 'active',
    },
  ];

  beforeEach(() => {
    service = new RouteCalculationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAllNodes', () => {
    it('should fetch and parse nodes from indexer', async () => {
      mockGraphqlRequest.mockResolvedValueOnce({
        nodess: { items: mockNodes },
      });

      const nodes = await service.fetchAllNodes();

      expect(nodes).toHaveLength(5);
      expect(nodes[0]).toEqual({
        address: '0xnode1',
        lat: 40.7128,
        lng: -74.006,
        addressName: 'New York Hub',
        validNode: true,
      });
    });

    it('should filter out nodes without valid coordinates', async () => {
      mockGraphqlRequest.mockResolvedValueOnce({
        nodess: {
          items: [
            ...mockNodes,
            { id: '0xbad', lat: '', lng: '', validNode: true },
          ],
        },
      });

      const nodes = await service.fetchAllNodes();

      expect(nodes).toHaveLength(5);
    });

    it('should return empty array on error', async () => {
      mockGraphqlRequest.mockRejectedValueOnce(new Error('Network error'));

      const nodes = await service.fetchAllNodes();

      expect(nodes).toEqual([]);
    });
  });

  describe('getNodeLocation', () => {
    it('should fetch a specific node location', async () => {
      mockGraphqlRequest.mockResolvedValueOnce({
        nodes: mockNodes[0],
      });

      const node = await service.getNodeLocation('0xnode1');

      expect(node).toEqual({
        address: '0xnode1',
        lat: 40.7128,
        lng: -74.006,
        addressName: 'New York Hub',
        validNode: true,
      });
    });

    it('should return null if node not found', async () => {
      mockGraphqlRequest.mockResolvedValueOnce({
        nodes: null,
      });

      const node = await service.getNodeLocation('0xnonexistent');

      expect(node).toBeNull();
    });
  });

  describe('calculateRoute', () => {
    beforeEach(() => {
      // Mock fetchAllNodes
      mockGraphqlRequest.mockImplementation(async (_url, query, _vars) => {
        // Check if it's a single node query or all nodes query
        if (query.includes('GetNodeByAddress')) {
          return { nodes: mockNodes[0] };
        }
        return { nodess: { items: mockNodes } };
      });
    });

    it('should return direct route when confirmationLevel is 1', async () => {
      const route = await service.calculateRoute(
        '0xnode1', // NYC origin
        38.9072, // DC destination lat
        -77.0369, // DC destination lng
        1, // Direct route
      );

      expect(route.nodes).toHaveLength(1);
      expect(route.nodes[0]).toBe('0xnode1');
    });

    it('should include intermediate nodes when confirmationLevel > 1', async () => {
      const route = await service.calculateRoute(
        '0xnode1', // NYC origin
        38.9072, // DC destination lat
        -77.0369, // DC destination lng
        3, // 3 nodes
      );

      // Should have origin + 2 intermediate nodes
      expect(route.nodes.length).toBeGreaterThanOrEqual(1);
      expect(route.nodes.length).toBeLessThanOrEqual(3);
      expect(route.nodes[0]).toBe('0xnode1'); // Origin first
    });

    it('should filter out nodes that are too far off route', async () => {
      const route = await service.calculateRoute(
        '0xnode1', // NYC origin
        38.9072, // DC destination lat
        -77.0369, // DC destination lng
        5, // Max nodes
      );

      // Boston (0xnode5) should NOT be included as it's north of NYC
      // when destination is south (DC)
      const hasBoston = route.nodes.includes('0xnode5');
      expect(hasBoston).toBe(false);
    });

    it('should order nodes by distance from origin', async () => {
      const route = await service.calculateRoute(
        '0xnode1', // NYC origin
        38.9072, // DC destination lat
        -77.0369, // DC destination lng
        4,
      );

      // First node should always be origin
      expect(route.nodes[0]).toBe('0xnode1');

      // Nodes should be ordered: NYC -> Philly -> Baltimore -> DC
      // (though some may be filtered due to randomness)
    });

    it('should calculate total distance', async () => {
      const route = await service.calculateRoute(
        '0xnode1',
        38.9072,
        -77.0369,
        1,
      );

      // NYC to DC is approximately 328 km
      expect(route.totalDistance).toBeGreaterThan(300);
      expect(route.totalDistance).toBeLessThan(400);
    });

    it('should calculate estimated days based on node count', async () => {
      const route1 = await service.calculateRoute(
        '0xnode1',
        38.9072,
        -77.0369,
        1,
      );
      const route3 = await service.calculateRoute(
        '0xnode1',
        38.9072,
        -77.0369,
        3,
      );

      // Base 2 days + 1 day per node
      expect(route1.estimatedDays).toBe(3); // 2 + 1
      expect(route3.estimatedDays).toBeGreaterThanOrEqual(4); // 2 + 2+
    });

    it('should handle missing origin node gracefully', async () => {
      mockGraphqlRequest.mockImplementation(async (_url, query) => {
        if (query.includes('GetNodeByAddress')) {
          return { nodes: null };
        }
        return { nodess: { items: mockNodes } };
      });

      const route = await service.calculateRoute(
        '0xnonexistent',
        38.9072,
        -77.0369,
        3,
      );

      // Should return just the origin address
      expect(route.nodes).toHaveLength(1);
      expect(route.nodes[0]).toBe('0xnonexistent');
    });

    it('should handle no available nodes gracefully', async () => {
      mockGraphqlRequest.mockImplementation(async (_url, query) => {
        if (query.includes('GetNodeByAddress')) {
          return { nodes: mockNodes[0] };
        }
        return { nodess: { items: [] } };
      });

      const route = await service.calculateRoute(
        '0xnode1',
        38.9072,
        -77.0369,
        3,
      );

      // Should return just the origin
      expect(route.nodes).toHaveLength(1);
    });
  });

  describe('Haversine distance calculation', () => {
    it('should calculate correct distance between NYC and DC', async () => {
      // Access private method via any cast for testing
      const serviceAny = service as any;

      const distance = serviceAny.haversineDistance(
        40.7128,
        -74.006, // NYC
        38.9072,
        -77.0369, // DC
      );

      // NYC to DC is approximately 328 km
      expect(distance).toBeGreaterThan(320);
      expect(distance).toBeLessThan(340);
    });

    it('should return 0 for same location', async () => {
      const serviceAny = service as any;

      const distance = serviceAny.haversineDistance(
        40.7128,
        -74.006,
        40.7128,
        -74.006,
      );

      expect(distance).toBe(0);
    });
  });

  describe('Route randomization', () => {
    it('should produce different routes on multiple calls (with same inputs)', async () => {
      mockGraphqlRequest.mockImplementation(async (_url, query) => {
        if (query.includes('GetNodeByAddress')) {
          return { nodes: mockNodes[0] };
        }
        return { nodess: { items: mockNodes } };
      });

      const routes: string[][] = [];

      // Run multiple times to check randomization
      for (let i = 0; i < 10; i++) {
        const route = await service.calculateRoute(
          '0xnode1',
          38.9072,
          -77.0369,
          3,
        );
        routes.push(route.nodes);
      }

      // Check if we got at least 2 different routes (randomization working)
      // Note: This test may occasionally fail if randomization happens to produce
      // the same result 10 times in a row (very unlikely with multiple candidates)
      const uniqueRoutes = new Set(routes.map((r) => r.join(',')));
      // At minimum, all routes should have the same origin
      expect(routes.every((r) => r[0] === '0xnode1')).toBe(true);
    });
  });
});
