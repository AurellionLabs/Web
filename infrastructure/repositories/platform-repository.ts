import { IPlatformRepository, Asset } from '@/domain/platform';
import { AuraAsset } from '@/typechain-types';
import { PinataSDK } from 'pinata';

export class PlatformRepository implements IPlatformRepository {
  contract: AuraAsset;
  pinata: PinataSDK;
  constructor(_contract: AuraAsset, _pinata: PinataSDK) {
    this.contract = _contract;
    this.pinata = _pinata;
  }
  async getSupportedAssets(): Promise<Asset[]> {
    const ipfsKeys: string[] = [];
    // Probe sequentially until the contract getter reverts (no on-chain length available)
    for (let i = 0; ; i++) {
      try {
        console.log('before push', i);
        const key = await this.contract.ipfsID(i);
        console.log('ipfs key:', key);
        ipfsKeys.push(key);
      } catch (err) {
        console.log('likely end of supported assets', err);
        break;
      }
    }

    if (ipfsKeys.length === 0) return [];

    const assets = await Promise.all(
      ipfsKeys.map(async (key) => {
        try {
          console.log('getting key to ipfs', key);
          const { data } = await this.pinata.gateways.public.get(`${key}`);
          const json = typeof data === 'string' ? JSON.parse(data) : data;

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

          const attributesArrayRaw = Array.isArray(contractAsset?.attributes)
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
          const attributesArray = attributesArrayRaw.map((attr) => ({
            name: attr?.name ?? '',
            values: Array.isArray(attr?.values)
              ? (attr?.values as string[]).map((v) => String(v))
              : [],
            description: attr?.description ?? '',
          }));

          const asset: Asset = {
            assetClass: json.className ?? (json.class as string) ?? 'Unknown',
            tokenID: BigInt(
              (json.tokenId as any) ?? (contractAsset?.id as any) ?? 0,
            ),
            name: contractAsset?.name ?? 'Unknown Asset',
            attributes: attributesArray.filter(
              (a) => typeof a.name === 'string' && a.name.length > 0,
            ),
          };
          return asset;
        } catch (err) {
          console.error(err);
          return null;
        }
      }),
    );

    return assets.filter((a): a is Asset => a !== null);
  }

  async getSupportedAssetClasses(): Promise<string[]> {
    const supportedClasses: string[] = [];
    for (let i = 0; ; i++) {
      try {
        supportedClasses.push(await this.contract.supportedClasses(i));
      } catch (err) {
        console.log('likely end of supported asset classes list', err);
        break;
      }
    }
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
            tokenID: BigInt(
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
        tokenID: BigInt(
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
        tokenID: BigInt(
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
  /**
   * Retrieve an asset definition by its IPFS CID/hash
   */
  async getAssetByHash(hashHex: string): Promise<Asset | null> {
    try {
      console.log('searching for hash hex', hashHex);
      const list = await this.pinata.files.public
        .list()
        .keyvalues({ hash: hashHex })
        .all();
      console.log('returned list of hashHex', list);
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
        tokenID: BigInt(
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
      console.error('[PlatformRepository] getAssetByHash failed', err);
      return null;
    }
  }
}
