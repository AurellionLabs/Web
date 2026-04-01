import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import { OrderStatus } from '@/domain/orders/order';
import type { OrderWithAsset } from '@/app/types/shared';

vi.mock('@/app/components/settlement/SettlementDestinationModal', () => ({
  SettlementDestinationModal: () => null,
}));

function makeOrder(overrides: Partial<OrderWithAsset> = {}): OrderWithAsset {
  return {
    id: '0xorder1',
    token: '0xtoken',
    tokenId: '1',
    tokenQuantity: '10',
    price: '5000',
    txFee: '0',
    buyer: '0xbuyer',
    seller: '0xseller',
    journeyIds: [],
    nodes: [],
    currentStatus: OrderStatus.PROCESSING,
    contractualAgreement: '',
    isP2P: true,
    journeyStatus: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    asset: null,
    ...overrides,
  };
}

describe('P2POrderFlow', () => {
  it('renders a terminal cancelled state with no delivery actions', () => {
    render(
      <P2POrderFlow
        order={makeOrder({ currentStatus: OrderStatus.CANCELLED })}
        onScheduleDelivery={vi.fn()}
        onSignPickup={vi.fn()}
        onSignDelivery={vi.fn()}
      />,
    );

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This P2P trade was cancelled before it could continue.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Schedule Delivery')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign for Pickup')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign for Delivery')).not.toBeInTheDocument();
  });

  it('keeps the unmatched open-offer messaging for step-zero offers', () => {
    render(
      <P2POrderFlow
        order={makeOrder({
          currentStatus: OrderStatus.CREATED,
          seller: '0x0000000000000000000000000000000000000000',
        })}
      />,
    );

    expect(
      screen.getByText(
        'Open offer — waiting for a seller to accept before delivery can be scheduled.',
      ),
    ).toBeInTheDocument();
  });
});
