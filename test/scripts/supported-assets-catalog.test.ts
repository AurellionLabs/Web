import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildSupportedAssetMetadataPayload,
  diffSupportedAssetCatalog,
  getSupportedAssetClasses,
  loadSupportedAssetCatalog,
} from '@/scripts/lib/supported-assets';

describe('supported asset catalog', () => {
  it('loads the checked-in catalog and reproduces the current default class set', () => {
    const catalog = loadSupportedAssetCatalog();

    expect(catalog).toHaveLength(6);
    expect(getSupportedAssetClasses(catalog)).toEqual([
      'CHICKEN',
      'COW',
      'DUCK',
      'GOAT',
      'GOLD',
      'SHEEP',
    ]);
  });

  it('builds Pinata metadata in the same shape used by the runtime uploader', () => {
    const catalog = loadSupportedAssetCatalog();
    const goat = catalog.find((entry) => entry.name === 'AUGOAT');

    expect(goat).toBeDefined();

    const metadata = buildSupportedAssetMetadataPayload(goat!);

    expect(metadata.className).toBe('GOAT');
    expect(metadata.asset).toEqual({
      name: 'AUGOAT',
      assetClass: 'GOAT',
      attributes: [
        {
          name: 'weight',
          values: ['S', 'M', 'L'],
          description: 'A goats weight either S = 20 KG, M = 30 KG, L = 40KG',
        },
        {
          name: 'sex',
          values: ['M', 'F'],
          description: 'Gender of the goat',
        },
      ],
    });
    expect(metadata.hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(metadata.tokenId).toMatch(/^\d+$/);
  });

  it('detects missing classes and missing metadata independently', () => {
    const catalog = loadSupportedAssetCatalog();
    const goat = catalog.find((entry) => entry.className === 'GOAT');

    expect(goat).toBeDefined();

    const diff = diffSupportedAssetCatalog({
      catalog,
      existingClasses: ['GOAT', 'SHEEP'],
      existingMetadataTokenIds: [
        buildSupportedAssetMetadataPayload(goat!).tokenId,
      ],
    });

    expect(diff.missingClasses).toEqual(['CHICKEN', 'COW', 'DUCK', 'GOLD']);
    expect(diff.missingMetadata.map((entry) => entry.className)).toEqual([
      'CHICKEN',
      'COW',
      'DUCK',
      'GOLD',
      'SHEEP',
    ]);
  });

  it('rejects invalid catalog entries', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supported-assets-'));
    const invalidDir = path.join(tempDir, 'invalid');
    fs.mkdirSync(invalidDir, { recursive: true });
    fs.writeFileSync(
      path.join(invalidDir, 'broken.json'),
      JSON.stringify({
        className: 'goat',
        name: 'BROKEN',
        attributes: [],
      }),
    );

    expect(() => loadSupportedAssetCatalog(tempDir)).toThrow(
      'className must be uppercase snake case',
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
