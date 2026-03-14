import type { Journey } from '@/domain/shared';
import * as NetworkModule from '@/config/network';
import * as ChainConstantsModule from '@/chain-constants';
import * as DiamondContextModule from '@/infrastructure/diamond/diamond-context';
import * as DiamondNodeRepositoryModule from '@/infrastructure/diamond/diamond-node-repository';
import * as RpcProviderFactoryModule from '@/infrastructure/providers/rpc-provider-factory';
import * as OrderRepositoryModule from '@/infrastructure/repositories/orders-repository';
import * as ContractsModule from '@/lib/contracts/index';
import type { Ausys } from '@/lib/contracts/index';
import { ethers } from 'ethers';

import type {
  PublicJourneyDto,
  PublicNodeAssetDto,
  PublicNodeDto,
  PublicOrderDto,
} from './types.js';

let diamondContextPromise: Promise<DiamondContextInstance> | null = null;
let nodeRepositoryPromise: Promise<DiamondNodeRepositoryInstance> | null = null;
let orderRepositoryPromise: Promise<OrderRepositoryInstance> | null = null;

const NETWORK_CONFIGS =
  (NetworkModule as { NETWORK_CONFIGS?: Record<number, { rpcUrl: string }> })
    .NETWORK_CONFIGS ??
  (
    NetworkModule as {
      default?: { NETWORK_CONFIGS?: Record<number, { rpcUrl: string }> };
    }
  ).default?.NETWORK_CONFIGS ??
  {};

const NEXT_PUBLIC_AUSYS_ADDRESS =
  (ChainConstantsModule as { NEXT_PUBLIC_AUSYS_ADDRESS?: string })
    .NEXT_PUBLIC_AUSYS_ADDRESS ??
  (
    ChainConstantsModule as {
      default?: { NEXT_PUBLIC_AUSYS_ADDRESS?: string };
    }
  ).default?.NEXT_PUBLIC_AUSYS_ADDRESS ??
  '';

const NEXT_PUBLIC_DEFAULT_CHAIN_ID =
  (ChainConstantsModule as { NEXT_PUBLIC_DEFAULT_CHAIN_ID?: number })
    .NEXT_PUBLIC_DEFAULT_CHAIN_ID ??
  (
    ChainConstantsModule as {
      default?: { NEXT_PUBLIC_DEFAULT_CHAIN_ID?: number };
    }
  ).default?.NEXT_PUBLIC_DEFAULT_CHAIN_ID ??
  84532;

const DiamondContext =
  (DiamondContextModule as {
    DiamondContext?: new () => DiamondContextInstance;
  }).DiamondContext ??
  (
    DiamondContextModule as {
      default?: { DiamondContext?: new () => DiamondContextInstance };
    }
  ).default?.DiamondContext;

const DiamondNodeRepository =
  (DiamondNodeRepositoryModule as {
    DiamondNodeRepository?: new (
      context: DiamondContextInstance,
    ) => DiamondNodeRepositoryInstance;
  }).DiamondNodeRepository ??
  (
    DiamondNodeRepositoryModule as {
      default?: {
        DiamondNodeRepository?: new (
          context: DiamondContextInstance,
        ) => DiamondNodeRepositoryInstance;
      };
    }
  ).default?.DiamondNodeRepository;

const RpcProviderFactory =
  (RpcProviderFactoryModule as {
    RpcProviderFactory?: {
      getReadOnlyProvider: (chainId: number) => ethers.Provider;
    };
  }).RpcProviderFactory ??
  (
    RpcProviderFactoryModule as {
      default?: {
        RpcProviderFactory?: {
          getReadOnlyProvider: (chainId: number) => ethers.Provider;
        };
      };
    }
  ).default?.RpcProviderFactory;

const OrderRepository =
  (OrderRepositoryModule as {
    OrderRepository?: new (
      contract: Ausys,
      provider: unknown,
      signer: ethers.VoidSigner,
    ) => OrderRepositoryInstance;
  }).OrderRepository ??
  (
    OrderRepositoryModule as {
      default?: {
        OrderRepository?: new (
          contract: Ausys,
          provider: unknown,
          signer: ethers.VoidSigner,
        ) => OrderRepositoryInstance;
      };
    }
  ).default?.OrderRepository;

const Ausys__factory =
  (ContractsModule as { Ausys__factory?: { connect: Function } }).Ausys__factory ??
  (
    ContractsModule as {
      default?: { Ausys__factory?: { connect: Function } };
    }
  ).default?.Ausys__factory;

type DiamondContextInstance = InstanceType<
  NonNullable<typeof DiamondContext>
>;
type DiamondNodeRepositoryInstance = InstanceType<
  NonNullable<typeof DiamondNodeRepository>
>;
type OrderRepositoryInstance = InstanceType<NonNullable<typeof OrderRepository>>;

function getRpcUrl(): string {
  return NETWORK_CONFIGS[NEXT_PUBLIC_DEFAULT_CHAIN_ID]?.rpcUrl || '';
}

async function getDiamondContext(): Promise<DiamondContextInstance> {
  if (!diamondContextPromise) {
    diamondContextPromise = (async () => {
      if (!DiamondContext) {
        throw new Error(
          'DiamondContext export is unavailable from shared module',
        );
      }

      const context = new DiamondContext();
      await context.initializeReadOnly(getRpcUrl());
      return context;
    })();
  }

  return diamondContextPromise;
}

async function getNodeRepository(): Promise<DiamondNodeRepositoryInstance> {
  if (!nodeRepositoryPromise) {
    nodeRepositoryPromise = (async () => {
      if (!DiamondNodeRepository) {
        throw new Error(
          'DiamondNodeRepository export is unavailable from shared module',
        );
      }

      const context = await getDiamondContext();
      return new DiamondNodeRepository(context);
    })();
  }

  return nodeRepositoryPromise;
}

async function getOrderRepository(): Promise<OrderRepositoryInstance> {
  if (!orderRepositoryPromise) {
    orderRepositoryPromise = (async () => {
      if (!Ausys__factory) {
        throw new Error(
          'Ausys__factory export is unavailable from @/lib/contracts/index',
        );
      }
      if (!RpcProviderFactory) {
        throw new Error(
          'RpcProviderFactory export is unavailable from shared module',
        );
      }
      if (!OrderRepository) {
        throw new Error(
          'OrderRepository export is unavailable from shared module',
        );
      }

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
  context: DiamondContextInstance,
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
