import type { Journey } from '@/domain/shared';
import * as NetworkModule from '@/config/network';
import * as ChainConstantsModule from '@/chain-constants';
import * as DiamondContextModule from '@/infrastructure/diamond/diamond-context';
import * as DiamondNodeRepositoryModule from '@/infrastructure/diamond/diamond-node-repository';
import * as RpcProviderFactoryModule from '@/infrastructure/providers/rpc-provider-factory';
import * as OrderRepositoryModule from '@/infrastructure/repositories/orders-repository';
import * as ContractsModule from '@/lib/contracts/index';
import type { DiamondContext as DiamondContextType } from '@/infrastructure/diamond/diamond-context';
import type { DiamondNodeRepository as DiamondNodeRepositoryType } from '@/infrastructure/diamond/diamond-node-repository';
import type { OrderRepository as OrderRepositoryType } from '@/infrastructure/repositories/orders-repository';
import type { Ausys } from '@/lib/contracts/index';
import { ethers } from 'ethers';

import type {
  PublicJourneyDto,
  PublicNodeAssetDto,
  PublicNodeDto,
  PublicOrderDto,
} from './types.js';

type AusysFactory = {
  connect: (address: string, signerOrProvider: ethers.Provider) => Ausys;
};

type DiamondContextCtor = new () => DiamondContextType;
type DiamondNodeRepositoryCtor = new (
  context: DiamondContextType,
) => DiamondNodeRepositoryType;
type RpcProviderFactoryLike = {
  getReadOnlyProvider: (chainId: number) => ethers.Provider;
};
type OrderRepositoryCtor = new (
  contract: Ausys,
  provider: unknown,
  signer: ethers.VoidSigner,
) => OrderRepositoryType;

function resolveNamedExport<T>(
  module: unknown,
  exportName: string,
  moduleName: string,
): T {
  const moduleObject = module as {
    [key: string]: unknown;
    default?: { [key: string]: unknown };
  };
  const resolved =
    moduleObject[exportName] ?? moduleObject.default?.[exportName];
  if (resolved === undefined) {
    throw new Error(`${exportName} export is unavailable from ${moduleName}`);
  }
  return resolved as T;
}

const NETWORK_CONFIGS = resolveNamedExport<Record<number, { rpcUrl: string }>>(
  NetworkModule,
  'NETWORK_CONFIGS',
  '@/config/network',
);
const NEXT_PUBLIC_AUSYS_ADDRESS = resolveNamedExport<string>(
  ChainConstantsModule,
  'NEXT_PUBLIC_AUSYS_ADDRESS',
  '@/chain-constants',
);
const NEXT_PUBLIC_DEFAULT_CHAIN_ID = resolveNamedExport<number>(
  ChainConstantsModule,
  'NEXT_PUBLIC_DEFAULT_CHAIN_ID',
  '@/chain-constants',
);
const DiamondContextCtor = resolveNamedExport<DiamondContextCtor>(
  DiamondContextModule,
  'DiamondContext',
  '@/infrastructure/diamond/diamond-context',
);
const DiamondNodeRepositoryCtor = resolveNamedExport<DiamondNodeRepositoryCtor>(
  DiamondNodeRepositoryModule,
  'DiamondNodeRepository',
  '@/infrastructure/diamond/diamond-node-repository',
);
const RpcProviderFactory = resolveNamedExport<RpcProviderFactoryLike>(
  RpcProviderFactoryModule,
  'RpcProviderFactory',
  '@/infrastructure/providers/rpc-provider-factory',
);
const OrderRepositoryCtor = resolveNamedExport<OrderRepositoryCtor>(
  OrderRepositoryModule,
  'OrderRepository',
  '@/infrastructure/repositories/orders-repository',
);
const AusysFactory = resolveNamedExport<AusysFactory>(
  ContractsModule,
  'Ausys__factory',
  '@/lib/contracts/index',
);

let diamondContextPromise: Promise<DiamondContextType> | null = null;
let nodeRepositoryPromise: Promise<DiamondNodeRepositoryType> | null = null;
let orderRepositoryPromise: Promise<OrderRepositoryType> | null = null;

function getRpcUrl(): string {
  return NETWORK_CONFIGS[NEXT_PUBLIC_DEFAULT_CHAIN_ID]?.rpcUrl || '';
}

async function getDiamondContext(): Promise<DiamondContextType> {
  if (!diamondContextPromise) {
    diamondContextPromise = (async () => {
      const context = new DiamondContextCtor();
      await context.initializeReadOnly(getRpcUrl());
      return context;
    })();
  }

  return diamondContextPromise;
}

async function getNodeRepository(): Promise<DiamondNodeRepositoryType> {
  if (!nodeRepositoryPromise) {
    nodeRepositoryPromise = (async () => {
      const context = await getDiamondContext();
      return new DiamondNodeRepositoryCtor(context);
    })();
  }

  return nodeRepositoryPromise;
}

async function getOrderRepository(): Promise<OrderRepositoryType> {
  if (!orderRepositoryPromise) {
    orderRepositoryPromise = (async () => {
      const provider = RpcProviderFactory.getReadOnlyProvider(
        NEXT_PUBLIC_DEFAULT_CHAIN_ID,
      );
      const contract = AusysFactory.connect(
        NEXT_PUBLIC_AUSYS_ADDRESS,
        provider,
      ) as Ausys;
      const signer = new ethers.VoidSigner(ethers.ZeroAddress, provider);

      return new OrderRepositoryCtor(
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
  context: DiamondContextType,
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
  let orderSource: PublicOrderDto['orderSource'] | null = null;
  try {
    order = await orderRepository.getP2POrderById(orderId);
    if (order) {
      orderSource = 'p2p';
    } else {
      order = await orderRepository.getUnifiedOrderById(orderId);
      if (order) {
        orderSource = 'unified';
      }
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }

  if (!order || !orderSource || isZeroBytes32(order.id)) {
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
    orderSource,
    token: order.token,
    tokenId: order.tokenId,
    tokenQuantity: order.tokenQuantity,
    price: order.price,
    txFee: order.txFee,
    buyer: order.buyer,
    seller: order.seller,
    status: order.currentStatus,
    contractualAgreement: order.contractualAgreement,
    isP2P: orderSource === 'p2p',
    createdAt: order.createdAt,
    journeyIds: order.journeyIds,
    nodes: order.nodes,
    locationData: order.locationData,
    journeys,
  };
}
