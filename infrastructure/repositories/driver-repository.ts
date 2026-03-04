import {
  type IDriverRepository,
  type Delivery,
  DeliveryStatus,
} from '@/domain/driver/driver';
import { type ParcelData } from '@/domain/shared';

import { BrowserProvider, ethers, type Signer } from 'ethers';
import type { Ausys } from '@/lib/contracts';
import { handleContractError } from '@/utils/error-handler';
import { graphqlRequest } from './shared/graph';
import {
  GET_ALL_JOURNEYS_CREATED,
  GET_JOURNEYS_BY_DRIVER,
  extractPonderItems,
  JourneyCreatedRawEvent,
  DriverAssignedRawEvent,
  AuSysJourneyStatusUpdatedRawEvent,
  AllJourneysCreatedResponse,
  JourneysByDriverResponse,
} from './shared/graph-queries';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';

/**
 * Infrastructure implementation of the IDriverRepository interface
 * Uses AuSysFacet verbose events for journey data
 */
export class DriverRepository implements IDriverRepository {
  private ausysContract: Ausys;
  private provider: BrowserProvider;
  private signer: Signer;
  private get graphQLEndpoint() {
    return getCurrentIndexerUrl();
  }

  constructor(ausysContract: Ausys, provider: BrowserProvider, signer: Signer) {
    if (!ausysContract) {
      throw new Error('DriverRepository: Ausys contract instance is required.');
    }
    this.ausysContract = ausysContract;
    this.provider = provider;
    this.signer = signer;
  }

  /**
   * Map contract status to domain DeliveryStatus
   * Contract: 0=Pending, 1=InTransit, 2=Delivered, 3=Canceled
   */
  private mapStatusToDomain(
    status: string | number,
    driverAddress: string,
  ): DeliveryStatus {
    const statusNum = Number(status);
    switch (statusNum) {
      case 0: // Pending
        if (driverAddress && driverAddress !== ethers.ZeroAddress) {
          return DeliveryStatus.ACCEPTED;
        }
        return DeliveryStatus.PENDING;
      case 1: // InTransit
        return DeliveryStatus.PICKED_UP;
      case 2: // Delivered
        return DeliveryStatus.COMPLETED;
      case 3: // Canceled
        return DeliveryStatus.CANCELED;
      default:
        return DeliveryStatus.PENDING;
    }
  }

  /**
   * Convert JourneyCreated event to Delivery domain model
   */
  private journeyCreatedToDelivery(
    event: JourneyCreatedRawEvent,
    statusEvent?: AuSysJourneyStatusUpdatedRawEvent,
  ): Delivery {
    // Pay token is AURA (18 decimals) on testnet, USDC (6) in production
    const bountyFormatted = event.bounty
      ? ethers.formatUnits(event.bounty, 18)
      : '0';

    const driver = statusEvent?.driver || event.driver;
    const status = statusEvent
      ? this.mapStatusToDomain(statusEvent.new_status, driver)
      : this.mapStatusToDomain(0, event.driver);

    return {
      jobId: event.journey_id,
      customer: event.sender,
      fee: Number(bountyFormatted),
      ETA: Number(event.e_t_a || '0'),
      deliveryETA: Number(event.e_t_a || '0'),
      currentStatus: status,
      parcelData: {
        startLocation: { lat: event.start_lat, lng: event.start_lng },
        endLocation: { lat: event.end_lat, lng: event.end_lng },
        startName: event.start_name,
        endName: event.end_name,
      },
    };
  }

  /**
   * Convert DriverAssigned event to Delivery domain model
   */
  private driverAssignedToDelivery(
    event: DriverAssignedRawEvent,
    statusEvent?: AuSysJourneyStatusUpdatedRawEvent,
  ): Delivery {
    // Pay token is AURA (18 decimals) on testnet, USDC (6) in production
    const bountyFormatted = event.bounty
      ? ethers.formatUnits(event.bounty, 18)
      : '0';

    const status = statusEvent
      ? this.mapStatusToDomain(statusEvent.new_status, event.driver)
      : DeliveryStatus.ACCEPTED; // Driver assigned = ACCEPTED

    return {
      jobId: event.journey_id,
      customer: event.sender,
      fee: Number(bountyFormatted),
      ETA: Number(event.e_t_a || '0'),
      deliveryETA: Number(event.e_t_a || '0'),
      currentStatus: status,
      parcelData: {
        startLocation: { lat: event.start_lat, lng: event.start_lng },
        endLocation: { lat: event.end_lat, lng: event.end_lng },
        startName: event.start_name,
        endName: event.end_name,
      },
    };
  }

