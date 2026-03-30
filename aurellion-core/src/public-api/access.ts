import NodeCache from 'node-cache';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT = 60;
const AUTH_MODE_PUBLIC = 'public';
const AUTH_MODE_API_KEY = 'api_key';

type AuthMode = typeof AUTH_MODE_PUBLIC | typeof AUTH_MODE_API_KEY;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

export interface GuardOptions {
  scope: string;
  requestsPerMinute?: number;
}

export interface GuardError {
  statusCode: number;
  body: {
    error: {
      code: string;
      message: string;
    };
  };
}

export interface GuardResult {
  error?: GuardError;
  headers: Record<string, string>;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __aurellionCorePublicApiRateLimitCache__?: NodeCache;
};

const rateLimitCache =
  globalForRateLimit.__aurellionCorePublicApiRateLimitCache__ ??
  new NodeCache({
    stdTTL: RATE_LIMIT_WINDOW_SECONDS,
    checkperiod: RATE_LIMIT_WINDOW_SECONDS,
    useClones: false,
  });

globalForRateLimit.__aurellionCorePublicApiRateLimitCache__ = rateLimitCache;

function getAuthMode(): AuthMode {
  const rawMode = process.env.PUBLIC_API_AUTH_MODE?.trim().toLowerCase();
  return rawMode === AUTH_MODE_API_KEY
    ? AUTH_MODE_API_KEY
    : AUTH_MODE_PUBLIC;
}

function getConfiguredApiKeys(): Set<string> {
  const rawKeys = process.env.PUBLIC_API_KEYS || process.env.API_KEYS || '';
  return new Set(
    rawKeys
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean),
  );
}

function getFirstHeaderValue(
  request: RequestLike,
  headerName: string,
): string | undefined {
  const rawValue = request.headers[headerName];
  if (Array.isArray(rawValue)) {
    return rawValue[0];
  }
  return rawValue;
}

function getClientIdentifier(request: RequestLike): string {
  const forwardedFor = getFirstHeaderValue(request, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = getFirstHeaderValue(request, 'x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number,
): Record<string, string> {
  return {
    'x-rate-limit-limit': String(limit),
    'x-rate-limit-remaining': String(remaining),
    'x-rate-limit-reset': String(Math.ceil(resetAt / 1000)),
  };
}

function buildError(
  code: string,
  message: string,
  statusCode: number,
): GuardError {
  return {
    statusCode,
    body: {
      error: { code, message },
    },
  };
}

function consumeRateLimit(
  request: RequestLike,
  scope: string,
  limit: number,
): { allowed: boolean; headers: Record<string, string> } {
  const clientId = getClientIdentifier(request);
  const cacheKey = `${scope}:${clientId}`;
  const now = Date.now();
  const existing = rateLimitCache.get<RateLimitEntry>(cacheKey);

  if (!existing || existing.resetAt <= now) {
    const nextEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
    };
    rateLimitCache.set(cacheKey, nextEntry, RATE_LIMIT_WINDOW_SECONDS);

    return {
      allowed: true,
      headers: buildRateLimitHeaders(limit, limit - 1, nextEntry.resetAt),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      headers: buildRateLimitHeaders(limit, 0, existing.resetAt),
    };
  }

  const updatedEntry: RateLimitEntry = {
    count: existing.count + 1,
    resetAt: existing.resetAt,
  };
  const ttlSeconds = Math.max(
    1,
    Math.ceil((updatedEntry.resetAt - now) / 1000),
  );
  rateLimitCache.set(cacheKey, updatedEntry, ttlSeconds);

  return {
    allowed: true,
    headers: buildRateLimitHeaders(
      limit,
      Math.max(0, limit - updatedEntry.count),
      updatedEntry.resetAt,
    ),
  };
}

export async function guardPublicApiRequest(
  request: RequestLike,
  options: GuardOptions,
): Promise<GuardResult> {
  const requestsPerMinute = options.requestsPerMinute ?? DEFAULT_RATE_LIMIT;
  const rateLimit = consumeRateLimit(
    request,
    options.scope,
    requestsPerMinute,
  );

  if (!rateLimit.allowed) {
    return {
      error: buildError('RATE_LIMITED', 'Too many requests', 429),
      headers: rateLimit.headers,
    };
  }

  const authMode = getAuthMode();
  if (authMode === AUTH_MODE_PUBLIC) {
    return { headers: rateLimit.headers };
  }

  const configuredApiKeys = getConfiguredApiKeys();
  if (configuredApiKeys.size === 0) {
    return {
      error: buildError(
        'API_AUTH_MISCONFIGURED',
        'API key auth is enabled but no keys are configured',
        500,
      ),
      headers: rateLimit.headers,
    };
  }

  const presentedApiKey = getFirstHeaderValue(request, 'x-api-key')?.trim();
  if (!presentedApiKey) {
    return {
      error: buildError('API_KEY_REQUIRED', 'Missing API key', 401),
      headers: rateLimit.headers,
    };
  }

  if (!configuredApiKeys.has(presentedApiKey)) {
    return {
      error: buildError('API_KEY_INVALID', 'Invalid API key', 403),
      headers: rateLimit.headers,
    };
  }

  return { headers: rateLimit.headers };
}

export function resetPublicApiAccessState(): void {
  rateLimitCache.flushAll();
}
