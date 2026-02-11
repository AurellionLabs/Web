// @ts-nocheck - File with outdated contract types
import { IDriverService } from '@/domain/driver/driver';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import type { Ausys as LocationContract } from '@/lib/contracts';
import { handleContractError } from '@/utils/error-handler';
import { ethers } from 'ethers';
import { sendContractTxWithReadEstimation } from '@/infrastructure/shared/tx-helper';

/**
 * Concrete implementation of the IDriverService interface.
 */
export class DriverService implements IDriverService {
  private context: RepositoryContext;
  private ausysContract: LocationContract | null = null;

  constructor(context: RepositoryContext) {
    this.context = context;
    this.ausysContract = this.context.getAusysContract(); // Get contract from context
  }

  private getAusysContractOrThrow(): LocationContract {
    if (!this.ausysContract) {
      throw new Error(
        'Ausys/LocationContract is not initialized in RepositoryContext',
      );
    }
    return this.ausysContract;
  }

  // --- Implementation of IDriverService methods ---

  async acceptDelivery(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = this.context.getSigner();
    const driverAddress = await signer.getAddress();
    console.log(
      `[DriverService] Driver ${driverAddress} accepting delivery for journey ${journeyId}`,
    );
    try {
      // Reference: ausys-controller.ts#assignDriverToJobId
      await sendContractTxWithReadEstimation(
        contract as unknown as ethers.Contract,
        'assignDriverToJourney',
        [driverAddress, journeyId],
        { from: driverAddress },
      );
      console.log(
        `[DriverService] Journey ${journeyId} accepted successfully by ${driverAddress}`,
      );
    } catch (error) {
      handleContractError(error, `accept delivery for journey ${journeyId}`);
      throw error;
    }
  }

  async confirmPickup(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = this.context.getSigner();
    const driverAddress = await signer.getAddress();
    console.log(
      `[DriverService] Driver ${driverAddress} confirming pickup for journey ${journeyId}`,
    );
    try {
      // Reference: ausys-controller.ts#packageHandOn
      // Need to get the customer/sender address first
      const journey = await contract.getJourney(journeyId);
      if (!journey || journey.sender === ethers.ZeroAddress) {
        throw new Error(`Journey ${journeyId} not found or has no sender.`);
      }
      const customerAddress = journey.sender;

      await sendContractTxWithReadEstimation(
        contract as unknown as ethers.Contract,
        'handOn',
        [journeyId],
        { from: driverAddress },
      );
      console.log(
        `[DriverService] Pickup confirmed successfully for journey ${journeyId}`,
      );
    } catch (error) {
      handleContractError(error, `confirm pickup for journey ${journeyId}`);
      throw error;
    }
  }

  async packageSign(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = this.context.getSigner();
    const driverAddress = await signer.getAddress();
    console.log(
      `[DriverService] Driver ${driverAddress} signing package for journey ${journeyId}`,
    );
    try {
      // Reference: ausys-controller.ts#driverPackageSign
      // Need to get the sender address first
      const journey = await contract.getJourney(journeyId);
      if (!journey || journey.sender === ethers.ZeroAddress) {
        throw new Error(`Journey ${journeyId} not found or has no sender.`);
      }
      await sendContractTxWithReadEstimation(
        contract as unknown as ethers.Contract,
        'packageSign',
        [journeyId],
        { from: driverAddress },
      );
      console.log(
        `[DriverService] Package signed successfully for journey ${journeyId} by driver ${driverAddress}`,
      );
    } catch (error) {
      handleContractError(error, `package sign for journey ${journeyId}`);
      throw error;
    }
  }

  async completeDelivery(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = this.context.getSigner();
    const driverAddress = await signer.getAddress();
    // Default token address - adjust if a different default or lookup logic is needed
    const tokenAddress = ethers.ZeroAddress;
    console.log(
      `[DriverService] Driver ${driverAddress} completing delivery for journey ${journeyId}`,
    );
    try {
      // Reference: ausys-controller.ts#packageHandOff
      // Need to get the receiver address first
      const journey = await contract.getJourney(journeyId);
      if (!journey || journey.receiver === ethers.ZeroAddress) {
        throw new Error(`Journey ${journeyId} not found or has no receiver.`);
      }
      await sendContractTxWithReadEstimation(
        contract as unknown as ethers.Contract,
        'handOff',
        [journeyId],
        { from: driverAddress },
      );
      console.log(
        `[DriverService] Delivery completed successfully for journey ${journeyId}`,
      );
    } catch (error) {
      handleContractError(error, `complete delivery for journey ${journeyId}`);
      throw error;
    }
  }
}
