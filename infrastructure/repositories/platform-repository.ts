import { IPlatformRepository } from '@/domain/platform';
import { Asset } from '@/domain/shared';
import type { AuraAsset } from '@/lib/contracts';
import { PinataSDK } from 'pinata';
import { graphqlRequest } from './shared/graph';
import {
  GET_SUPPORTED_ASSET_ADDED_EVENTS,
  GET_SUPPORTED_CLASS_ADDED_EVENTS,
  GET_SUPPORTED_CLASS_REMOVED_EVENTS,
} from '../shared/graph-queries';
import { NEXT_PUBLIC_INDEXER_URL } from '@/chain-constants';
import {
  SupportedAssetAddedEvent,
  SupportedClassAddedEvent,
  SupportedClassRemovedEvent,
} from '../shared/indexer-types';

interface SupportedAssetEventsResponse {
  diamondSupportedAssetAddedEventss: {
    items: SupportedAssetAddedEvent[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export class PlatformRepository implements IPlatformRepository {
  contract: AuraAsset;
  pinata: PinataSDK;
  private graphEndpoint = NEXT_PUBLIC_INDEXER_URL;
  private processedTokenIds = new Set<string>();

  constructor(_contract: AuraAsset, _pinata: PinataSDK) {
    this.contract = _contract;
    this.pinata = _pinata;
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

      for (const event of items) {
        const tokenIdKey = `${event.token}-${event.token_id}`;
        if (this.processedTokenIds.has(tokenIdKey)) continue;
        this.processedTokenIds.add(tokenIdKey);

        let attributes: Asset['attributes'] = [];
        let assetClass = 'Unknown';
        let assetName = '';

        try {
          const cid = await this.getAssetCID(event.token, event.token_id);
          if (cid) {
            const { data } = await this.pinata.gateways.public.get(cid);
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
    try {
      // Try with both token + tokenId first (most specific)
      let list = await this.pinata.files.public
        .list()
        .keyvalues({ token: token, tokenId: tokenId })
        .all();
      if (list && list.length > 0) return list[0].cid;

      // Fallback: query by tokenId only (upload scripts may not set 'token' keyvalue)
      list = await this.pinata.files.public
        .list()
        .keyvalues({ tokenId: tokenId })
        .all();
      if (list && list.length > 0) return list[0].cid;

      // Fallback: try decimal conversion in case formats differ
      try {
        const tokenIdDecimal = BigInt(tokenId).toString(10);
        if (tokenIdDecimal !== tokenId) {
          list = await this.pinata.files.public
            .list()
            .keyvalues({ tokenId: tokenIdDecimal })
            .all();
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
    console.log('[PlatformRepository] getSupportedAssetClasses: Starting...');

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

      console.log(
        `[PlatformRepository] Found ${activeClasses.size} active asset classes from indexer`,
      );
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
    console.log('[PlatformRepository] getSupportedAssetClassesFromIPFS...');
    const classSet = new Set<string>();

    try {
      // Get all supported assets to extract class names from IPFS
      const assets = await this.getSupportedAssets();
      for (const asset of assets) {
        if (asset.assetClass && asset.assetClass !== 'Unknown') {
          classSet.add(asset.assetClass);
        }
      }
      console.log(
        `[PlatformRepository] Found ${classSet.size} unique asset classes from IPFS`,
      );
    } catch (err) {
      console.warn(
        '[PlatformRepository] Failed to get asset classes from IPFS:',
        err,
      );
    }

    return Array.from(classSet);
  }

  async getClassAssets(assetClass: string): Promise<Asset[]> {
    // Client-only: query Pinata Files via keyvalues; no on-chain fallback.
    const hasJwt = Boolean((this.pinata as any)?.config?.pinataJwt);
    if (!hasJwt) {
      console.warn(
        '[getClassAssets] Missing Pinata JWT; cannot query by keyvalues',
      );
      return [];
    }

    let list: { cid: string }[] = [];
    try {
      list = await this.pinata.files.public
        .list()
        .keyvalues({ className: assetClass })
        .all();
      console.log(
        '[getClassAssets] files.list keyvalues(className=%s) count=%d',
        assetClass,
        list.length,
      );
    } catch (e) {
      console.error('[getClassAssets] Pinata files.list failed', e);
      return [];
    }
    console.log('looked for', assetClass);

    if (!list || list.length === 0) return [];

    const assets = await Promise.all(
      list.map(async (item) => {
        try {
          const cid = item.cid;
          console.log('returned cid', cid);
          const { data } = await this.pinata.gateways.public.get(`${cid}`);
          const json = typeof data === 'string' ? JSON.parse(data) : data;
          console.log('returned output from ipfs', data);
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
            assetClass: json.className ?? (json.class as string) ?? assetClass,
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
          console.log('returned class asset', asset);
          return asset;
        } catch (err) {
          console.error(err);
          return null;
        }
      }),
    );
    return assets.filter((a): a is Asset => a !== null);
  }
  /**
   * Lookup an asset JSON via Pinata keyvalues using the stored owner+asset hash
   */
  async getAssetByOwnerAssetHash(hashHex: string): Promise<Asset | null> {
    try {
      const list = await this.pinata.files.public
        .list()
        .keyvalues({ hash: hashHex })
        .all();
      if (!list || list.length === 0) return null;
      const cid = list[0].cid;
      const { data } = await this.pinata.gateways.public.get(`${cid}`);
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
    try {
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
        list = await this.pinata.files.public
          .list()
          .keyvalues({ tokenId: candidate })
          .all();
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
      const { data } = await this.pinata.gateways.public.get(`${cid}`);
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
      console.error('[PlatformRepository] getAssetByTokenId failed', e);
      return null;
    }
  }
}
