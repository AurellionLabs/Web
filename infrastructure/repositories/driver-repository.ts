import { type IDriverRepository } from '@/domain/driver/driver';
import { type Journey, type ParcelData } from '@/domain/shared';
// Commenting out unused Node imports
// import type {
//   Node,
//   NodeRepository,
//   TokenizedAsset,
//   AggregateAssetAmount,
//   NodeLocation,
//   AssetType,
// } from '@/domain/node';
// import { Order } from '@/domain/orders'; // Comment out Order import for now

import { BrowserProvider, ethers, type Signer } from 'ethers'; // Added Signer
import { LocationContract } from '@/typechain-types/contracts/AuSys.sol/LocationContract';
import { handleContractError } from '@/utils/error-handler';
// Commenting out unused constants
// import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';

// Define the delay constant at the top of the file
const JOURNEY_FETCH_DELAY_MS = 350;

// Helper function for delay (can be defined here or in a utils file)
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Infrastructure implementation of the IDriverRepository interface
 * This implementation directly interacts with the Ausys (LocationContract) blockchain contracts
 */
// Corrected class name to match export expectation potentially, and implements the right interface
export class DriverRepository implements IDriverRepository {
  private ausysContract: LocationContract;
  private provider: BrowserProvider; // Keep if needed for specific provider calls
  private signer: Signer; // Keep signer if needed

  // Constructor accepting the initialized Ausys contract
  constructor(
    ausysContract: LocationContract,
    provider: BrowserProvider, // Keep provider/signer if potentially needed
    signer: Signer,
  ) {
    if (!ausysContract) {
      throw new Error('DriverRepository: Ausys contract instance is required.');
    }
    this.ausysContract = ausysContract;
    this.provider = provider;
    this.signer = signer;
  }

  // --- Helper to map contract Journey status to domain DeliveryStatus ---
  private mapContractStatusToDomain(contractStatus: bigint | number): bigint {
    return BigInt(contractStatus);
  }

  // --- Helper to map contract Journey struct to domain Delivery model ---
  private mapJourneyToDomain(
    journey: LocationContract.JourneyStructOutput,
  ): Journey {
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
      parcelData,
      journeyId: journey.journeyId,
      currentStatus: this.mapContractStatusToDomain(journey.currentStatus),
      sender: journey.sender,
      receiver: journey.receiver,
      driver: journey.driver,
      journeyStart: journey.journeyStart,
      journeyEnd: journey.journeyEnd,
      bounty: journey.bounty,
      ETA: journey.ETA,
    };
  }

  // --- Implement IDriverRepository methods ---

  async getAvailableDeliveries(): Promise<Journey[]> {
    console.log('[DriverRepository] Getting available deliveries...');
    const availableDeliveries: Journey[] = [];
    let index = 1;
    const MAX_ITERATIONS = 1000; // Safety break for loop

    try {
      while (index < MAX_ITERATIONS) {
        let journeyId: string;
        try {
          // Use numberToJourneyID mapping like in ausys-controller#fetchAllJourneyIds
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
            availableDeliveries.push(this.mapJourneyToDomain(journey));
          }
        } catch (journeyError: any) {
          // Log error fetching specific journey but continue iteration
          console.error(
            `[DriverRepository] Failed to fetch journey details for ID ${journeyId}:`,
            journeyError.message,
          );
        }
        await sleep(JOURNEY_FETCH_DELAY_MS); // Use the constant for delay
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
      throw error; // Rethrow after handling
    }
  }

  async getMyDeliveries(driverWalletAddress: string): Promise<Journey[]> {
    console.log(
      `[DriverRepository] Getting deliveries for driver: ${driverWalletAddress}`,
    );
    const myDeliveries: Journey[] = [];
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
            myDeliveries.push(this.mapJourneyToDomain(journey));
          }
        } catch (journeyError: any) {
          console.error(
            `[DriverRepository] Failed to fetch journey details for ID ${journeyId}:`,
            journeyError.message,
          );
        }
        await sleep(JOURNEY_FETCH_DELAY_MS); // Use the constant for delay
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
      throw error; // Rethrow after handling
    }
  }
} // End of class DriverRepository
