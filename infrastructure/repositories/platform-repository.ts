import { IPlatformRepository } from '@/domain/platform';
import { Asset } from '@/domain/shared';
import type { AuraAsset } from '@/lib/contracts';
import { PinataSDK } from 'pinata';
import { graphqlRequest } from './shared/graph';
import {
  GET_ALL_ASSETS,
  GET_SUPPORTED_CLASSES,
  extractPonderItems,
  extractPonderSupportedClasses,
  SupportedClassesResponse,
} from './shared/graph-queries';
import { NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL } from '@/chain-constants';

export class PlatformRepository implements IPlatformRepository {
  contract: AuraAsset;
  pinata: PinataSDK;
  private graphEndpoint = NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL;
  constructor(_contract: AuraAsset, _pinata: PinataSDK) {
    this.contract = _contract;
    this.pinata = _pinata;
  }
  async getSupportedAssets(): Promise<Asset[]> {
    const PAGE = 500;
    const out: Asset[] = [];
    let after: string | undefined = undefined;
    let hasNextPage = true;
    const MAX_ITERATIONS = 50; // Cap to avoid infinite loops
    let iterations = 0;

    while (hasNextPage && iterations < MAX_ITERATIONS) {
      const res: {
        assetss: {
          items: any[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } = await graphqlRequest<{
        assetss: {
          items: any[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(this.graphEndpoint, GET_ALL_ASSETS, {
        limit: PAGE,
        after: after,
      });

      const items = extractPonderItems(res.assetss || { items: [] });
      if (items.length === 0) break;

      for (const a of items as any[]) {
        // Handle attributes - can be array, object, or null/undefined
        const attributesRaw = a.attributes;
        let attributesArray: any[] = [];

        if (Array.isArray(attributesRaw)) {
          attributesArray = attributesRaw;
        } else if (attributesRaw && typeof attributesRaw === 'object') {
          // Single attribute object - wrap in array
          attributesArray = [attributesRaw];
        } else if (attributesRaw?.items) {
          // Ponder format: { items: [...] }
          attributesArray = Array.isArray(attributesRaw.items)
            ? attributesRaw.items
            : [];
        }

        out.push({
          assetClass: a.class ?? a.className ?? a.assetClass ?? 'Unknown',
          tokenId: String(a.tokenId),
          name: a.name ?? 'Unknown Asset',
          attributes: attributesArray
            .map((attr: any) => ({
              name: String(attr?.name ?? ''),
              values: Array.isArray(attr?.values)
                ? attr.values.map((v: any) => String(v))
                : [],
              description: String(attr?.description ?? ''),
            }))
            .filter((x: { name: string }) => x.name.length > 0),
        });
      }

      hasNextPage = res.assetss?.pageInfo?.hasNextPage || false;
      after = res.assetss?.pageInfo?.endCursor || undefined;
      iterations++;

      if (items.length < PAGE) break;
    }

    return out;
  }

  async getSupportedAssetClasses(): Promise<string[]> {
    console.log('[PlatformRepository] getSupportedAssetClasses: Starting...');

    // Try GraphQL first (faster and more efficient)
    try {
      const graphClasses = await this.getSupportedAssetClassesFromGraph();
      if (graphClasses.length > 0) {
        console.log(
          `[PlatformRepository] Got ${graphClasses.length} classes from GraphQL`,
        );
        return graphClasses;
      }
      console.log(
        '[PlatformRepository] GraphQL returned no classes, falling back to on-chain',
      );
    } catch (graphErr) {
      console.warn(
        '[PlatformRepository] GraphQL query failed, falling back to on-chain:',
        graphErr,
      );
    }

    // Fallback to on-chain query
    return this.getSupportedAssetClassesFromChain();
  }

  /**
   * Fetch supported asset classes from the indexer via GraphQL
   */
  private async getSupportedAssetClassesFromGraph(): Promise<string[]> {
    const response = await graphqlRequest<SupportedClassesResponse>(
      this.graphEndpoint,
      GET_SUPPORTED_CLASSES,
      {},
    );
    return extractPonderSupportedClasses(response);
  }

  /**
   * Fetch supported asset classes directly from the smart contract (fallback)
   */
  private async getSupportedAssetClassesFromChain(): Promise<string[]> {
    console.log('[PlatformRepository] getSupportedAssetClassesFromChain...');
    const supportedClasses: string[] = [];
    const MAX_ITERATIONS = 100;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      try {
        const className = await this.contract.supportedClasses(i);
        console.log(
          `[PlatformRepository] Successfully read supportedClasses[${i}]: "${className}"`,
        );
        // Filter out empty strings (tombstoned entries)
        if (className && className.length > 0) {
          supportedClasses.push(className);
          console.log(
            `[PlatformRepository] Added class "${className}" to array. Total: ${supportedClasses.length}`,
          );
        } else {
          console.log(
            `[PlatformRepository] Index ${i} returned empty string, skipping`,
          );
        }
      } catch (err: unknown) {
        const error = err as {
          code?: string;
          info?: { code?: string };
          message?: string;
          reason?: string;
          data?: unknown;
        };
        // Check if this is an end-of-array error (expected when reaching the end)
        const isEndOfArray =
          error?.code === 'BAD_DATA' ||
          error?.info?.code === 'BAD_DATA' ||
          error?.code === 'CALL_EXCEPTION' ||
          error?.code === 'UNPREDICTABLE_GAS_LIMIT' ||
          error?.message?.includes('could not decode') ||
          error?.message?.includes('execution reverted') ||
          error?.message?.includes('missing revert data');

        console.log(`[PlatformRepository] Error at index ${i}:`, {
          code: error?.code,
          message: error?.message,
          isEndOfArray,
          currentClassesCount: supportedClasses.length,
        });

        if (isEndOfArray) {
          console.log(
            `[PlatformRepository] Detected end of array at index ${i}. Breaking loop.`,
          );
          break;
        }
        console.warn(
          `[PlatformRepository] Error reading supportedClasses[${i}]:`,
          err,
        );
        if (supportedClasses.length > 0) {
          console.log(
            `[PlatformRepository] Have ${supportedClasses.length} classes, breaking on error at index ${i}`,
          );
          break;
        }
      }
    }
    console.log(
      `[PlatformRepository] getSupportedAssetClassesFromChain: Returning ${supportedClasses.length} classes:`,
      supportedClasses,
    );
    return supportedClasses;
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
   * Lookup an asset JSON via Pinata keyvalues using the stored tokenId (decimal string)
   */
  async getAssetByTokenId(
    tokenId: string | number | bigint,
  ): Promise<Asset | null> {
    try {
      const tokenIdDecimal = BigInt(tokenId).toString(10);
      const list = await this.pinata.files.public
        .list()
        .keyvalues({ tokenId: tokenIdDecimal })
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
      console.error('[PlatformRepository] getAssetByTokenId failed', e);
      return null;
    }
  }
}
