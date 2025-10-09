import {
  type IDriverRepository,
  type Delivery,
  DeliveryStatus,
} from '@/domain/driver/driver';
import { type ParcelData } from '@/domain/shared';

import { BrowserProvider, ethers, type Signer } from 'ethers';
// REFACTOR: Use Ausys contract instead of LocationContract
import { Ausys } from '@/typechain-types/contracts/AuSys.sol/Ausys';
import { handleContractError } from '@/utils/error-handler';
import { graphqlRequest } from './shared/graph';
import {
  GET_AVAILABLE_JOURNEYS,
  GET_JOURNEYS_BY_DRIVER,
  JourneyGraphResponse,
} from '../shared/graph-queries';
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
  // Accepts either Graph response or Contract struct shape
  private mapJourneyToDelivery(
    journey:
      | Ausys.JourneyStructOutput
      | (JourneyGraphResponse & { id: string }),
  ): Delivery {
    // Normalize fields between graph and contract outputs
    const isGraph =
      (journey as JourneyGraphResponse).parcelData?.startLocationLat !==
      undefined;

    const parcelData: ParcelData = isGraph
      ? {
          startLocation: {
            lat: (journey as JourneyGraphResponse).parcelData.startLocationLat,
            lng: (journey as JourneyGraphResponse).parcelData.startLocationLng,
          },
          endLocation: {
            lat: (journey as JourneyGraphResponse).parcelData.endLocationLat,
            lng: (journey as JourneyGraphResponse).parcelData.endLocationLng,
          },
          startName: (journey as JourneyGraphResponse).parcelData.startName,
          endName: (journey as JourneyGraphResponse).parcelData.endName,
        }
      : {
          startLocation: {
            lat: (journey as Ausys.JourneyStructOutput).parcelData.startLocation
              .lat,
            lng: (journey as Ausys.JourneyStructOutput).parcelData.startLocation
              .lng,
          },
          endLocation: {
            lat: (journey as Ausys.JourneyStructOutput).parcelData.endLocation
              .lat,
            lng: (journey as Ausys.JourneyStructOutput).parcelData.endLocation
              .lng,
          },
          startName: (journey as Ausys.JourneyStructOutput).parcelData
            .startName,
          endName: (journey as Ausys.JourneyStructOutput).parcelData.endName,
        };

    const jobId = isGraph
      ? (journey as JourneyGraphResponse).id
      : (journey as Ausys.JourneyStructOutput).journeyId;
    const sender = isGraph
      ? (journey as JourneyGraphResponse).sender
      : (journey as Ausys.JourneyStructOutput).sender;
    const driver = isGraph
      ? (journey as JourneyGraphResponse).driver
      : (journey as Ausys.JourneyStructOutput).driver;
    const bounty = isGraph
      ? (journey as JourneyGraphResponse).bounty
      : (journey as Ausys.JourneyStructOutput).bounty;
    const eta = isGraph
      ? (journey as JourneyGraphResponse).eta
      : (journey as Ausys.JourneyStructOutput).ETA;
    const currentStatus = isGraph
      ? (journey as JourneyGraphResponse).currentStatus
      : (journey as Ausys.JourneyStructOutput).currentStatus;

    // Debug bounty conversion
    const bountyRaw = bounty as any;
    const bountyFormatted = ethers.formatUnits(bountyRaw, 6);
    const bountyNumber = Number(bountyFormatted);
    console.log('[DriverRepository] Bounty conversion:', {
      jobId,
      bountyRaw: bountyRaw.toString(),
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
      const response = await graphqlRequest<{
        journeys: JourneyGraphResponse[];
      }>(this.graphQLEndpoint, GET_AVAILABLE_JOURNEYS, { first: 200, skip: 0 });
      const deliveries = (response.journeys || []).map((j) =>
        this.mapJourneyToDelivery(j as any),
      );
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
      const response = await graphqlRequest<{
        journeys: JourneyGraphResponse[];
      }>(this.graphQLEndpoint, GET_JOURNEYS_BY_DRIVER, {
        driverAddress: driverWalletAddress.toLowerCase(),
      });
      const deliveries = (response.journeys || []).map((j) =>
        this.mapJourneyToDelivery(j as any),
      );
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
