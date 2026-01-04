/**
 * Order Flows - Domain-specific flow helpers for Order testing
 *
 * Provides high-level functions that mirror the exact UI flows
 * for Order and Journey operations.
 */

import { ethers, Contract, ContractTransactionReceipt } from 'ethers';
import { FlowContext, TestUser } from './flow-context';
import { ActionSimulator, ActionResult } from './action-simulator';
import { getCoverageTracker } from '../coverage/coverage-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface ParcelData {
  startLat: string | number;
  startLng: string | number;
  endLat: string | number;
  endLng: string | number;
  startName: string;
  endName: string;
}

export interface CreateJobParams {
  parcelData: ParcelData;
  recipientAddress: string;
  senderAddress?: string;
  bounty?: string | bigint;
  eta?: number;
}

export interface CreateOrderParams {
  sender: string;
  receiver: string;
  nodeAddress: string;
  tokenAddress: string;
  tokenId: string | bigint;
  quantity: string | bigint;
  price: string | bigint;
}

export interface CreateJobResult {
  journeyId: string;
  transactionHash: string;
  receipt: ContractTransactionReceipt;
}

export interface CreateOrderResult {
  orderId: string;
  transactionHash: string;
  receipt: ContractTransactionReceipt;
}

// =============================================================================
// ORDER FLOWS CLASS
// =============================================================================

export class OrderFlows {
  private context: FlowContext;
  private simulator: ActionSimulator;
  private auSys: Contract | null = null;
  private verbose: boolean;

  constructor(context: FlowContext, verbose: boolean = false) {
    this.context = context;
    this.simulator = new ActionSimulator(context, verbose);
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Get the AuSys contract
   */
  private getAuSys(): Contract {
    if (!this.auSys) {
      this.auSys = this.context.getContract('AuSys');
    }
    return this.auSys;
  }

  /**
   * Get AuSys connected to a user
   */
  private getAuSysAs(user: TestUser): Contract {
    return this.context.getContractAs('AuSys', user.name);
  }

  // ---------------------------------------------------------------------------
  // Customer Actions (mirrors IOrderService)
  // ---------------------------------------------------------------------------

  /**
   * Create a new job/journey
   * Mirrors: IOrderService.jobCreation
   */
  async createJob(
    customer: TestUser,
    params: CreateJobParams,
  ): Promise<CreateJobResult> {
    this.log(`📦 ${customer.name} creating job`);

    const auSys = this.getAuSysAs(customer);

    // Convert parcel data to contract format
    const parcelData = {
      startLat: this.toCoordinate(params.parcelData.startLat),
      startLng: this.toCoordinate(params.parcelData.startLng),
      endLat: this.toCoordinate(params.parcelData.endLat),
      endLng: this.toCoordinate(params.parcelData.endLng),
      startName: params.parcelData.startName,
      endName: params.parcelData.endName,
    };

    const bounty = params.bounty
      ? typeof params.bounty === 'string'
        ? ethers.parseEther(params.bounty)
        : params.bounty
      : ethers.parseEther('0.1');

    const eta = params.eta ?? Math.floor(Date.now() / 1000) + 86400; // Default: 24 hours from now

    const tx = await auSys.createJourney(
      parcelData,
      params.recipientAddress,
      params.senderAddress ?? customer.address,
      bounty,
      eta,
    );

    const receipt = await tx.wait();

    // Extract journey ID from event
    const event = this.simulator.getEventsFromReceipt(
      receipt,
      auSys,
      'JourneyCreated',
    )[0];
    const journeyId = event?.args?.journeyId ?? ethers.ZeroHash;

    // Track coverage
    getCoverageTracker().mark('IOrderService', 'jobCreation');

    this.log(`✅ Created job: ${journeyId}`);

    return {
      journeyId,
      transactionHash: tx.hash,
      receipt,
    };
  }

  /**
   * Create a new order
   * Mirrors: IOrderService.createOrder
   */
  async createOrder(
    customer: TestUser,
    params: CreateOrderParams,
  ): Promise<CreateOrderResult> {
    this.log(`🛒 ${customer.name} creating order`);

    const auSys = this.getAuSysAs(customer);

    const tokenId = BigInt(params.tokenId);
    const quantity =
      typeof params.quantity === 'string'
        ? ethers.parseEther(params.quantity)
        : BigInt(params.quantity);
    const price =
      typeof params.price === 'string'
        ? ethers.parseEther(params.price)
        : BigInt(params.price);

    const tx = await auSys.createOrder(
      params.sender,
      params.receiver,
      params.nodeAddress,
      params.tokenAddress,
      tokenId,
      quantity,
      price,
    );

    const receipt = await tx.wait();

    // Extract order ID from event
    const event = this.simulator.getEventsFromReceipt(
      receipt,
      auSys,
      'OrderCreated',
    )[0];
    const orderId = event?.args?.orderId ?? ethers.ZeroHash;

    // Track coverage
    getCoverageTracker().mark('IOrderService', 'createOrder');

    this.log(`✅ Created order: ${orderId}`);

    return {
      orderId,
      transactionHash: tx.hash,
      receipt,
    };
  }

  /**
   * Customer signs for package
   * Mirrors: IOrderService.customerSignPackage
   */
  async customerSignPackage(
    customer: TestUser,
    journeyId: string,
  ): Promise<ActionResult> {
    this.log(`✍️ ${customer.name} signing for package ${journeyId}`);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'customerSignPackage',
      [journeyId],
      customer,
      { interfaceName: 'IOrderService', methodName: 'customerSignPackage' },
    );

    if (result.success) {
      this.log(`✅ Package signed by customer`);
    }

    return result;
  }

