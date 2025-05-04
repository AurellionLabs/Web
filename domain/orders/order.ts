import { LocationContract } from '@/typechain-types';
import {
  BytesLike,
  ContractTransactionReceipt,
  Overrides,
  BigNumberish,
} from 'ethers';

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
export type Attribute = {
  name: string;
  value: string;
};
export type Asset = {
  assetName: string;
  attributes: Attribute[];
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
  getNodeOrders(address: string): Promise<LocationContract.OrderStruct[]>;

  /**
   * Retrieves the journeys created by a specific customer.
   * If no address is provided, it defaults to the connected user's wallet address.
   * @param address The optional wallet address of the customer.
   * @returns A promise resolving to an array of the customer's journey structures.
   */
  getCustomerJourneys(
    address?: string,
  ): Promise<LocationContract.JourneyStruct[]>;

  /**
   * Retrieves the journeys where a specific user is the receiver.
   * If no address is provided, it defaults to the connected user's wallet address.
   * @param address The optional wallet address of the receiver.
   * @returns A promise resolving to an array of the receiver's journey structures.
   */
  getReceiverJourneys(
    address?: string,
  ): Promise<LocationContract.JourneyStruct[]>;

  /**
   * Fetches all journeys from the system.
   * @returns A promise resolving to an array of all journey structure outputs.
   */
  fetchAllJourneys(): Promise<LocationContract.JourneyStructOutput[]>;

  /**
   * Retrieves a specific journey by its ID.
   * @param journeyId The unique identifier (BytesLike) of the journey.
   * @returns A promise resolving to the journey structure.
   */
  getJourneyById(journeyId: BytesLike): Promise<LocationContract.JourneyStruct>;

  /**
   * Retrieves the Order ID associated with a specific Journey ID.
   * @param journeyId The unique identifier (BytesLike) of the journey.
   * @returns A promise resolving to the corresponding order ID (BytesLike).
   */
  getOrderIdByJourneyId(journeyId: BytesLike): Promise<BytesLike>;

  /**
   * Retrieves all orders created by a specific customer.
   * If no address is provided, it defaults to the connected user's wallet address.
   * @param address The optional wallet address of the customer.
   * @returns A promise resolving to an array of the customer's order structure outputs.
   */
  getCustomerOrders(
    address?: string,
  ): Promise<LocationContract.OrderStructOutput[]>;

  /**
   * Retrieves a specific order by its ID.
   * @param orderId The unique identifier (BytesLike) of the order.
   * @returns A promise resolving to the order structure output.
   */
  getOrderById(orderId: BytesLike): Promise<LocationContract.OrderStructOutput>;

  /**
   * Retrieves supported attributes and their value for a specific hash
   * @param assetName the name of the asset to be retrieved
   * @returns a an assets attributes and its values
   */
  getAssetAttributes(assetName: string): Promise<Asset>;
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
    parcelData: LocationContract.ParcelDataStruct,
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
   * @returns A promise resolving to the contract transaction receipt upon successful order creation.
   */
  createOrder(
    orderData: LocationContract.OrderStruct,
    overrides?: Overrides,
  ): Promise<ContractTransactionReceipt>;

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
}
