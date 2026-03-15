import fs from 'node:fs';
import path from 'node:path';

import { AbiCoder, keccak256 } from 'ethers';
import { z } from 'zod';

const SUPPORTED_ASSET_FILE_EXTENSION = '.json';
const abiCoder = AbiCoder.defaultAbiCoder();

export const DEFAULT_SUPPORTED_ASSETS_DIR = path.join(
  process.cwd(),
  'supported-assets',
);

export const supportedAssetAttributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required'),
  values: z.array(z.string()),
  description: z.string(),
});

export const supportedAssetCatalogSchema = z.object({
  className: z
    .string()
    .trim()
    .min(1, 'className is required')
    .regex(/^[A-Z0-9_]+$/, 'className must be uppercase snake case'),
  name: z.string().trim().min(1, 'name is required'),
  attributes: z.array(supportedAssetAttributeSchema),
  metadata: z
    .object({
      description: z.string().optional(),
      image: z.string().optional(),
      externalUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SupportedAssetAttribute = z.infer<
  typeof supportedAssetAttributeSchema
>;
export type SupportedAssetCatalogInput = z.infer<
  typeof supportedAssetCatalogSchema
>;

export interface SupportedAssetCatalogEntry extends SupportedAssetCatalogInput {
  sourcePath: string;
}

export interface SupportedAssetContractAsset {
  name: string;
  assetClass: string;
  attributes: SupportedAssetAttribute[];
}

export interface SupportedAssetIdentifiers {
  hash: string;
  tokenId: string;
}

export interface SupportedAssetMetadataPayload
  extends SupportedAssetIdentifiers {
  className: string;
  asset: SupportedAssetContractAsset;
}

export interface SupportedAssetDiff {
  missingClasses: string[];
  missingMetadata: SupportedAssetMetadataPayload[];
}

function normalizeCatalogEntry(
  input: SupportedAssetCatalogInput,
  sourcePath: string,
): SupportedAssetCatalogEntry {
  return {
    className: input.className.trim(),
    name: input.name.trim(),
    attributes: input.attributes.map((attribute) => ({
      name: attribute.name.trim(),
      values: attribute.values,
      description: attribute.description,
    })),
    metadata: input.metadata,
    sourcePath,
  };
}

function collectCatalogFiles(targetDirectory: string): string[] {
  const entries = fs.readdirSync(targetDirectory, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const absolutePath = path.join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      return collectCatalogFiles(absolutePath);
    }

    if (
      entry.isFile() &&
      absolutePath.endsWith(SUPPORTED_ASSET_FILE_EXTENSION)
    ) {
      return [absolutePath];
    }

    return [];
  });

  return files.sort((left, right) => left.localeCompare(right));
}

export function toSupportedAssetContractAsset(
  entry: Pick<SupportedAssetCatalogEntry, 'name' | 'className' | 'attributes'>,
): SupportedAssetContractAsset {
  return {
    name: entry.name,
    assetClass: entry.className,
    attributes: entry.attributes.map((attribute) => ({
      name: attribute.name,
      values: [...attribute.values],
      description: attribute.description,
    })),
  };
}

export function computeSupportedAssetIdentifiers(
  entry: Pick<SupportedAssetCatalogEntry, 'name' | 'className' | 'attributes'>,
): SupportedAssetIdentifiers {
  const asset = toSupportedAssetContractAsset(entry);
  const encodedAsset = abiCoder.encode(
    [
      'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
    ],
    [asset],
  );
  const hash = keccak256(encodedAsset);

  return {
    hash,
    tokenId: BigInt(hash).toString(),
  };
}

export function buildSupportedAssetMetadataPayload(
  entry: Pick<SupportedAssetCatalogEntry, 'name' | 'className' | 'attributes'>,
): SupportedAssetMetadataPayload {
  return {
    ...computeSupportedAssetIdentifiers(entry),
    className: entry.className,
    asset: toSupportedAssetContractAsset(entry),
  };
}

export function getSupportedAssetClasses(
  entries: Pick<SupportedAssetCatalogEntry, 'className'>[],
): string[] {
  return Array.from(new Set(entries.map((entry) => entry.className)));
}

export function loadSupportedAssetCatalog(
  catalogDirectory = DEFAULT_SUPPORTED_ASSETS_DIR,
): SupportedAssetCatalogEntry[] {
  if (!fs.existsSync(catalogDirectory)) {
    throw new Error(`Supported assets directory not found: ${catalogDirectory}`);
  }

  const catalogFiles = collectCatalogFiles(catalogDirectory);
  if (catalogFiles.length === 0) {
    throw new Error(`No supported asset definitions found in ${catalogDirectory}`);
  }

  const entries = catalogFiles.map((absolutePath) => {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    const parsed = supportedAssetCatalogSchema.parse(JSON.parse(raw));
    return normalizeCatalogEntry(parsed, absolutePath);
  });

  const seenNames = new Map<string, string>();
  const seenTokenIds = new Map<string, string>();

  for (const entry of entries) {
    const priorNameSource = seenNames.get(entry.name);
    if (priorNameSource) {
      throw new Error(
        `Duplicate supported asset name "${entry.name}" in ${entry.sourcePath} and ${priorNameSource}`,
      );
    }
    seenNames.set(entry.name, entry.sourcePath);

    const { tokenId } = computeSupportedAssetIdentifiers(entry);
    const priorTokenSource = seenTokenIds.get(tokenId);
    if (priorTokenSource) {
      throw new Error(
        `Duplicate supported asset tokenId "${tokenId}" in ${entry.sourcePath} and ${priorTokenSource}`,
      );
    }
    seenTokenIds.set(tokenId, entry.sourcePath);
  }

  return entries;
}

export function diffSupportedAssetCatalog(options: {
  catalog: SupportedAssetCatalogEntry[];
  existingClasses: Iterable<string>;
  existingMetadataTokenIds: Iterable<string>;
}): SupportedAssetDiff {
  const existingClasses = new Set(
    Array.from(options.existingClasses)
      .map((className) => className.trim())
      .filter(Boolean),
  );
  const existingMetadataTokenIds = new Set(
    Array.from(options.existingMetadataTokenIds)
      .map((tokenId) => tokenId.trim())
      .filter(Boolean),
  );

  return {
    missingClasses: getSupportedAssetClasses(options.catalog).filter(
      (className) => !existingClasses.has(className),
    ),
    missingMetadata: options.catalog
      .map((entry) => buildSupportedAssetMetadataPayload(entry))
      .filter((entry) => !existingMetadataTokenIds.has(entry.tokenId)),
  };
}
