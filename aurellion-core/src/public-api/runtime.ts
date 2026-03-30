import type { FastifyRequest } from 'fastify';

import {
  guardPublicApiRequest,
  type GuardOptions,
  type GuardResult,
} from './access.js';
import {
  getPublicNodeById,
  getPublicOrderById,
} from './read-service.js';
import type { PublicNodeDto, PublicOrderDto } from './types.js';

export interface PublicApiHandlers {
  guard(
    request: FastifyRequest,
    options: GuardOptions,
  ): Promise<GuardResult>;
  getPublicOrderById(orderId: string): Promise<PublicOrderDto | null>;
  getPublicNodeById(nodeId: string): Promise<PublicNodeDto | null>;
}

export function createPublicApiHandlers(): PublicApiHandlers {
  return {
    guard: guardPublicApiRequest,
    getPublicOrderById,
    getPublicNodeById,
  };
}
