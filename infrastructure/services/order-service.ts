import type { IOrderService, Order as DomainOrder } from '@/domain/orders/order';
import type { Ausys } from '@/typechain-types/contracts/AuSys.sol/Ausys';
import {
  BytesLike,
  ContractTransactionReceipt,
  Signer,
  ethers,
  BigNumberish,
} from 'ethers';
import { handleContractError } from '@/utils/error-handler';

/**
 * Implements domain service operations for orders by interacting directly with the blockchain contract.
 * REFACTOR NOTE: Updated to use Ausys contract with proper domain-to-contract mapping
 */
export class OrderService implements IOrderService {
  private contract: Ausys;
  private currentSigner: Signer;

  constructor(contractInstance: Ausys, initialSigner: Signer) {
    if (!contractInstance || !initialSigner) {
      throw new Error(
        'OrderService requires a contract instance and an initial signer.',
      );
    }
    this.contract = contractInstance;
    this.currentSigner = initialSigner;
    initialSigner
      .getAddress()
      .then((addr) => {
        console.log(
          `[OrderService] Initialized with contract at ${contractInstance.target} and signer ${addr}`,
        );
      })
      .catch((err) => {
        console.error(
          '[OrderService] Failed to get initial signer address during initialization:',
          err,
        );
      });
  }

  /**
   * Updates the signer used for subsequent contract interactions.
   * @param newSigner The new ethers Signer to use.
   */
  public async setSigner(newSigner: Signer): Promise<void> {
    if (!newSigner || !newSigner.provider) {
      throw new Error('Invalid signer or signer missing provider.');
    }
    this.currentSigner = newSigner;
    const addr = await newSigner.getAddress();
    console.log(`[OrderService] Signer updated to: ${addr}`);
  }

  /**
   * Gets the address of the currently configured signer.
   */
  public async getCurrentSignerAddress(): Promise<string> {
    return this.currentSigner.getAddress();
  }

