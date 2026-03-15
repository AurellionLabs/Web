import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PulsingHexNetwork } from '@/app/components/eva/eva-animations';

describe('PulsingHexNetwork', () => {
  it('does not render demo nodes when no topology data is provided', () => {
    render(<PulsingHexNetwork />);

    expect(screen.queryByText('NODE-01')).not.toBeInTheDocument();
    expect(screen.queryByText('NODE-07')).not.toBeInTheDocument();
  });

  it('renders an add-node affordance for an explicitly empty topology', () => {
    const onAddNode = vi.fn();

    render(<PulsingHexNetwork nodes={[]} onAddNode={onAddNode} />);

    fireEvent.click(screen.getByText('ADD NODE'));

    expect(onAddNode).toHaveBeenCalledTimes(1);
  });
});
