import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  createPublicApiHandlers,
  type PublicApiHandlers,
} from './runtime.js';

const orderIdSchema = z.string().regex(
  /^0x[a-fA-F0-9]{64}$/,
  'orderId must be a bytes32 hex string',
);
const nodeIdSchema = z.string().regex(
  /^0x[a-fA-F0-9]{64}$/,
  'nodeId must be a bytes32 hex string',
);

const ORDER_CACHE_CONTROL =
  'public, max-age=10, s-maxage=10, stale-while-revalidate=30';
const NODE_CACHE_CONTROL =
  'public, max-age=15, s-maxage=15, stale-while-revalidate=60';

function applySharedHeaders(
  reply: FastifyReply,
  headers: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(headers)) {
    reply.header(key, value);
  }
  reply.header('vary', 'x-api-key');
}

function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  headers: Record<string, string>,
  cacheControl: string,
): FastifyReply {
  applySharedHeaders(reply, headers);
  reply.header('cache-control', cacheControl);
  return reply.code(200).send({ data });
}

function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  headers: Record<string, string>,
  cacheControl = 'no-store',
): FastifyReply {
  applySharedHeaders(reply, headers);
  reply.header('cache-control', cacheControl);
  return reply.code(statusCode).send({
    error: { code, message },
  });
}

function sendGuardError(
  reply: FastifyReply,
  statusCode: number,
  body: { error: { code: string; message: string } },
  headers: Record<string, string>,
): FastifyReply {
  applySharedHeaders(reply, headers);
  reply.header('cache-control', 'no-store');
  return reply.code(statusCode).send(body);
}

export function createPublicApiPlugin(
  handlers: PublicApiHandlers = createPublicApiHandlers(),
): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.get('/api/v1/orders/:orderId', async (request, reply) => {
      const guard = await handlers.guard(request, {
        scope: 'public-api:orders:detail',
        requestsPerMinute: 60,
      });

      if (guard.error) {
        return sendGuardError(
          reply,
          guard.error.statusCode,
          guard.error.body,
          guard.headers,
        );
      }

      const parsedOrderId = orderIdSchema.safeParse(
        (request.params as { orderId?: string }).orderId,
      );
      if (!parsedOrderId.success) {
        return sendError(
          reply,
          400,
          'INVALID_ORDER_ID',
          'orderId must be a bytes32 hex string',
          guard.headers,
        );
      }

      try {
        const order = await handlers.getPublicOrderById(parsedOrderId.data);

        if (!order) {
          return sendError(
            reply,
            404,
            'ORDER_NOT_FOUND',
            'Order not found',
            guard.headers,
          );
        }

        return sendSuccess(
          reply,
          order,
          guard.headers,
          ORDER_CACHE_CONTROL,
        );
      } catch (error) {
        request.log.error({ err: error }, 'Failed to fetch public order');
        return sendError(
          reply,
          500,
          'ORDER_FETCH_FAILED',
          'Failed to fetch order',
          guard.headers,
        );
      }
    });

    app.get('/api/v1/nodes/:nodeId', async (request, reply) => {
      const guard = await handlers.guard(request, {
        scope: 'public-api:nodes:detail',
        requestsPerMinute: 60,
      });

      if (guard.error) {
        return sendGuardError(
          reply,
          guard.error.statusCode,
          guard.error.body,
          guard.headers,
        );
      }

      const parsedNodeId = nodeIdSchema.safeParse(
        (request.params as { nodeId?: string }).nodeId,
      );
      if (!parsedNodeId.success) {
        return sendError(
          reply,
          400,
          'INVALID_NODE_ID',
          'nodeId must be a bytes32 hex string',
          guard.headers,
        );
      }

      try {
        const node = await handlers.getPublicNodeById(parsedNodeId.data);

        if (!node) {
          return sendError(
            reply,
            404,
            'NODE_NOT_FOUND',
            'Node not found',
            guard.headers,
          );
        }

        return sendSuccess(
          reply,
          node,
          guard.headers,
          NODE_CACHE_CONTROL,
        );
      } catch (error) {
        request.log.error({ err: error }, 'Failed to fetch public node');
        return sendError(
          reply,
          500,
          'NODE_FETCH_FAILED',
          'Failed to fetch node',
          guard.headers,
        );
      }
    });
  };

  return plugin;
}