  /**
   * Creates a new job (journey) via the contract.
   * Requires bounty and ETA to be provided.
   */
  async jobCreation(
    parcelData: Ausys.ParcelDataStruct,
    recipientWalletAddress: string,
    senderWalletAddress: string,
    bounty: BigNumberish,
    eta: BigNumberish,
  ): Promise<ContractTransactionReceipt> {
    const connectedSignerAddress = await this.getCurrentSignerAddress();
    const effectiveSender = senderWalletAddress ?? connectedSignerAddress;

    console.log(
      `[OrderService] Creating job from ${effectiveSender} to ${recipientWalletAddress}`,
    );

    if (bounty === undefined || eta === undefined) {
      throw new Error(
        'Bounty and ETA (in Wei and Unix timestamp respectively) are required for job creation',
      );
    }

    if (
      effectiveSender.toLowerCase() !== connectedSignerAddress.toLowerCase()
    ) {
      console.warn(
        `[OrderService] Provided senderWalletAddress ${effectiveSender} differs from connected signer ${connectedSignerAddress}. Transaction will be sent by connected signer.`,
      );
    }

    try {
      const contractWithSigner = this.contract.connect(this.currentSigner);

      const tx = await contractWithSigner.journeyCreation(
        connectedSignerAddress,
        recipientWalletAddress,
        parcelData,
        bounty,
        eta,
      );
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Job creation transaction failed to return a receipt.');
      }
      console.log(
        `[OrderService] Job created successfully, tx: ${receipt.hash}`,
      );
      return receipt;
    } catch (error) {
      handleContractError(error, 'job creation service');
      throw error;
    }
  }

  /**
   * Allows the connected user (customer/receiver) to sign for a package.
   */
  async customerSignPackage(
    journeyId: string,
  ): Promise<ContractTransactionReceipt> {
    const signerAddress = await this.getCurrentSignerAddress();
    console.log(
      `[OrderService] Signer ${signerAddress} attempting to sign for package on journey: ${journeyId}`,
    );
    try {
      const contractWithSigner = this.contract.connect(this.currentSigner);

      // Fetch journey details to verify receiver
      const journey = await contractWithSigner.getjourney(journeyId);

      if (journey.receiver.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error(
          'Only the designated receiver can sign for the package.',
        );
      }
      if (journey.driver === ethers.ZeroAddress) {
        console.warn(
          `[OrderService] Attempting to sign journey ${journeyId} which has no driver assigned yet.`,
        );
      }

      // packageSign only takes the journey ID - signatures are tracked by msg.sender
      const tx = await contractWithSigner.packageSign(journeyId);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error(
          'Customer sign package transaction failed to return a receipt.',
        );
      }
      console.log(
        `[OrderService] Customer package sign successful, tx: ${receipt.hash}`,
      );
      return receipt;
    } catch (error) {
      handleContractError(error, 'customer sign package service');
      throw error;
    }
  }

  /**
   * Creates a new order via the contract.
   * The connected signer is assumed to be the buyer/customer.
   * REFACTOR NOTE: Maps domain Order to contract OrderStruct
   */
  async createOrder(
    orderData: DomainOrder,
  ): Promise<string> {
    const signerAddress = await this.getCurrentSignerAddress();
    console.log(
      `[OrderService] Signer ${signerAddress} creating order for buyer: ${orderData.buyer}`,
    );

    // Normalize addresses for comparison
    const normalizedCustomerAddress = ethers.getAddress(
      String(orderData.buyer),
    );

    // Ensure the signer submitting the order IS the customer listed in the order data
    if (
      signerAddress.toLowerCase() !== normalizedCustomerAddress.toLowerCase()
    ) {
      throw new Error(
        `Connected signer (${signerAddress}) does not match order customer address (${normalizedCustomerAddress}).`,
      );
    }

    try {
      const contractWithSigner = this.contract.connect(this.currentSigner);

      // Map domain Order -> contract OrderStruct
      const parcelData: Ausys.ParcelDataStruct = {
        startLocation: {
          lat: orderData.locationData.startLocation.lat,
          lng: orderData.locationData.startLocation.lng,
        },
        endLocation: {
          lat: orderData.locationData.endLocation.lat,
          lng: orderData.locationData.endLocation.lng,
        },
        startName: orderData.locationData.startName,
        endName: orderData.locationData.endName,
      };

      const contractOrder: Ausys.OrderStruct = {
        id: ethers.ZeroHash,
        token: orderData.token,
        tokenId: orderData.tokenId,
        tokenQuantity: orderData.tokenQuantity,
        price: orderData.price,
        txFee: 0n,
        buyer: normalizedCustomerAddress, // domain buyer -> contract buyer
        seller: orderData.seller,
        journeyIds: [] as BytesLike[],
        nodes: orderData.nodes,
        locationData: parcelData,
        currentStatus: 0, // Pending
        contractualAgreement: ethers.ZeroHash,
      };

      // Call the contract's orderCreation with mapped struct
      const tx = await contractWithSigner.orderCreation(contractOrder);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error(
          'Order creation transaction failed to return a receipt.',
        );
      }
      if (receipt.status !== 1) {
        console.error('Order creation transaction reverted. Receipt:', receipt);
        throw new Error(
          `Order creation transaction failed. Hash: ${receipt.hash}`,
        );
      }
      console.log(
        '[OrderService] Order created successfully, tx: ',
        receipt.hash,
      );

      // Parse event to get orderId
      console.log(
        '[OrderService] Raw receipt logs:',
        JSON.stringify(receipt.logs, null, 2),
      );
      let createdOrderId: string = String(ethers.ZeroHash);
      const eventFragment = this.contract.interface.getEvent('OrderCreated');
      if (receipt.logs && eventFragment) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.contract.interface.parseLog(
              log as unknown as { topics: string[]; data: string },
            );
            if (parsedLog && parsedLog.name === 'OrderCreated') {
              createdOrderId = String(parsedLog.args.orderId);
              console.log(
                `[OrderService] Found OrderCreated event, orderId: ${createdOrderId}`,
              );
              break;
            }
          } catch (e) {
            /* Ignore logs that don't match */
          }
        }
      }

      if (createdOrderId === ethers.ZeroHash) {
        console.error(
          'Could not find OrderCreated event in transaction logs',
          receipt.logs,
        );
        throw new Error(
          'Failed to parse OrderCreated event from transaction receipt.',
        );
      }

      return createdOrderId;
    } catch (error) {
      console.error('Error in create order service:', error);
      handleContractError(error, 'create order');
      throw error;
    }
  }

  /**
   * Adds a receiver to an existing order via the contract.
   * NOTE: This method may not be implemented in the current contract version.
   * Keeping as a placeholder for future implementation.
   */
  async addReceiverToOrder(
    orderId: BytesLike,
    receiver: string,
    sender?: string,
  ): Promise<ContractTransactionReceipt> {
    console.warn('[OrderService] addReceiverToOrder is not currently supported in the Ausys contract');
    throw new Error('addReceiverToOrder is not implemented in the current contract version');
  }

  /**
   * Creates a journey for an order
   */
  async createOrderJourney(
    orderId: BytesLike,
    senderNodeAddress: string,
    receiverAddress: string,
    parcelData: Ausys.ParcelDataStruct,
    bountyWei: bigint,
    etaTimestamp: bigint,
    tokenQuantity: bigint,
    assetId: bigint,
  ): Promise<string> {
    console.log(
      `[OrderService] Creating journey for order ${orderId} from ${senderNodeAddress} to ${receiverAddress}`,
    );
    try {
      const contract = this.contract.connect(this.currentSigner);

      const tx = await contract.orderJourneyCreation(
        orderId,
        senderNodeAddress,
        receiverAddress,
        parcelData,
        bountyWei,
        etaTimestamp,
        tokenQuantity,
        assetId,
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
      let journeyId: string = String(ethers.ZeroHash);
      const eventFragment = contract.interface.getEvent('JourneyCreated');
      if (receipt.logs && eventFragment) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(
              log as unknown as { topics: string[]; data: string },
            );
            if (parsedLog && parsedLog.name === 'JourneyCreated') {
              journeyId = String(parsedLog.args.journeyId);
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

      if (journeyId === String(ethers.ZeroHash)) {
        console.warn(
          `[OrderService] Could not find JourneyCreated event in transaction logs for order ${orderId}.`,
        );
      }

      return journeyId;
    } catch (error) {
      handleContractError(error, `create order journey for order ${orderId}`);
      throw error;
    }
  }
}