/**
 * Tests for MEVProtectionIndicator component
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MEVProtectionIndicator } from '@/app/components/trading/mev-protection-indicator';

describe('MEVProtectionIndicator', () => {
  it('renders nothing when requiresCommitReveal is null', () => {
    const { container } = render(
      <MEVProtectionIndicator requiresCommitReveal={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows MEV PROTECTED label when protection is enabled', () => {
    render(<MEVProtectionIndicator requiresCommitReveal={true} />);
    expect(screen.getByText('MEV PROTECTED')).toBeTruthy();
  });

  it('shows DIRECT ORDER label when protection is disabled', () => {
    render(<MEVProtectionIndicator requiresCommitReveal={false} />);
    expect(screen.getByText('DIRECT ORDER')).toBeTruthy();
  });

  it('shows reveal delay sublabel when minRevealDelay is provided', () => {
    render(
      <MEVProtectionIndicator requiresCommitReveal={true} minRevealDelay={2} />,
    );
    expect(screen.getByText('Reveal after 2 blocks')).toBeTruthy();
  });

  it('handles singular block correctly', () => {
    render(
      <MEVProtectionIndicator requiresCommitReveal={true} minRevealDelay={1} />,
    );
    expect(screen.getByText('Reveal after 1 block')).toBeTruthy();
  });

  it('compact mode renders inline badge with clip-path', () => {
    const { container } = render(
      <MEVProtectionIndicator requiresCommitReveal={true} compact />,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.clipPath).toContain('polygon');
  });

  it('shows commit-reveal required sublabel when minRevealDelay is not provided', () => {
    render(<MEVProtectionIndicator requiresCommitReveal={true} />);
    expect(screen.getByText('Commit-reveal required')).toBeTruthy();
  });
});
