import { IDriverService } from '@/domain/driver/driver';
import type { Ausys as LocationContract } from '@/lib/contracts';
import { handleContractError } from '@/utils/error-handler';
import { ethers } from 'ethers';
import { sendContractTxWithReadEstimation } from '@/infrastructure/shared/tx-helper';
import { getDiamondContract, getDiamondSigner } from '@/infrastructure/diamond';

/**
 * Concrete implementation of the IDriverService interface.
 */
export class DriverService implements IDriverService {
  private ausysContract: LocationContract | null = null;

  constructor(contract?: LocationContract) {
    this.ausysContract = contract ?? null;
  }

  private getAusysContractOrThrow(): LocationContract {
    if (!this.ausysContract) {
      this.ausysContract = getDiamondContract() as any;
    }
    if (!this.ausysContract) {
      throw new Error('Diamond AuSys contract is not initialized');
    }
    return this.ausysContract;
  }

  // --- Implementation of IDriverService methods ---

  async acceptDelivery(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = getDiamondSigner();
    const driverAddress = await signer.getAddress();
    try {
      await sendContractTxWithReadEstimation(
        contract as unknown as ethers.Contract,
        'assignDriverToJourney',
        [driverAddress, journeyId],
        { from: driverAddress },
      );
    } catch (error) {
      handleContractError(error, `accept delivery for journey ${journeyId}`);
      throw error;
    }
  }

  async confirmPickup(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = getDiamondSigner();
    const driverAddress = await signer.getAddress();
    try {
      // Need to get the customer/sender address first
      const journey = await contract.getJourney(journeyId);
      if (!journey || journey.sender === ethers.ZeroAddress) {
        throw new Error(`Journey ${journeyId} not found or has no sender.`);
      }
      await sendContractTxWithReadEstimation(
        contract as unknown as ethers.Contract,
        'handOn',
        [journeyId],
        { from: driverAddress },
      );
    } catch (error) {
      handleContractError(error, `confirm pickup for journey ${journeyId}`);
      throw error;
    }
  }

  async packageSign(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = getDiamondSigner();
    const driverAddress = await signer.getAddress();
    try {
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
    } catch (error) {
      handleContractError(error, `package sign for journey ${journeyId}`);
      throw error;
    }
  }

  async completeDelivery(journeyId: string): Promise<void> {
    const contract = this.getAusysContractOrThrow();
    const signer = getDiamondSigner();
    const driverAddress = await signer.getAddress();
    try {
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
    } catch (error) {
      handleContractError(error, `complete delivery for journey ${journeyId}`);
      throw error;
    }
  }
}
