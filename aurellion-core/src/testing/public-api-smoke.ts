type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: Json | undefined;
  text: string;
}

interface CommonArgs {
  baseUrl: string;
  indexerUrl: string;
  timeout: number;
  forwardedFor: string;
  apiKey?: string;
  json: boolean;
}

export interface HealthArgs extends CommonArgs {
  command: 'health';
}

export interface DiscoverArgs extends CommonArgs {
  command: 'discover';
  kind: 'nodes' | 'orders' | 'all';
  limit: number;
  owner?: string;
  buyer?: string;
  seller?: string;
}

export interface SmokeArgs extends CommonArgs {
  command: 'smoke';
  nodeId?: string;
  orderId?: string;
  discover: boolean;
}

export interface AuthArgs extends CommonArgs {
  command: 'auth';
  kind: 'node' | 'order';
  resourceId?: string;
  discover: boolean;
  invalidApiKey: string;
}

export interface RateLimitArgs extends CommonArgs {
  command: 'rate-limit';
  kind: 'node' | 'order';
  resourceId?: string;
  requests: number;
}

export type ParsedArgs =
  | HealthArgs
  | DiscoverArgs
  | SmokeArgs
  | AuthArgs
  | RateLimitArgs;

export interface SmokeCheck {
  name: string;
  ok: boolean;
  details: string;
  skipped?: boolean;
}

export interface SmokeSummary {
  command: ParsedArgs['command'];
  baseUrl: string;
  indexerUrl: string;
  checks: SmokeCheck[];
}

export interface RunResult {
  exitCode: number;
  summary: SmokeSummary;
}

export interface SmokeDependencies {
  httpJsonRequest(
    method: string,
    url: string,
    options: {
      headers?: Record<string, string>;
      payload?: Record<string, unknown>;
      timeoutSeconds: number;
    },
  ): Promise<ApiResponse>;
  discoverNodes(
    indexerUrl: string,
    limit: number,
    owner: string | undefined,
    timeoutSeconds: number,
  ): Promise<Record<string, Json>[]>;
  discoverOrders(
    indexerUrl: string,
    limit: number,
    buyer: string | undefined,
    seller: string | undefined,
    timeoutSeconds: number,
  ): Promise<Record<string, Json>[]>;
  log(message: string): void;
}

const DEFAULT_BASE_URL =
  process.env.AURELLION_CORE_PUBLIC_API_BASE_URL ||
  process.env.PUBLIC_API_BASE_URL ||
  'http://localhost:3001';
const DEFAULT_INDEXER_URL =
  process.env.PUBLIC_API_INDEXER_URL ||
  process.env.NEXT_PUBLIC_INDEXER_URL ||
  process.env.NEXT_PUBLIC_INDEXER_URL_84532 ||
  'https://dev.indexer.aurellionlabs.com/graphql';
const DEFAULT_TIMEOUT = Number(process.env.PUBLIC_API_TIMEOUT_SECONDS || '15');
const DEFAULT_FORWARDED_FOR =
  process.env.PUBLIC_API_TEST_IP || '203.0.113.10';
const DEFAULT_API_KEY = process.env.PUBLIC_API_KEY || '';
const DEFAULT_INVALID_API_KEY = 'invalid-test-key';

const NODE_INVALID_ID = 'not-a-node';
const ORDER_INVALID_ID = 'not-an-order';

const LATEST_NODES_QUERY = `
query LatestNodes($limit: Int = 5) {
  diamondNodeRegisteredEventss(
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      node_hash
      owner
      node_type
      block_timestamp
      transaction_hash
    }
  }
}
`;

const NODES_BY_OWNER_QUERY = `
query NodesByOwner($owner: String!, $limit: Int = 5) {
  diamondNodeRegisteredEventss(
    where: { owner: $owner }
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      node_hash
      owner
      node_type
      block_timestamp
      transaction_hash
    }
  }
}
`;

const LATEST_ORDERS_QUERY = `
query LatestOrders($limit: Int = 5) {
  diamondUnifiedOrderCreatedEventss(
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      unified_order_id
      buyer
      seller
      token
      token_id
      quantity
      price
      block_timestamp
      transaction_hash
    }
  }
}
`;

