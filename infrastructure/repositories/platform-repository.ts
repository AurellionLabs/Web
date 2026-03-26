import { IPlatformRepository } from '@/domain/platform';
import { Asset } from '@/domain/shared';
import { PinataSDK } from 'pinata';
import { graphqlRequest } from './shared/graph';
import {
  GET_SUPPORTED_ASSET_ADDED_EVENTS,
  GET_SUPPORTED_CLASS_ADDED_EVENTS,
  GET_SUPPORTED_CLASS_REMOVED_EVENTS,
} from '../shared/graph-queries';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';
import {
  SupportedAssetAddedEvent,
  SupportedClassAddedEvent,
  SupportedClassRemovedEvent,
} from '../shared/indexer-types';
import { getIpfsGroupId } from '@/chain-constants';
import {
  fetchAssetByTokenIdFromMetadataApi,
  fetchAssetsByTokenIdsFromMetadataApi,
  fetchClassAssetsFromMetadataApi,
} from './shared/platform-metadata-api';

interface SupportedAssetEventsResponse {
  diamondSupportedAssetAddedEventss: {
    items: SupportedAssetAddedEvent[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export class PlatformRepository implements IPlatformRepository {
  pinata: PinataSDK | null;
  private chainId: number;
  private get graphEndpoint() {
    return getCurrentIndexerUrl();
  }
  private processedTokenIds = new Set<string>();
  private assetByTokenIdCache = new Map<string, Asset | null>();
  private inFlightAssetByTokenId = new Map<string, Promise<Asset | null>>();

  private isPinataRateLimitError(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    return (
      message.includes('429') ||
      message.toLowerCase().includes('too many requests')
    );
  }

  private async withPinataRetry<T = any>(
    fn: () => Promise<T> | T,
    maxAttempts = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!this.isPinataRateLimitError(error) || attempt === maxAttempts) {
          throw error;
        }
        const backoffMs = 300 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    throw lastError;
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) return [];
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({
      length: Math.min(concurrency, items.length),
    }).map(async () => {
      while (true) {
        const current = nextIndex++;
        if (current >= items.length) break;
        results[current] = await mapper(items[current], current);
      }
    });

    await Promise.all(workers);
    return results;
  }

  constructor(
    _contractOrPinata: unknown,
    _pinata?: PinataSDK,
    _chainId?: number,
  ) {
    // Backward-compatible constructor:
    // - old callsites/tests: new PlatformRepository(contract, pinata)
    // - new callsites: new PlatformRepository(pinata, chainId)
    const maybePinata =
      _pinata ??
      (_contractOrPinata &&
      typeof _contractOrPinata === 'object' &&
      'files' in (_contractOrPinata as Record<string, unknown>) &&
      'gateways' in (_contractOrPinata as Record<string, unknown>)
        ? (_contractOrPinata as PinataSDK)
        : null);

    this.pinata = maybePinata;
    this.chainId = _chainId ?? 0;
  }

  private get groupId(): string {
    if (!this.chainId) {
      throw new Error('PlatformRepository: chainId not set');
    }
    return getIpfsGroupId(this.chainId);
  }

  private getPinataListBuilder() {
    const listBuilder = this.pinata!.files.public.list() as any;

    if (typeof listBuilder.group === 'function' && this.chainId) {
      return listBuilder.group(this.groupId);
    }

    return listBuilder;
  }

  private getAssetClassFromMetadata(
    json: Record<string, any>,
    fallbackClass?: string,
  ): string {
    return (
      json.className ??
      json.class ??
      json.assetClass ??
      json.asset?.assetClass ??
      fallbackClass ??
      'Unknown'
    );
  }

  async getSupportedAssets(): Promise<Asset[]> {
    const PAGE = 500;
    const out: Asset[] = [];
    let after: string | undefined = undefined;
    let hasNextPage = true;
    const MAX_ITERATIONS = 50;
    let iterations = 0;
    this.processedTokenIds.clear();

    while (hasNextPage && iterations < MAX_ITERATIONS) {
      const res: SupportedAssetEventsResponse =
        await graphqlRequest<SupportedAssetEventsResponse>(
          this.graphEndpoint,
          GET_SUPPORTED_ASSET_ADDED_EVENTS,
          { limit: PAGE, after },
        );

      const items = res.diamondSupportedAssetAddedEventss?.items || [];
      if (items.length === 0) break;

      const metadataByTokenId = !this.pinata
        ? new Map(
            (
              await fetchAssetsByTokenIdsFromMetadataApi(
                items.map((event) => String(event.token_id)),
                this.chainId || undefined,
              )
            ).map((asset) => [asset.tokenId, asset]),
          )
        : null;

      for (const event of items) {
        const tokenIdKey = `${event.token}-${event.token_id}`;
        if (this.processedTokenIds.has(tokenIdKey)) continue;
        this.processedTokenIds.add(tokenIdKey);

        let attributes: Asset['attributes'] = [];
        let assetClass = 'Unknown';
        let assetName = '';

        try {
          if (!this.pinata) {
            const asset =
              metadataByTokenId?.get(String(event.token_id)) ?? null;
            if (asset) {
              assetClass = asset.assetClass;
              assetName = asset.name;
              attributes = asset.attributes;
            }
          } else {
            const cid = await this.getAssetCID(event.token, event.token_id);
            if (!cid) {
              out.push({
                assetClass,
                tokenId: String(event.token_id),
                name: assetName,
                attributes,
              });
              continue;
            }

            const { data } = await this.withPinataRetry<any>(() =>
              this.pinata!.gateways.public.get(cid),
            );
            const json = typeof data === 'string' ? JSON.parse(data) : data;

            // Extract asset class from IPFS metadata
            // Support multiple field names: className, class, assetClass
            assetClass =
              (json.className as string) ??
              (json.class as string) ??
              (json.assetClass as string) ??
              (json.asset?.assetClass as string) ??
              'Unknown';

            const contractAsset = json.asset as {
              name?: string;
              assetClass?: string;
              attributes?: Array<{
                name?: string;
                values?: string[];
                description?: string;
              }>;
            };

            // Extract asset name
            assetName = contractAsset?.name ?? (json.name as string) ?? '';

            attributes = (contractAsset?.attributes || [])
              .map((attr) => ({
                name: attr?.name ?? '',
                values: Array.isArray(attr?.values) ? attr.values : [],
                description: attr?.description ?? '',
              }))
              .filter((a) => typeof a.name === 'string' && a.name.length > 0);
          }
        } catch (e) {
          console.warn(
            `[PlatformRepository] Failed to fetch IPFS metadata for token ${event.token_id}:`,
            e,
          );
        }

        out.push({
          assetClass,
          tokenId: String(event.token_id),
          name: assetName,
          attributes,
        });
      }

      hasNextPage =
        res.diamondSupportedAssetAddedEventss?.pageInfo?.hasNextPage || false;
      after =
        res.diamondSupportedAssetAddedEventss?.pageInfo?.endCursor ?? undefined;
      iterations++;

      if (items.length < PAGE) break;
    }

    return out;
  }

  private async getAssetCID(
    token: string,
    tokenId: string,
  ): Promise<string | null> {
    if (!this.pinata) {
      return null;
    }

    try {
      // Try with both token + tokenId first (most specific)
      let list = await this.withPinataRetry(() =>
        this.getPinataListBuilder()
          .keyvalues({ token: token, tokenId: tokenId })
          .all(),
      );
      if (list && list.length > 0) return list[0].cid;

      // Fallback: query by tokenId only (upload scripts may not set 'token' keyvalue)
      list = await this.withPinataRetry(() =>
        this.getPinataListBuilder().keyvalues({ tokenId: tokenId }).all(),
      );
      if (list && list.length > 0) return list[0].cid;

      // Fallback: try decimal conversion in case formats differ
      try {
        const tokenIdDecimal = BigInt(tokenId).toString(10);
        if (tokenIdDecimal !== tokenId) {
          list = await this.withPinataRetry(() =>
            this.getPinataListBuilder()
              .keyvalues({ tokenId: tokenIdDecimal })
              .all(),
          );
          if (list && list.length > 0) return list[0].cid;
        }
      } catch {
        // tokenId wasn't convertible to BigInt, skip
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch supported asset classes from indexed events
   * Uses SupportedClassAdded/Removed events from AssetsFacet
   */
  async getSupportedAssetClasses(): Promise<string[]> {
    try {
      // Query SupportedClassAdded events from the indexer
      const addedResponse = await graphqlRequest<{
        diamondSupportedClassAddedEventss: {
          items: SupportedClassAddedEvent[];
        };
      }>(this.graphEndpoint, GET_SUPPORTED_CLASS_ADDED_EVENTS, { limit: 100 });

      // Query SupportedClassRemoved events from the indexer
      const removedResponse = await graphqlRequest<{
        diamondSupportedClassRemovedEventss: {
          items: SupportedClassRemovedEvent[];
        };
      }>(this.graphEndpoint, GET_SUPPORTED_CLASS_REMOVED_EVENTS, {
        limit: 100,
      });

      const addedEvents =
        addedResponse?.diamondSupportedClassAddedEventss?.items || [];
      const removedEvents =
        removedResponse?.diamondSupportedClassRemovedEventss?.items || [];

      // Build set of active classes: added - removed
      const activeClasses = new Set<string>();

      // Add all classes that were added
      for (const event of addedEvents) {
        if (event.class_name) {
          activeClasses.add(event.class_name);
        }
      }

      // Remove classes that were removed
      for (const event of removedEvents) {
        if (event.class_name) {
          activeClasses.delete(event.class_name);
        }
      }

      return Array.from(activeClasses);
    } catch (err) {
      console.warn(
        '[PlatformRepository] Failed to get asset classes from indexer, falling back to IPFS:',
        err,
      );
      // Fallback to IPFS-based extraction if indexer fails
      return this.getSupportedAssetClassesFromIPFS();
    }
  }

  /**
   * Fallback: Fetch supported asset classes from IPFS metadata
   * Queries all supported assets and extracts unique class names from their metadata
   */
  private async getSupportedAssetClassesFromIPFS(): Promise<string[]> {
    const classSet = new Set<string>();

    try {
      // Get all supported assets to extract class names from IPFS
      const assets = await this.getSupportedAssets();
      for (const asset of assets) {
        if (asset.assetClass && asset.assetClass !== 'Unknown') {
          classSet.add(asset.assetClass);
        }
      }
    } catch (err) {
      console.warn(
        '[PlatformRepository] Failed to get asset classes from IPFS:',
        err,
      );
    }

    return Array.from(classSet);
  }

  async getClassAssets(assetClass: string): Promise<Asset[]> {
    if (!this.pinata) {
      return fetchClassAssetsFromMetadataApi(
        assetClass,
        this.chainId || undefined,
      );
    }
    const pinata = this.pinata;

    const hasJwt = Boolean((pinata as any)?.config?.pinataJwt);
    if (!hasJwt) {
      console.warn(
        '[getClassAssets] Missing Pinata JWT; cannot query by keyvalues',
      );
      return [];
    }

    let list: { cid: string }[] = [];
    try {
      list = await this.getPinataListBuilder()
        .keyvalues({ className: assetClass })
        .all();
    } catch (e) {
      console.error('[getClassAssets] Pinata files.list failed', e);
      return [];
    }

    let shouldFilterByPayloadClass = false;
    if (!list || list.length === 0) {
      shouldFilterByPayloadClass = true;
      try {
        list = await this.getPinataListBuilder().all();
      } catch (e) {
        console.error('[getClassAssets] Pinata fallback scan failed', e);
        return [];
      }
    }

    if (!list || list.length === 0) return [];

    const assets = await this.mapWithConcurrency(list, 3, async (item) => {
      try {
        const cid = item.cid;
        const { data } = await this.withPinataRetry<any>(() =>
          pinata.gateways.public.get(`${cid}`),
        );
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const resolvedClass = this.getAssetClassFromMetadata(json, assetClass);
        if (
          shouldFilterByPayloadClass &&
          resolvedClass.toLowerCase() !== assetClass.toLowerCase()
        ) {
          return null;
        }
        const contractAsset = json.asset as {
          id?: string | number | bigint;
          name?: string;
          attributes?:
            | Array<{
                name?: string;
                values?: string[];
                description?: string;
              }>
            | { name?: string; values?: string[]; description?: string };
        };

        const attributesArray = Array.isArray(contractAsset?.attributes)
          ? (contractAsset?.attributes as Array<{
              name?: string;
              values?: string[];
              description?: string;
            }>)
          : contractAsset?.attributes &&
              typeof contractAsset.attributes === 'object'
            ? [
                contractAsset.attributes as {
                  name?: string;
                  values?: string[];
                  description?: string;
                },
              ]
            : [];

        const asset: Asset = {
          assetClass: resolvedClass,
          tokenId: String(
            (json.tokenId as any) ?? (contractAsset?.id as any) ?? 0,
          ),
          name: contractAsset?.name ?? 'Unknown Asset',
          attributes: attributesArray
            .map((attr) => ({
              name: attr?.name ?? '',
              values: Array.isArray(attr?.values)
                ? (attr?.values as string[])
                : [],
              description: attr?.description ?? '',
            }))
            .filter((a) => typeof a.name === 'string' && a.name.length > 0),
        };
        return asset;
      } catch (err) {
        console.error(err);
        return null;
      }
    });
    return assets.filter((a): a is Asset => a !== null);
  }
  /**
   * Lookup an asset JSON via Pinata keyvalues using the stored owner+asset hash
   */
  async getAssetByOwnerAssetHash(hashHex: string): Promise<Asset | null> {
    if (!this.pinata) {
      return null;
    }

    try {
      const list = await this.withPinataRetry(() =>
        this.getPinataListBuilder().keyvalues({ hash: hashHex }).all(),
      );
      if (!list || list.length === 0) return null;
      const cid = list[0].cid;
      const { data } = await this.withPinataRetry<any>(() =>
        this.pinata!.gateways.public.get(`${cid}`),
      );
      const json = typeof data === 'string' ? JSON.parse(data) : data;
      const contractAsset = json.asset as {
        id?: string | number | bigint;
        name?: string;
        attributes?:
          | Array<{ name?: string; values?: string[]; description?: string }>
          | {
              name?: string;
              values?: string[];
              description?: string;
            };
      };
      const attributesArray = Array.isArray(contractAsset?.attributes)
        ? (contractAsset?.attributes as Array<{
            name?: string;
            values?: string[];
            description?: string;
          }>)
        : contractAsset?.attributes &&
            typeof contractAsset.attributes === 'object'
          ? [
              contractAsset.attributes as {
                name?: string;
                values?: string[];
                description?: string;
              },
            ]
          : [];
      const asset: Asset = {
        assetClass: json.className ?? (json.class as string) ?? 'Unknown',
        tokenId: String(
          (json.tokenId as any) ?? (contractAsset?.id as any) ?? 0,
        ),
        name: contractAsset?.name ?? 'Unknown Asset',
        attributes: attributesArray
          .map((attr) => ({
            name: attr?.name ?? '',
            values: Array.isArray(attr?.values)
              ? (attr?.values as string[])
              : [],
            description: attr?.description ?? '',
          }))
          .filter((a) => typeof a.name === 'string' && a.name.length > 0),
      };
      return asset;
    } catch (e) {
      console.error('[PlatformRepository] getAssetByOwnerAssetHash failed', e);
      return null;
    }
  }
  /**
   * Lookup an asset JSON via Pinata keyvalues using the stored tokenId.
   * Tries multiple formats (raw string, decimal, hex) to handle inconsistent keyvalue storage.
   */
  async getAssetByTokenId(
    tokenId: string | number | bigint,
  ): Promise<Asset | null> {
    const canonicalTokenId = (() => {
      try {
        return BigInt(tokenId).toString(10);
      } catch {
        return String(tokenId);
      }
    })();
    if (this.assetByTokenIdCache.has(canonicalTokenId)) {
      return this.assetByTokenIdCache.get(canonicalTokenId) ?? null;
    }
    const inFlight = this.inFlightAssetByTokenId.get(canonicalTokenId);
    if (inFlight) return inFlight;

    const lookupPromise = (async (): Promise<Asset | null> => {
      try {
        if (!this.pinata) {
          const apiResult = await fetchAssetByTokenIdFromMetadataApi(
            canonicalTokenId,
            this.chainId || undefined,
          );
          if (apiResult.asset) {
            this.assetByTokenIdCache.set(canonicalTokenId, apiResult.asset);
          }
          return apiResult.asset;
        }
        const pinata = this.pinata;

        const tokenIdStr = String(tokenId);

        // Build list of candidate formats to try
        const candidates: string[] = [tokenIdStr];
        try {
          const asBigInt = BigInt(tokenId);
          const decimal = asBigInt.toString(10);
          const hex = '0x' + asBigInt.toString(16);
          if (!candidates.includes(decimal)) candidates.push(decimal);
          if (!candidates.includes(hex)) candidates.push(hex);
        } catch {
          // Not a valid BigInt, skip alternative formats
        }

        let list: any[] | null = null;
        for (const candidate of candidates) {
          const filters = this.chainId
            ? [
                { tokenId: candidate, chainId: String(this.chainId) },
                { tokenId: candidate },
              ]
            : [{ tokenId: candidate }];

          for (const filter of filters) {
            list = await this.withPinataRetry(() =>
              this.getPinataListBuilder().keyvalues(filter).all(),
            );
            if (list && list.length > 0) break;
          }
          if (list && list.length > 0) break;
        }

        if (!list || list.length === 0) {
          console.warn(
            '[PlatformRepository] getAssetByTokenId: no Pinata files found for any format:',
            candidates,
          );
          return null;
        }
        const cid = list[0].cid;
        const { data } = await this.withPinataRetry<any>(() =>
          pinata.gateways.public.get(`${cid}`),
        );
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const contractAsset = json.asset as {
          id?: string | number | bigint;
          name?: string;
          attributes?:
            | Array<{ name?: string; values?: string[]; description?: string }>
            | {
                name?: string;
                values?: string[];
                description?: string;
              };
        };
        const attributesArray = Array.isArray(contractAsset?.attributes)
          ? (contractAsset?.attributes as Array<{
              name?: string;
              values?: string[];
              description?: string;
            }>)
          : contractAsset?.attributes &&
              typeof contractAsset.attributes === 'object'
            ? [
                contractAsset.attributes as {
                  name?: string;
                  values?: string[];
                  description?: string;
                },
              ]
            : [];
        const asset: Asset = {
          assetClass: json.className ?? (json.class as string) ?? 'Unknown',
          tokenId: String(
            (json.tokenId as any) ?? (contractAsset?.id as any) ?? 0,
          ),
          name: contractAsset?.name ?? 'Unknown Asset',
          attributes: attributesArray
            .map((attr) => ({
              name: attr?.name ?? '',
              values: Array.isArray(attr?.values)
                ? (attr?.values as string[])
                : [],
              description: attr?.description ?? '',
            }))
            .filter((a) => typeof a.name === 'string' && a.name.length > 0),
        };
        this.assetByTokenIdCache.set(canonicalTokenId, asset);
        return asset;
      } catch (e) {
        console.error('[PlatformRepository] getAssetByTokenId failed', e);
        return null;
      }
    })();

    this.inFlightAssetByTokenId.set(canonicalTokenId, lookupPromise);
    try {
      return await lookupPromise;
    } finally {
      this.inFlightAssetByTokenId.delete(canonicalTokenId);
    }
  }
}
