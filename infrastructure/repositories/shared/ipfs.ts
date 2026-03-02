import { AssetIpfsRecord } from '@/domain/platform';
import { PinataSDK } from 'pinata';

export const hashToAssets = async (
  hash: string,
  pinata: PinataSDK,
): Promise<AssetIpfsRecord[]> => {
  try {
    const list = await pinata.files.public
      .list()
      .keyvalues({ hash: hash })
      .all();

    const items: any[] = Array.isArray(list)
      ? list
      : Object.values(list as any);

    const results = await Promise.all(
      items.map(async (item: any) => {
        const cid: string | undefined =
          item?.cid || item?.ipfs_pin_hash || item?.id || item?.cidv1;
        if (!cid) return null;
        const { data } = await pinata.gateways.public.get(`${cid}`);
        return data as unknown as AssetIpfsRecord;
      }),
    );

    const filtered = results.filter((v): v is AssetIpfsRecord => Boolean(v));
    return filtered;
  } catch (e) {
    console.error('hashToAssets: error when trying to find asset', e);
    return [];
  }
};

export const tokenIdToAssets = async (
  tokenId: string,
  pinata: PinataSDK,
): Promise<AssetIpfsRecord[]> => {
  try {
    const list = await pinata.files.public
      .list()
      .keyvalues({ tokenId: tokenId })
      .all();

    const items: any[] = Array.isArray(list)
      ? list
      : Object.values(list as any);

    const results = await Promise.all(
      items.map(async (item: any) => {
        const cid: string | undefined =
          item?.cid || item?.ipfs_pin_hash || item?.id || item?.cidv1;
        if (!cid) return null;
        const { data } = await pinata.gateways.public.get(`${cid}`);
        return data as unknown as AssetIpfsRecord;
      }),
    );

    const filtered = results.filter((v): v is AssetIpfsRecord => Boolean(v));
    return filtered;
  } catch (e) {
    console.error('hashToAssets: error when trying to find asset', e);
    return [];
  }
};