const LATEST_P2P_ORDERS_QUERY = `
query LatestP2POrders($limit: Int = 5) {
  diamondP2POfferCreatedEventss(
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      order_id
      creator
      target_counterparty
      token
      token_id
      token_quantity
      price
      block_timestamp
      transaction_hash
    }
  }
}
`;

const ORDERS_BY_BUYER_QUERY = `
query OrdersByBuyer($buyer: String!, $limit: Int = 5) {
  diamondUnifiedOrderCreatedEventss(
    where: { buyer: $buyer }
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      unified_order_id
      buyer
      seller
      token
      token_id
      quantity
      price
      block_timestamp
      transaction_hash
    }
  }
}
`;

const ORDERS_BY_SELLER_QUERY = `
query OrdersBySeller($seller: String!, $limit: Int = 5) {
  diamondUnifiedOrderCreatedEventss(
    where: { seller: $seller }
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      unified_order_id
      buyer
      seller
      token
      token_id
      quantity
      price
      block_timestamp
      transaction_hash
    }
  }
}
`;

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function randomBytes32(exclude: Set<string> = new Set()): string {
  let value = '';
  do {
    value = `0x${crypto.randomUUID().replace(/-/g, '')}${crypto
      .randomUUID()
      .replace(/-/g, '')}`;
  } while (exclude.has(value.toLowerCase()));
  return value;
}

function safeJsonParse(text: string): Json | undefined {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as Json;
  } catch {
    return undefined;
  }
}

export async function defaultHttpJsonRequest(
  method: string,
  url: string,
  options: {
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
    timeoutSeconds: number;
  },
): Promise<ApiResponse> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...options.headers,
  };
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    options.timeoutSeconds * 1000,
  );

  try {
    let body: string | undefined;
    if (options.payload) {
      body = JSON.stringify(options.payload);
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await response.text();

    return {
      status: response.status,
      headers: Object.fromEntries(
        Array.from(response.headers.entries()).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      ),
      body: safeJsonParse(text),
      text,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function graphqlRequest(
  httpRequest: SmokeDependencies['httpJsonRequest'],
  indexerUrl: string,
  query: string,
  variables: Record<string, unknown>,
  timeoutSeconds: number,
): Promise<Record<string, Json>> {
  const response = await httpRequest('POST', indexerUrl, {
    payload: { query: query.trim(), variables },
    timeoutSeconds,
  });

  if (response.status !== 200) {
    throw new Error(
      `Indexer request failed with status ${response.status}: ${response.text}`,
    );
  }

  if (!response.body || typeof response.body !== 'object') {
    throw new Error('Indexer response was not valid JSON');
  }

  const body = response.body as Record<string, Json>;
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    throw new Error(`Indexer returned errors: ${JSON.stringify(body.errors)}`);
  }

  const data = body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Indexer response did not contain a data object');
  }

  return data as Record<string, Json>;
}

function asItems(value: Json | undefined): Record<string, Json>[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const items = (value as Record<string, Json>).items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter(
    (item): item is Record<string, Json> =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  );
}

async function defaultDiscoverNodes(
  indexerUrl: string,
  limit: number,
  owner: string | undefined,
  timeoutSeconds: number,
): Promise<Record<string, Json>[]> {
  const data = owner
    ? await graphqlRequest(
        defaultHttpJsonRequest,
        indexerUrl,
        NODES_BY_OWNER_QUERY,
        { owner: owner.toLowerCase(), limit },
        timeoutSeconds,
      )
    : await graphqlRequest(
        defaultHttpJsonRequest,
        indexerUrl,
        LATEST_NODES_QUERY,
        { limit },
        timeoutSeconds,
      );

  return asItems(data.diamondNodeRegisteredEventss);
}

async function defaultDiscoverOrders(
  indexerUrl: string,
  limit: number,
  buyer: string | undefined,
  seller: string | undefined,
  timeoutSeconds: number,
): Promise<Record<string, Json>[]> {
  const data = buyer
    ? await graphqlRequest(
        defaultHttpJsonRequest,
        indexerUrl,
        ORDERS_BY_BUYER_QUERY,
        { buyer: buyer.toLowerCase(), limit },
        timeoutSeconds,
      )
    : seller
      ? await graphqlRequest(
          defaultHttpJsonRequest,
          indexerUrl,
          ORDERS_BY_SELLER_QUERY,
          { seller: seller.toLowerCase(), limit },
          timeoutSeconds,
        )
      : null;

  if (data) {
    return asItems(data.diamondUnifiedOrderCreatedEventss);
  }

  const p2pData = await graphqlRequest(
    defaultHttpJsonRequest,
    indexerUrl,
    LATEST_P2P_ORDERS_QUERY,
    { limit },
    timeoutSeconds,
  );
  const p2pOrders = asItems(
    (p2pData as Record<string, { items?: Record<string, Json>[] }>)
      .diamondP2POfferCreatedEventss,
  );
  if (p2pOrders.length > 0) {
    return p2pOrders;
  }

  const unifiedData = await graphqlRequest(
    defaultHttpJsonRequest,
    indexerUrl,
    LATEST_ORDERS_QUERY,
    { limit },
    timeoutSeconds,
  );

  return asItems(unifiedData.diamondUnifiedOrderCreatedEventss);
}

export function createDefaultDependencies(): SmokeDependencies {
  return {
    httpJsonRequest: defaultHttpJsonRequest,
    discoverNodes: defaultDiscoverNodes,
    discoverOrders: defaultDiscoverOrders,
    log: (message: string) => {
      console.log(message);
    },
  };
}

function getErrorCode(response: ApiResponse): string | undefined {
  if (
    !response.body ||
    typeof response.body !== 'object' ||
    Array.isArray(response.body)
  ) {
    return undefined;
  }
  const error = (response.body as Record<string, Json>).error;
  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    return undefined;
  }
  const code = (error as Record<string, Json>).code;
  return typeof code === 'string' ? code : undefined;
}

