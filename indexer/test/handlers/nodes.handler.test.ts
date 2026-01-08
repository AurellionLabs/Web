/**
 * TDD Tests for Nodes Handler
 *
 * Tests for all node-related event handlers.
 * Written BEFORE implementation following TDD methodology.
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

const createMockClient = () => ({
  readContract: vi.fn().mockResolvedValue({
    owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    nodeType: 'warehouse',
    capacity: 1000n,
    createdAt: 1704067200n,
    active: true,
    validNode: true,
    assetHash:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    addressName: 'Test Location',
    lat: '40.7128',
    lng: '-74.0060',
  }),
});

const createMockContext = () => ({
  db: createMockDb(),
  client: createMockClient(),
  contracts: {
    Diamond: {
      abi: [],
      address: '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58' as `0x${string}`,
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
// HANDLER LOGIC (to be extracted to actual handler)
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

async function handleNodeRegistered(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { nodeHash, owner, nodeType } = event.args as {
    nodeHash: `0x${string}`;
    owner: `0x${string}`;
    nodeType: string;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Get additional node data from contract
  let locationData = { addressName: '', lat: '0', lng: '0' };
  let status = 'Active';

  try {
    const node = await context.client.readContract({
      abi: context.contracts.Diamond.abi,
      address: context.contracts.Diamond.address,
      functionName: 'getNode',
      args: [nodeHash],
    });

    if (node) {
      locationData = {
        addressName: (node as any).addressName || '',
        lat: (node as any).lat || '0',
        lng: (node as any).lng || '0',
      };
      status = (node as any).active ? 'Active' : 'Inactive';
    }
  } catch (e) {
    // Use defaults
  }

  // Insert node
  await context.db
    .insert({})
    .values({
      id: nodeHash,
      owner,
      node_type: nodeType,
      status,
      address_name: locationData.addressName,
      lat: locationData.lat,
      lng: locationData.lng,
      created_at: event.block.timestamp,
      updated_at: event.block.timestamp,
    })
    .onConflictDoNothing();

  // Insert event
  await context.db
    .insert({})
    .values({
      id,
      node_address: nodeHash,
      owner,
      block_number: event.block.number,
      block_timestamp: event.block.timestamp,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoNothing();

  return { nodeHash, owner, nodeType, status, locationData };
}

async function handleTokensDepositedToNode(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { nodeHash, tokenId, amount, depositor } = event.args as {
    nodeHash: `0x${string}`;
    tokenId: bigint;
    amount: bigint;
    depositor: `0x${string}`;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const balanceId = `${nodeHash}-${tokenId}`;

  // Get current balance
  const existing = await context.db.find({}, { id: balanceId });
  const currentBalance = existing ? (existing as any).balance : 0n;
  const newBalance = currentBalance + amount;

  // Upsert balance
  await context.db
    .insert({})
    .values({
      id: balanceId,
      node_id: nodeHash,
      token_id: tokenId,
      balance: newBalance,
      updated_at: event.block.timestamp,
    })
    .onConflictDoUpdate({
      balance: newBalance,
      updated_at: event.block.timestamp,
    });

  // Insert event
  await context.db
    .insert({})
    .values({
      id,
      node_hash: nodeHash,
      token_id: tokenId,
      amount,
      depositor,
      block_number: event.block.number,
      block_timestamp: event.block.timestamp,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoNothing();

  return { nodeHash, tokenId, amount, depositor, newBalance };
}

async function handleTokensWithdrawnFromNode(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { nodeHash, tokenId, amount, recipient } = event.args as {
    nodeHash: `0x${string}`;
    tokenId: bigint;
    amount: bigint;
    recipient: `0x${string}`;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const balanceId = `${nodeHash}-${tokenId}`;

  // Get current balance
  const existing = await context.db.find({}, { id: balanceId });
  const currentBalance = existing ? (existing as any).balance : 0n;
  const newBalance = currentBalance > amount ? currentBalance - amount : 0n;

  // Update balance
  await context.db.update({}).set({
    balance: newBalance,
    updated_at: event.block.timestamp,
  });

  // Insert event
  await context.db
    .insert({})
    .values({
      id,
      node_hash: nodeHash,
      token_id: tokenId,
      amount,
      recipient,
      block_number: event.block.number,
      block_timestamp: event.block.timestamp,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoNothing();

  return { nodeHash, tokenId, amount, recipient, newBalance };
}

async function handleSupportedAssetAdded(
  event: ReturnType<typeof createMockEvent>,
  context: ReturnType<typeof createMockContext>,
) {
  const { nodeHash, token, tokenId, price, capacity } = event.args as {
    nodeHash: `0x${string}`;
    token: `0x${string}`;
    tokenId: bigint;
    price: bigint;
    capacity: bigint;
  };
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const assetId = `${nodeHash}-${token}-${tokenId}`;

  // Insert or update node asset
  await context.db
    .insert({})
    .values({
      id: assetId,
      node_id: nodeHash,
      token,
      token_id: tokenId,
      price,
      capacity,
      balance: 0n,
      created_at: event.block.timestamp,
      updated_at: event.block.timestamp,
    })
    .onConflictDoUpdate({
      price,
      capacity,
      updated_at: event.block.timestamp,
    });

  // Insert event
  await context.db
    .insert({})
    .values({
      id,
      node_hash: nodeHash,
      token,
      token_id: tokenId,
      price,
      capacity,
      block_number: event.block.number,
      block_timestamp: event.block.timestamp,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoNothing();

  return { nodeHash, token, tokenId, price, capacity, assetId };
}

// ============================================================================
// TESTS: NodeRegistered
// ============================================================================

describe('Nodes Handler: NodeRegistered', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should create node entity with correct fields', async () => {
    const event = createMockEvent({
      nodeHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      nodeType: 'warehouse',
    });

    const result = await handleNodeRegistered(event, context);

    expect(result.nodeHash).toBe(event.args.nodeHash);
    expect(result.owner).toBe(event.args.owner);
    expect(result.nodeType).toBe('warehouse');
    expect(context.db.insert).toHaveBeenCalled();
    expect(context.db.values).toHaveBeenCalled();
  });

  it('should fetch location data from contract', async () => {
    const event = createMockEvent({
      nodeHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      nodeType: 'warehouse',
    });

    const result = await handleNodeRegistered(event, context);

    expect(context.client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getNode',
        args: [event.args.nodeHash],
      }),
    );
    expect(result.locationData.addressName).toBe('Test Location');
    expect(result.locationData.lat).toBe('40.7128');
    expect(result.locationData.lng).toBe('-74.0060');
  });

  it('should set status based on active flag', async () => {
    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      owner: '0xaaaa' as `0x${string}`,
      nodeType: 'warehouse',
    });

    const result = await handleNodeRegistered(event, context);
    expect(result.status).toBe('Active');

    // Test inactive
    context.client.readContract.mockResolvedValueOnce({
      ...context.client.readContract.mock.results[0]?.value,
      active: false,
    });

    const result2 = await handleNodeRegistered(event, context);
    expect(result2.status).toBe('Inactive');
  });

  it('should handle contract read failure gracefully', async () => {
    context.client.readContract.mockRejectedValueOnce(
      new Error('Contract error'),
    );

    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      owner: '0xaaaa' as `0x${string}`,
      nodeType: 'warehouse',
    });

    const result = await handleNodeRegistered(event, context);

    expect(result.status).toBe('Active'); // Default
    expect(result.locationData.addressName).toBe(''); // Default
  });

  it('should use onConflictDoNothing for idempotency', async () => {
    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      owner: '0xaaaa' as `0x${string}`,
      nodeType: 'warehouse',
    });

    await handleNodeRegistered(event, context);

    expect(context.db.onConflictDoNothing).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: TokensDepositedToNode
// ============================================================================

describe('Nodes Handler: TokensDepositedToNode', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should create new balance entry for first deposit', async () => {
    const event = createMockEvent({
      nodeHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      tokenId: 1n,
      amount: 1000000000000000000n,
      depositor: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
    });

    const result = await handleTokensDepositedToNode(event, context);

    expect(result.newBalance).toBe(1000000000000000000n);
    expect(context.db.insert).toHaveBeenCalled();
  });

  it('should add to existing balance', async () => {
    context.db.find.mockResolvedValueOnce({ balance: 500000000000000000n });

    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      tokenId: 1n,
      amount: 500000000000000000n,
      depositor: '0xbbbb' as `0x${string}`,
    });

    const result = await handleTokensDepositedToNode(event, context);

    expect(result.newBalance).toBe(1000000000000000000n);
  });

  it('should generate correct balance ID', async () => {
    const event = createMockEvent({
      nodeHash: '0xnode' as `0x${string}`,
      tokenId: 42n,
      amount: 100n,
      depositor: '0xdep' as `0x${string}`,
    });

    await handleTokensDepositedToNode(event, context);

    expect(context.db.find).toHaveBeenCalledWith({}, { id: '0xnode-42' });
  });

  it('should record deposit event', async () => {
    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      tokenId: 1n,
      amount: 100n,
      depositor: '0xbbbb' as `0x${string}`,
    });

    await handleTokensDepositedToNode(event, context);

    // Should insert twice: balance and event
    expect(context.db.insert).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// TESTS: TokensWithdrawnFromNode
// ============================================================================

describe('Nodes Handler: TokensWithdrawnFromNode', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should subtract from existing balance', async () => {
    context.db.find.mockResolvedValueOnce({ balance: 1000000000000000000n });

    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      tokenId: 1n,
      amount: 300000000000000000n,
      recipient: '0xcccc' as `0x${string}`,
    });

    const result = await handleTokensWithdrawnFromNode(event, context);

    expect(result.newBalance).toBe(700000000000000000n);
  });

  it('should not go below zero (safe subtraction)', async () => {
    context.db.find.mockResolvedValueOnce({ balance: 100n });

    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      tokenId: 1n,
      amount: 200n, // More than balance
      recipient: '0xcccc' as `0x${string}`,
    });

    const result = await handleTokensWithdrawnFromNode(event, context);

    expect(result.newBalance).toBe(0n);
  });

  it('should handle withdrawal from non-existent balance', async () => {
    context.db.find.mockResolvedValueOnce(null);

    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      tokenId: 1n,
      amount: 100n,
      recipient: '0xcccc' as `0x${string}`,
    });

    const result = await handleTokensWithdrawnFromNode(event, context);

    expect(result.newBalance).toBe(0n);
  });

  it('should update balance via update().set()', async () => {
    context.db.find.mockResolvedValueOnce({ balance: 1000n });

    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      tokenId: 1n,
      amount: 500n,
      recipient: '0xcccc' as `0x${string}`,
    });

    await handleTokensWithdrawnFromNode(event, context);

    expect(context.db.update).toHaveBeenCalled();
    expect(context.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: 500n,
      }),
    );
  });
});

// ============================================================================
// TESTS: SupportedAssetAdded
// ============================================================================

describe('Nodes Handler: SupportedAssetAdded', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createMockContext();
  });

  it('should create node asset with price and capacity', async () => {
    const event = createMockEvent({
      nodeHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      token: '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`,
      tokenId: 1n,
      price: 1000000n,
      capacity: 1000n,
    });

    const result = await handleSupportedAssetAdded(event, context);

    expect(result.price).toBe(1000000n);
    expect(result.capacity).toBe(1000n);
    expect(result.assetId).toContain(event.args.nodeHash as string);
    expect(result.assetId).toContain(event.args.token as string);
  });

  it('should generate correct asset ID', async () => {
    const event = createMockEvent({
      nodeHash: '0xnode' as `0x${string}`,
      token: '0xtoken' as `0x${string}`,
      tokenId: 42n,
      price: 100n,
      capacity: 10n,
    });

    const result = await handleSupportedAssetAdded(event, context);

    expect(result.assetId).toBe('0xnode-0xtoken-42');
  });

  it('should use onConflictDoUpdate for price/capacity changes', async () => {
    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      token: '0xtoken' as `0x${string}`,
      tokenId: 1n,
      price: 2000000n, // Updated price
      capacity: 500n, // Updated capacity
    });

    await handleSupportedAssetAdded(event, context);

    expect(context.db.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 2000000n,
        capacity: 500n,
      }),
    );
  });

  it('should initialize balance to zero for new assets', async () => {
    const event = createMockEvent({
      nodeHash: '0x1234' as `0x${string}`,
      token: '0xtoken' as `0x${string}`,
      tokenId: 1n,
      price: 1000000n,
      capacity: 100n,
    });

    await handleSupportedAssetAdded(event, context);

    expect(context.db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: 0n,
      }),
    );
  });
});

// ============================================================================
// TESTS: Event ID Generation
// ============================================================================

describe('Nodes Handler: Event ID Generation', () => {
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
});