  /**
   * Get available deliveries (journeys with no driver assigned)
   */
  async getAvailableDeliveries(): Promise<Delivery[]> {
    try {
      // Use ALL_JOURNEYS query which includes status updates + driver assignments
      const response = await graphqlRequest<AllJourneysCreatedResponse>(
        this.graphQLEndpoint,
        GET_ALL_JOURNEYS_CREATED,
        { limit: 200 },
      );

      const journeys = extractPonderItems(
        response.journeys || { items: [] },
      ) as JourneyCreatedRawEvent[];

      const statusEvents = extractPonderItems(
        response.statusUpdates || { items: [] },
      ) as AuSysJourneyStatusUpdatedRawEvent[];

      const driverAssignments = extractPonderItems(
        response.driverAssignments || { items: [] },
      );

      // Build set of journey IDs that have been claimed (driver assigned or status > 0)
      const claimedJourneyIds = new Set<string>();

      // Any status update means the journey has progressed past Pending
      statusEvents.forEach((s) => {
        claimedJourneyIds.add(s.journey_id);
      });

      // Check driver field in status events
      statusEvents.forEach((s) => {
        if (s.driver && s.driver !== ethers.ZeroAddress) {
          claimedJourneyIds.add(s.journey_id);
        }
      });

      // DriverAssigned events — the key filter: a driver was assigned to this journey
      driverAssignments.forEach((da) => {
        claimedJourneyIds.add(da.journey_id);
      });

      // Deduplicate journeys by journey_id (keep latest)
      const journeyMap = new Map<string, JourneyCreatedRawEvent>();
      journeys.forEach((j) => {
        if (!journeyMap.has(j.journey_id)) {
          journeyMap.set(j.journey_id, j);
        }
      });

      // Filter to only journeys that haven't been claimed
      const availableJourneys = Array.from(journeyMap.values()).filter(
        (j) => !claimedJourneyIds.has(j.journey_id),
      );

      const deliveries = availableJourneys.map((j) =>
        this.journeyCreatedToDelivery(j),
      );

      return deliveries;
    } catch (error) {
      handleContractError(error, 'get available deliveries');
      return [];
    }
  }

  /**
   * Get deliveries assigned to a specific driver
   */
  async getMyDeliveries(driverWalletAddress: string): Promise<Delivery[]> {
    if (!driverWalletAddress) {
      console.error(
        '[DriverRepository] driverWalletAddress is required for getMyDeliveries',
      );
      return [];
    }

    try {
      const response = await graphqlRequest<JourneysByDriverResponse>(
        this.graphQLEndpoint,
        GET_JOURNEYS_BY_DRIVER,
        { driverAddress: driverWalletAddress.toLowerCase() },
      );

      const assignedEvents = extractPonderItems(
        response.assigned || { items: [] },
      ) as DriverAssignedRawEvent[];

      const statusEvents = extractPonderItems(
        response.statusUpdates || { items: [] },
      ) as AuSysJourneyStatusUpdatedRawEvent[];

      // Create lookup for latest status per journey
      const statusMap = new Map<string, AuSysJourneyStatusUpdatedRawEvent>();
      statusEvents.forEach((s) => {
        const existing = statusMap.get(s.journey_id);
        if (
          !existing ||
          BigInt(s.block_timestamp) > BigInt(existing.block_timestamp)
        ) {
          statusMap.set(s.journey_id, s);
        }
      });

      // Deduplicate by journey_id — keep the latest event per journey
      const uniqueAssignments = new Map<string, DriverAssignedRawEvent>();
      assignedEvents.forEach((event) => {
        const existing = uniqueAssignments.get(event.journey_id);
        if (
          !existing ||
          BigInt(event.block_timestamp) > BigInt(existing.block_timestamp)
        ) {
          uniqueAssignments.set(event.journey_id, event);
        }
      });

      // Convert to deliveries
      const deliveries = Array.from(uniqueAssignments.values()).map(
        (assigned) => {
          const latestStatus = statusMap.get(assigned.journey_id);
          return this.driverAssignedToDelivery(assigned, latestStatus);
        },
      );

      return deliveries;
    } catch (error) {
      handleContractError(
        error,
        `get deliveries for driver ${driverWalletAddress}`,
      );
      return [];
    }
  }
}