function getDiscoveredOrderId(
  order: Record<string, Json> | undefined,
): string | undefined {
  if (!order) return undefined;
  if (typeof order.order_id === 'string') return order.order_id;
  if (typeof order.unified_order_id === 'string') return order.unified_order_id;
  return undefined;
}

function describeDiscoveredOrder(order: Record<string, Json>): string {
  const orderId = getDiscoveredOrderId(order) || 'unknown';

  if (typeof order.order_id === 'string') {
    return `orderId=${orderId} source=p2p creator=${order.creator ?? 'unknown'} tx=${order.transaction_hash ?? 'unknown'}`;
  }

  return `orderId=${orderId} source=unified buyer=${order.buyer ?? 'unknown'} seller=${order.seller ?? 'unknown'} tx=${order.transaction_hash ?? 'unknown'}`;
}

export function checkSharedHeaders(response: ApiResponse): string[] {
  const issues: string[] = [];
  if (!response.headers['x-rate-limit-limit']) {
    issues.push('missing x-rate-limit-limit header');
  }
  if (!response.headers['x-rate-limit-remaining']) {
    issues.push('missing x-rate-limit-remaining header');
  }
  if (response.headers.vary !== 'x-api-key') {
    issues.push('vary header is not x-api-key');
  }
  return issues;
}

export function checkNodeSuccess(
  response: ApiResponse,
  nodeId: string,
): [boolean, string] {
  if (response.status !== 200) {
    return [
      false,
      `expected 200, got ${response.status} (${getErrorCode(response)})`,
    ];
  }

  const issues = checkSharedHeaders(response);
  if (!response.headers['cache-control']?.includes('public')) {
    issues.push('cache-control is not public');
  }

  const body = response.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    issues.push('response body is not a JSON object');
    return [false, issues.join('; ')];
  }

  const data = (body as Record<string, Json>).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push('missing data envelope');
    return [false, issues.join('; ')];
  }

  if ((data as Record<string, Json>).nodeId !== nodeId) {
    issues.push(
      `nodeId mismatch: ${(data as Record<string, Json>).nodeId} != ${nodeId}`,
    );
  }

  const assets = (data as Record<string, Json>).assets;
  if (!Array.isArray(assets)) {
    issues.push('assets is not a list');
  } else if (assets.length > 0) {
    const firstAsset = assets[0];
    if (
      !firstAsset ||
      typeof firstAsset !== 'object' ||
      Array.isArray(firstAsset)
    ) {
      issues.push('first asset is not an object');
    } else {
      if (!('sellableQuantity' in firstAsset)) {
        issues.push('first asset is missing sellableQuantity');
      }
      if (!('custodyQuantity' in firstAsset)) {
        issues.push('first asset is missing custodyQuantity');
      }
    }
  }

  return issues.length > 0
    ? [false, issues.join('; ')]
    : [
        true,
        `nodeId=${nodeId}, assets=${Array.isArray(assets) ? assets.length : 0}`,
      ];
}

