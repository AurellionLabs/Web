import {
  computePermissionSyncActions,
  validateNonEmptyPermissionCatalog,
} from './permissions-sync';

export interface PermissionFacetTransaction {
  wait(): Promise<unknown>;
}

export interface AuSysPermissionFacetLike {
  getAllowedDrivers(): Promise<string[]>;
  setDriver(address: string, enable: boolean): Promise<PermissionFacetTransaction>;
}

export interface NodePermissionFacetLike {
  getAllowedNodeRegistrars(): Promise<string[]>;
  setNodeRegistrar(
    address: string,
    enable: boolean,
  ): Promise<PermissionFacetTransaction>;
}

export interface PermissionSyncSummary {
  dryRun: boolean;
  applied: boolean;
  drivers: {
    current: string[];
    desired: string[];
    toAdd: string[];
    toRemove: string[];
  };
  nodeRegistrars: {
    current: string[];
    desired: string[];
    toAdd: string[];
    toRemove: string[];
  };
}

export async function syncPermissions(options: {
  write: boolean;
  desiredDrivers: string[];
  desiredNodeRegistrars: string[];
  auSysFacet: AuSysPermissionFacetLike;
  nodesFacet: NodePermissionFacetLike;
  allowEmpty: boolean;
}): Promise<PermissionSyncSummary> {
  validateNonEmptyPermissionCatalog({
    drivers: options.desiredDrivers,
    nodeRegistrars: options.desiredNodeRegistrars,
    allowEmpty: options.allowEmpty,
  });

  const [currentDrivers, currentNodeRegistrars] = await Promise.all([
    options.auSysFacet.getAllowedDrivers(),
    options.nodesFacet.getAllowedNodeRegistrars(),
  ]);

  const actions = computePermissionSyncActions({
    desiredDrivers: options.desiredDrivers,
    desiredNodeRegistrars: options.desiredNodeRegistrars,
    currentDrivers,
    currentNodeRegistrars,
  });

  if (options.write) {
    for (const wallet of actions.drivers.toAdd) {
      const tx = await options.auSysFacet.setDriver(wallet, true);
      await tx.wait();
    }
    for (const wallet of actions.drivers.toRemove) {
      const tx = await options.auSysFacet.setDriver(wallet, false);
      await tx.wait();
    }
    for (const wallet of actions.nodeRegistrars.toAdd) {
      const tx = await options.nodesFacet.setNodeRegistrar(wallet, true);
      await tx.wait();
    }
    for (const wallet of actions.nodeRegistrars.toRemove) {
      const tx = await options.nodesFacet.setNodeRegistrar(wallet, false);
      await tx.wait();
    }
  }

  return {
    dryRun: !options.write,
    applied: options.write,
    drivers: {
      current: currentDrivers,
      desired: options.desiredDrivers,
      toAdd: actions.drivers.toAdd,
      toRemove: actions.drivers.toRemove,
    },
    nodeRegistrars: {
      current: currentNodeRegistrars,
      desired: options.desiredNodeRegistrars,
      toAdd: actions.nodeRegistrars.toAdd,
      toRemove: actions.nodeRegistrars.toRemove,
    },
  };
}
