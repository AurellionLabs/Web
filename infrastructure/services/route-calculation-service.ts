'use client';

import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_ALL_ACTIVE_NODES,
  GET_NODE_BY_ADDRESS,
  GetAllActiveNodesResponse,
  ActiveNodeResponse,
} from '@/infrastructure/shared/graph-queries';
import { NEXT_PUBLIC_INDEXER_URL } from '@/chain-constants';

/**
 * Node with parsed location data
 */
export interface NodeWithLocation {
  address: string;
  lat: number;
  lng: number;
  addressName: string;
  validNode: boolean;
}

/**
 * Scored node for route selection
 */
interface ScoredNode extends NodeWithLocation {
  score: number;
  distanceFromOrigin: number;
  distanceToDestination: number;
  totalViaDistance: number;
}

/**
 * Route calculation result
 */
export interface CalculatedRoute {
  nodes: string[];
  totalDistance: number;
  estimatedDays: number;
}

/**
 * RouteCalculationService - Calculates optimal delivery routes through the node network
 *
 * Features:
 * - Fetches all active nodes from the indexer
 * - Filters nodes that are "on the way" (max 30% deviation from direct path)
 * - Scores nodes by efficiency
 * - Adds randomness for security/unpredictability
 * - Returns ordered list of node addresses for the delivery route
 */
export class RouteCalculationService {
  private indexerUrl: string;

  constructor() {
    this.indexerUrl = NEXT_PUBLIC_INDEXER_URL;
  }

  /**
   * Fetch all active nodes from the indexer
   */
  async fetchAllNodes(): Promise<NodeWithLocation[]> {
    try {
      const response = await graphqlRequest<GetAllActiveNodesResponse>(
        this.indexerUrl,
        GET_ALL_ACTIVE_NODES,
        { limit: 500 },
      );

      const nodes = response.nodess?.items || [];

      return nodes
        .filter((node) => node.validNode && node.lat && node.lng)
        .map((node) => ({
          address: node.id,
          lat: parseFloat(node.lat),
          lng: parseFloat(node.lng),
          addressName: node.addressName,
          validNode: node.validNode,
        }));
    } catch (error) {
      console.error('[RouteCalculationService] Failed to fetch nodes:', error);
      return [];
    }
  }

  /**
   * Get a specific node's location
   */
  async getNodeLocation(nodeAddress: string): Promise<NodeWithLocation | null> {
    try {
      const response = await graphqlRequest<{
        nodes: ActiveNodeResponse | null;
      }>(this.indexerUrl, GET_NODE_BY_ADDRESS, { nodeAddress });

      const node = response.nodes;
      if (!node || !node.lat || !node.lng) {
        return null;
      }

      return {
        address: node.id,
        lat: parseFloat(node.lat),
        lng: parseFloat(node.lng),
        addressName: node.addressName,
        validNode: node.validNode,
      };
    } catch (error) {
      console.error(
        '[RouteCalculationService] Failed to fetch node location:',
        error,
      );
      return null;
    }
  }

