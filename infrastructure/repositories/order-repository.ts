import {
  type IOrderRepository,
  type OrderStatus, // If needed for mapping, otherwise remove
} from '@/domain/orders/order';
import {
  LocationContract,
  LocationContract__factory, // Keep if needed for type checks, maybe not here
} from '@/typechain-types';
import {
  type BrowserProvider,
  type Signer,
  ethers,
  type BytesLike,
  type ContractTransactionReceipt, // Needed for service, not repo
  type AddressLike,
} from 'ethers';
import { handleContractError } from '@/utils/error-handler'; // Adjust path if necessary

/**
 * Infrastructure implementation of the IOrderRepository interface.
 * Interacts with the LocationContract (AuSys) blockchain contract.
 */
export class OrderRepository implements IOrderRepository {
  private contract: LocationContract;
  private provider: BrowserProvider;
  private signer: Signer;

  constructor(
    contract: LocationContract,
    provider: BrowserProvider,
    signer: Signer,
  ) {
    if (!contract) {
      throw new Error(
        'OrderRepository: LocationContract instance is required.',
      );
    }
    this.contract = contract;
    this.provider = provider;
    this.signer = signer;
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

  async getNodeOrders(
    address: string,
  ): Promise<LocationContract.OrderStructOutput[]> {
    console.log(`[OrderRepository] Getting orders for node: ${address}`);
    const orders: LocationContract.OrderStructOutput[] = [];
    try {
      let index = 0;
      const MAX_NODE_ORDERS = 100; // Safety limit
      while (index < MAX_NODE_ORDERS) {
        let orderId: BytesLike;
        try {
          // Assuming nodeToOrderIds mapping exists and is populated correctly
          orderId = await this.contract.nodeToOrderIds(address, index);
          if (!orderId || orderId === ethers.ZeroHash) {
            console.log(
              `[OrderRepository] End of order list for node ${address} at index ${index}`,
            );
            break;
          }
        } catch (error: any) {
          console.log(
            `[OrderRepository] Error fetching order ID for node ${address} at index ${index} (likely end):`,
            error.message,
          );
          break; // Assume end of list on error
        }

        try {
          const order = await this.contract.getOrder(orderId);
          // Ensure order has a valid ID before adding
          if (order && order.id !== ethers.ZeroHash) {
            orders.push(order);
          } else {
            console.warn(
              `[OrderRepository] Node ${address} linked to invalid order ID ${orderId} at index ${index}`,
            );
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
      if (index >= MAX_NODE_ORDERS) {
        console.warn(
          `[OrderRepository] Reached MAX_NODE_ORDERS limit for node ${address}.`,
        );
      }
    } catch (error) {
      handleContractError(error, `get orders for node ${address}`);
      throw error; // Re-throw after handling
    }
    console.log(
      `[OrderRepository] Found ${orders.length} orders for node ${address}.`,
    );
    return orders;
  }

  async getCustomerJourneys(
    address?: string,
  ): Promise<LocationContract.JourneyStructOutput[]> {
    const customerAddress = address ?? (await this._getWalletAddress());
    console.log(
      `[OrderRepository] Getting journeys for customer: ${customerAddress}`,
    );
    const journeys: LocationContract.JourneyStructOutput[] = [];
    try {
      const journeyCount =
        await this.contract.numberOfJourneysCreatedForCustomer(customerAddress);
      console.log(
        `[OrderRepository] Customer ${customerAddress} has ${journeyCount} journeys.`,
      );

      for (let i = 0; i < journeyCount; i++) {
        let journeyId: BytesLike;
        try {
          journeyId = await this.contract.customerToJourneyId(
            customerAddress,
            i,
          );
          if (!journeyId || journeyId === ethers.ZeroHash) {
            console.warn(
              `[OrderRepository] Found zero hash journey ID for customer ${customerAddress} at index ${i}`,
            );
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
          const journey = await this.contract.journeyIdToJourney(journeyId);
          // Basic validation
          if (journey && journey.journeyId !== ethers.ZeroHash) {
            journeys.push(journey);
          } else {
            console.warn(
              `[OrderRepository] Invalid journey data returned for ID ${journeyId} (customer ${customerAddress})`,
            );
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
    console.log(
      `[OrderRepository] Found ${journeys.length} journeys for customer ${customerAddress}.`,
    );
    return journeys;
  }

  async getReceiverJourneys(
    address?: string,
  ): Promise<LocationContract.JourneyStructOutput[]> {
    const receiverAddress = address ?? (await this._getWalletAddress());
    console.log(
      `[OrderRepository] Getting journeys for receiver: ${receiverAddress}`,
    );
    const journeys: LocationContract.JourneyStructOutput[] = [];
    try {
      const journeyCount =
        await this.contract.numberOfJourneysCreatedForReceiver(receiverAddress);
      console.log(
        `[OrderRepository] Receiver ${receiverAddress} has ${journeyCount} journeys.`,
      );

      for (let i = 0; i < journeyCount; i++) {
        let journeyId: BytesLike;
        try {
          journeyId = await this.contract.receiverToJourneyId(
            receiverAddress,
            i,
          );
          if (!journeyId || journeyId === ethers.ZeroHash) {
            console.warn(
              `[OrderRepository] Found zero hash journey ID for receiver ${receiverAddress} at index ${i}`,
            );
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
          const journey = await this.contract.journeyIdToJourney(journeyId);
          if (journey && journey.journeyId !== ethers.ZeroHash) {
            journeys.push(journey);
          } else {
            console.warn(
              `[OrderRepository] Invalid journey data returned for ID ${journeyId} (receiver ${receiverAddress})`,
            );
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
    console.log(
      `[OrderRepository] Found ${journeys.length} journeys for receiver ${receiverAddress}.`,
    );
    return journeys;
  }

  async fetchAllJourneys(): Promise<LocationContract.JourneyStructOutput[]> {
    console.log(`[OrderRepository] Fetching all journeys...`);
    const allJourneys: LocationContract.JourneyStructOutput[] = [];
    try {
      let index = 0;
      const MAX_JOURNEYS = 1000; // Safety break
      while (index < MAX_JOURNEYS) {
        let journeyId: BytesLike;
        try {
          journeyId = await this.contract.numberToJourneyID(index);
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
          const journey = await this.contract.journeyIdToJourney(journeyId);
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
      if (index >= MAX_JOURNEYS) {
        console.warn(
          `[OrderRepository] Reached MAX_JOURNEYS limit while fetching all journeys.`,
        );
      }
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
    console.log(`[OrderRepository] Getting journey by ID: ${journeyId}`);
    try {
      // The contract has getjourney(bytes32) and journeyIdToJourney(bytes32 => Journey)
      // Use the mapping directly or the getter, should be equivalent
      const journey = await this.contract.journeyIdToJourney(journeyId);
      if (!journey || journey.journeyId === ethers.ZeroHash) {
        throw new Error(
          `Journey with ID ${journeyId} not found or is invalid.`,
        );
      }
      return journey;
    } catch (error) {
      handleContractError(error, `get journey by ID ${journeyId}`);
      throw error;
    }
  }

  async getOrderIdByJourneyId(journeyId: BytesLike): Promise<BytesLike> {
    console.log(
      `[OrderRepository] Getting order ID for journey ID: ${journeyId}`,
    );
    try {
      const orderId = await this.contract.journeyToOrderId(journeyId);
      // Contract returns bytes32, which might be ZeroHash if not linked
      return orderId;
    } catch (error) {
      handleContractError(error, `get order ID for journey ${journeyId}`);
      throw error;
    }
  }

  async getCustomerOrders(
    address?: string,
  ): Promise<LocationContract.OrderStructOutput[]> {
    const customerAddress = address ?? (await this._getWalletAddress());
    console.log(
      `[OrderRepository] Getting orders for customer: ${customerAddress}`,
    );
    const orders: LocationContract.OrderStructOutput[] = [];
    try {
      let index = 0;
      const MAX_ORDERS = 1000; // Safety limit
      while (index < MAX_ORDERS) {
        let orderId: BytesLike;
        try {
          // Read from public orderIds array
          orderId = await this.contract.orderIds(index);
          if (!orderId || orderId === ethers.ZeroHash) {
            // This might indicate end, or just a zero entry?
            // Let's assume end for now, but contract might behave differently
            console.log(
              `[OrderRepository] Found zero hash order ID at global index ${index}, assuming end.`,
            );
            break;
          }
        } catch (error: any) {
          console.log(
            `[OrderRepository] Error fetching order ID at global index ${index} (likely end):`,
            error.message,
          );
          break;
        }

        try {
          const order = await this.contract.getOrder(orderId);
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
      if (index >= MAX_ORDERS) {
        console.warn(
          `[OrderRepository] Reached MAX_ORDERS limit while fetching orders for customer ${customerAddress}.`,
        );
      }
    } catch (error) {
      handleContractError(error, `get orders for customer ${customerAddress}`);
      throw error;
    }
    console.log(
      `[OrderRepository] Found ${orders.length} orders for customer ${customerAddress}.`,
    );
    return orders;
  }

  async getOrderById(
    orderId: BytesLike,
  ): Promise<LocationContract.OrderStructOutput> {
    console.log(`[OrderRepository] Getting order by ID: ${orderId}`);
    try {
      const order = await this.contract.getOrder(orderId);
      if (!order || order.id === ethers.ZeroHash) {
        throw new Error(`Order with ID ${orderId} not found or is invalid.`);
      }
      return order;
    } catch (error) {
      handleContractError(error, `get order by ID ${orderId}`);
      throw error;
    }
  }
}
