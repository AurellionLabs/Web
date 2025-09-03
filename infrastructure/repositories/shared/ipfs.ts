import { AssetIpfsRecord } from '@/domain/platform';
import { PinataSDK } from 'pinata';

export const hashToAssets = async (
    hash: string,
    pinata: PinataSDK,
): Promise<AssetIpfsRecord[]> => {
    try {
        console.log("searching for asset list returned with hash", hash)
        const list = await pinata.files.public
            .list()
            .keyvalues({ hash: hash })
            .all();
        console.log("list returned by ipfs", list)

        const items: any[] = Array.isArray(list) ? list : Object.values(list as any);

        const results = await Promise.all(
            items.map(async (item: any) => {
                const cid: string | undefined = item?.cid || item?.ipfs_pin_hash || item?.id || item?.cidv1;
                if (!cid) return null;
                console.log("cid in list", cid)
                const { data } = await pinata.gateways.public.get(`${cid}`);
                return data as unknown as AssetIpfsRecord;
            })
        );

        const filtered = results.filter((v): v is AssetIpfsRecord => Boolean(v));
        console.log("Raw assets returned by ipfs", filtered)
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
        console.log("searching for asset list returned with tokenId", tokenId)
        const list = await pinata.files.public
            .list()
            .keyvalues({ tokenId: tokenId})
            .all();
        console.log("list returned by ipfs", list)

        const items: any[] = Array.isArray(list) ? list : Object.values(list as any);

        const results = await Promise.all(
            items.map(async (item: any) => {
                const cid: string | undefined = item?.cid || item?.ipfs_pin_hash || item?.id || item?.cidv1;
                if (!cid) return null;
                console.log("cid in list", cid)
                const { data } = await pinata.gateways.public.get(`${cid}`);
                return data as unknown as AssetIpfsRecord;
            })
        );

        const filtered = results.filter((v): v is AssetIpfsRecord => Boolean(v));
        console.log("Raw assets returned by ipfs", filtered)
        return filtered;
    } catch (e) {
        console.error('hashToAssets: error when trying to find asset', e);
        return [];
    }
};
