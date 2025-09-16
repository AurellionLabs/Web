import {
  type IOrderRepository,
  // type OrderStatus, // Keep commented if not used for mapping
  Order, // Import Attribute type
} from '@/domain/orders/order';
import { LocationContract, LocationContract__factory } from '@/typechain-types';
import {
  type BrowserProvider,
  type Signer,
  ethers,
  type BytesLike,
  Provider,
  // type ContractTransactionReceipt, // Not needed in repo
  // type AddressLike, // Already inferred for addresses
} from 'ethers';
import { handleContractError } from '@/utils/error-handler'; // Adjust path if necessary
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { Journey } from '@/domain/shared';

/**
 * Infrastructure implementation of the IOrderRepository interface.
 * Interacts with the LocationContract (AuSys) blockchain contract.
 * Uses dedicated RPC for read operations and user's signer for write operations.
 */
export class OrderRepository implements IOrderRepository {
  private readContract: LocationContract;
  private writeContract: LocationContract;
  private userProvider: BrowserProvider;
  private readProvider: Provider;
  private signer: Signer;
  private contractAddress: string;
  private isInitialized = false;

  constructor(
    contract: LocationContract,
    userProvider: BrowserProvider,
    signer: Signer,
  ) {
    if (!contract) {
      throw new Error(
        'OrderRepository: LocationContract instance is required.',
      );
    }
    this.writeContract = contract;
    this.userProvider = userProvider;
    this.signer = signer;
    this.contractAddress = contract.target as string;

    // Initialize with user provider as fallback
    this.readProvider = userProvider;
    this.readContract = contract;

    // Asynchronously initialize read provider using dedicated RPC
    this.initializeReadProvider();
  }

  private async initializeReadProvider(): Promise<void> {
    try {
      const chainId = await RpcProviderFactory.getChainId(this.userProvider);
      this.readProvider = RpcProviderFactory.getReadOnlyProvider(chainId);

      // Read contract uses dedicated RPC provider
      this.readContract = LocationContract__factory.connect(
        this.contractAddress,
        this.readProvider,
      );
      this.isInitialized = true;

      console.log(
        `[OrderRepository] Initialized with dedicated RPC for chain ${chainId}`,
      );
    } catch (error) {
      console.warn(
        '[OrderRepository] Failed to initialize read provider, using user provider:',
        error,
      );
      // Already initialized with user provider as fallback
      this.isInitialized = true;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeReadProvider();
    }
  }

