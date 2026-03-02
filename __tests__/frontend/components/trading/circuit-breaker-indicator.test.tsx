/**
 * Tests for CircuitBreakerIndicator component
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CircuitBreakerIndicator } from '@/app/components/trading/circuit-breaker-indicator';
import { CircuitBreaker, CircuitBreakerStatus } from '@/domain/clob/clob';

const baseCircuitBreaker: CircuitBreaker = {
  marketId: '0xmarket',
  lastPrice: '1000000000000000000',
  priceChangeThreshold: 1000, // 10%
  cooldownPeriod: 3600,
  tripTimestamp: 0,
  status: CircuitBreakerStatus.ACTIVE,
  isEnabled: true,
};

describe('CircuitBreakerIndicator', () => {
  it('renders nothing when circuitBreaker is null', () => {
    const { container } = render(
      <CircuitBreakerIndicator circuitBreaker={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when isEnabled is false', () => {
    const cb: CircuitBreaker = { ...baseCircuitBreaker, isEnabled: false };
    const { container } = render(
      <CircuitBreakerIndicator circuitBreaker={cb} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows CB ACTIVE label when status is ACTIVE', () => {
    render(<CircuitBreakerIndicator circuitBreaker={baseCircuitBreaker} />);
    expect(screen.getByText('CB ACTIVE')).toBeTruthy();
  });

  it('shows CIRCUIT TRIPPED label when status is TRIPPED', () => {
    const cb: CircuitBreaker = {
      ...baseCircuitBreaker,
      status: CircuitBreakerStatus.TRIPPED,
    };
    render(<CircuitBreakerIndicator circuitBreaker={cb} />);
    expect(screen.getByText('CIRCUIT TRIPPED')).toBeTruthy();
    expect(screen.getByText('Trading halted')).toBeTruthy();
  });

  it('shows COOLDOWN label when status is COOLDOWN', () => {
    const cb: CircuitBreaker = {
      ...baseCircuitBreaker,
      status: CircuitBreakerStatus.COOLDOWN,
      tripTimestamp: Math.floor(Date.now() / 1000) - 300, // tripped 5m ago
    };
    render(<CircuitBreakerIndicator circuitBreaker={cb} />);
    expect(screen.getByText('COOLDOWN')).toBeTruthy();
  });

  it('displays threshold percentage in expanded mode', () => {
    render(
      <CircuitBreakerIndicator
        circuitBreaker={baseCircuitBreaker}
        compact={false}
      />,
    );
    // 1000 bps = 10.0%
    expect(screen.getByText('±10.0%')).toBeTruthy();
  });

  it('compact mode renders inline badge', () => {
    const { container } = render(
      <CircuitBreakerIndicator circuitBreaker={baseCircuitBreaker} compact />,
    );
    // Compact renders a div with a clip-path inline style
    const badge = container.firstChild as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.clipPath).toContain('polygon');
  });
});
