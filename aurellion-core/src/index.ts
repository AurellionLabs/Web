import { createApp } from './app.js';
import { readCoreEnv } from './config/env.js';

async function main(): Promise<void> {
  const env = readCoreEnv();
  const app = createApp();

  try {
    await app.listen({
      host: env.host,
      port: env.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