  /**
   * Helper to get the wallet address from the current signer.
   */
  private async _getWalletAddress(): Promise<string> {
    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Error getting wallet address from signer:', error);
      throw new Error('Could not get wallet address. Is the wallet connected?');
    }
  }

  // --- IOrderRepository Implementation ---

  async getNodeOrders(address: string): Promise<Order[]> {
    console.log(`[OrderRepository] Getting orders for node: ${address}`);
    const orders: Order[] = [];
    try {
      let index = 0;
      const MAX_NODE_ORDERS = 100; // Safety limit
      while (index < MAX_NODE_ORDERS) {
        let orderId: BytesLike;
        try {
          // Use the explicit getter instead of direct mapping access
          orderId = await this.readContract.getNodeOrderIdByIndex(
            address,
            index,
          );
          console.log(`[OrderRepository] Order ID>>: ${orderId}`);
          if (!orderId || orderId === ethers.ZeroHash) {
            console.log(
              `[OrderRepository] End of order list for node ${address} at index ${index}`,
            );
            break; // Assume end of list if ZeroHash
          }
        } catch (error: any) {
          console.log(
            `[OrderRepository] Error fetching order ID for node ${address} at index ${index} (likely end):`,
            error.message,
          );
          break; // Assume end of list on error
        }

        try {
          const contractOrder = await this.readContract.getOrder(orderId);
          // Ensure order has a valid ID before adding
          if (contractOrder && contractOrder[0] !== ethers.ZeroHash) {
            // Map contract result to Order domain object
            const order: Order = {
              id: contractOrder.id,
              token: contractOrder.token,
              tokenId: contractOrder.tokenId,
              tokenQuantity: contractOrder.tokenQuantity,
              requestedTokenQuantity: contractOrder.requestedTokenQuantity,
              price: contractOrder.price,
              txFee: contractOrder.txFee,
              customer: contractOrder.customer,
              journeyIds: contractOrder.journeyIds,
              nodes: contractOrder.nodes,
              locationData: contractOrder.locationData,
              currentStatus: contractOrder.currentStatus,
              contracatualAgreement: contractOrder.contracatualAgreement,
            };
            console.log('[OrderRepository] Order>>>>>:', order);
            orders.push(order);
          } else {
            // console.warn(`[OrderRepository] Node ${address} linked to invalid order ID ${orderId} at index ${index}`);
          }
        } catch (orderError: any) {
          console.error(
            `[OrderRepository] Failed to fetch order details for ID ${orderId} linked to node ${address}:`,
            orderError.message,
          );
          // Decide whether to continue or break on single order fetch failure
        }
        index++;
      }
      // if (index >= MAX_NODE_ORDERS) {
      //     console.warn(`[OrderRepository] Reached MAX_NODE_ORDERS limit for node ${address}.`);
      // }
    } catch (error) {
      handleContractError(error, `get orders for node ${address}`);
      throw error; // Re-throw after handling
    }
    console.log(
      `[OrderRepository] Found ${orders.length} orders for node ${address}.`,
      orders,
    );

    console.log(`[OrderRepository] Found orders.`, orders);
    return orders;
  }

  async getCustomerJourneys(address?: string): Promise<Journey[]> {
    const customerAddress = address ?? (await this._getWalletAddress());
    console.log(
      `[OrderRepository] Getting journeys for customer: ${customerAddress}`,
    );
    const journeys: LocationContract.JourneyStructOutput[] = [];
    try {
      const journeyCount =
        await this.readContract.numberOfJourneysCreatedForCustomer(
          customerAddress,
        );
      // console.log(`[OrderRepository] Customer ${customerAddress} has ${journeyCount} journeys.`);

      for (let i = 0; i < journeyCount; i++) {
        let journeyId: BytesLike;
        try {
          journeyId = await this.readContract.customerToJourneyId(
            customerAddress,
            i,
          );
          if (!journeyId || journeyId === ethers.ZeroHash) {
            // console.warn(`[OrderRepository] Found zero hash journey ID for customer ${customerAddress} at index ${i}`);
            continue; // Skip this one
          }
        } catch (idError: any) {
          console.error(
            `[OrderRepository] Error fetching journey ID for customer ${customerAddress} at index ${i}:`,
            idError.message,
          );
          continue; // Skip if ID fetch fails
        }

        try {
          const journey = await this.readContract.journeyIdToJourney(journeyId);
          // Basic validation
          if (journey && journey.journeyId !== ethers.ZeroHash) {
            journeys.push(journey);
          } else {
            // console.warn(`[OrderRepository] Invalid journey data returned for ID ${journeyId} (customer ${customerAddress})`);
          }
        } catch (journeyError: any) {
          console.error(
            `[OrderRepository] Failed to fetch journey details for ID ${journeyId} (customer ${customerAddress}):`,
            journeyError.message,
          );
          // Decide whether to continue or break
        }
      }
    } catch (error) {
      handleContractError(
        error,
        `get journeys for customer ${customerAddress}`,
      );
      throw error;
    }
    // console.log(`[OrderRepository] Found ${journeys.length} journeys for customer ${customerAddress}.`);
    return journeys;
  }

  async getReceiverJourneys(address?: string): Promise<Journey[]> {
    const receiverAddress = address ?? (await this._getWalletAddress());
    console.log(
      `[OrderRepository] Getting journeys for receiver: ${receiverAddress}`,
    );
    const journeys: LocationContract.JourneyStructOutput[] = [];
    try {
      const journeyCount =
        await this.readContract.numberOfJourneysCreatedForReceiver(
          receiverAddress,
        );
      // console.log(`[OrderRepository] Receiver ${receiverAddress} has ${journeyCount} journeys.`);

      for (let i = 0; i < journeyCount; i++) {
        let journeyId: BytesLike;
        try {
          journeyId = await this.readContract.receiverToJourneyId(
            receiverAddress,
            i,
          );
          if (!journeyId || journeyId === ethers.ZeroHash) {
            // console.warn(`[OrderRepository] Found zero hash journey ID for receiver ${receiverAddress} at index ${i}`);
            continue;
          }
        } catch (idError: any) {
          console.error(
            `[OrderRepository] Error fetching journey ID for receiver ${receiverAddress} at index ${i}:`,
            idError.message,
          );
          continue;
        }

        try {
          const journey = await this.readContract.journeyIdToJourney(journeyId);
          if (journey && journey.journeyId !== ethers.ZeroHash) {
            journeys.push(journey);
          } else {
            // console.warn(`[OrderRepository] Invalid journey data returned for ID ${journeyId} (receiver ${receiverAddress})`);
          }
        } catch (journeyError: any) {
          console.error(
            `[OrderRepository] Failed to fetch journey details for ID ${journeyId} (receiver ${receiverAddress}):`,
            journeyError.message,
          );
        }
      }
    } catch (error) {
      handleContractError(
        error,
        `get journeys for receiver ${receiverAddress}`,
      );
      throw error;
    }
    // console.log(`[OrderRepository] Found ${journeys.length} journeys for receiver ${receiverAddress}.`);
    return journeys;
  }

  async fetchAllJourneys(): Promise<Journey[]> {
    console.log(`[OrderRepository] Fetching all journeys...`);
    const allJourneys: LocationContract.JourneyStructOutput[] = [];
    try {
      let index = 1;
      const MAX_JOURNEYS = 1000; // Safety break
      while (index < MAX_JOURNEYS) {
        let journeyId: BytesLike;
        try {
          // Assuming numberToJourneyID mapping exists and holds the counter
          journeyId = await this.readContract.numberToJourneyID(index);
          console.log(
            `[OrderRepository] fetchAllJourneys loop index ${index}, raw journeyId:`,
            journeyId,
          );
          if (!journeyId || journeyId === ethers.ZeroHash) {
            console.log(
              `[OrderRepository] End of global journey list reached at index ${index}.`,
            );
            break;
          }
        } catch (error: any) {
          console.log(
            `[OrderRepository] Error fetching journey ID at global index ${index} (likely end):`,
            error.message,
          );
          break;
        }

        try {
          const journey = await this.readContract.journeyIdToJourney(journeyId);
          console.log(
            `[OrderRepository] fetchAllJourneys loop index ${index}, fetched journey sender:`,
            journey.sender,
          );
          // Add validation similar to ausys-controller if needed
          if (
            journey &&
            journey.journeyId !== ethers.ZeroHash &&
            journey.parcelData?.startLocation &&
            journey.parcelData?.endLocation
          ) {
            allJourneys.push(journey);
          } else {
            console.warn(
              `[OrderRepository] Skipping invalid or incomplete journey data for ID ${journeyId} at global index ${index}`,
            );
          }
        } catch (journeyError: any) {
          console.error(
            `[OrderRepository] Failed to fetch journey details for ID ${journeyId} at global index ${index}:`,
            journeyError.message,
          );
        }
        index++;
      }
      // if (index >= MAX_JOURNEYS) {
      //      console.warn(`[OrderRepository] Reached MAX_JOURNEYS limit while fetching all journeys.`);
      // }
    } catch (error) {
      handleContractError(error, `fetch all journeys`);
      throw error;
    }
    console.log(
      `[OrderRepository] Found ${allJourneys.length} total journeys.`,
    );
    return allJourneys;
  }

  async getJourneyById(
    journeyId: BytesLike,
  ): Promise<LocationContract.JourneyStructOutput> {
    // console.log(`[OrderRepository] Getting journey by ID: ${journeyId}`);
    try {
      // The contract has getjourney(bytes32) and journeyIdToJourney(bytes32 => Journey)
      // Use the mapping directly as it's simpler
      const journey = await this.readContract.journeyIdToJourney(journeyId);
      if (!journey || journey.journeyId === ethers.ZeroHash) {
        // Match error message used in tests
        throw new Error(
          `Journey with ID ${journeyId} not found or is invalid.`,
        );
      }
      return journey;
    } catch (error) {
      // Re-throw specific not found error, handle others
      if (
        error instanceof Error &&
        error.message.includes('not found or is invalid')
      ) {
        throw error;
      }
      handleContractError(error, `get journey by ID ${journeyId}`);
      throw error; // Ensure other errors are thrown after handling
    }
  }

  async getOrderIdByJourneyId(journeyId: BytesLike): Promise<BytesLike> {
    // console.log(`[OrderRepository] Getting order ID for journey ID: ${journeyId}`);
    try {
      const orderId = await this.readContract.journeyToOrderId(journeyId);
      // Contract returns bytes32, which might be ZeroHash if not linked
      return orderId;
    } catch (error) {
      handleContractError(error, `get order ID for journey ${journeyId}`);
      throw error;
    }
  }

  async getCustomerOrders(address: string): Promise<Order[]> {
    const customerAddress = address;
    console.log(
      `[OrderRepository] Getting orders for customer: ${customerAddress}`,
    );
    const orders: LocationContract.OrderStructOutput[] = [];
    try {
      let index = 1;
      const MAX_ORDERS = 1000; // Safety limit
      while (index < MAX_ORDERS) {
        let orderId: BytesLike;
        try {
          // Read from public orderIds array getter
          orderId = await this.readContract.orderIds(index);
          if (!orderId || orderId === ethers.ZeroHash) {
            // console.log(`[OrderRepository] Found zero hash order ID at global index ${index}, assuming end.`);
            break; // Assume end
          }
        } catch (error: any) {
          // console.log(`[OrderRepository] Error fetching order ID at global index ${index} (likely end):`, error.message);
          break; // Assume end on error
        }

        try {
          const order = await this.readContract.getOrder(orderId);
          // Filter by customer
          if (
            order &&
            order.id !== ethers.ZeroHash &&
            order.customer.toLowerCase() === customerAddress.toLowerCase()
          ) {
            orders.push(order);
          }
          // else: either invalid order or belongs to another customer
        } catch (orderError: any) {
          console.error(
            `[OrderRepository] Failed to fetch order details for ID ${orderId} at global index ${index}:`,
            orderError.message,
          );
          // Continue checking other orders
        }
        index++;
      }
      //  if (index >= MAX_ORDERS) {
      //      console.warn(`[OrderRepository] Reached MAX_ORDERS limit while fetching orders for customer ${customerAddress}.`);
      // }
    } catch (error) {
      handleContractError(error, `get orders for customer ${customerAddress}`);
      throw error;
    }
    console.log(
      `[OrderRepository] Found ${orders.length} orders for customer ${customerAddress}.`,
    );
    return orders;
  }

  async getOrderById(orderId: BytesLike): Promise<Order> {
    // console.log(`[OrderRepository] Getting order by ID: ${orderId}`);
    try {
      const order = await this.readContract.getOrder(orderId);
      if (!order || order.id === ethers.ZeroHash) {
        // Match error message used in tests
        throw new Error(`Order with ID ${orderId} not found or is invalid.`);
      }
      return order;
    } catch (error) {
      // Re-throw specific not found error, handle others
      if (
        error instanceof Error &&
        error.message.includes('not found or is invalid')
      ) {
        throw error;
      }
      handleContractError(error, `get order by ID ${orderId}`);
      throw error; // Ensure other errors are thrown after handling
    }
  }

  /**
   * Retrieves supported attributes and their value for a specific hash
   * @param assetName the name of the asset to be retrieved
   * @returns a an assets attributes and its values
   */

  // --- End Implementation ---
}
