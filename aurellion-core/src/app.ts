import Fastify, { type FastifyInstance } from 'fastify';

import { createPublicApiPlugin } from './public-api/plugin.js';
import type { PublicApiHandlers } from './public-api/runtime.js';

export function createApp(
  handlers?: PublicApiHandlers,
): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.register(createPublicApiPlugin(handlers));

  return app;
}
