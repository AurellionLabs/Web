import fs from 'node:fs';
import path from 'node:path';

export interface ManifestFacet {
  address: string;
  codeHash: string;
  selectors: string[];
  deployedAt: string;
}

export interface DeploymentManifest {
  network: string;
  chainId: number;
  diamond: string;
  updatedAt: string;
  gitCommit: string;
  facets: Record<string, ManifestFacet>;
}

interface ArtifactPathOptions {
  deploymentsDir: string;
  networkName?: string | null;
  chainId: number;
}

interface CreateManifestOptions {
  networkName?: string | null;
  chainId: number;
  diamondAddress: string;
  gitCommit: string;
  facets: Record<string, ManifestFacet>;
  updatedAt?: string;
}

function getArtifactKey(
  networkName: string | null | undefined,
  chainId: number,
) {
  const trimmed = networkName?.trim();
  if (trimmed) {
    return trimmed.replace(/[^a-zA-Z0-9_.-]/g, '-');
  }

  return String(chainId);
}

export function getDeploymentArtifactPaths(options: ArtifactPathOptions) {
  const key = getArtifactKey(options.networkName, options.chainId);

  return {
    manifestPath: path.join(options.deploymentsDir, `manifest.${key}.json`),
    pendingChangesPath: path.join(
      options.deploymentsDir,
      `pending-changes.${key}.json`,
    ),
  };
}

export function createDeploymentManifest(
  options: CreateManifestOptions,
): DeploymentManifest {
  return {
    network: options.networkName?.trim() || String(options.chainId),
    chainId: options.chainId,
    diamond: options.diamondAddress,
    updatedAt: options.updatedAt || new Date().toISOString(),
    gitCommit: options.gitCommit,
    facets: options.facets,
  };
}

export function loadDeploymentManifest(options: ArtifactPathOptions) {
  const { manifestPath } = getDeploymentArtifactPaths(options);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  ) as DeploymentManifest;
}