  /**
   * Add receiver to an order
   * Mirrors: IOrderService.addReceiverToOrder
   */
  async addReceiverToOrder(
    sender: TestUser,
    orderId: string,
    receiverAddress: string,
  ): Promise<ActionResult> {
    this.log(`👤 ${sender.name} adding receiver to order ${orderId}`);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'addReceiverToOrder',
      [orderId, receiverAddress, sender.address],
      sender,
      { interfaceName: 'IOrderService', methodName: 'addReceiverToOrder' },
    );

    if (result.success) {
      this.log(`✅ Receiver added to order`);
    }

    return result;
  }

  /**
   * Create an order journey
   * Mirrors: IOrderService.createOrderJourney
   */
  async createOrderJourney(
    node: TestUser,
    orderId: string,
    receiverAddress: string,
    parcelData: ParcelData,
    bounty: string | bigint,
    eta: number,
    tokenQuantity: string | bigint,
    assetId: string | bigint,
  ): Promise<ActionResult> {
    this.log(`🚚 ${node.name} creating order journey for ${orderId}`);

    const contractParcelData = {
      startLat: this.toCoordinate(parcelData.startLat),
      startLng: this.toCoordinate(parcelData.startLng),
      endLat: this.toCoordinate(parcelData.endLat),
      endLng: this.toCoordinate(parcelData.endLng),
      startName: parcelData.startName,
      endName: parcelData.endName,
    };

    const bountyWei =
      typeof bounty === 'string' ? ethers.parseEther(bounty) : bounty;
    const quantity =
      typeof tokenQuantity === 'string'
        ? ethers.parseEther(tokenQuantity)
        : BigInt(tokenQuantity);
    const asset = BigInt(assetId);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'createOrderJourney',
      [
        orderId,
        node.address,
        receiverAddress,
        contractParcelData,
        bountyWei,
        eta,
        quantity,
        asset,
      ],
      node,
      { interfaceName: 'IOrderService', methodName: 'createOrderJourney' },
    );

    if (result.success) {
      this.log(`✅ Order journey created`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Driver Actions (mirrors IDriverService)
  // ---------------------------------------------------------------------------

  /**
   * Accept a delivery
   * Mirrors: IDriverService.acceptDelivery
   */
  async acceptDelivery(
    driver: TestUser,
    journeyId: string,
  ): Promise<ActionResult> {
    this.log(`🚗 ${driver.name} accepting delivery ${journeyId}`);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'acceptDelivery',
      [journeyId],
      driver,
      { interfaceName: 'IDriverService', methodName: 'acceptDelivery' },
    );

    if (result.success) {
      this.log(`✅ Delivery accepted`);
    }

    return result;
  }

  /**
   * Confirm pickup
   * Mirrors: IDriverService.confirmPickup
   */
  async confirmPickup(
    driver: TestUser,
    journeyId: string,
  ): Promise<ActionResult> {
    this.log(`📥 ${driver.name} confirming pickup ${journeyId}`);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'confirmPickup',
      [journeyId],
      driver,
      { interfaceName: 'IDriverService', methodName: 'confirmPickup' },
    );

    if (result.success) {
      this.log(`✅ Pickup confirmed`);
    }

    return result;
  }

  /**
   * Driver signs package
   * Mirrors: IDriverService.packageSign
   */
  async driverSignPackage(
    driver: TestUser,
    journeyId: string,
  ): Promise<ActionResult> {
    this.log(`✍️ ${driver.name} signing package ${journeyId}`);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'driverSignPackage',
      [journeyId],
      driver,
      { interfaceName: 'IDriverService', methodName: 'packageSign' },
    );

    if (result.success) {
      this.log(`✅ Package signed by driver`);
    }

    return result;
  }

  /**
   * Complete delivery
   * Mirrors: IDriverService.completeDelivery
   */
  async completeDelivery(
    driver: TestUser,
    journeyId: string,
  ): Promise<ActionResult> {
    this.log(`✅ ${driver.name} completing delivery ${journeyId}`);

    const result = await this.simulator.executeWrite(
      'AuSys',
      'completeDelivery',
      [journeyId],
      driver,
      { interfaceName: 'IDriverService', methodName: 'completeDelivery' },
    );

    if (result.success) {
      this.log(`✅ Delivery completed`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Read Operations (mirrors IOrderRepository, IDriverRepository)
  // ---------------------------------------------------------------------------

  /**
   * Get journey by ID
   * Mirrors: IOrderRepository.getJourneyById
   */
  async getJourney(journeyId: string): Promise<any> {
    const auSys = this.getAuSys();
    const journey = await auSys.getJourney(journeyId);

    getCoverageTracker().mark('IOrderRepository', 'getJourneyById');

    return journey;
  }

  /**
   * Get order by ID
   * Mirrors: IOrderRepository.getOrderById
   */
  async getOrder(orderId: string): Promise<any> {
    const auSys = this.getAuSys();
    const order = await auSys.getOrder(orderId);

    getCoverageTracker().mark('IOrderRepository', 'getOrderById');

    return order;
  }

  /**
   * Get orders by customer
   * Mirrors: IOrderRepository.getOrdersByCustomer
   */
  async getOrdersByCustomer(customerAddress: string): Promise<any[]> {
    const auSys = this.getAuSys();
    const orders = await auSys.getOrdersByCustomer(customerAddress);

    getCoverageTracker().mark('IOrderRepository', 'getOrdersByCustomer');

    return orders;
  }

  /**
   * Get orders by node
   * Mirrors: IOrderRepository.getOrdersByNode
   */
  async getOrdersByNode(nodeAddress: string): Promise<any[]> {
    const auSys = this.getAuSys();
    const orders = await auSys.getOrdersByNode(nodeAddress);

    getCoverageTracker().mark('IOrderRepository', 'getOrdersByNode');

    return orders;
  }

  /**
   * Get journeys by driver
   * Mirrors: IOrderRepository.getJourneysByDriver
   */
  async getJourneysByDriver(driverAddress: string): Promise<any[]> {
    const auSys = this.getAuSys();
    const journeys = await auSys.getJourneysByDriver(driverAddress);

    getCoverageTracker().mark('IOrderRepository', 'getJourneysByDriver');

    return journeys;
  }

  /**
   * Get driver's deliveries
   * Mirrors: IDriverRepository.getMyDeliveries
   */
  async getDriverDeliveries(driverAddress: string): Promise<any[]> {
    const auSys = this.getAuSys();
    const deliveries = await auSys.getDriverDeliveries(driverAddress);

    getCoverageTracker().mark('IDriverRepository', 'getMyDeliveries');

    return deliveries;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Convert coordinate to contract format (multiply by 1e6)
   */
  private toCoordinate(value: string | number): bigint {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return BigInt(Math.round(num * 1e6));
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[OrderFlows] ${message}`);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create Order flows helper
 */
export function createOrderFlows(
  context: FlowContext,
  verbose: boolean = false,
): OrderFlows {
  return new OrderFlows(context, verbose);
}
