import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildSupportedAssetMetadataPayload,
  loadSupportedAssetCatalog,
} from '@/scripts/lib/supported-assets';
import { syncSupportedAssets } from '@/scripts/lib/supported-assets-sync';

function createTempCatalog(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-sync-'));
  fs.mkdirSync(path.join(tempDir, 'goat'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'sheep'), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, 'goat', 'augoat.json'),
    JSON.stringify({
      className: 'GOAT',
      name: 'AUGOAT',
      attributes: [],
    }),
  );
  fs.writeFileSync(
    path.join(tempDir, 'sheep', 'ausheep.json'),
    JSON.stringify({
      className: 'SHEEP',
      name: 'AUSHEEP',
      attributes: [],
    }),
  );

  return tempDir;
}

function createMockPinata(existingTokenIds: Iterable<string>) {
  const knownTokenIds = new Set(existingTokenIds);
  const uploadCalls: Array<{
    payload: unknown;
    groupId: string;
    fileName: string;
    keyvalues: Record<string, string>;
  }> = [];

  const list = vi.fn(() => {
    let currentTokenId = '';
    const builder = {
      group: vi.fn().mockReturnThis(),
      keyvalues: vi.fn((values: Record<string, string>) => {
        currentTokenId = values.tokenId;
        return builder;
      }),
      all: vi.fn(async () =>
        knownTokenIds.has(currentTokenId)
          ? [{ cid: `cid-${currentTokenId}` }]
          : [],
      ),
    };

    return builder;
  });

  const pinata = {
    files: {
      public: {
        list,
      },
    },
    upload: {
      public: {
        json: vi.fn((payload: unknown) => ({
          group: (groupId: string) => ({
            name: (fileName: string) => ({
              keyvalues: async (keyvalues: Record<string, string>) => {
                uploadCalls.push({ payload, groupId, fileName, keyvalues });
                return { cid: `uploaded-${fileName}` };
              },
            }),
          }),
        })),
      },
    },
  };

  return { pinata, uploadCalls, list };
}

describe('syncSupportedAssets', () => {
  it('reports missing classes and metadata in dry-run mode without writing', async () => {
    const catalogDirectory = createTempCatalog();
    const catalog = loadSupportedAssetCatalog(catalogDirectory);
    const goat = catalog.find((entry) => entry.className === 'GOAT');
    const goatTokenId = buildSupportedAssetMetadataPayload(goat!).tokenId;
    const assetsFacet = {
      getSupportedClasses: vi.fn().mockResolvedValue(['GOAT']),
      addSupportedClass: vi.fn(),
    };
    const { pinata, uploadCalls } = createMockPinata([goatTokenId]);

    const summary = await syncSupportedAssets({
      write: false,
      catalogDirectory,
      diamondAddress: '0x123',
      groupId: 'group-1',
      chainId: 84532,
      assetsFacet,
      pinata,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.missingClasses).toEqual(['SHEEP']);
    expect(summary.missingMetadata.map((entry) => entry.name)).toEqual([
      'AUSHEEP',
    ]);
    expect(assetsFacet.addSupportedClass).not.toHaveBeenCalled();
    expect(uploadCalls).toHaveLength(0);

    fs.rmSync(catalogDirectory, { recursive: true, force: true });
  });

  it('adds missing classes and uploads missing metadata in write mode', async () => {
    const catalogDirectory = createTempCatalog();
    const assetsFacet = {
      getSupportedClasses: vi.fn().mockResolvedValue([]),
      addSupportedClass: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const { pinata, uploadCalls } = createMockPinata([]);

    const summary = await syncSupportedAssets({
      write: true,
      catalogDirectory,
      diamondAddress: '0xabc',
      groupId: 'group-2',
      chainId: 84532,
      assetsFacet,
      pinata,
    });

    expect(summary.dryRun).toBe(false);
    expect(summary.addedClasses).toEqual(['GOAT', 'SHEEP']);
    expect(assetsFacet.addSupportedClass).toHaveBeenCalledTimes(2);
    expect(uploadCalls).toHaveLength(2);
    expect(uploadCalls[0]?.groupId).toBe('group-2');
    expect(uploadCalls[0]?.fileName).toMatch(/\.json$/);
    expect(uploadCalls[0]?.keyvalues).toMatchObject({
      className: 'GOAT',
      assetName: 'AUGOAT',
    });
    expect(summary.uploadedMetadata).toHaveLength(2);

    fs.rmSync(catalogDirectory, { recursive: true, force: true });
  });
});
