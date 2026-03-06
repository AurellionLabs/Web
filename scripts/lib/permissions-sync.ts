export interface PermissionDiff {
  toAdd: string[];
  toRemove: string[];
}

export interface PermissionSyncActions {
  drivers: PermissionDiff;
  nodeRegistrars: PermissionDiff;
}

function diffPermissions(desired: string[], current: string[]): PermissionDiff {
  const desiredSet = new Set(desired);
  const currentSet = new Set(current);

  return {
    toAdd: desired.filter((wallet) => !currentSet.has(wallet)),
    toRemove: current.filter((wallet) => !desiredSet.has(wallet)),
  };
}

export function validateNonEmptyPermissionCatalog(options: {
  drivers: string[];
  nodeRegistrars: string[];
  allowEmpty: boolean;
}): void {
  if (options.allowEmpty) {
    return;
  }

  if (options.drivers.length === 0 && options.nodeRegistrars.length === 0) {
    throw new Error(
      'Refusing to sync an empty permission catalog without explicit allowEmpty.',
    );
  }
}

export function computePermissionSyncActions(options: {
  desiredDrivers: string[];
  desiredNodeRegistrars: string[];
  currentDrivers: string[];
  currentNodeRegistrars: string[];
}): PermissionSyncActions {
  return {
    drivers: diffPermissions(options.desiredDrivers, options.currentDrivers),
    nodeRegistrars: diffPermissions(
      options.desiredNodeRegistrars,
      options.currentNodeRegistrars,
    ),
  };
}
