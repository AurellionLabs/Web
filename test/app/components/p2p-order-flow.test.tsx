import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import type { P2PStepTransactionMap } from '@/app/components/p2p/p2p-order-step-transactions';
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

function makeStepTransactions(
  overrides: Partial<P2PStepTransactionMap> = {},
): P2PStepTransactionMap {
  return {
    accepted: [
      {
        txHash: '0xaccepted1234567890',
        timestamp: 1700000000,
        blockNumber: 100,
        eventLabels: ['Offer Accepted'],
        actorLabels: ['Acceptor'],
      },
    ],
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

  it('opens the step transaction modal for clickable steps', async () => {
    const user = userEvent.setup();
    const onOpenStepTransactions = vi.fn();

    render(
      <P2POrderFlow
        order={makeOrder()}
        stepTransactions={makeStepTransactions()}
        onOpenStepTransactions={onOpenStepTransactions}
        getTransactionHref={(txHash) => `https://explorer.test/tx/${txHash}`}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Accepted step' }));

    expect(onOpenStepTransactions).toHaveBeenCalledWith('accepted');
    expect(screen.getByText('Accepted Transactions')).toBeInTheDocument();
    expect(screen.getByText('Offer Accepted')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Offer Accepted/i }),
    ).toHaveAttribute('href', 'https://explorer.test/tx/0xaccepted1234567890');
  });

  it('leaves steps without known transactions disabled', () => {
    render(<P2POrderFlow order={makeOrder({ journeyIds: [] })} />);

    expect(screen.getByRole('button', { name: 'Journey step' })).toBeDisabled();
  });

  it('shows an empty state when a clickable step has no loaded transactions yet', async () => {
    const user = userEvent.setup();

    render(
      <P2POrderFlow order={makeOrder()} onOpenStepTransactions={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Accepted step' }));

    expect(screen.getByText('Accepted Transactions')).toBeInTheDocument();
    expect(
      screen.getByText('No transactions recorded for this step yet.'),
    ).toBeInTheDocument();
  });
});
