import {
  computePermissionSyncActions,
  validateNonEmptyPermissionCatalog,
} from '@/scripts/lib/permissions-sync';

describe('permission sync', () => {
  it('computes add and remove actions for drivers and node registrars', () => {
    const diff = computePermissionSyncActions({
      desiredDrivers: [
        '0x00000000000000000000000000000000000000AA',
        '0x00000000000000000000000000000000000000BB',
      ],
      desiredNodeRegistrars: ['0x00000000000000000000000000000000000000CC'],
      currentDrivers: [
        '0x00000000000000000000000000000000000000BB',
        '0x00000000000000000000000000000000000000DD',
      ],
      currentNodeRegistrars: ['0x00000000000000000000000000000000000000EE'],
    });

    expect(diff.drivers.toAdd).toEqual([
      '0x00000000000000000000000000000000000000AA',
    ]);
    expect(diff.drivers.toRemove).toEqual([
      '0x00000000000000000000000000000000000000DD',
    ]);
    expect(diff.nodeRegistrars.toAdd).toEqual([
      '0x00000000000000000000000000000000000000CC',
    ]);
    expect(diff.nodeRegistrars.toRemove).toEqual([
      '0x00000000000000000000000000000000000000EE',
    ]);
  });

  it('rejects fully empty permission catalogs unless explicitly allowed', () => {
    expect(() =>
      validateNonEmptyPermissionCatalog({
        drivers: [],
        nodeRegistrars: [],
        allowEmpty: false,
      }),
    ).toThrow('Refusing to sync an empty permission catalog');
  });
});
