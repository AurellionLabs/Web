import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyStatus } from '@/domain/shared';
import { OrderStatus } from '@/domain/orders/order';

const mockOrderRepository = {
  getP2POrderById: vi.fn(),
  getUnifiedOrderById: vi.fn(),
  getJourneyById: vi.fn(),
};

vi.mock('@/config/network', () => ({
  NETWORK_CONFIGS: {
    84532: { rpcUrl: 'http://rpc.local' },
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AUSYS_ADDRESS: '0x0000000000000000000000000000000000000001',
  NEXT_PUBLIC_DEFAULT_CHAIN_ID: 84532,
}));

vi.mock('@/infrastructure/diamond/diamond-context', () => ({
  DiamondContext: class {},
}));

vi.mock('@/infrastructure/diamond/diamond-node-repository', () => ({
  DiamondNodeRepository: class {},
}));

vi.mock('@/infrastructure/providers/rpc-provider-factory', () => ({
  RpcProviderFactory: {
    getReadOnlyProvider: vi.fn(() => ({})),
  },
}));

vi.mock('@/infrastructure/repositories/orders-repository', () => ({
  OrderRepository: class {
    constructor() {
      return mockOrderRepository;
    }
  },
}));

vi.mock('@/lib/contracts', () => ({
  Ausys__factory: {
    connect: vi.fn(() => ({})),
  },
}));

async function loadReadService() {
  vi.resetModules();
  return import('@core/public-api/read-service');
}

describe('public-api read-service getPublicOrderById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers a P2P order result when both sources are available', async () => {
    mockOrderRepository.getP2POrderById.mockResolvedValue({
      id: '0xP2POrder1',
      token: '0xToken1',
      tokenId: '123',
      tokenQuantity: '5',
      price: '1000',
      txFee: '0',
      buyer: '0xBuyer1',
      seller: '0xSeller1',
      journeyIds: ['0xJourney1'],
      nodes: [],
      currentStatus: OrderStatus.CREATED,
      contractualAgreement: '',
      isP2P: true,
      createdAt: 1700000000,
    });
    mockOrderRepository.getUnifiedOrderById.mockResolvedValue({
      id: '0xP2POrder1',
      token: '0xToken2',
      tokenId: '999',
      tokenQuantity: '8',
      price: '2000',
      txFee: '0',
      buyer: '0xUnifiedBuyer',
      seller: '0xUnifiedSeller',
      journeyIds: [],
      nodes: ['0xNode1'],
      currentStatus: OrderStatus.PROCESSING,
      contractualAgreement: '',
      isP2P: false,
      createdAt: 1700000100,
    });
    mockOrderRepository.getJourneyById.mockResolvedValue({
      journeyId: '0xJourney1',
      currentStatus: JourneyStatus.PENDING,
      sender: '0xSender',
      receiver: '0xReceiver',
      driver: '0xDriver',
      bounty: 1n,
      journeyStart: 0n,
      journeyEnd: 0n,
      ETA: 10n,
      parcelData: {
        startLocation: { lat: '0', lng: '0' },
        endLocation: { lat: '1', lng: '1' },
        startName: 'Start',
        endName: 'End',
      },
    });

    const { getPublicOrderById } = await loadReadService();
    const result = await getPublicOrderById('0xP2POrder1');

    expect(result?.orderSource).toBe('p2p');
    expect(result?.isP2P).toBe(true);
    expect(result?.journeys).toHaveLength(1);
    expect(mockOrderRepository.getUnifiedOrderById).not.toHaveBeenCalled();
  });

  it('falls back to unified orders when P2P lookup misses', async () => {
    mockOrderRepository.getP2POrderById.mockResolvedValue(null);
    mockOrderRepository.getUnifiedOrderById.mockResolvedValue({
      id: '0xUnifiedOrder1',
      token: '0xToken1',
      tokenId: '123',
      tokenQuantity: '5',
      price: '1000',
      txFee: '0',
      buyer: '0xBuyer1',
      seller: '0xSeller1',
      journeyIds: [],
      nodes: ['0xNode1'],
      currentStatus: OrderStatus.PROCESSING,
      contractualAgreement: '',
      isP2P: false,
      createdAt: 1700000000,
    });

    const { getPublicOrderById } = await loadReadService();
    const result = await getPublicOrderById('0xUnifiedOrder1');

    expect(result?.orderSource).toBe('unified');
    expect(result?.isP2P).toBe(false);
    expect(mockOrderRepository.getUnifiedOrderById).toHaveBeenCalledWith(
      '0xUnifiedOrder1',
    );
  });

  it('returns null when neither source resolves the order id', async () => {
    mockOrderRepository.getP2POrderById.mockResolvedValue(null);
    mockOrderRepository.getUnifiedOrderById.mockResolvedValue(null);

    const { getPublicOrderById } = await loadReadService();
    const result = await getPublicOrderById('0xMissingOrder');

    expect(result).toBeNull();
  });
});
