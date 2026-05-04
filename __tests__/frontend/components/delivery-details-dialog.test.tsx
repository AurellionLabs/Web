import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  DeliveryDetailsDialog,
  type DeliveryDetailsDialogProps,
} from '@/app/components/p2p/delivery-details-dialog';
import { P2POfferStatus, type P2POffer } from '@/domain/p2p';

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: false }),
  Autocomplete: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/app/components/eva/eva-components', () => ({
  TrapButton: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/app/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select
      data-testid="pickup-node-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="" disabled>
      {placeholder || 'Select'}
    </option>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="icon-mappin" />,
  Truck: () => <span data-testid="icon-truck" />,
  Package: () => <span data-testid="icon-package" />,
  Network: () => <span data-testid="icon-network" />,
  X: () => <span data-testid="icon-x" />,
}));

vi.mock('@/hooks/useQuoteTokenMetadata', () => ({
  useQuoteTokenMetadata: () => ({
    address: '0x00000000000000000000000000000000000000aa',
    decimals: 18,
    symbol: 'AURA',
    refresh: vi.fn(),
  }),
}));

function makeOffer(overrides: Partial<P2POffer> = {}): P2POffer {
  return {
    id: '0xoffer123',
    creator: '0x1111111111111111111111111111111111111111',
    targetCounterparty: null,
    token: '0xToken0000000000000000000000000000000000',
    tokenId: '100',
    quantity: BigInt(2),
    price: BigInt('1000000000000000000'),
    txFee: BigInt('20000000000000000'),
    isSellerInitiated: true,
    status: P2POfferStatus.OPEN,
    buyer: '',
    seller: '0x2222222222222222222222222222222222222222',
    createdAt: 1700000000,
    expiresAt: 0,
    nodes: ['0xNodeRef'],
    ...overrides,
  };
}

const defaultProps: DeliveryDetailsDialogProps = {
  offer: makeOffer(),
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn().mockResolvedValue(undefined),
  assetName: 'AUGOAT',
  initialDeliveryAddress: '123 Main St',
  lockDeliveryAddress: true,
};

describe('DeliveryDetailsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open=true', () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);
    expect(screen.getByText(/confirm.*delivery/i)).toBeInTheDocument();
  });

  it('does not show fulfillment node selector by default', () => {
    render(<DeliveryDetailsDialog {...defaultProps} />);
    expect(screen.queryByText(/fulfillment node/i)).not.toBeInTheDocument();
  });

  it('shows fulfillment node selector when required and options are provided', () => {
    render(
      <DeliveryDetailsDialog
        {...defaultProps}
        requirePickupNodeSelection
        pickupNodeOptions={[
          {
            pickupNodeRef: '0xnode-ref-1',
            senderNodeAddress: '0x3333333333333333333333333333333333333333',
            label: 'Node 1',
            startName: 'Node One Address',
            startLocation: { lat: '1.1', lng: '2.2' },
          },
        ]}
      />,
    );

    expect(screen.getByText(/fulfillment node/i)).toBeInTheDocument();
    expect(screen.getByTestId('pickup-node-select')).toBeInTheDocument();
  });

  it('uses seller address as sender when pickup node selection is not required', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeliveryDetailsDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      senderNodeAddress: '0x2222222222222222222222222222222222222222',
      pickupNodeRef: undefined,
      pickupStartName: undefined,
      pickupStartLocation: undefined,
    });
  });

  it('sends selected pickup metadata when pickup node selection is required', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeliveryDetailsDialog
        {...defaultProps}
        onConfirm={onConfirm}
        requirePickupNodeSelection
        pickupNodeOptions={[
          {
            pickupNodeRef: '0xnode-ref-1',
            senderNodeAddress: '0x4444444444444444444444444444444444444444',
            label: 'Node 1',
            startName: 'Node One Address',
            startLocation: { lat: '11.11', lng: '22.22' },
          },
        ]}
      />,
    );

    const confirmBtn = screen.getByRole('button', {
      name: /accept.*schedule/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      senderNodeAddress: '0x4444444444444444444444444444444444444444',
      pickupNodeRef: '0xnode-ref-1',
      pickupStartName: 'Node One Address',
      pickupStartLocation: { lat: '11.11', lng: '22.22' },
    });
  });

  it('disables confirmation when pickup node selection is required but no options exist', () => {
    render(
      <DeliveryDetailsDialog
        {...defaultProps}
        requirePickupNodeSelection
        pickupNodeOptions={[]}
      />,
    );

    expect(
      screen.getByText(/no eligible fulfillment nodes found/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /accept.*schedule/i }),
    ).toBeDisabled();
  });
});
