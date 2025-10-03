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

// Define the delay constant at the top of the file
const JOURNEY_FETCH_DELAY_MS = 350;

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  constructor(ausysContract: Ausys, provider: BrowserProvider, signer: Signer) {
    if (!ausysContract) {
      throw new Error('DriverRepository: Ausys contract instance is required.');
    }
    this.ausysContract = ausysContract;
    this.provider = provider;
    this.signer = signer;
  }

  // --- Helper to map contract Journey status to domain DeliveryStatus ---
  // DEV VERSION: Better mapping with driver awareness
  private mapContractStatusToDomain(
    contractStatus: bigint | number,
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

  // --- Helper to map contract Journey struct to domain Delivery model ---
  // DEV VERSION: Maps to user-friendly Delivery model
  private mapJourneyToDelivery(journey: Ausys.JourneyStructOutput): Delivery {
    const parcelData: ParcelData = {
      startLocation: {
        lat: journey.parcelData.startLocation.lat,
        lng: journey.parcelData.startLocation.lng,
      },
      endLocation: {
        lat: journey.parcelData.endLocation.lat,
        lng: journey.parcelData.endLocation.lng,
      },
      startName: journey.parcelData.startName,
      endName: journey.parcelData.endName,
    };

    return {
      jobId: journey.journeyId,
      customer: journey.sender, // Assuming sender is the customer placing the delivery
      fee: Number(ethers.formatEther(journey.bounty)), // Convert bounty (BigInt wei) to number (Ether)
      ETA: Number(journey.ETA), // Convert BigInt timestamp to number
      deliveryETA: Number(journey.ETA), // Using ETA as deliveryETA
      currentStatus: this.mapContractStatusToDomain(
        journey.currentStatus,
        journey.driver,
      ),
      parcelData: parcelData,
    };
  }

  // --- Implement IDriverRepository methods ---

  async getAvailableDeliveries(): Promise<Delivery[]> {
    console.log('[DriverRepository] Getting available deliveries...');
    const availableDeliveries: Delivery[] = [];
    let index = 1;
    const MAX_ITERATIONS = 1000; // Safety break for loop

    try {
      while (index < MAX_ITERATIONS) {
        let journeyId: string;
        try {
          // Use numberToJourneyID mapping
          journeyId = await this.ausysContract.numberToJourneyID(index);
          // Check for zero address or empty bytes32 indicating end of list
          if (
            !journeyId ||
            journeyId === ethers.ZeroHash ||
            journeyId === ethers.ZeroAddress
          ) {
            console.log(
              `[DriverRepository] End of journey list reached at index ${index}.`,
            );
            break;
          }
        } catch (error: any) {
          // Error fetching ID likely means end of list
          console.log(
            `[DriverRepository] Error fetching journey ID at index ${index} (likely end):`,
            error.message,
          );
          break;
        }

        try {
          const journey = await this.ausysContract.getjourney(journeyId);

          console.log(
            `[DriverRepository] Processing Journey ID: ${journeyId}`,
            {
              status: Number(journey.currentStatus),
              driver: journey.driver,
              isPending: Number(journey.currentStatus) === 0,
              isDriverZero: journey.driver === ethers.ZeroAddress,
            },
          );

          // Filter for available: Pending status and no driver assigned
          if (
            Number(journey.currentStatus) === 0 && // Status.Pending
            journey.driver === ethers.ZeroAddress
          ) {
            availableDeliveries.push(this.mapJourneyToDelivery(journey));
          }
        } catch (journeyError: any) {
          // Log error fetching specific journey but continue iteration
          console.error(
            `[DriverRepository] Failed to fetch journey details for ID ${journeyId}:`,
            journeyError.message,
          );
        }
        await sleep(JOURNEY_FETCH_DELAY_MS);
        index++;
      }
      if (index >= MAX_ITERATIONS) {
        console.warn(
          '[DriverRepository] Reached MAX_ITERATIONS limit while fetching available deliveries.',
        );
      }
      console.log(
        `[DriverRepository] Found ${availableDeliveries.length} available deliveries.`,
      );
      return availableDeliveries;
    } catch (error) {
      handleContractError(error, 'get available deliveries');
      throw error;
    }
  }

  async getMyDeliveries(driverWalletAddress: string): Promise<Delivery[]> {
    console.log(
      `[DriverRepository] Getting deliveries for driver: ${driverWalletAddress}`,
    );
    const myDeliveries: Delivery[] = [];
    let index = 1;
    const MAX_ITERATIONS = 1000; // Safety break

    if (!driverWalletAddress) {
      console.error(
        '[DriverRepository] driverWalletAddress is required for getMyDeliveries',
      );
      return [];
    }

    try {
      while (index < MAX_ITERATIONS) {
        let journeyId: string;
        try {
          journeyId = await this.ausysContract.numberToJourneyID(index);
          if (
            !journeyId ||
            journeyId === ethers.ZeroHash ||
            journeyId === ethers.ZeroAddress
          ) {
            console.log(
              `[DriverRepository] End of journey list reached at index ${index}.`,
            );
            break;
          }
        } catch (error: any) {
          console.log(
            `[DriverRepository] Error fetching journey ID at index ${index} (likely end):`,
            error.message,
          );
          break;
        }

        try {
          const journey = await this.ausysContract.getjourney(journeyId);
          // Filter: Check if the driver address matches
          if (
            journey.driver.toLowerCase() === driverWalletAddress.toLowerCase()
          ) {
            myDeliveries.push(this.mapJourneyToDelivery(journey));
          }
        } catch (journeyError: any) {
          console.error(
            `[DriverRepository] Failed to fetch journey details for ID ${journeyId}:`,
            journeyError.message,
          );
        }
        await sleep(JOURNEY_FETCH_DELAY_MS);
        index++;
      }
      if (index >= MAX_ITERATIONS) {
        console.warn(
          '[DriverRepository] Reached MAX_ITERATIONS limit while fetching driver deliveries.',
        );
      }
      console.log(
        `[DriverRepository] Found ${myDeliveries.length} deliveries for driver ${driverWalletAddress}.`,
      );
      return myDeliveries;
    } catch (error) {
      handleContractError(
        error,
        `get deliveries for driver ${driverWalletAddress}`,
      );
      throw error;
    }
  }
}
