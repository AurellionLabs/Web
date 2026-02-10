/**
 * P2P Trading Domain
 *
 * Defines interfaces and types for peer-to-peer trading functionality.
 * P2P allows either buyers or sellers to create offers that counterparties can accept.
 */

import { ParcelData } from '@/domain/shared';

/**
 * P2P Offer status enum - matches AuSys contract status
 */
export enum P2POfferStatus {
  CREATED = 'created', // Offer open, pending acceptance (contract: 0)
  PROCESSING = 'processing', // Offer accepted, in logistics flow (contract: 1)
  SETTLED = 'settled', // Trade completed (contract: 2)
  CANCELLED = 'cancelled', // Offer cancelled by creator (contract: 3)
  EXPIRED = 'expired', // Offer expired (contract: 4)
}

/**
 * Maps contract status numbers to P2POfferStatus enum
 */
export function mapContractStatusToP2PStatus(status: number): P2POfferStatus {
  switch (status) {
    case 0:
      return P2POfferStatus.CREATED;
    case 1:
      return P2POfferStatus.PROCESSING;
    case 2:
      return P2POfferStatus.SETTLED;
    case 3:
      return P2POfferStatus.CANCELLED;
    case 4:
      return P2POfferStatus.EXPIRED;
    default:
      return P2POfferStatus.CREATED;
  }
}

/**
 * P2P Offer interface
 *
 * Represents a peer-to-peer trade offer where either party can initiate.
 */
export interface P2POffer {
  /** Unique identifier (bytes32 hash) */
  id: string;

  /** Address of the offer creator */
  creator: string;

  /** Target counterparty address, or null if open to all */
  targetCounterparty: string | null;

  /** ERC1155 token contract address */
  token: string;

  /** Token ID within the ERC1155 contract */
  tokenId: string;

  /** Quantity of tokens being traded */
  quantity: bigint;

  /** Price in quote token (payment token) */
  price: bigint;

  /** Transaction fee (2% of price) */
  txFee: bigint;

  /** True if seller created the offer, false if buyer created */
  isSellerInitiated: boolean;

  /** Current status of the offer */
  status: P2POfferStatus;

  /** Buyer address (may be empty for seller-initiated offers) */
  buyer: string;

  /** Seller address (may be empty for buyer-initiated offers) */
  seller: string;

  /** Unix timestamp when offer was created */
  createdAt: number;

  /** Unix timestamp when offer expires, 0 for no expiry */
  expiresAt: number;

  /** Optional location data for delivery */
  locationData?: ParcelData;

  /** Custody nodes involved in the trade */
  nodes: string[];
}

/**
 * Input for creating a new P2P offer
 */
export interface CreateP2POfferInput {
  /** ERC1155 token contract address */
  token: string;

  /** Token ID within the ERC1155 contract */
  tokenId: string;

  /** Quantity of tokens to trade */
  quantity: bigint;

  /** Price in quote token */
  price: bigint;

  /** True if creating a sell offer, false for buy offer */
  isSellOffer: boolean;

  /** Optional: specific counterparty address, null for open offer */
  targetCounterparty?: string;

  /** Optional: expiry timestamp, 0 for no expiry */
  expiresAt?: number;

  /** Optional: custody nodes */
  nodes?: string[];
}

/**
 * P2P Repository interface - read operations
 */
export interface IP2PRepository {
  /**
   * Get all open P2P offers
   */
  getOpenOffers(): Promise<P2POffer[]>;

  /**
   * Get P2P offers created by a specific user
   */
  getUserOffers(userAddress: string): Promise<P2POffer[]>;

  /**
   * Get a specific P2P offer by ID
   */
  getOffer(offerId: string): Promise<P2POffer | null>;

  /**
   * Get offers filtered by asset
   */
  getOffersByAsset(token: string, tokenId: string): Promise<P2POffer[]>;

  /**
   * Get buy offers (offers from buyers looking to purchase)
   */
  getBuyOffers(): Promise<P2POffer[]>;

  /**
   * Get sell offers (offers from sellers looking to sell)
   */
  getSellOffers(): Promise<P2POffer[]>;
}

/**
 * P2P Service interface - write operations
 */
/**
 * Delivery details required to create a journey after accepting a P2P offer.
 */
export interface P2PDeliveryDetails {
  /** Node address of the sender (typically the seller's custody node) */
  senderNodeAddress: string;
  /** Address of the receiver (the buyer) */
  receiverAddress: string;
  /** Start and end locations for the delivery journey */
  parcelData: ParcelData;
  /** Bounty for the delivery driver (in wei of quote token) */
  bountyWei: bigint;
  /** Estimated arrival timestamp (Unix seconds, must be in the future) */
  etaTimestamp: bigint;
  /** Quantity of tokens being delivered */
  tokenQuantity: bigint;
  /** Asset ID (token ID as bigint) */
  assetId: bigint;
  /** User-entered delivery address string (for display purposes) */
  deliveryAddress?: string;
}

export interface IP2PService {
  /**
   * Create a new P2P offer
   * @returns The created offer ID
   */
  createOffer(input: CreateP2POfferInput): Promise<string>;

  /**
   * Accept a P2P offer
   * @param offerId The offer to accept
   */
  acceptOffer(offerId: string): Promise<void>;

  /**
   * Accept a P2P offer and immediately schedule delivery.
   * Fires acceptP2POffer then createOrderJourney in sequence.
   * ERC20 approval covers price + txFee + bounty.
   *
   * @param offerId The offer to accept
   * @param delivery Delivery details for journey creation
   */
  acceptOfferWithDelivery(
    offerId: string,
    delivery: P2PDeliveryDetails,
  ): Promise<void>;

  /**
   * Cancel a P2P offer (only creator can cancel)
   * @param offerId The offer to cancel
   */
  cancelOffer(offerId: string): Promise<void>;
}