export function checkOrderSuccess(
  response: ApiResponse,
  orderId: string,
): [boolean, string] {
  if (response.status !== 200) {
    return [
      false,
      `expected 200, got ${response.status} (${getErrorCode(response)})`,
    ];
  }

  const issues = checkSharedHeaders(response);
  if (!response.headers['cache-control']?.includes('public')) {
    issues.push('cache-control is not public');
  }

  const body = response.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    issues.push('response body is not a JSON object');
    return [false, issues.join('; ')];
  }

  const data = (body as Record<string, Json>).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push('missing data envelope');
    return [false, issues.join('; ')];
  }

  if ((data as Record<string, Json>).orderId !== orderId) {
    issues.push(
      `orderId mismatch: ${(data as Record<string, Json>).orderId} != ${orderId}`,
    );
  }

  const orderSource = (data as Record<string, Json>).orderSource;
  if (orderSource !== 'p2p' && orderSource !== 'unified') {
    issues.push('orderSource is missing or invalid');
  }

  const journeys = (data as Record<string, Json>).journeys;
  if (!Array.isArray(journeys)) {
    issues.push('journeys is not a list');
  }

  return issues.length > 0
    ? [false, issues.join('; ')]
    : [
        true,
        `orderId=${orderId}, journeys=${Array.isArray(journeys) ? journeys.length : 0}`,
      ];
}

export function checkErrorResponse(
  response: ApiResponse,
  expectedStatus: number,
  expectedCode: string,
  requireVary = true,
): [boolean, string] {
  const issues: string[] = [];
  if (!response.headers['x-rate-limit-limit']) {
    issues.push('missing x-rate-limit-limit header');
  }
  if (!response.headers['x-rate-limit-remaining']) {
    issues.push('missing x-rate-limit-remaining header');
  }
  if (requireVary && response.headers.vary !== 'x-api-key') {
    issues.push('vary header is not x-api-key');
  }
  if (response.status !== expectedStatus) {
    issues.push(`expected status ${expectedStatus}, got ${response.status}`);
  }

  const code = getErrorCode(response);
  if (code !== expectedCode) {
    issues.push(`expected code ${expectedCode}, got ${code}`);
  }

  return issues.length > 0
    ? [false, issues.join('; ')]
    : [true, `status=${response.status}, code=${code}`];
}

function checkHealthResponse(
  response: ApiResponse,
  expectedPath: '/health' | '/ready',
): [boolean, string] {
  if (response.status !== 200) {
    return [false, `expected 200, got ${response.status}`];
  }
  if (
    !response.body ||
    typeof response.body !== 'object' ||
    Array.isArray(response.body)
  ) {
    return [false, `${expectedPath} response body is not a JSON object`];
  }
  const status = (response.body as Record<string, Json>).status;
  const expectedStatus = expectedPath === '/health' ? 'ok' : 'ready';
  if (status !== expectedStatus) {
    return [false, `${expectedPath} status mismatch: ${status}`];
  }
  return [true, `status=${status}`];
}

function endpointHeaders(
  apiKey: string | undefined,
  forwardedFor: string,
): Record<string, string> {
  return apiKey
    ? { 'x-forwarded-for': forwardedFor, 'x-api-key': apiKey }
    : { 'x-forwarded-for': forwardedFor };
}

function authResourcePath(args: AuthArgs): {
  basePath: string;
  resourceId: string;
} {
  if (args.kind === 'node') {
    return {
      basePath: '/api/v1/nodes',
      resourceId: args.resourceId || randomBytes32(),
    };
  }

  return {
    basePath: '/api/v1/orders',
    resourceId: args.resourceId || randomBytes32(),
  };
}

function authSuccessExpectation(
  kind: 'node' | 'order',
  discovered: boolean,
): { status: number; code: string } {
  if (discovered) {
    return { status: 200, code: 'success with valid API key' };
  }
  return {
    status: 404,
    code: kind === 'node' ? 'NODE_NOT_FOUND' : 'ORDER_NOT_FOUND',
  };
}

