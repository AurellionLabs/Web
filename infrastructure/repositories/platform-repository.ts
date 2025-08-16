import { IPlatformRepository, Asset } from '@/domain/platform';
import { AuraAsset } from '@/typechain-types';
import { PinataSDK } from 'pinata';

const DUMMY_ASSET_CLASSES: string[] = [
  'Goat',
  'Sheep',
  'Horses',
  'Gold',
  'Diamond',
];

const DUMMY_ASSETS: Asset[] = [
  {
    assetClass: 'Goat',
    tokenID: 1n,
    name: 'Mountain Goat',
    attributes: [
      {
        name: 'breed',
        values: ['Boer', 'Kalahari Red', 'Nubian'],
        description: 'Goat breed',
      },
      {
        name: 'age',
        values: ['6 months', '1 year', '2 years+'],
        description: 'Approximate age',
      },
    ],
  },
  {
    assetClass: 'Sheep',
    tokenID: 2n,
    name: 'Wool Sheep',
    attributes: [
      {
        name: 'breed',
        values: ['Merino', 'Suffolk', 'Dorper'],
        description: 'Sheep breed',
      },
      {
        name: 'wool_grade',
        values: ['Fine', 'Medium', 'Coarse'],
        description: 'Wool micron grade',
      },
    ],
  },
  {
    assetClass: 'Horses',
    tokenID: 3n,
    name: 'Racing Horse',
    attributes: [
      {
        name: 'breed',
        values: ['Thoroughbred', 'Arabian', 'Quarter Horse'],
        description: 'Horse breed',
      },
      {
        name: 'training_level',
        values: ['Green', 'Intermediate', 'Advanced'],
        description: 'Training and handling level',
      },
    ],
  },
  {
    assetClass: 'Gold',
    tokenID: 4n,
    name: 'Gold Bar',
    attributes: [
      {
        name: 'purity',
        values: ['99.9%', '99.5%', '99.0%'],
        description: 'Gold purity level',
      },
      {
        name: 'weight',
        values: ['1oz', '10oz', '100oz', '1kg'],
        description: 'Bar weight',
      },
    ],
  },
  {
    assetClass: 'Diamond',
    tokenID: 5n,
    name: 'Polished Diamond',
    attributes: [
      {
        name: 'clarity',
        values: ['IF', 'VVS1', 'VS1', 'SI1'],
        description: 'Clarity grade',
      },
      {
        name: 'carat',
        values: ['0.5ct', '1.0ct', '2.0ct+'],
        description: 'Carat weight',
      },
      {
        name: 'color',
        values: ['D', 'E', 'F', 'G'],
        description: 'Color grade',
      },
    ],
  },
];

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
        const key = await this.contract.ipfsID(i);
        if (key && typeof key === 'string') {
          ipfsKeys.push(key);
        }
      } catch (err) {
        console.error('error in getSupportedAssets', err);
        break;
      }
    }

    if (ipfsKeys.length === 0) return [];

    const assets = await Promise.all(
      ipfsKeys.map(async (key) => {
        try {
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
        console.error('error in getSupportedAssetClasses', err);
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
