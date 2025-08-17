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
    const normalizedClass = assetClass.trim().toLowerCase();

    // Gather all keys by probing until revert
    const allKeys: string[] = [];
    for (let i = 0; ; i++) {
      try {
        const key = await this.contract.ipfsID(i);
        allKeys.push(key);
      } catch (err) {
        console.error('error in getClassAssets', err);
        break;
      }
    }
    if (allKeys.length === 0) return [];

    // Prefilter on-chain by class to avoid unnecessary gateway fetches
    const matchingKeys = (
      await Promise.all(
        allKeys.map(async (key) => {
          try {
            const onChainClass = await this.contract.hashToClass(key);
            return (onChainClass ?? '').trim().toLowerCase() === normalizedClass
              ? key
              : null;
          } catch {
            return null;
          }
        }),
      )
    ).filter((k): k is string => !!k);

    if (matchingKeys.length === 0) return [];

    const assets = await Promise.all(
      matchingKeys.map(async (key) => {
        try {
          const { data } = await this.pinata.gateways.public.get(`${key}`);
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
