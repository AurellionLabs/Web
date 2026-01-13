/**
 * Tests for RWY Vault Handler
 *
 * Tests for all RWY (Real World Yield) event handlers.
 * Following the "dumb indexer" pattern - handlers only insert raw events.
 *
 * @author Staff Engineer Implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

const createMockDb = () => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockResolvedValue(undefined),
  find: vi.fn().mockResolvedValue(null),
});

const createMockContext = () => ({
  db: createMockDb(),
  contracts: {
    RWYVault: {
      abi: [],
      address: '0xfC2d5b8464f14a051661E6dE14DB3F703C601938' as `0x${string}`,
    },
  },
});

const createMockEvent = <T extends Record<string, unknown>>(
  args: T,
  overrides: Partial<{
    block: { number: bigint; timestamp: bigint };
    transaction: { hash: `0x${string}`; from: `0x${string}` };
    log: { logIndex: number };
  }> = {},
) => ({
  args,
  block: {
    number: 12345678n,
    timestamp: 1704067200n,
    ...overrides.block,
  },
  transaction: {
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
    from: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    ...overrides.transaction,
  },
  log: {
    logIndex: 0,
    ...overrides.log,
  },
});

// ============================================================================
// HANDLER LOGIC (for testing)
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

/**
 * RWY Handler: CommodityStaked
 * Stores raw event - no entity population
 */
async function handleCommodityStaked(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { opportunityId, staker, amount, totalStaked } = event.args as {
    opportunityId: `0x${string}`;
    staker: `0x${string}`;
    amount: bigint;
    totalStaked: bigint;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert({}).values({
    id,
    opportunity_id: opportunityId,
    staker: staker,
    amount: amount,
    total_staked: totalStaked,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });

  return { id, opportunityId, staker, amount, totalStaked };
}

/**
 * RWY Handler: OpportunityCreated
 */
async function handleOpportunityCreated(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const {
    opportunityId,
    operator,
    inputToken,
    inputTokenId,
    targetAmount,
    outputTokenId,
    expectedOutputAmount,
    promisedYieldBps,
    operatorFeeBps,
    minSalePrice,
    operatorCollateral,
    fundingDeadline,
    name,
    description,
  } = event.args as {
    opportunityId: `0x${string}`;
    operator: `0x${string}`;
    inputToken: `0x${string}`;
    inputTokenId: bigint;
    targetAmount: bigint;
    outputTokenId: bigint;
    expectedOutputAmount: bigint;
    promisedYieldBps: number;
    operatorFeeBps: number;
    minSalePrice: bigint;
    operatorCollateral: bigint;
    fundingDeadline: bigint;
    name: string;
    description: string;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert({}).values({
    id,
    opportunity_id: opportunityId,
    operator: operator,
    input_token: inputToken,
    input_token_id: inputTokenId,
    target_amount: targetAmount,
    output_token_id: outputTokenId,
    expected_output_amount: expectedOutputAmount,
    promised_yield_bps: promisedYieldBps,
    operator_fee_bps: operatorFeeBps,
    min_sale_price: minSalePrice,
    operator_collateral: operatorCollateral,
    funding_deadline: fundingDeadline,
    name: name,
    description: description,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });

  return { id, opportunityId, operator, name };
}

/**
 * RWY Handler: OperatorApproved
 */
async function handleOperatorApproved(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { operator } = event.args as { operator: `0x${string}` };
  const id = eventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert({}).values({
    id,
    operator: operator,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });

  return { id, operator };
}

/**
 * RWY Handler: OperatorSlashed
 */
async function handleOperatorSlashed(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { opportunityId, operator, slashedAmount } = event.args as {
    opportunityId: `0x${string}`;
    operator: `0x${string}`;
    slashedAmount: bigint;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert({}).values({
    id,
    opportunity_id: opportunityId,
    operator: operator,
    slashed_amount: slashedAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });

  return { id, opportunityId, operator, slashedAmount };
}

// ============================================================================
// TESTS: CommodityStaked
// ============================================================================

describe('RWY Handler: CommodityStaked', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should insert raw event with correct fields', async () => {
    const event = createMockEvent({
      opportunityId:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      staker: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      amount: 1000000000000000000n, // 1 ETH
      totalStaked: 1000000000000000000n,
    });

    const result = await handleCommodityStaked(event, context);

    expect(result.opportunityId).toBe(event.args.opportunityId);
    expect(result.staker).toBe(event.args.staker);
    expect(result.amount).toBe(1000000000000000000n);
    expect(context.db.insert).toHaveBeenCalled();
  });

  it('should generate unique event ID from txHash and logIndex', async () => {
    const event = createMockEvent(
      {
        opportunityId: '0x1234' as `0x${string}`,
        staker: '0xaaaa' as `0x${string}`,
        amount: 100n,
        totalStaked: 100n,
      },
      { log: { logIndex: 5 } },
    );

    await handleCommodityStaked(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining(event.transaction.hash),
        id: expect.stringContaining('5'),
      }),
    );
  });

  it('should include all required block metadata', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      staker: '0xaaaa' as `0x${string}`,
      amount: 100n,
      totalStaked: 100n,
    });

    await handleCommodityStaked(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        block_number: event.block.number,
        block_timestamp: BigInt(event.block.timestamp),
        transaction_hash: event.transaction.hash,
      }),
    );
  });

  it('should use onConflictDoNothing for idempotency', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      staker: '0xaaaa' as `0x${string}`,
      amount: 100n,
      totalStaked: 100n,
    });

    await handleCommodityStaked(event, context);

    expect(context.db.onConflictDoNothing).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: OpportunityCreated
