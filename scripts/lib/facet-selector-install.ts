export interface FacetSelectorInstallPlan {
  selectorsToAdd: string[];
  duplicateCount: number;
  alreadyInstalledCount: number;
}

export function planFacetSelectorAdditions(options: {
  selectors: string[];
  activeSelectors: Iterable<string>;
}): FacetSelectorInstallPlan {
  const activeSelectors = new Set(
    Array.from(options.activeSelectors, (selector) => selector.toLowerCase()),
  );
  const seenSelectors = new Set<string>();
  const selectorsToAdd: string[] = [];
  let duplicateCount = 0;
  let alreadyInstalledCount = 0;

  for (const selector of options.selectors) {
    const normalizedSelector = selector.toLowerCase();

    if (seenSelectors.has(normalizedSelector)) {
      duplicateCount += 1;
      continue;
    }

    seenSelectors.add(normalizedSelector);

    if (activeSelectors.has(normalizedSelector)) {
      alreadyInstalledCount += 1;
      continue;
    }

    selectorsToAdd.push(selector);
    activeSelectors.add(normalizedSelector);
  }

  return {
    selectorsToAdd,
    duplicateCount,
    alreadyInstalledCount,
  };
}
