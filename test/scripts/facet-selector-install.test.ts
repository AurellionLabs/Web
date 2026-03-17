import { planFacetSelectorAdditions } from '@/scripts/lib/facet-selector-install';

describe('planFacetSelectorAdditions', () => {
  it('adds only selectors that are not already active on the diamond', () => {
    const result = planFacetSelectorAdditions({
      selectors: ['0xaaaa0001', '0xbbbb0002', '0xcccc0003'],
      activeSelectors: ['0xbbbb0002'],
    });

    expect(result).toEqual({
      selectorsToAdd: ['0xaaaa0001', '0xcccc0003'],
      duplicateCount: 0,
      alreadyInstalledCount: 1,
    });
  });

  it('removes duplicate selectors before planning additions', () => {
    const result = planFacetSelectorAdditions({
      selectors: ['0xaaaa0001', '0xAAAA0001', '0xbbbb0002'],
      activeSelectors: [],
    });

    expect(result).toEqual({
      selectorsToAdd: ['0xaaaa0001', '0xbbbb0002'],
      duplicateCount: 1,
      alreadyInstalledCount: 0,
    });
  });

  it('treats selectors added earlier in the same facet as active', () => {
    const result = planFacetSelectorAdditions({
      selectors: ['0xaaaa0001', '0xbbbb0002', '0xBBBB0002'],
      activeSelectors: ['0xcccc0003'],
    });

    expect(result).toEqual({
      selectorsToAdd: ['0xaaaa0001', '0xbbbb0002'],
      duplicateCount: 1,
      alreadyInstalledCount: 0,
    });
  });
});