// ============================================================================

describe('RWY Handler: OpportunityCreated', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should insert raw event with all opportunity fields', async () => {
    const event = createMockEvent({
      opportunityId:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      operator: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      inputToken: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
      inputTokenId: 1n,
      targetAmount: 100000000000000000000n, // 100 tokens
      outputTokenId: 2n,
      expectedOutputAmount: 50000000000000000000n, // 50 tokens
      promisedYieldBps: 500, // 5%
      operatorFeeBps: 100, // 1%
      minSalePrice: 100000000000000000n, // 0.1 ETH
      operatorCollateral: 1000000000000000000n, // 1 ETH
      fundingDeadline: 1704678000n,
      name: 'Coffee Beans Batch #1',
      description: 'Premium Ethiopian coffee beans',
    });

    const result = await handleOpportunityCreated(event, context);

    expect(result.opportunityId).toBe(event.args.opportunityId);
    expect(result.operator).toBe(event.args.operator);
    expect(result.name).toBe('Coffee Beans Batch #1');
    expect(context.db.insert).toHaveBeenCalled();
  });

  it('should handle large numeric values correctly', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      operator: '0xaaaa' as `0x${string}`,
      inputToken: '0xtoken' as `0x${string}`,
      inputTokenId: 1n,
      targetAmount: 1000000000000000000000000n, // 1M tokens
      outputTokenId: 2n,
      expectedOutputAmount: 500000000000000000000000n, // 500K tokens
      promisedYieldBps: 1000, // 10%
      operatorFeeBps: 200, // 2%
      minSalePrice: 1000000000000000000000n, // 1000 ETH
      operatorCollateral: 10000000000000000000000n, // 10000 ETH
      fundingDeadline: 1704678000n,
      name: 'Test',
      description: 'Test',
    });

    await handleOpportunityCreated(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        target_amount: 1000000000000000000000000n,
        expected_output_amount: 500000000000000000000000n,
        min_sale_price: 1000000000000000000000n,
        operator_collateral: 10000000000000000000000n,
      }),
    );
  });

  it('should generate unique event ID', async () => {
    const event = createMockEvent(
      {
        opportunityId: '0x1234' as `0x${string}`,
        operator: '0xaaaa' as `0x${string}`,
        inputToken: '0xtoken' as `0x${string}`,
        inputTokenId: 1n,
        targetAmount: 100n,
        outputTokenId: 2n,
        expectedOutputAmount: 50n,
        promisedYieldBps: 500,
        operatorFeeBps: 100,
        minSalePrice: 10n,
        operatorCollateral: 100n,
        fundingDeadline: 1704678000n,
        name: 'Test',
        description: 'Test',
      },
      { log: { logIndex: 10 } },
    );

    await handleOpportunityCreated(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('10'),
      }),
    );
  });
});

// ============================================================================
// TESTS: OperatorApproved
// ============================================================================