function rateLimitPath(kind: 'node' | 'order', resourceId?: string): string {
  if (kind === 'node') {
    return `/api/v1/nodes/${resourceId || NODE_INVALID_ID}`;
  }
  return `/api/v1/orders/${resourceId || ORDER_INVALID_ID}`;
}

function createSummary(args: ParsedArgs): SmokeSummary {
  return {
    command: args.command,
    baseUrl: args.baseUrl,
    indexerUrl: args.indexerUrl,
    checks: [],
  };
}

function recordCheck(
  summary: SmokeSummary,
  deps: SmokeDependencies,
  check: SmokeCheck,
  jsonOutput: boolean,
): void {
  summary.checks.push(check);
  if (jsonOutput) {
    return;
  }
  if (check.skipped) {
    deps.log(`[SKIP] ${check.name}: ${check.details}`);
    return;
  }
  deps.log(`[${check.ok ? 'PASS' : 'FAIL'}] ${check.name}: ${check.details}`);
}

function recordSection(
  deps: SmokeDependencies,
  jsonOutput: boolean,
  title: string,
): void {
  if (!jsonOutput) {
    deps.log(`\n== ${title} ==`);
  }
}

async function resolveSmokeIds(
  args: SmokeArgs,
  deps: SmokeDependencies,
): Promise<{ nodeId?: string; orderId?: string; discoveryFailed: boolean }> {
  let nodeId = args.nodeId;
  let orderId = args.orderId;
  let discoveryFailed = false;

  if (!args.discover) {
    return { nodeId, orderId, discoveryFailed };
  }

  if (!nodeId) {
    const nodes = await deps.discoverNodes(
      args.indexerUrl,
      1,
      undefined,
      args.timeout,
    );
    nodeId = typeof nodes[0]?.node_hash === 'string' ? nodes[0].node_hash : undefined;
    discoveryFailed ||= !nodeId;
  }

  if (!orderId) {
    const orders = await deps.discoverOrders(
      args.indexerUrl,
      1,
      undefined,
      undefined,
      args.timeout,
    );
    orderId = getDiscoveredOrderId(orders[0]);
    discoveryFailed ||= !orderId;
  }

  return { nodeId, orderId, discoveryFailed };
}

async function runHealthChecks(
  args: CommonArgs,
  deps: SmokeDependencies,
  summary: SmokeSummary,
): Promise<void> {
  recordSection(deps, args.json, 'Health Checks');

  for (const path of ['/health', '/ready'] as const) {
    const response = await deps.httpJsonRequest(
      'GET',
      buildUrl(args.baseUrl, path),
      { timeoutSeconds: args.timeout },
    );
    const [ok, details] = checkHealthResponse(response, path);
    recordCheck(summary, deps, { name: `GET ${path}`, ok, details }, args.json);
  }
}

async function runDiscover(
  args: DiscoverArgs,
  deps: SmokeDependencies,
  summary: SmokeSummary,
): Promise<void> {
  if (args.kind === 'nodes' || args.kind === 'all') {
    recordSection(deps, args.json, 'Latest Nodes');
    const nodes = await deps.discoverNodes(
      args.indexerUrl,
      args.limit,
      args.owner,
      args.timeout,
    );
    if (nodes.length === 0) {
      recordCheck(summary, deps, {
        name: 'discover nodes',
        ok: true,
        details: 'No node IDs found.',
      }, args.json);
    } else {
      nodes.forEach((node, index) => {
        recordCheck(summary, deps, {
          name: `discover nodes #${index + 1}`,
          ok: true,
          details: `nodeId=${node.node_hash} owner=${node.owner} type=${node.node_type} tx=${node.transaction_hash}`,
        }, args.json);
      });
    }
  }

  if (args.kind === 'orders' || args.kind === 'all') {
    recordSection(deps, args.json, 'Latest Orders');
    const orders = await deps.discoverOrders(
      args.indexerUrl,
      args.limit,
      args.buyer,
      args.seller,
      args.timeout,
    );
    if (orders.length === 0) {
      recordCheck(summary, deps, {
        name: 'discover orders',
        ok: true,
        details: 'No order IDs found.',
      }, args.json);
    } else {
      orders.forEach((order, index) => {
        recordCheck(summary, deps, {
          name: `discover orders #${index + 1}`,
          ok: true,
          details: describeDiscoveredOrder(order),
        }, args.json);
      });
    }
  }
}

