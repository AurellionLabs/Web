import { syncPermissions } from '@/scripts/lib/permissions-sync-runner';

function createRoleFacet(initialWallets: string[] = []) {
  const wallets = [...initialWallets];
  const setter = vi.fn(async (wallet: string, enable: boolean) => {
    if (enable && !wallets.includes(wallet)) {
      wallets.push(wallet);
    }
    if (!enable) {
      const index = wallets.indexOf(wallet);
      if (index >= 0) {
        wallets.splice(index, 1);
      }
    }

    return {
      wait: vi.fn().mockResolvedValue(undefined),
    };
  });

  return {
    wallets,
    facet: {
      getAllowedDrivers: vi
        .fn()
        .mockResolvedValue(
          initialWallets.filter((wallet) => wallet.includes('DRIVER')),
        ),
      getAllowedNodeRegistrars: vi
        .fn()
        .mockResolvedValue(
          initialWallets.filter((wallet) => wallet.includes('NODE')),
        ),
      setDriver: setter,
      setNodeRegistrar: setter,
    },
  };
}

describe('syncPermissions', () => {
  it('reports add/remove diffs in dry-run mode', async () => {
    const driverFacet = {
      getAllowedDrivers: vi
        .fn()
        .mockResolvedValue(['DRIVER_PRESENT', 'DRIVER_STALE']),
      setDriver: vi.fn(),
    };
    const nodesFacet = {
      getAllowedNodeRegistrars: vi.fn().mockResolvedValue(['NODE_STALE']),
      setNodeRegistrar: vi.fn(),
    };

    const summary = await syncPermissions({
      write: false,
      desiredDrivers: ['DRIVER_PRESENT', 'DRIVER_NEW'],
      desiredNodeRegistrars: ['NODE_NEW'],
      auSysFacet: driverFacet as any,
      nodesFacet: nodesFacet as any,
      allowEmpty: false,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.drivers.toAdd).toEqual(['DRIVER_NEW']);
    expect(summary.drivers.toRemove).toEqual(['DRIVER_STALE']);
    expect(summary.nodeRegistrars.toAdd).toEqual(['NODE_NEW']);
    expect(summary.nodeRegistrars.toRemove).toEqual(['NODE_STALE']);
    expect(driverFacet.setDriver).not.toHaveBeenCalled();
    expect(nodesFacet.setNodeRegistrar).not.toHaveBeenCalled();
  });

  it('applies the diff in write mode', async () => {
    const driverFacet = {
      getAllowedDrivers: vi.fn().mockResolvedValue(['0xdriverOld']),
      setDriver: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const nodesFacet = {
      getAllowedNodeRegistrars: vi.fn().mockResolvedValue(['0xnodeOld']),
      setNodeRegistrar: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const summary = await syncPermissions({
      write: true,
      desiredDrivers: ['0xdriverNew'],
      desiredNodeRegistrars: ['0xnodeNew'],
      auSysFacet: driverFacet as any,
      nodesFacet: nodesFacet as any,
      allowEmpty: false,
    });

    expect(driverFacet.setDriver).toHaveBeenCalledWith('0xdriverNew', true);
    expect(driverFacet.setDriver).toHaveBeenCalledWith('0xdriverOld', false);
    expect(nodesFacet.setNodeRegistrar).toHaveBeenCalledWith('0xnodeNew', true);
    expect(nodesFacet.setNodeRegistrar).toHaveBeenCalledWith(
      '0xnodeOld',
      false,
    );
    expect(summary.applied).toBe(true);
  });
});