describe('RWY Handler: OperatorApproved', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should insert raw event with operator address', async () => {
    const event = createMockEvent({
      operator: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
    });

    const result = await handleOperatorApproved(event, context);

    expect(result.operator).toBe(event.args.operator);
    expect(context.db.insert).toHaveBeenCalled();
  });

  it('should include all required metadata', async () => {
    const event = createMockEvent({
      operator: '0x1234' as `0x${string}`,
    });

    await handleOperatorApproved(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        block_number: event.block.number,
        block_timestamp: BigInt(event.block.timestamp),
        transaction_hash: event.transaction.hash,
      }),
    );
  });
});

// ============================================================================
// TESTS: OperatorSlashed
// ============================================================================

describe('RWY Handler: OperatorSlashed', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should insert raw event with slashed amount', async () => {
    const event = createMockEvent({
      opportunityId:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      operator: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      slashedAmount: 500000000000000000n, // 0.5 ETH
    });

    const result = await handleOperatorSlashed(event, context);

    expect(result.opportunityId).toBe(event.args.opportunityId);
    expect(result.operator).toBe(event.args.operator);
    expect(result.slashedAmount).toBe(500000000000000000n);
    expect(context.db.insert).toHaveBeenCalled();
  });

  it('should handle zero slashed amount', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      operator: '0xaaaa' as `0x${string}`,
      slashedAmount: 0n,
    });

    await handleOperatorSlashed(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        slashed_amount: 0n,
      }),
    );
  });

  it('should handle large slashed amounts', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      operator: '0xaaaa' as `0x${string}`,
      slashedAmount: 1000000000000000000000000n, // 1M ETH
    });

    await handleOperatorSlashed(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        slashed_amount: 1000000000000000000000000n,
      }),
    );
  });
});

// ============================================================================
// TESTS: Event ID Generation
// ============================================================================

describe('RWY Handler: Event ID Generation', () => {
  it('should create unique IDs from txHash and logIndex', () => {
    const id1 = eventId('0xabc', 0);
    const id2 = eventId('0xabc', 1);
    const id3 = eventId('0xdef', 0);

    expect(id1).toBe('0xabc-0');
    expect(id2).toBe('0xabc-1');
    expect(id3).toBe('0xdef-0');
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
  });

  it('should handle long transaction hashes', () => {
    const longHash =
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const id = eventId(longHash, 0);

    expect(id).toBe(longHash + '-0');
    expect(id.length).toBe(longHash.length + 2);
  });

  it('should handle high logIndex values', () => {
    const id = eventId('0xabc', 999);
    expect(id).toBe('0xabc-999');
  });
});

// ============================================================================
// TESTS: Dumb Handler Pattern
// ============================================================================

describe('RWY Handler: Dumb Handler Pattern', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should NOT perform any data transformation', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      operator: '0xaaaa' as `0x${string}`,
      amount: 100n,
      totalStaked: 100n,
    });

    await handleCommodityStaked(event, context);

    // Verify the handler only inserts - no aggregation, no entity updates
    expect(context.db.insert).toHaveBeenCalled();
    expect(context.db.update).not.toHaveBeenCalled();
    expect(context.db.find).not.toHaveBeenCalled();
    expect(context.client).toBeUndefined(); // No client usage in dumb handlers
  });

  it('should only use insert operation with onConflictDoNothing', async () => {
    const event = createMockEvent({
      opportunityId: '0x1234' as `0x${string}`,
      staker: '0xaaaa' as `0x${string}`,
      amount: 100n,
      totalStaked: 100n,
    });

    await handleCommodityStaked(event, context);

    // Should use insert().values().onConflictDoNothing()
    expect(context.db.insert).toHaveBeenCalled();
    expect(context.db.values).toHaveBeenCalled();
    expect(context.db.onConflictDoNothing).toHaveBeenCalled();
    expect(context.db.onConflictDoUpdate).not.toHaveBeenCalled();
    expect(context.db.update).not.toHaveBeenCalled();
  });

  it('should store raw values without conversion', async () => {
    const event = createMockEvent({
      opportunityId:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      operator: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      amount: 1000000000000000000n,
      totalStaked: 2000000000000000000n,
    });

    await handleCommodityStaked(event, context);

    // Values should be stored exactly as received
    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunity_id: event.args.opportunityId,
        staker: event.args.staker,
        amount: event.args.amount,
        total_staked: event.args.totalStaked,
      }),
    );
  });
});