async function runSmoke(
  args: SmokeArgs,
  deps: SmokeDependencies,
  summary: SmokeSummary,
): Promise<void> {
  await runHealthChecks(args, deps, summary);
  recordSection(deps, args.json, 'Smoke Tests');

  const { nodeId, orderId, discoveryFailed } = await resolveSmokeIds(args, deps);
  if (args.discover && discoveryFailed) {
    recordCheck(summary, deps, {
      name: 'discover ids for smoke',
      ok: false,
      details: 'Failed to discover one or more live IDs from the indexer',
    }, args.json);
  }

  const nodeBase = buildUrl(args.baseUrl, '/api/v1/nodes');
  const orderBase = buildUrl(args.baseUrl, '/api/v1/orders');
  const headers = endpointHeaders(args.apiKey, args.forwardedFor);

  if (nodeId) {
    const response = await deps.httpJsonRequest('GET', `${nodeBase}/${nodeId}`, {
      headers,
      timeoutSeconds: args.timeout,
    });
    const [ok, details] = checkNodeSuccess(response, nodeId);
    recordCheck(summary, deps, {
      name: 'GET /api/v1/nodes/[nodeId] success',
      ok,
      details,
    }, args.json);
  } else {
    recordCheck(summary, deps, {
      name: 'GET /api/v1/nodes/[nodeId] success',
      ok: true,
      skipped: true,
      details: 'provide --node-id or add --discover',
    }, args.json);
  }

  {
    const response = await deps.httpJsonRequest(
      'GET',
      `${nodeBase}/${NODE_INVALID_ID}`,
      { headers, timeoutSeconds: args.timeout },
    );
    const [ok, details] = checkErrorResponse(response, 400, 'INVALID_NODE_ID');
    recordCheck(summary, deps, {
      name: 'GET /api/v1/nodes invalid id',
      ok,
      details,
    }, args.json);
  }

  {
    const missingNodeId = randomBytes32(new Set(nodeId ? [nodeId.toLowerCase()] : []));
    const response = await deps.httpJsonRequest(
      'GET',
      `${nodeBase}/${missingNodeId}`,
      { headers, timeoutSeconds: args.timeout },
    );
    const [ok, details] = checkErrorResponse(response, 404, 'NODE_NOT_FOUND');
    recordCheck(summary, deps, {
      name: 'GET /api/v1/nodes missing id',
      ok,
      details,
    }, args.json);
  }

  if (orderId) {
    const response = await deps.httpJsonRequest('GET', `${orderBase}/${orderId}`, {
      headers,
      timeoutSeconds: args.timeout,
    });
    const [ok, details] = checkOrderSuccess(response, orderId);
    recordCheck(summary, deps, {
      name: 'GET /api/v1/orders/[orderId] success',
      ok,
      details,
    }, args.json);
  } else {
    recordCheck(summary, deps, {
      name: 'GET /api/v1/orders/[orderId] success',
      ok: true,
      skipped: true,
      details: 'provide --order-id or add --discover',
    }, args.json);
  }

  {
    const response = await deps.httpJsonRequest(
      'GET',
      `${orderBase}/${ORDER_INVALID_ID}`,
      { headers, timeoutSeconds: args.timeout },
    );
    const [ok, details] = checkErrorResponse(response, 400, 'INVALID_ORDER_ID');
    recordCheck(summary, deps, {
      name: 'GET /api/v1/orders invalid id',
      ok,
      details,
    }, args.json);
  }

  {
    const missingOrderId = randomBytes32(
      new Set(orderId ? [orderId.toLowerCase()] : []),
    );
    const response = await deps.httpJsonRequest(
      'GET',
      `${orderBase}/${missingOrderId}`,
      { headers, timeoutSeconds: args.timeout },
    );
    const [ok, details] = checkErrorResponse(response, 404, 'ORDER_NOT_FOUND');
    recordCheck(summary, deps, {
      name: 'GET /api/v1/orders missing id',
      ok,
      details,
    }, args.json);
  }
}

