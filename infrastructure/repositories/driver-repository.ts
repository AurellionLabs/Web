// @ts-nocheck - Uses typechain struct types that need migration
import {
  type IDriverRepository,
  type Delivery,
  DeliveryStatus,
} from '@/domain/driver/driver';
import { type ParcelData } from '@/domain/shared';

import { BrowserProvider, ethers, type Signer } from 'ethers';
// REFACTOR: Use Ausys contract instead of LocationContract
import type { Ausys } from '@/lib/contracts';
import { handleContractError } from '@/utils/error-handler';
import { graphqlRequest } from './shared/graph';
import {
  GET_AVAILABLE_JOURNEYS,
  GET_JOURNEYS_BY_DRIVER,
  extractPonderItems,
} from './shared/graph-queries';
import { JourneyGraphResponse } from './shared/order-queries';
import { NEXT_PUBLIC_AUSYS_SUBGRAPH_URL } from '@/chain-constants';

/**
 * Infrastructure implementation of the IDriverRepository interface
 * This implementation directly interacts with the Ausys blockchain contracts
 *
 * REFACTOR NOTE: Updated to use Ausys contract while keeping dev's Delivery domain model
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

  // --- Helper to map contract/graph Journey status to domain DeliveryStatus ---
  // DEV VERSION: Better mapping with driver awareness
  private mapContractStatusToDomain(
    contractStatus: bigint | number | string,
    driverAddress: string,
  ): DeliveryStatus {
    // Mapping based on Ausys contract enum (Pending, InProgress, Completed, Canceled)
    // and DeliveryStatus enum (PENDING, ACCEPTED, PICKED_UP, COMPLETED, CANCELED)
    const statusNum = Number(contractStatus);
    switch (statusNum) {
      case 0: // Contract: Pending
        // If there's a driver assigned but status is still Pending, it means ACCEPTED
        if (driverAddress && driverAddress !== ethers.ZeroAddress) {
          return DeliveryStatus.ACCEPTED;
        }
        return DeliveryStatus.PENDING;
      case 1: // Contract: InProgress - maps to PICKED_UP
        return DeliveryStatus.PICKED_UP;
      case 2: // Contract: Completed
        return DeliveryStatus.COMPLETED;
      case 3: // Contract: Canceled
        return DeliveryStatus.CANCELED;
      default:
        console.warn(`Unknown contract status received: ${statusNum}`);
        return DeliveryStatus.PENDING; // Default fallback
    }
  }

  // --- Helper to map Journey (graph or contract) to domain Delivery model ---
  // Accepts either Graph response (Ponder flat structure) or Contract struct shape
  private mapJourneyToDelivery(
    journey:
      | Ausys.JourneyStructOutput
      | (JourneyGraphResponse & { id: string }),
  ): Delivery {
    // Ponder returns flat structure - check for flat field (start_location_lat) vs nested (parcelData)
    const isPonderGraph =
      (journey as JourneyGraphResponse).start_location_lat !== undefined;
    const isContractStruct =
      (journey as Ausys.JourneyStructOutput).parcelData !== undefined;

    let parcelData: ParcelData;

    if (isPonderGraph) {
      // Ponder returns flat structure
      const j = journey as JourneyGraphResponse;
      parcelData = {
        startLocation: {
          lat: j.start_location_lat,
          lng: j.start_location_lng,
        },
        endLocation: {
          lat: j.end_location_lat,
          lng: j.end_location_lng,
        },
        startName: j.start_name,
        endName: j.end_name,
      };
    } else if (isContractStruct) {
      // Contract struct has nested parcelData
      const j = journey as Ausys.JourneyStructOutput;
      parcelData = {
        startLocation: {
          lat: j.parcelData.startLocation.lat,
          lng: j.parcelData.startLocation.lng,
        },
        endLocation: {
          lat: j.parcelData.endLocation.lat,
          lng: j.parcelData.endLocation.lng,
        },
        startName: j.parcelData.startName,
        endName: j.parcelData.endName,
      };
    } else {
      // Fallback for unknown format
      parcelData = {
        startLocation: { lat: '0', lng: '0' },
        endLocation: { lat: '0', lng: '0' },
        startName: '',
        endName: '',
      };
    }

    const jobId = isPonderGraph
      ? (journey as JourneyGraphResponse).id
      : (journey as Ausys.JourneyStructOutput).journeyId;
    const sender = isPonderGraph
      ? (journey as JourneyGraphResponse).sender
      : (journey as Ausys.JourneyStructOutput).sender;
    const driver = isPonderGraph
      ? (journey as JourneyGraphResponse).driver
      : (journey as Ausys.JourneyStructOutput).driver;
    const bounty = isPonderGraph
      ? (journey as JourneyGraphResponse).bounty
      : (journey as Ausys.JourneyStructOutput).bounty;
    const eta = isPonderGraph
      ? (journey as JourneyGraphResponse).eta
      : (journey as Ausys.JourneyStructOutput).ETA;
    const currentStatus = isPonderGraph
      ? (journey as JourneyGraphResponse).current_status
      : (journey as Ausys.JourneyStructOutput).currentStatus;

    // Debug bounty conversion
    const bountyRaw = bounty as any;
    const bountyFormatted = bountyRaw ? ethers.formatUnits(bountyRaw, 6) : '0';
    const bountyNumber = Number(bountyFormatted);
    console.log('[DriverRepository] Bounty conversion:', {
      jobId,
      bountyRaw: bountyRaw?.toString(),
      bountyFormatted,
      bountyNumber,
      bountyType: typeof bountyRaw,
    });

    return {
      jobId,
      customer: sender,
      fee: bountyNumber, // USDT has 6 decimals
      ETA: Number(eta as any),
      deliveryETA: Number(eta as any),
      currentStatus: this.mapContractStatusToDomain(
        currentStatus as any,
        driver,
      ),
      parcelData: parcelData,
    };
  }

  // --- Implement IDriverRepository methods ---

  async getAvailableDeliveries(): Promise<Delivery[]> {
    console.log('[DriverRepository] Getting available deliveries (Graph)...');
    try {
      // Ponder returns { journeyss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        journeyss: { items: JourneyGraphResponse[] };
      }>(this.graphQLEndpoint, GET_AVAILABLE_JOURNEYS, { limit: 200 });
      const items = extractPonderItems(response.journeyss || { items: [] });
      const deliveries = items.map((j) => this.mapJourneyToDelivery(j as any));
      console.log(
        `[DriverRepository] Found ${deliveries.length} available deliveries (Graph).`,
      );
      return deliveries;
    } catch (error) {
      handleContractError(error, 'get available deliveries (Graph)');
      return [];
    }
  }

  async getMyDeliveries(driverWalletAddress: string): Promise<Delivery[]> {
    console.log(
      `[DriverRepository] Getting deliveries for driver (Graph): ${driverWalletAddress}`,
    );
    if (!driverWalletAddress) {
      console.error(
        '[DriverRepository] driverWalletAddress is required for getMyDeliveries',
      );
      return [];
    }

    try {
      // Ponder returns { journeyss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        journeyss: { items: JourneyGraphResponse[] };
      }>(this.graphQLEndpoint, GET_JOURNEYS_BY_DRIVER, {
        driverAddress: driverWalletAddress.toLowerCase(),
      });
      const items = extractPonderItems(response.journeyss || { items: [] });
      const deliveries = items.map((j) => this.mapJourneyToDelivery(j as any));
      console.log(
        `[DriverRepository] Found ${deliveries.length} deliveries for driver (Graph).`,
      );
      return deliveries;
    } catch (error) {
      handleContractError(
        error,
        `get deliveries for driver via Graph ${driverWalletAddress}`,
      );
      return [];
    }
  }
}