  /**
   * Calculate optimal route from origin node to destination
   *
   * @param originNodeAddress - The starting node address
   * @param destinationLat - Customer delivery latitude
   * @param destinationLng - Customer delivery longitude
   * @param confirmationLevel - Number of nodes to include (1-5)
   * @returns Ordered array of node addresses for the route
   */
  async calculateRoute(
    originNodeAddress: string,
    destinationLat: number,
    destinationLng: number,
    confirmationLevel: number,
  ): Promise<CalculatedRoute> {
    console.log('[RouteCalculationService] Calculating route:', {
      originNodeAddress,
      destinationLat,
      destinationLng,
      confirmationLevel,
    });

    // Step 1: Get origin node location
    const originNode = await this.getNodeLocation(originNodeAddress);
    if (!originNode) {
      console.warn(
        '[RouteCalculationService] Origin node not found, using direct route',
      );
      return {
        nodes: [originNodeAddress],
        totalDistance: 0,
        estimatedDays: confirmationLevel + 2,
      };
    }

    // Step 2: Fetch all active nodes
    const allNodes = await this.fetchAllNodes();
    console.log(
      `[RouteCalculationService] Found ${allNodes.length} active nodes`,
    );

    if (allNodes.length === 0 || confirmationLevel <= 1) {
      // Direct route - just origin node
      const directDistance = this.haversineDistance(
        originNode.lat,
        originNode.lng,
        destinationLat,
        destinationLng,
      );
      return {
        nodes: [originNodeAddress],
        totalDistance: directDistance,
        estimatedDays: 3,
      };
    }

    // Step 3: Calculate direct distance
    const directDistance = this.haversineDistance(
      originNode.lat,
      originNode.lng,
      destinationLat,
      destinationLng,
    );

    // Step 4: Filter nodes that are "on the way" (max 30% deviation)
    const MAX_DEVIATION = 0.3;
    const maxAllowedDistance = directDistance * (1 + MAX_DEVIATION);

    const nodesOnRoute: ScoredNode[] = [];

    for (const node of allNodes) {
      // Skip the origin node
      if (node.address.toLowerCase() === originNodeAddress.toLowerCase()) {
        continue;
      }

      const distanceFromOrigin = this.haversineDistance(
        originNode.lat,
        originNode.lng,
        node.lat,
        node.lng,
      );

      const distanceToDestination = this.haversineDistance(
        node.lat,
        node.lng,
        destinationLat,
        destinationLng,
      );

      const totalViaDistance = distanceFromOrigin + distanceToDestination;

      // Only include if within acceptable deviation
      if (totalViaDistance <= maxAllowedDistance) {
        // Score: prefer nodes that add minimal extra distance
        // Higher score = better (less deviation)
        const extraDistance = totalViaDistance - directDistance;
        const score = extraDistance > 0 ? 1 / extraDistance : 1000;

        nodesOnRoute.push({
          ...node,
          score,
          distanceFromOrigin,
          distanceToDestination,
          totalViaDistance,
        });
      }
    }

    console.log(
      `[RouteCalculationService] ${nodesOnRoute.length} nodes on route (within ${MAX_DEVIATION * 100}% deviation)`,
    );

    if (nodesOnRoute.length === 0) {
      // No intermediate nodes available, return direct route
      return {
        nodes: [originNodeAddress],
        totalDistance: directDistance,
        estimatedDays: 3,
      };
    }

    // Step 5: Sort by score (best first)
    nodesOnRoute.sort((a, b) => b.score - a.score);

    // Step 6: Add randomness - take top candidates and shuffle
    const candidateCount = Math.min(nodesOnRoute.length, confirmationLevel * 3);
    const topCandidates = nodesOnRoute.slice(0, candidateCount);
    this.shuffleArray(topCandidates);

    // Step 7: Select nodes based on confirmation level
    // confirmationLevel includes origin, so we need (confirmationLevel - 1) intermediate nodes
    const intermediateCount = Math.min(
      confirmationLevel - 1,
      topCandidates.length,
    );
    const selectedNodes = topCandidates.slice(0, intermediateCount);

    // Step 8: Sort selected nodes by distance from origin (route order)
    selectedNodes.sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);

    // Step 9: Build final route
    const route = [originNodeAddress, ...selectedNodes.map((n) => n.address)];

    // Calculate total route distance
    let totalDistance = 0;
    let prevLat = originNode.lat;
    let prevLng = originNode.lng;

    for (const node of selectedNodes) {
      totalDistance += this.haversineDistance(
        prevLat,
        prevLng,
        node.lat,
        node.lng,
      );
      prevLat = node.lat;
      prevLng = node.lng;
    }
    totalDistance += this.haversineDistance(
      prevLat,
      prevLng,
      destinationLat,
      destinationLng,
    );

    console.log('[RouteCalculationService] Final route:', {
      nodes: route,
      totalDistance: `${totalDistance.toFixed(2)} km`,
      nodeCount: route.length,
    });

    return {
      nodes: route,
      totalDistance,
      estimatedDays: route.length + 2, // Base 2 days + 1 day per node
    };
  }

  /**
   * Calculate the Haversine distance between two points in kilometers
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Fisher-Yates shuffle for randomness
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

export default RouteCalculationService;
