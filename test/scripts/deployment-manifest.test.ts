import path from 'node:path';

import {
  createDeploymentManifest,
  getDeploymentArtifactPaths,
} from '@/scripts/lib/deployment-manifest';

describe('deployment-manifest helpers', () => {
  it('uses chain-specific artifact file names keyed by network', () => {
    const deploymentsDir = path.join('/tmp', 'deployments');

    const paths = getDeploymentArtifactPaths({
      deploymentsDir,
      networkName: 'arbitrumOne',
      chainId: 42161,
    });

    expect(paths.manifestPath).toBe(
      path.join(deploymentsDir, 'manifest.arbitrumOne.json'),
    );
    expect(paths.pendingChangesPath).toBe(
      path.join(deploymentsDir, 'pending-changes.arbitrumOne.json'),
    );
  });

  it('falls back to the chain id when the network name is unavailable', () => {
    const deploymentsDir = path.join('/tmp', 'deployments');

    const paths = getDeploymentArtifactPaths({
      deploymentsDir,
      networkName: '',
      chainId: 84532,
    });

    expect(paths.manifestPath).toBe(
      path.join(deploymentsDir, 'manifest.84532.json'),
    );
  });

  it('builds manifest metadata from the active runtime network', () => {
    const manifest = createDeploymentManifest({
      networkName: 'arbitrumOne',
      chainId: 42161,
      diamondAddress: '0x123',
      gitCommit: 'abc123',
      facets: {},
      updatedAt: '2026-03-16T00:00:00.000Z',
    });

    expect(manifest).toMatchObject({
      network: 'arbitrumOne',
      chainId: 42161,
      diamond: '0x123',
      gitCommit: 'abc123',
    });
  });
});
