import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getAddress } from 'ethers';

import {
  DEFAULT_PERMISSIONS_DIR,
  loadPermissionsCatalog,
} from '@/scripts/lib/permissions-catalog';

function writePermissionsFile(
  rootDir: string,
  name: 'drivers.json' | 'node-registrars.json',
  wallets: string[],
) {
  fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, name),
    JSON.stringify({ wallets }, null, 2),
  );
}

describe('permissions catalog', () => {
  it('loads driver and node registrar wallets from the checked-in permissions directory', () => {
    const catalog = loadPermissionsCatalog(DEFAULT_PERMISSIONS_DIR);

    expect(catalog.drivers).toBeDefined();
    expect(catalog.nodeRegistrars).toBeDefined();
  });

  it('normalizes and sorts wallet addresses', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'permissions-'));
    writePermissionsFile(tempDir, 'drivers.json', [
      '0x00000000000000000000000000000000000000BB',
      '0x00000000000000000000000000000000000000aa',
    ]);
    writePermissionsFile(tempDir, 'node-registrars.json', [
      '0x00000000000000000000000000000000000000cc',
    ]);

    const catalog = loadPermissionsCatalog(tempDir);

    expect(catalog.drivers).toEqual([
      getAddress('0x00000000000000000000000000000000000000aa'),
      getAddress('0x00000000000000000000000000000000000000BB'),
    ]);
    expect(catalog.nodeRegistrars).toEqual([
      getAddress('0x00000000000000000000000000000000000000cc'),
    ]);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('rejects duplicate wallets within a file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'permissions-'));
    writePermissionsFile(tempDir, 'drivers.json', [
      '0x00000000000000000000000000000000000000AA',
      '0x00000000000000000000000000000000000000aa',
    ]);
    writePermissionsFile(tempDir, 'node-registrars.json', []);

    expect(() => loadPermissionsCatalog(tempDir)).toThrow('Duplicate wallet');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('rejects invalid wallet addresses', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'permissions-'));
    writePermissionsFile(tempDir, 'drivers.json', ['not-an-address']);
    writePermissionsFile(tempDir, 'node-registrars.json', []);

    expect(() => loadPermissionsCatalog(tempDir)).toThrow('Invalid wallet');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
