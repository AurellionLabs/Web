import { Journey, ParcelData, JourneyStatus } from '@/domain/shared';
import {
  BytesLike,
  ContractTransactionReceipt,
  Overrides,
  BigNumberish,
} from 'ethers';

/**
 * Order status enum - matches Ausys contract OrderStatus
 *
 * Uses string values for readability. Repository layer converts between:
 * - Contract values (0,1,2,3)
 * - Domain strings ('created', 'processing', 'settled', 'cancelled')
 */
export enum OrderStatus {
  CREATED = 'created', // Order placed, no journeys started (contract: 0)
  PROCESSING = 'processing', // At least one journey is active (contract: 1)
  SETTLED = 'settled', // Payments distributed, order complete (contract: 2)
  CANCELLED = 'cancelled', // Order cancelled (contract: 3)
}

// Note: JourneyStatus is now in @/domain/shared for better organization
// Re-export it here for backwards compatibility
export { JourneyStatus } from '@/domain/shared';

export type Order = {
  id: string;
  token: string;
  tokenId: string;
  tokenQuantity: string;
  price: string;
  txFee: string;
  buyer: string;
  seller: string;
  journeyIds: string[];
  nodes: string[];
  locationData: ParcelData;
  currentStatus: OrderStatus; // Uses OrderStatus enum (numeric values)
  contractualAgreement: string;
};
/**
 * Interface defining the data access methods for orders and journeys.
 */
export interface IOrderRepository {
  /**
   * Retrieves all orders associated with a specific node address.
   * @param address The address of the node.
   * @returns A promise resolving to an array of order structures.
   */
  getNodeOrders(address: string): Promise<Order[]>;

  /**
   * Retrieves the journeys created by a specific customer.
   * If no address is provided, it defaults to the connected user's wallet address.
   * @param address The optional wallet address of the customer.
   * @returns A promise resolving to an array of the customer's journey structures.
   */
  getCustomerJourneys(address?: string): Promise<Journey[]>;

  /**
   * Retrieves the journeys where a specific user is the receiver.
   * If no address is provided, it defaults to the connected user's wallet address.
   * @param address The optional wallet address of the receiver.
   * @returns A promise resolving to an array of the receiver's journey structures.
   */
  getReceiverJourneys(address?: string): Promise<Journey[]>;

  /**
   * Fetches all journeys from the system.
   * @returns A promise resolving to an array of all journey structure outputs.
   */
  fetchAllJourneys(): Promise<Journey[]>;

  /**
   * Retrieves a specific journey by its ID.
   * @param journeyId The unique identifier (BytesLike) of the journey.
   * @returns A promise resolving to the journey structure.
   */
  getJourneyById(journeyId: BytesLike): Promise<Journey>;

  /**
   * Retrieves the Order ID associated with a specific Journey ID.
   * @param journeyId The unique identifier (BytesLike) of the journey.
   * @returns A promise resolving to the corresponding order ID (BytesLike).
   */
  getOrderIdByJourneyId(journeyId: BytesLike): Promise<BytesLike>;

  /**
   * Retrieves all orders created by a specific buyer.
   * @param address The wallet address of the buyer.
   * @returns A promise resolving to an array of the buyer's order structure outputs.
   */
  getBuyerOrders(address: string): Promise<Order[]>;

  /**
   * Retrieves a specific order by its ID.
   * @param orderId The unique identifier (BytesLike) of the order.
   * @returns A promise resolving to the order structure output.
   */
  getOrderById(orderId: BytesLike): Promise<Order>;
}

/**
 * Interface defining the service methods for order-related operations.
 */
export interface IOrderService {
  /**
   * Creates a new job (journey) based on the provided parcel data and recipient address.
   * If the sender wallet address is not provided, it defaults to the connected user's wallet address.
   * @param parcelData The data defining the parcel and its route (start/end locations and names).
   * @param recipientWalletAddress The wallet address of the recipient.
   * @param senderWalletAddress The optional wallet address of the sender.
   * @param bounty The bounty offered for the journey (in Wei).
   * @param eta The estimated time of arrival (Unix timestamp).
   * @param overrides Optional transaction overrides (e.g., gasLimit).
   * @returns A promise resolving to the contract transaction receipt upon successful job creation.
   */
  jobCreation(
    parcelData: ParcelData,
    recipientWalletAddress: string,
    senderWalletAddress?: string,
    bounty?: BigNumberish,
    eta?: BigNumberish,
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt>;

  /**
   * Allows the customer (receiver) to sign for a package upon delivery.
   * This typically confirms the handoff process.
   * @param journeyId The unique identifier of the journey being completed.
   * @param overrides Optional transaction overrides (e.g., gasLimit).
   * @returns A promise resolving to the contract transaction receipt.
   */
  customerSignPackage(
    journeyId: string,
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt>;

  /**
   * Creates a new order based on the provided order data.
   * @param orderData The structure containing all details for the new order.
   * @param overrides Optional transaction overrides (e.g., gasLimit).
   * @returns A promise resolving to the unique ID (bytes32) of the created order.
   */
  createOrder(orderData: Order, overrides?: Overrides): Promise<string>;

  /**
   * Adds or updates the receiver for a specific order.
   * The sender defaults to the connected user's wallet address if not provided.
   * @param orderId The unique identifier (BytesLike) of the order to modify.
   * @param receiver The wallet address of the new receiver.
   * @param sender The optional wallet address of the sender initiating the change.
   * @param overrides Optional transaction overrides (e.g., gasLimit).
   * @returns A promise resolving to the contract transaction receipt.
   */
  addReceiverToOrder(
    orderId: BytesLike,
    receiver: string,
    sender?: string,
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt>;

  /**
   * Creates a journey specifically linked to an existing order.
   *
   * @param orderId - The ID of the order to link the journey to.
   * @param senderNodeAddress - The address of the node sending the parcel for this leg.
   * @param receiverAddress - The address receiving the parcel (can be another node or the final customer).
   * @param parcelData - Geographic and naming details for the journey leg.
   * @param bountyWei - The reward for the driver completing this journey leg (in Wei).
   * @param etaTimestamp - The expected arrival timestamp (Unix timestamp).
   * @param tokenQuantity - The quantity of the specific token being moved in this leg.
   * @param assetId - The ID of the asset being moved in this leg.
   * @param overrides Optional transaction overrides (e.g., gasLimit).
   * @returns The unique ID (bytes32) of the created journey leg.
   */
  createOrderJourney(
    orderId: BytesLike,
    senderNodeAddress: string,
    receiverAddress: string,
    parcelData: ParcelData,
    bountyWei: bigint,
    etaTimestamp: bigint,
    tokenQuantity: bigint,
    assetId: bigint,
    overrides?: Overrides,
  ): Promise<string>;
}
