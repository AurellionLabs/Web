import {
  type IDriverRepository,
  type Delivery,
  DeliveryStatus,
  type ParcelData,
  type Location,
} from '@/domain/driver/driver';
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
import {
  LocationContract, // Use LocationContract type
  LocationContract__factory, // Keep factory if needed elsewhere, maybe not here
} from '@/typechain-types';
import { handleContractError } from '@/utils/error-handler';
// Commenting out unused constants
// import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';

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
  private mapContractStatusToDomain(
    contractStatus: bigint | number,
  ): DeliveryStatus {
    // Mapping based on LocationContract enum (Pending, InProgress, Completed, Canceled)
    // and DeliveryStatus enum (PENDING, ACCEPTED, PICKED_UP, COMPLETED, CANCELED)
    const statusNum = Number(contractStatus);
    switch (statusNum) {
      case 0: // Contract: Pending
        return DeliveryStatus.PENDING;
      case 1: // Contract: InProgress (Assuming this maps to Accepted/PickedUp - let's use ACCEPTED for now)
        // TODO: Refine this mapping - how to differentiate ACCEPTED vs PICKED_UP?
        // Does the contract have separate statuses or rely on other flags (e.g., handOn event)?
        return DeliveryStatus.ACCEPTED;
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
  private mapJourneyToDelivery(
    journey: LocationContract.JourneyStructOutput, // Use the output struct type from TypeChain
  ): Delivery {
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
      deliveryETA: Number(journey.ETA), // Using ETA as deliveryETA, clarify if different field exists
      currentStatus: this.mapContractStatusToDomain(journey.currentStatus),
      parcelData: parcelData,
    };
  }

  // --- Implement IDriverRepository methods ---

  async getAvailableDeliveries(): Promise<Delivery[]> {
    console.log('[DriverRepository] Getting available deliveries...');
    const availableDeliveries: Delivery[] = [];
    let index = 0;
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
            availableDeliveries.push(this.mapJourneyToDelivery(journey));
          }
        } catch (journeyError: any) {
          // Log error fetching specific journey but continue iteration
          console.error(
            `[DriverRepository] Failed to fetch journey details for ID ${journeyId}:`,
            journeyError.message,
          );
        }
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

  async getMyDeliveries(driverWalletAddress: string): Promise<Delivery[]> {
    console.log(
      `[DriverRepository] Getting deliveries for driver: ${driverWalletAddress}`,
    );
    const myDeliveries: Delivery[] = [];
    let index = 0;
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
