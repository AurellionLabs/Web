import type { Journey } from '@/domain/shared';
import { NETWORK_CONFIGS } from '@/config/network';
import {
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_DEFAULT_CHAIN_ID,
} from '@/chain-constants';
import { DiamondContext } from '@/infrastructure/diamond/diamond-context';
import { DiamondNodeRepository } from '@/infrastructure/diamond/diamond-node-repository';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { OrderRepository } from '@/infrastructure/repositories/orders-repository';
import { Ausys__factory, type Ausys } from '@/lib/contracts';
import { ethers } from 'ethers';

import type {
  PublicJourneyDto,
  PublicNodeAssetDto,
  PublicNodeDto,
  PublicOrderDto,
} from './types.js';

let diamondContextPromise: Promise<DiamondContext> | null = null;
let nodeRepositoryPromise: Promise<DiamondNodeRepository> | null = null;
let orderRepositoryPromise: Promise<OrderRepository> | null = null;

function getRpcUrl(): string {
  return NETWORK_CONFIGS[NEXT_PUBLIC_DEFAULT_CHAIN_ID]?.rpcUrl || '';
}

async function getDiamondContext(): Promise<DiamondContext> {
  if (!diamondContextPromise) {
    diamondContextPromise = (async () => {
      const context = new DiamondContext();
      await context.initializeReadOnly(getRpcUrl());
      return context;
    })();
  }

  return diamondContextPromise;
}

async function getNodeRepository(): Promise<DiamondNodeRepository> {
  if (!nodeRepositoryPromise) {
    nodeRepositoryPromise = (async () => {
      const context = await getDiamondContext();
      return new DiamondNodeRepository(context);
    })();
  }

  return nodeRepositoryPromise;
}

async function getOrderRepository(): Promise<OrderRepository> {
  if (!orderRepositoryPromise) {
    orderRepositoryPromise = (async () => {
      const provider = RpcProviderFactory.getReadOnlyProvider(
        NEXT_PUBLIC_DEFAULT_CHAIN_ID,
      );
      const contract = Ausys__factory.connect(
        NEXT_PUBLIC_AUSYS_ADDRESS,
        provider,
      ) as Ausys;
      const signer = new ethers.VoidSigner(ethers.ZeroAddress, provider);

      return new OrderRepository(
        contract,
        provider as unknown as any,
        signer,
      );
    })();
  }

  return orderRepositoryPromise;
}

function isZeroAddress(value: string | undefined): boolean {
  return /^0x0{40}$/i.test(value ?? '');
}

function isZeroBytes32(value: string | undefined): boolean {
  return /^0x0{64}$/i.test(value ?? '');
}

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('not found');
}

function mapJourneyToDto(journey: Journey): PublicJourneyDto {
  return {
    journeyId: journey.journeyId,
    status: journey.currentStatus,
    sender: journey.sender,
    receiver: journey.receiver,
    driver: journey.driver,
    journeyStart: journey.journeyStart.toString(),
    journeyEnd: journey.journeyEnd.toString(),
    bounty: journey.bounty.toString(),
    eta: journey.ETA.toString(),
    parcelData: journey.parcelData,
  };
}

async function getSellableQuantity(
  context: DiamondContext,
  owner: string,
  tokenId: bigint,
  nodeId: string,
): Promise<bigint> {
  const diamond = context.getDiamond();

  try {
    const [nodeHashes, amounts] = await diamond.getOwnerNodeSellableBalances(
      owner,
      tokenId,
    );
    const matchIndex = (nodeHashes as string[]).findIndex(
      (hash) => hash.toLowerCase() === nodeId.toLowerCase(),
    );

    if (matchIndex >= 0) {
      return BigInt(amounts[matchIndex].toString());
    }

    return 0n;
  } catch {
    const amount = await diamond.getNodeSellableAmount(owner, tokenId, nodeId);
    return BigInt(amount.toString());
  }
}

export async function getPublicNodeById(
  nodeId: string,
): Promise<PublicNodeDto | null> {
  const [context, nodeRepository] = await Promise.all([
    getDiamondContext(),
    getNodeRepository(),
  ]);
  const node = await nodeRepository.getNode(nodeId);

  if (!node) {
    return null;
  }

  const diamond = context.getDiamond();
  const assets = await Promise.all(
    node.assets.map(async (asset) => {
      const tokenId = BigInt(asset.tokenId);
      const [sellableQuantity, custodyQuantity] = await Promise.all([
        getSellableQuantity(context, node.owner, tokenId, nodeId),
        diamond.getNodeCustodyInfo(tokenId, nodeId),
      ]);

      return {
        token: asset.token,
        tokenId: asset.tokenId,
        price: asset.price.toString(),
        capacity: String(asset.capacity),
        sellableQuantity: sellableQuantity.toString(),
        custodyQuantity: BigInt(custodyQuantity.toString()).toString(),
      } satisfies PublicNodeAssetDto;
    }),
  );

  return {
    nodeId,
    owner: node.owner,
    status: node.status,
    validNode: node.validNode,
    location: {
      addressName: node.location.addressName,
      lat: node.location.location.lat,
      lng: node.location.location.lng,
    },
    assets,
  };
}

export async function getPublicOrderById(
  orderId: string,
): Promise<PublicOrderDto | null> {
  const orderRepository = await getOrderRepository();

  let order;
  try {
    order = await orderRepository.getOrderById(orderId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }

  if (!order || isZeroBytes32(order.id)) {
    return null;
  }

  if (
    isZeroAddress(order.token) &&
    isZeroAddress(order.buyer) &&
    isZeroAddress(order.seller)
  ) {
    return null;
  }

  const journeys = (
    await Promise.all(
      order.journeyIds.map(async (journeyId) => {
        try {
          const journey = await orderRepository.getJourneyById(journeyId);
          return mapJourneyToDto(journey);
        } catch {
          return null;
        }
      }),
    )
  ).filter((journey): journey is PublicJourneyDto => journey !== null);

  return {
    orderId: order.id,
    token: order.token,
    tokenId: order.tokenId,
    tokenQuantity: order.tokenQuantity,
    price: order.price,
    txFee: order.txFee,
    buyer: order.buyer,
    seller: order.seller,
    status: order.currentStatus,
    contractualAgreement: order.contractualAgreement,
    isP2P: order.isP2P ?? false,
    createdAt: order.createdAt,
    journeyIds: order.journeyIds,
    nodes: order.nodes,
    locationData: order.locationData,
    journeys,
  };
}
