import fs from 'node:fs';
import path from 'node:path';

import { getAddress } from 'ethers';
import { z } from 'zod';

export const DEFAULT_PERMISSIONS_DIR = path.join(process.cwd(), 'permissions');

const permissionsFileSchema = z.object({
  wallets: z.array(z.string()),
});

export interface PermissionsCatalog {
  drivers: string[];
  nodeRegistrars: string[];
}

function loadPermissionFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Permissions file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = permissionsFileSchema.parse(JSON.parse(raw));
  const seen = new Set<string>();
  const normalized = parsed.wallets.map((wallet) => {
    let checksumAddress: string;
    try {
      checksumAddress = getAddress(wallet);
    } catch {
      throw new Error(`Invalid wallet in ${path.basename(filePath)}: ${wallet}`);
    }

    if (seen.has(checksumAddress)) {
      throw new Error(
        `Duplicate wallet in ${path.basename(filePath)}: ${checksumAddress}`,
      );
    }
    seen.add(checksumAddress);
    return checksumAddress;
  });

  return normalized.sort((left, right) => left.localeCompare(right));
}

export function loadPermissionsCatalog(
  permissionsDirectory = DEFAULT_PERMISSIONS_DIR,
): PermissionsCatalog {
  return {
    drivers: loadPermissionFile(path.join(permissionsDirectory, 'drivers.json')),
    nodeRegistrars: loadPermissionFile(
      path.join(permissionsDirectory, 'node-registrars.json'),
    ),
  };
}
