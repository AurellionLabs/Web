import { BytesLike } from 'ethers';
import { ethers } from 'ethers';
import { handleContractError } from '../utils/error-handler';
import { LocationContract } from '../contracts/LocationContract';

class OrderService {
  private locationContract: LocationContract;
  private signer: ethers.Signer;

  constructor(locationContract: LocationContract, signer: ethers.Signer) {
    this.locationContract = locationContract;
    this.signer = signer;
  }

  async createOrderJourney(
    orderId: BytesLike,
    senderNodeAddress: string,
    receiverAddress: string,
    parcelData: LocationContract.ParcelDataStruct,
    bountyWei: bigint,
    etaTimestamp: bigint,
    tokenQuantity: bigint,
    overrides?: Overrides,
  ): Promise<BytesLike> {
    console.log(
      `[OrderService] Creating journey for order ${orderId} from ${senderNodeAddress} to ${receiverAddress}`,
    );
    try {
      const contract = this.locationContract.connect(this.signer);

      // Assuming bounty approval happens elsewhere or is handled by the caller

      const tx = await contract.orderJourneyCreation(
        orderId,
        senderNodeAddress,
        receiverAddress,
        parcelData,
        bountyWei,
        etaTimestamp,
        tokenQuantity,
        overrides ?? {},
      );

      console.log(`[OrderService] orderJourneyCreation tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(
        `[OrderService] orderJourneyCreation tx confirmed. Status: ${receipt?.status}`,
      );

      if (!receipt || receipt.status !== 1) {
        throw new Error(
          `orderJourneyCreation transaction failed or reverted. Hash: ${tx.hash}`,
        );
      }

      // Parse JourneyCreated event to get the journeyId
      let journeyId: BytesLike = ethers.ZeroHash;
      const eventFragment = contract.interface.getEvent('JourneyCreated');
      if (receipt.logs && eventFragment) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(
              log as unknown as { topics: string[]; data: string },
            );
            if (parsedLog && parsedLog.name === 'JourneyCreated') {
              journeyId = parsedLog.args.journeyId;
              console.log(
                `[OrderService] Found JourneyCreated event, journeyId: ${journeyId}`,
              );
              break;
            }
          } catch (e) {
            // Ignore other logs
          }
        }
      }

      if (journeyId === ethers.ZeroHash) {
        console.warn(
          `[OrderService] Could not find JourneyCreated event in transaction logs for order ${orderId}.`,
        );
        // Consider throwing an error here if a journeyId is strictly required
        // throw new Error('Could not parse JourneyCreated event from transaction receipt');
      }

      return journeyId;
    } catch (error) {
      // Ensure handleContractError exists and is appropriate here
      handleContractError(error, `create order journey for order ${orderId}`);
      throw error;
    }
  }
}

export default OrderService;
