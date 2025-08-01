import { PlatformRepository, Asset } from '@/domain/platform';

export class PlatformRepositoryImpl implements PlatformRepository {
  async getSupportedAssets(): Promise<Asset[]> {
    return [];
  }
}
