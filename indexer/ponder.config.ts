import { createConfig } from 'ponder';

import { resolveIndexerRuntimeConfig } from './runtime-config';

const runtimeConfig = resolveIndexerRuntimeConfig();

export default createConfig({
  chains: {
    [runtimeConfig.chain.name]: {
      id: runtimeConfig.chain.id,
      rpc: runtimeConfig.chain.rpc,
    },
  },
  contracts: {
    Diamond: runtimeConfig.contracts.Diamond,
  },
  database: {
    kind: 'postgres',
    connectionString: runtimeConfig.database.connectionString,
    schema: runtimeConfig.database.schema,
  },
});