async function runAuth(
  args: AuthArgs,
  deps: SmokeDependencies,
  summary: SmokeSummary,
): Promise<void> {
  await runHealthChecks(args, deps, summary);
  recordSection(deps, args.json, 'Auth Tests');
  if (!args.json) {
    deps.log(
      'These checks assume the server is running with PUBLIC_API_AUTH_MODE=api_key.',
    );
  }

  let discovered = false;
  let resourceId = args.resourceId;

  if (args.discover && !resourceId) {
    if (args.kind === 'node') {
      const nodes = await deps.discoverNodes(args.indexerUrl, 1, undefined, args.timeout);
      if (typeof nodes[0]?.node_hash === 'string') {
        resourceId = nodes[0].node_hash;
        discovered = true;
      }
    } else {
      const orders = await deps.discoverOrders(
        args.indexerUrl,
        1,
        undefined,
        undefined,
        args.timeout,
      );
      const discoveredOrderId = getDiscoveredOrderId(orders[0]);
      if (typeof discoveredOrderId === 'string') {
        resourceId = discoveredOrderId;
        discovered = true;
      }
    }
  }

  const target = authResourcePath({ ...args, resourceId });
  const url = buildUrl(args.baseUrl, `${target.basePath}/${target.resourceId}`);

  {
    const response = await deps.httpJsonRequest('GET', url, {
      headers: endpointHeaders(undefined, args.forwardedFor),
      timeoutSeconds: args.timeout,
    });
    const [ok, details] = checkErrorResponse(
      response,
      401,
      'API_KEY_REQUIRED',
      false,
    );
    recordCheck(summary, deps, {
      name: 'missing x-api-key',
      ok,
      details,
    }, args.json);
  }

  {
    const response = await deps.httpJsonRequest('GET', url, {
      headers: endpointHeaders(args.invalidApiKey, args.forwardedFor),
      timeoutSeconds: args.timeout,
    });
    const [ok, details] = checkErrorResponse(
      response,
      403,
      'API_KEY_INVALID',
      false,
    );
    recordCheck(summary, deps, {
      name: 'invalid x-api-key',
      ok,
      details,
    }, args.json);
  }

  if (!args.apiKey) {
    recordCheck(summary, deps, {
      name: 'valid x-api-key',
      ok: true,
      skipped: true,
      details: 'provide --api-key or set PUBLIC_API_KEY',
    }, args.json);
    return;
  }

  const expected = authSuccessExpectation(args.kind, discovered);
  const response = await deps.httpJsonRequest('GET', url, {
    headers: endpointHeaders(args.apiKey, args.forwardedFor),
    timeoutSeconds: args.timeout,
  });

  const [ok, details] =
    expected.status === 200
      ? args.kind === 'node'
        ? checkNodeSuccess(response, target.resourceId)
        : checkOrderSuccess(response, target.resourceId)
      : checkErrorResponse(response, expected.status, expected.code, false);

  recordCheck(summary, deps, {
    name: 'valid x-api-key',
    ok,
    details,
  }, args.json);
}

async function runRateLimit(
  args: RateLimitArgs,
  deps: SmokeDependencies,
  summary: SmokeSummary,
): Promise<void> {
  await runHealthChecks(args, deps, summary);
  recordSection(deps, args.json, 'Rate Limit Test');
  const url = buildUrl(args.baseUrl, rateLimitPath(args.kind, args.resourceId));
  const headers = endpointHeaders(args.apiKey, args.forwardedFor);

  if (!args.json) {
    deps.log(`Target URL: ${url}`);
    deps.log(`Using x-forwarded-for: ${args.forwardedFor}`);
  }

  for (let attempt = 1; attempt <= args.requests; attempt += 1) {
    const response = await deps.httpJsonRequest('GET', url, {
      headers,
      timeoutSeconds: args.timeout,
    });
    if (!args.json) {
      deps.log(
        `#${attempt}: status=${response.status} code=${getErrorCode(response)} remaining=${response.headers['x-rate-limit-remaining']} reset=${response.headers['x-rate-limit-reset']}`,
      );
    }
    if (response.status === 429) {
      recordCheck(summary, deps, {
        name: 'rate limit reached',
        ok: true,
        details: 'received 429 RATE_LIMITED',
      }, args.json);
      return;
    }
  }

  recordCheck(summary, deps, {
    name: 'rate limit reached',
    ok: false,
    details: `no 429 received after ${args.requests} requests`,
  }, args.json);
}

