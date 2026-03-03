/**
 * P2POrderFlow Component Tests
 *
 * Tests the P2P order lifecycle step indicator and action buttons.
 * Verifies correct step rendering, status messages, and user actions
 * based on order state and signature status.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import { OrderStatus } from '@/domain/orders/order';
import { OrderWithAsset } from '@/app/types/shared';

// =============================================================================
// MOCKS
// =============================================================================

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock GlowButton to a simple button for testing
vi.mock('@/app/components/ui/glow-button', () => ({
  GlowButton: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check" />,
  Clock: () => <span data-testid="icon-clock" />,
  Truck: () => <span data-testid="icon-truck" />,
  Package: () => <span data-testid="icon-package" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Pen: () => <span data-testid="icon-pen" />,
  ArrowRight: () => <span data-testid="icon-arrow" />,
  PackageCheck: () => <span data-testid="icon-package-check" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  Flame: () => <span data-testid="icon-flame" />,
  MapPin: () => <span data-testid="icon-mappin" />,
  Plus: () => <span data-testid="icon-plus" />,
}));

// Mock nodes provider
vi.mock('@/app/providers/nodes.provider', () => ({
  useNodes: () => ({
    nodes: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

// Mock settlement destination hook
vi.mock('@/hooks/useSettlementDestination', () => ({
  useSettlementDestination: () => ({
    selectDestination: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  }),
}));

// Mock SettlementDestinationModal to avoid router context issues in tests
vi.mock('@/app/components/settlement/SettlementDestinationModal', () => ({
  SettlementDestinationModal: ({
    isOpen,
    orderId,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    orderId: string;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="settlement-modal">
        <span>Mock Settlement Modal for order {orderId}</span>
        <button onClick={onClose}>Close</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    ) : null,
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeOrder(overrides: Partial<OrderWithAsset> = {}): OrderWithAsset {
  return {
    id: '0xorder1',
    token: '0xtoken',
    tokenId: '100',
    tokenQuantity: '10',
    price: '5000000',
    txFee: '0',
    buyer: '0xbuyer',
    seller: '0xseller',
    journeyIds: [],
    nodes: [],
    currentStatus: OrderStatus.PROCESSING,
    contractualAgreement: '',
    isP2P: true,
    journeyStatus: null,
    asset: null,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('P2POrderFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all 5 step labels', () => {
    render(<P2POrderFlow order={makeOrder()} />);

    expect(screen.getByText('Accepted')).toBeDefined();
    expect(screen.getByText('Journey')).toBeDefined();
    expect(screen.getByText('In Transit')).toBeDefined();
    expect(screen.getByText('Delivery')).toBeDefined();
    expect(screen.getByText('Settled')).toBeDefined();
  });

  it('should show waiting message when no journey exists', () => {
    const order = makeOrder({ journeyIds: [], journeyStatus: null });
    render(<P2POrderFlow order={order} />);

    expect(screen.getByText(/no delivery journey yet/i)).toBeDefined();
  });

  it('should show journey created message when journey exists with status 0', () => {
    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 0,
    });
    render(<P2POrderFlow order={order} />);

    expect(
      screen.getByText(/journey created.*waiting for.*sign/i),
    ).toBeDefined();
  });

  it('should show sign for delivery button when journey is in transit and buyer has not signed', async () => {
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: false,
      driverDeliverySigned: false,
    });

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(
      <P2POrderFlow
        order={order}
        fetchSignatureState={fetchSig}
        onSignDelivery={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Sign for Delivery')).toBeDefined();
    });
  });

  it('should show buyer signed badge after fetchSignatureState returns buyerSigned=true', async () => {
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: true,
      driverDeliverySigned: false,
    });

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(<P2POrderFlow order={order} fetchSignatureState={fetchSig} />);

    await waitFor(() => {
      expect(screen.getByText('Customer: Signed')).toBeDefined();
      expect(screen.getByText('Driver: Pending')).toBeDefined();
    });
  });

  it('should show settling message when both parties have signed', async () => {
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: true,
      driverDeliverySigned: true,
    });

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(<P2POrderFlow order={order} fetchSignatureState={fetchSig} />);

    await waitFor(() => {
      expect(screen.getByText(/both parties have signed/i)).toBeDefined();
    });
  });

  it('should show settled message for settled orders', () => {
    const order = makeOrder({
      currentStatus: OrderStatus.SETTLED,
      journeyIds: ['0xjourney1'],
      journeyStatus: 2,
    });

    render(<P2POrderFlow order={order} />);

    expect(screen.getByText(/order is settled/i)).toBeDefined();
  });

  it('should call onSignDelivery when sign button is clicked', async () => {
    const onSign = vi.fn().mockResolvedValue(undefined);
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: false,
      driverDeliverySigned: false,
    });

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(
      <P2POrderFlow
        order={order}
        onSignDelivery={onSign}
        fetchSignatureState={fetchSig}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Sign for Delivery')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sign for Delivery'));

    await waitFor(() => {
      expect(onSign).toHaveBeenCalledWith('0xorder1', '0xjourney1');
    });
  });

  it('should not show any manual handoff button (handOff is auto-attempted)', async () => {
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: true,
      driverDeliverySigned: true,
    });

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(<P2POrderFlow order={order} fetchSignatureState={fetchSig} />);

    await waitFor(() => {
      expect(screen.getByText(/both parties have signed/i)).toBeDefined();
    });

    // No "Complete Handoff" button should exist
    expect(screen.queryByText('Complete Handoff')).toBeNull();
  });

  it('should display error message when sign action fails', async () => {
    const onSign = vi.fn().mockRejectedValue(new Error('Contract revert'));
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: false,
      driverDeliverySigned: false,
    });

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(
      <P2POrderFlow
        order={order}
        onSignDelivery={onSign}
        fetchSignatureState={fetchSig}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Sign for Delivery')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Sign for Delivery'));

    await waitFor(() => {
      expect(screen.getByText('Contract revert')).toBeDefined();
    });
  });

  it('should not show action buttons for settled orders', async () => {
    const fetchSig = vi.fn().mockResolvedValue({
      buyerSigned: true,
      driverDeliverySigned: true,
    });

    const order = makeOrder({
      currentStatus: OrderStatus.SETTLED,
      journeyIds: ['0xjourney1'],
      journeyStatus: 2,
    });

    render(
      <P2POrderFlow
        order={order}
        onSignDelivery={vi.fn()}
        onCompleteHandoff={vi.fn()}
        fetchSignatureState={fetchSig}
      />,
    );

    // Wait for any async effects
    await waitFor(() => {
      expect(screen.getByText(/order is settled/i)).toBeDefined();
    });

    // No action buttons should be present
    expect(screen.queryByText('Sign for Delivery')).toBeNull();
    expect(screen.queryByText('Complete Handoff')).toBeNull();
  });

  it('should show loading state while checking delivery status', () => {
    // Use a fetch that never resolves to keep loading state
    const fetchSig = vi.fn().mockReturnValue(new Promise(() => {}));

    const order = makeOrder({
      journeyIds: ['0xjourney1'],
      journeyStatus: 1,
    });

    render(<P2POrderFlow order={order} fetchSignatureState={fetchSig} />);

    expect(screen.getByText(/checking delivery status/i)).toBeDefined();
  });
});
