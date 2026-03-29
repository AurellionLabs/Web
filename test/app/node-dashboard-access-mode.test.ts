import { describe, expect, it } from 'vitest';

import { isNodeDashboardReadOnly } from '@/app/(app)/node/dashboard/access-mode';

describe('isNodeDashboardReadOnly', () => {
  it('returns false when the connected wallet owns the selected node', () => {
    expect(
      isNodeDashboardReadOnly({
        viewMode: null,
        diamondIsReadOnly: false,
        walletAddress: '0xabc',
        ownerAddress: '0xAbC',
      }),
    ).toBe(false);
  });

  it('returns true when the connected wallet does not own the selected node', () => {
    expect(
      isNodeDashboardReadOnly({
        viewMode: null,
        diamondIsReadOnly: false,
        walletAddress: '0xabc',
        ownerAddress: '0xdef',
      }),
    ).toBe(true);
  });

  it('returns true for public mode even when the owner is connected', () => {
    expect(
      isNodeDashboardReadOnly({
        viewMode: 'public',
        diamondIsReadOnly: false,
        walletAddress: '0xabc',
        ownerAddress: '0xabc',
      }),
    ).toBe(true);
  });
});
