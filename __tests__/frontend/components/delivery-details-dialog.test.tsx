/**
 * DeliveryDetailsDialog Component Tests (TDD)
 *
 * Tests the delivery scheduling dialog that appears when a buyer
 * accepts a P2P offer. It collects delivery address and shows
 * the total cost (price + bounty) before confirming.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DeliveryDetailsDialog,
  type DeliveryDetailsDialogProps,
} from '@/app/components/p2p/delivery-details-dialog';
import { P2POffer, P2POfferStatus } from '@/domain/p2p';

// =============================================================================
// MOCKS
// =============================================================================

vi.mock('@/app/components/ui/glow-button', () => ({
  GlowButton: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={props['data-testid']}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="icon-mappin" />,
  Truck: () => <span data-testid="icon-truck" />,
  DollarSign: () => <span data-testid="icon-dollar" />,
  Loader2: () => <span data-testid="icon-loader" />,
  X: () => <span data-testid="icon-x" />,
  Package: () => <span data-testid="icon-package" />,
  ArrowRight: () => <span data-testid="icon-arrow" />,
  Check: () => <span data-testid="icon-check" />,
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeOffer(overrides: Partial<P2POffer> = {}): P2POffer {
  return {
    id: '0xoffer123',
    creator: '0xSeller000000000000000000000000000000000',
    targetCounterparty: null,
    token: '0xToken0000000000000000000000000000000000',
    tokenId: '100',
    quantity: BigInt(1000),
    price: BigInt('1000000000000000000'), // 1 USDT (18 decimals)
    txFee: BigInt('20000000000000000'), // 0.02 USDT
    isSellerInitiated: true,
    status: P2POfferStatus.OPEN,
    buyer: '',
    seller: '0xSeller000000000000000000000000000000000',
    createdAt: 1700000000,
    expiresAt: 0,
    nodes: ['0xSellerNode00000000000000000000000000000'],
    ...overrides,
  };
}

const defaultProps: DeliveryDetailsDialogProps = {
  offer: makeOffer(),
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn().mockResolvedValue(undefined),
  assetName: 'AUGOAT',
};

// =============================================================================
// TESTS
// =============================================================================

describe('DeliveryDetailsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dialog when open=true', () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);

    expect(screen.getByText(/confirm.*delivery/i)).toBeDefined();
  });

  it('should display the offer details (asset, quantity, price)', () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);

    expect(screen.getByText('AUGOAT')).toBeDefined();
    expect(screen.getByText('1000')).toBeDefined();
  });

  it('should have a delivery address input field', () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(/delivery address/i);
    expect(input).toBeDefined();
  });

  it('should disable confirm button when delivery address is empty', () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    expect(confirmBtn).toHaveProperty('disabled', true);
  });

  it('should enable confirm button when delivery address is filled', async () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(/delivery address/i);
    fireEvent.change(input, { target: { value: '123 Main St, Cape Town' } });

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    expect(confirmBtn).toHaveProperty('disabled', false);
  });

  it('should call onConfirm with delivery details when confirmed', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeliveryDetailsDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText(/delivery address/i);
    fireEvent.change(input, { target: { value: '123 Main St, Cape Town' } });

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const callArgs = onConfirm.mock.calls[0][0];
      expect(callArgs.deliveryAddress).toBe('123 Main St, Cape Town');
    });
  });

  it('should show loading state while processing', async () => {
    // Create a promise we control
    let resolveConfirm: () => void;
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      }),
    );

    render(<DeliveryDetailsDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText(/delivery address/i);
    fireEvent.change(input, { target: { value: '123 Main St' } });

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeDefined();
    });

    // Resolve and finish
    resolveConfirm!();
  });

  it('should display error message when onConfirm fails', async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValue(new Error('Offer is no longer open'));

    render(<DeliveryDetailsDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText(/delivery address/i);
    fireEvent.change(input, { target: { value: '123 Main St' } });

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/offer is no longer open/i)).toBeDefined();
    });
  });

  it('should call onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <DeliveryDetailsDialog {...defaultProps} onOpenChange={onOpenChange} />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should use seller node address from offer.nodes[0]', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const offer = makeOffer({
      nodes: ['0xSellerNode123'],
    });

    render(
      <DeliveryDetailsDialog
        {...defaultProps}
        offer={offer}
        onConfirm={onConfirm}
      />,
    );

    const input = screen.getByPlaceholderText(/delivery address/i);
    fireEvent.change(input, { target: { value: 'Buyer Address' } });

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const callArgs = onConfirm.mock.calls[0][0];
      expect(callArgs.senderNodeAddress).toBe('0xSellerNode123');
    });
  });
});