export function formatUsage(): string {
  return `Public API smoke checks for AurellionCore.

Usage:
  tsx scripts/public-api-smoke.ts health [options]
  tsx scripts/public-api-smoke.ts discover [options]
  tsx scripts/public-api-smoke.ts smoke [options]
  tsx scripts/public-api-smoke.ts auth [options]
  tsx scripts/public-api-smoke.ts rate-limit [options]

Common options:
  --base-url <url>          Target AurellionCore base URL (default: ${DEFAULT_BASE_URL})
  --indexer-url <url>       Indexer GraphQL URL
  --timeout <seconds>       Request timeout in seconds
  --forwarded-for <ip>      x-forwarded-for value used for rate-limit tests
  --api-key <key>           Valid API key for auth-enabled environments
  --json                    Emit JSON summary instead of human-readable output

Commands:
  health                    Check /health and /ready
  discover                  Discover recent node/order IDs from the indexer
  smoke                     Run health + success + invalid-id + not-found checks
  auth                      Check api_key mode behavior for one endpoint
  rate-limit                Repeat requests until 429 is observed
`;
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    throw new UsageError(formatUsage());
  }

  const command = argv[0];
  const options = argv.slice(1);
  const common: CommonArgs = {
    baseUrl: DEFAULT_BASE_URL,
    indexerUrl: DEFAULT_INDEXER_URL,
    timeout: DEFAULT_TIMEOUT,
    forwardedFor: DEFAULT_FORWARDED_FOR,
    apiKey: DEFAULT_API_KEY || undefined,
    json: false,
  };

  const readOption = (name: string): string | undefined => {
    const index = options.indexOf(name);
    if (index === -1) {
      return undefined;
    }
    const value = options[index + 1];
    if (!value || value.startsWith('--')) {
      throw new UsageError(`Missing value for ${name}`);
    }
    return value;
  };
  const hasFlag = (name: string): boolean => options.includes(name);

  common.baseUrl = readOption('--base-url') || common.baseUrl;
  common.indexerUrl = readOption('--indexer-url') || common.indexerUrl;
  common.forwardedFor = readOption('--forwarded-for') || common.forwardedFor;
  common.json = hasFlag('--json');

  const timeoutValue = readOption('--timeout');
  if (timeoutValue) {
    common.timeout = Number(timeoutValue);
  }

  const apiKey = readOption('--api-key');
  if (apiKey !== undefined) {
    common.apiKey = apiKey;
  }

  switch (command) {
    case 'health':
      return { ...common, command };
    case 'discover':
      return {
        ...common,
        command,
        kind:
          (readOption('--kind') as DiscoverArgs['kind'] | undefined) || 'all',
        limit: Number(readOption('--limit') || '5'),
        owner: readOption('--owner'),
        buyer: readOption('--buyer'),
        seller: readOption('--seller'),
      };
    case 'smoke':
      return {
        ...common,
        command,
        nodeId: readOption('--node-id'),
        orderId: readOption('--order-id'),
        discover: hasFlag('--discover'),
      };
    case 'auth':
      return {
        ...common,
        command,
        kind: (readOption('--kind') as AuthArgs['kind'] | undefined) || 'node',
        resourceId: readOption('--resource-id'),
        discover: hasFlag('--discover'),
        invalidApiKey:
          readOption('--invalid-api-key') || DEFAULT_INVALID_API_KEY,
      };
    case 'rate-limit':
      return {
        ...common,
        command,
        kind:
          (readOption('--kind') as RateLimitArgs['kind'] | undefined) ||
          'node',
        resourceId: readOption('--resource-id'),
        requests: Number(readOption('--requests') || '65'),
      };
    default:
      throw new UsageError(`Unknown command: ${command}`);
  }
}

export async function runCommand(
  args: ParsedArgs,
  deps: SmokeDependencies = createDefaultDependencies(),
): Promise<RunResult> {
  const summary = createSummary(args);

  switch (args.command) {
    case 'health':
      await runHealthChecks(args, deps, summary);
      break;
    case 'discover':
      await runDiscover(args, deps, summary);
      break;
    case 'smoke':
      await runSmoke(args, deps, summary);
      break;
    case 'auth':
      await runAuth(args, deps, summary);
      break;
    case 'rate-limit':
      await runRateLimit(args, deps, summary);
      break;
  }

  const failedChecks = summary.checks.filter((check) => !check.ok && !check.skipped);
  return {
    exitCode: failedChecks.length > 0 ? 1 : 0,
    summary,
  };
}
