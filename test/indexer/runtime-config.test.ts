import { resolveIndexerRuntimeConfig } from '@/indexer/runtime-config';

describe('resolveIndexerRuntimeConfig', () => {
  it('builds an Arbitrum config from runtime env', () => {
    const config = resolveIndexerRuntimeConfig({
      CHAIN_ID: '42161',
      PONDER_RPC_URL: 'https://arb.example',
      DIAMOND_ADDRESS: '0x1111111111111111111111111111111111111111',
      DIAMOND_DEPLOY_BLOCK: '12345',
      DATABASE_URL: 'postgresql://example',
    });

    expect(config.chain.name).toBe('arbitrumOne');
    expect(config.chain.id).toBe(42161);
    expect(config.chain.rpc).toBe('https://arb.example');
    expect(config.contracts.Diamond.address).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(config.contracts.Diamond.startBlock).toBe(12345);
    expect(config.database.schema).toBe('public');
  });

  it('falls back to known chain defaults when CHAIN_NAME is omitted', () => {
    const config = resolveIndexerRuntimeConfig({
      CHAIN_ID: '84532',
      NEXT_PUBLIC_RPC_URL_84532: 'https://base-sepolia.example',
      NEXT_PUBLIC_DIAMOND_ADDRESS: '0x2222222222222222222222222222222222222222',
      DIAMOND_DEPLOY_BLOCK: '0',
    });

    expect(config.chain.name).toBe('baseSepolia');
    expect(config.chain.rpc).toBe('https://base-sepolia.example');
    expect(config.contracts.Diamond.chain).toBe('baseSepolia');
  });
});
