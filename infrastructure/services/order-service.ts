import type { IOrderService } from '@/domain/orders/order';
import type { LocationContract } from '@/typechain-types';
import {
  BytesLike,
  ContractTransactionReceipt,
  Overrides,
  Signer,
  ethers,
  BigNumberish,
} from 'ethers';
import { handleContractError } from '@/utils/error-handler';

/**
 * Implements domain service operations for orders by interacting directly with the blockchain contract.
 */
export class OrderService implements IOrderService {
  private contract: LocationContract;
  private currentSigner: Signer;

  constructor(contractInstance: LocationContract, initialSigner: Signer) {
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
    parcelData: LocationContract.ParcelDataStruct,
    recipientWalletAddress: string,
    senderWalletAddress?: string, // Optional override, primarily uses currentSigner
    bounty?: BigNumberish,
    eta?: BigNumberish,
    overrides?: Overrides,
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
      // Potentially throw an error here if strict sender control is needed
      // throw new Error("Sender address mismatch");
    }

    try {
      // Connect the current signer to the contract instance for this call
      const contractWithSigner = this.contract.connect(this.currentSigner);

      // Caller (using the service) must ensure allowance is set beforehand
      // await auraToken.connect(this.currentSigner).approve(this.contract.target, bounty); // This should happen *before* calling the service

      const tx = await contractWithSigner.journeyCreation(
        connectedSignerAddress, // Use the actual signer's address as sender
        recipientWalletAddress,
        parcelData,
        bounty,
        eta,
        { ...overrides },
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
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt> {
    const signerAddress = await this.getCurrentSignerAddress();
    console.log(
      `[OrderService] Signer ${signerAddress} attempting to sign for package on journey: ${journeyId}`,
    );
    try {
      const contractWithSigner = this.contract.connect(this.currentSigner);

      // Fetch journey details to verify receiver and get driver address
      const journey = await contractWithSigner.journeyIdToJourney(journeyId);

      if (journey.receiver.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error(
          'Only the designated receiver can sign for the package.',
        );
      }
      if (journey.driver === ethers.ZeroAddress) {
        // This might depend on exact state flow - can signing happen before driver assigned?
        console.warn(
          `[OrderService] Attempting to sign journey ${journeyId} which has no driver assigned yet.`,
        );
        // Potentially throw: throw new Error('Cannot sign package before a driver is assigned.');
      }

      // Call packageSign - assuming sender is the receiver, driver is journey.driver
      const tx = await contractWithSigner.packageSign(
        journey.driver, // driver
        signerAddress, // sender (in this context, the receiver signing)
        journeyId,
        { ...overrides },
      );
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
   * The connected signer is assumed to be the customer.
   */
  async createOrder(
    orderData: LocationContract.OrderStruct,
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt> {
    const signerAddress = await this.getCurrentSignerAddress();
    console.log(
      `[OrderService] Signer ${signerAddress} creating order for customer: ${orderData.customer}`,
    );

    // Normalize addresses for comparison
    const normalizedCustomerAddress = ethers.getAddress(
      String(orderData.customer),
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
      // Call the contract's orderCreation function directly
      const tx = await contractWithSigner.orderCreation(orderData, {
        ...overrides,
      });
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error(
          'Order creation transaction failed to return a receipt.',
        );
      }
      console.log('[OrderService] Order created successfully', receipt.hash);
      return receipt;
    } catch (error) {
      console.error('Error in create order service:', error);
      handleContractError(error, 'create order');
      throw error; // Re-throw error after handling
    }
  }

  /**
   * Adds a receiver to an existing order via the contract.
   * The connected signer is assumed to be the sender initiating the change.
   */
  async addReceiverToOrder(
    orderId: BytesLike,
    receiver: string,
    sender?: string, // Optional override, but TX will use connected signer
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt> {
    const signerAddress = await this.getCurrentSignerAddress();
    const effectiveSender = sender ?? signerAddress;

    console.log(
      `[OrderService] Signer ${signerAddress} adding receiver ${receiver} to order ${orderId}. Effective sender: ${effectiveSender}`,
    );

    if (sender && sender.toLowerCase() !== signerAddress.toLowerCase()) {
      console.warn(
        `[OrderService] Provided sender ${sender} differs from connected signer ${signerAddress}. Transaction will be sent by connected signer.`,
      );
    }

    try {
      const contractWithSigner = this.contract.connect(this.currentSigner);
      // Call the contract's addReceiver function
      const tx = await contractWithSigner.addReceiver(
        orderId,
        receiver,
        signerAddress,
        { ...overrides },
      ); // Pass signerAddress as the sender
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Add receiver transaction failed to return a receipt.');
      }
      console.log(
        `[OrderService] Add receiver successful, tx: ${receipt.hash}`,
      );
      return receipt;
    } catch (error) {
      handleContractError(error, 'add receiver to order service');
      throw error;
    }
  }
}
