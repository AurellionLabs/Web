import {
  buildSupportedAssetMetadataPayload,
  diffSupportedAssetCatalog,
  loadSupportedAssetCatalog,
} from './supported-assets';

export interface SyncOptions {
  write: boolean;
  catalogDirectory: string;
  diamondAddress: string;
  chainId: number;
}

export interface SyncSummary {
  dryRun: boolean;
  chainId: number;
  diamondAddress: string;
  catalogDirectory: string;
  totalCatalogAssets: number;
  totalCatalogClasses: number;
  missingClasses: string[];
  missingMetadata: Array<{
    className: string;
    name: string;
    tokenId: string;
  }>;
  addedClasses: string[];
  uploadedMetadata: Array<{
    className: string;
    name: string;
    tokenId: string;
    cid: string;
  }>;
}

export interface AssetsFacetLike {
  getSupportedClasses(): Promise<string[]>;
  addSupportedClass(
    className: string,
  ): Promise<{ wait(): Promise<unknown> } | { wait: () => Promise<unknown> }>;
}

export interface PinataListBuilderLike {
  group(groupId: string): PinataListBuilderLike;
  keyvalues(values: Record<string, string>): PinataListBuilderLike;
  all(): Promise<Array<{ cid: string }>>;
}

export interface PinataLike {
  files: {
    public: {
      list(): PinataListBuilderLike;
    };
  };
  upload: {
    public: {
      json(payload: unknown): {
        group(groupId: string): {
          name(fileName: string): {
            keyvalues(values: Record<string, string>): Promise<{ cid: string }>;
          };
        };
      };
    };
  };
}

export async function getExistingMetadataTokenIds(options: {
  pinata: PinataLike;
  groupId: string;
  tokenIds: string[];
}): Promise<Set<string>> {
  const entries = await Promise.all(
    options.tokenIds.map(async (tokenId) => {
      const matches = await options.pinata.files.public
        .list()
        .group(options.groupId)
        .keyvalues({ tokenId })
        .all();

      return matches.length > 0 ? tokenId : null;
    }),
  );

  return new Set(entries.filter((entry): entry is string => entry !== null));
}

export async function syncSupportedAssets(options: {
  write: boolean;
  catalogDirectory: string;
  diamondAddress: string;
  groupId: string;
  chainId: number;
  assetsFacet: AssetsFacetLike;
  pinata: PinataLike;
}): Promise<SyncSummary> {
  const catalog = loadSupportedAssetCatalog(options.catalogDirectory);
  const existingClassesRaw = await options.assetsFacet.getSupportedClasses();
  const existingClasses = existingClassesRaw.filter(Boolean);
  const metadataPayloads = catalog.map((entry) =>
    buildSupportedAssetMetadataPayload(entry),
  );
  const existingMetadataTokenIds = await getExistingMetadataTokenIds({
    pinata: options.pinata,
    groupId: options.groupId,
    tokenIds: metadataPayloads.map((payload) => payload.tokenId),
  });
  const diff = diffSupportedAssetCatalog({
    catalog,
    existingClasses,
    existingMetadataTokenIds,
  });
  const missingMetadataByTokenId = new Map(
    diff.missingMetadata.map((metadata) => [metadata.tokenId, metadata]),
  );

  const summary: SyncSummary = {
    dryRun: !options.write,
    chainId: options.chainId,
    diamondAddress: options.diamondAddress,
    catalogDirectory: options.catalogDirectory,
    totalCatalogAssets: catalog.length,
    totalCatalogClasses: new Set(catalog.map((entry) => entry.className)).size,
    missingClasses: [...diff.missingClasses],
    missingMetadata: catalog
      .filter((entry) =>
        missingMetadataByTokenId.has(
          buildSupportedAssetMetadataPayload(entry).tokenId,
        ),
      )
      .map((entry) => ({
        className: entry.className,
        name: entry.name,
        tokenId: buildSupportedAssetMetadataPayload(entry).tokenId,
      })),
    addedClasses: [],
    uploadedMetadata: [],
  };

  if (!options.write) {
    return summary;
  }

  for (const className of diff.missingClasses) {
    const tx = await options.assetsFacet.addSupportedClass(className);
    await tx.wait();
    summary.addedClasses.push(className);
  }

  for (const entry of catalog) {
    const metadata = buildSupportedAssetMetadataPayload(entry);
    if (!missingMetadataByTokenId.has(metadata.tokenId)) {
      continue;
    }

    const upload = await options.pinata.upload.public
      .json(metadata)
      .group(options.groupId)
      .name(`${metadata.tokenId}.json`)
      .keyvalues({
        tokenId: metadata.tokenId,
        className: metadata.className,
        hash: metadata.hash,
        assetName: entry.name,
      });

    summary.uploadedMetadata.push({
      className: entry.className,
      name: entry.name,
      tokenId: metadata.tokenId,
      cid: upload.cid,
    });
  }

  return summary;
}
