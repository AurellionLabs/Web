// @ts-nocheck - Uses typechain struct types that need migration
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
  GET_AVAILABLE_JOURNEYS,
  GET_JOURNEYS_BY_DRIVER,
  extractPonderItems,
  JourneyCreatedRawEvent,
  DriverAssignedRawEvent,
  AuSysJourneyStatusUpdatedRawEvent,
  AvailableJourneysResponse,
  JourneysByDriverResponse,
} from './shared/graph-queries';
import { NEXT_PUBLIC_AUSYS_SUBGRAPH_URL } from '@/chain-constants';

/**
 * Infrastructure implementation of the IDriverRepository interface
 * Uses AuSysFacet verbose events for journey data
 */
export class DriverRepository implements IDriverRepository {
  private ausysContract: Ausys;
  private provider: BrowserProvider;
  private signer: Signer;
  private graphQLEndpoint = NEXT_PUBLIC_AUSYS_SUBGRAPH_URL;

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
    const bountyFormatted = event.bounty
      ? ethers.formatUnits(event.bounty, 6)
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
    const bountyFormatted = event.bounty
      ? ethers.formatUnits(event.bounty, 6)
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
    console.log('[DriverRepository] Getting available deliveries...');
    try {
      const response = await graphqlRequest<AvailableJourneysResponse>(
        this.graphQLEndpoint,
        GET_AVAILABLE_JOURNEYS,
        { limit: 200 },
      );

      const journeys = extractPonderItems(
        response.journeys || { items: [] },
      ) as JourneyCreatedRawEvent[];

      // Filter to only journeys with no driver (driver = zero address)
      const availableJourneys = journeys.filter(
        (j) => !j.driver || j.driver === ethers.ZeroAddress,
      );

      const deliveries = availableJourneys.map((j) =>
        this.journeyCreatedToDelivery(j),
      );

      console.log(
        `[DriverRepository] Found ${deliveries.length} available deliveries.`,
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
    console.log(
      `[DriverRepository] Getting deliveries for driver: ${driverWalletAddress}`,
    );
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

      // Convert to deliveries
      const deliveries = assignedEvents.map((assigned) => {
        const latestStatus = statusMap.get(assigned.journey_id);
        return this.driverAssignedToDelivery(assigned, latestStatus);
      });

      console.log(
        `[DriverRepository] Found ${deliveries.length} deliveries for driver.`,
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
