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
            id: string | number | bigint;
            name: string;
            attributes: { name: string; values: string[]; description: string };
          };

          const asset: Asset = {
            assetClass: json.className ?? 'Unknown',
            tokenID: BigInt(json.tokenId ?? contractAsset.id ?? 0),
            name: contractAsset?.name ?? 'Unknown Asset',
            attributes: contractAsset?.attributes
              ? [
                  {
                    name: contractAsset.attributes.name,
                    values: contractAsset.attributes.values ?? [],
                    description: contractAsset.attributes.description ?? '',
                  },
                ]
              : [],
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
          const { data } = await this.pinata.gateways.public.get(`${cid}`);
          const json = typeof data === 'string' ? JSON.parse(data) : data;
          const contractAsset = json.asset as {
            id: string | number | bigint;
            name: string;
            attributes: { name: string; values: string[]; description: string };
          };
          const asset: Asset = {
            assetClass: json.className ?? assetClass,
            tokenID: BigInt(json.tokenId ?? contractAsset?.id ?? 0),
            name: contractAsset?.name ?? 'Unknown Asset',
            attributes: contractAsset?.attributes
              ? [
                  {
                    name: contractAsset.attributes.name,
                    values: contractAsset.attributes.values ?? [],
                    description: contractAsset.attributes.description ?? '',
                  },
                ]
              : [],
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
}
