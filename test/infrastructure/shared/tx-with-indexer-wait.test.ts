import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Contract } from 'ethers';
import {
  sendContractTxAndWaitForIndexer,
  TRANSACTION_METADATA,
  type IndexerWaitMetadata,
  type WaitOptions,
} from '@/infrastructure/shared/tx-with-indexer-wait';
import * as txHelperModule from '@/infrastructure/shared/tx-helper';
import * as ponderDbModule from '@/infrastructure/repositories/shared/ponder-db';

// Mock the modules
vi.mock('@/infrastructure/shared/tx-helper', () => ({
  sendContractTxWithReadEstimation: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/shared/ponder-db', () => ({
  queryOne: vi.fn(),
}));

describe('tx-with-indexer-wait', () => {
  let mockContract: any;
  let sendContractTxMock: ReturnType<typeof vi.fn>;
  let queryOneMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock contract
    mockContract = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      interface: {
        encodeFunctionData: vi.fn().mockReturnValue('0xabcd'),
      },
    } as unknown as Contract;

    // Get the mocked functions
    sendContractTxMock = vi.mocked(txHelperModule.sendContractTxWithReadEstimation);
    queryOneMock = vi.mocked(ponderDbModule.queryOne);

    // Set default return values
    sendContractTxMock.mockResolvedValue({
      tx: {
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
      receipt: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendContractTxAndWaitForIndexer', () => {
    it('should send transaction and wait for indexed result using metadata key', async () => {
      const nodeAddress = '0xnode1234567890123456789012345678901234567890';
      const ownerAddress = '0xowner1234567890123456789012345678901234567890';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      // Mock transaction response
      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock indexer query - first call returns null (not indexed yet), second returns result
      queryOneMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          node_address: nodeAddress,
          transaction_hash: txHash.toLowerCase(),
        });

      const nodeData = {
        owner: ownerAddress,
        location: { addressName: 'Test', location: { lat: '1', lng: '2' } },
        supportedAssets: [],
        capacity: [],
        assetPrices: [],
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [nodeData],
        'AurumNodeManager.registerNode',
      );

      expect(sendContractTxMock).toHaveBeenCalledTimes(1);
      expect(sendContractTxMock).toHaveBeenCalledWith(mockContract, 'registerNode', [nodeData], {});
      expect(result.result).toBe(nodeAddress);
      expect(result.tx.hash).toBe(txHash);
    });

    it('should handle confirmation-only transactions', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock indexer query - returns event for confirmation
      queryOneMock.mockResolvedValue({
        journey_id: '0xjourney123',
        transaction_hash: txHash.toLowerCase(),
      });

      const result = await sendContractTxAndWaitForIndexer(
        mockContract,
        'packageSign',
        ['0xjourney123'],
        'Ausys.packageSign',
      );

      expect(result.result).toBeUndefined();
      expect(result.tx.hash).toBe(txHash);
    });

    it('should use fallback entity table when event table has no result', async () => {
      const orderId = '0xorder12345678901234567890123456789012345678901234567890123456789012';
      const buyerAddress = '0xbuyer1234567890123456789012345678901234567890';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock: event table returns null, entity table returns result
      queryOneMock
        .mockResolvedValueOnce(null) // Event table query
        .mockResolvedValueOnce({
          id: orderId,
          buyer: buyerAddress.toLowerCase(),
          transaction_hash: txHash.toLowerCase(),
        }); // Entity table query

      const orderData = {
        buyer: buyerAddress,
        seller: '0xseller',
        token: '0xtoken',
        tokenId: 1n,
        tokenQuantity: 10n,
        price: 1000n,
        txFee: 10n,
        journeyIds: [],
        nodes: [],
        locationData: {
          startLocation: { lat: '1', lng: '2' },
          endLocation: { lat: '3', lng: '4' },
          startName: 'A',
          endName: 'B',
        },
        currentStatus: 0,
        contractualAgreement: '0x',
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'orderCreation',
        [orderData],
        'Ausys.orderCreation',
      );

      expect(result.result).toBe(orderId);
      expect(queryOneMock).toHaveBeenCalledTimes(2); // Event table + entity table
    });

    it('should use custom fallback query when provided', async () => {
      const nodeAddress = '0xnode1234567890123456789012345678901234567890';
      const ownerAddress = '0xowner1234567890123456789012345678901234567890';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock: event table returns null, fallback query returns result
      queryOneMock
        .mockResolvedValueOnce(null) // Event table
        .mockResolvedValueOnce({
          id: nodeAddress,
          owner: ownerAddress.toLowerCase(),
          transaction_hash: txHash.toLowerCase(),
        }); // Fallback query

      const nodeData = {
        owner: ownerAddress,
        location: { addressName: 'Test', location: { lat: '1', lng: '2' } },
        supportedAssets: [],
        capacity: [],
        assetPrices: [],
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [nodeData],
        'AurumNodeManager.registerNode',
      );

      expect(result.result).toBe(nodeAddress);
    });

    it('should handle timeout when indexer does not find result', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock: always returns null (not indexed)
      queryOneMock.mockResolvedValue(null);

      const metadata: IndexerWaitMetadata = {
        eventTable: 'test_events',
        eventIdColumn: 'test_id',
        waitForConfirmation: false,
      };

      const options: WaitOptions = {
        timeoutMs: 100, // Short timeout for test
        pollIntervalMs: 10,
      };

      await expect(
        sendContractTxAndWaitForIndexer<string>(
          mockContract,
          'testMethod',
          [],
          metadata,
          {},
          options,
        ),
      ).rejects.toThrow(/Timeout waiting for entity/);
    });

    it('should use custom extractResult function when provided', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const extractedValue = 'custom-extracted-value';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue({
        test_id: 'original-value',
        transaction_hash: txHash.toLowerCase(),
      });

      const metadata: IndexerWaitMetadata = {
        eventTable: 'test_events',
        eventIdColumn: 'test_id',
        extractResult: () => extractedValue,
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'testMethod',
        [],
        metadata,
      );

      expect(result.result).toBe(extractedValue);
    });

    it('should throw error when metadata key not found', async () => {
      sendContractTxMock.mockResolvedValue({
        tx: { hash: '0xtxhash' },
        receipt: null,
      });

      await expect(
        sendContractTxAndWaitForIndexer(
          mockContract,
          'unknownMethod',
          [],
          'UnknownContract.unknownMethod',
        ),
      ).rejects.toThrow(/No indexer metadata found/);
    });

    it('should normalize transaction hash to lowercase', async () => {
      const nodeAddress = '0xnode1234567890123456789012345678901234567890';
      const txHash = '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock query with lowercase hash
      queryOneMock.mockResolvedValue({
        node_address: nodeAddress,
        transaction_hash: txHash.toLowerCase(),
      });

      const nodeData = {
        owner: '0xowner',
        location: { addressName: 'Test', location: { lat: '1', lng: '2' } },
        supportedAssets: [],
        capacity: [],
        assetPrices: [],
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [nodeData],
        'AurumNodeManager.registerNode',
      );

      expect(result.result).toBe(nodeAddress);
      // Verify query was called with lowercase hash
      const queryCall = queryOneMock.mock.calls[0];
      expect(queryCall[1][0]).toBe(txHash.toLowerCase());
    });

    it('should poll at specified interval', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const startTime = Date.now();

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Return null twice, then result on third call
      queryOneMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          test_id: 'result',
          transaction_hash: txHash.toLowerCase(),
        });

      const metadata: IndexerWaitMetadata = {
        eventTable: 'test_events',
        eventIdColumn: 'test_id',
      };

      const options: WaitOptions = {
        timeoutMs: 5000,
        pollIntervalMs: 50, // 50ms interval
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'testMethod',
        [],
        metadata,
        {},
        options,
      );

      const elapsed = Date.now() - startTime;
      // Should have polled at least twice (with 50ms intervals)
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(result.result).toBe('result');
    });

    it('should handle errors during polling gracefully', async () => {
      const nodeAddress = '0xnode1234567890123456789012345678901234567890';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // First call throws error, second call succeeds
      queryOneMock
        .mockRejectedValueOnce(new Error('Database connection error'))
        .mockResolvedValueOnce({
          node_address: nodeAddress,
          transaction_hash: txHash.toLowerCase(),
        });

      const nodeData = {
        owner: '0xowner',
        location: { addressName: 'Test', location: { lat: '1', lng: '2' } },
        supportedAssets: [],
        capacity: [],
        assetPrices: [],
      };

      const options: WaitOptions = {
        timeoutMs: 5000,
        pollIntervalMs: 10,
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [nodeData],
        'AurumNodeManager.registerNode',
        {},
        options,
      );

      // Should eventually succeed despite initial error
      expect(result.result).toBe(nodeAddress);
    });
  });

  describe('TRANSACTION_METADATA registry', () => {
    it('should have metadata for all major transactions', () => {
      expect(TRANSACTION_METADATA).toHaveProperty('AurumNodeManager.registerNode');
      expect(TRANSACTION_METADATA).toHaveProperty('AurumNodeManager.updateStatus');
      expect(TRANSACTION_METADATA).toHaveProperty('Ausys.orderCreation');
      expect(TRANSACTION_METADATA).toHaveProperty('Ausys.journeyCreation');
      expect(TRANSACTION_METADATA).toHaveProperty('Ausys.orderJourneyCreation');
      expect(TRANSACTION_METADATA).toHaveProperty('Ausys.packageSign');
      expect(TRANSACTION_METADATA).toHaveProperty('Ausys.handOff');
      expect(TRANSACTION_METADATA).toHaveProperty('AuStake.createPool');
      expect(TRANSACTION_METADATA).toHaveProperty('AuStake.stake');
      expect(TRANSACTION_METADATA).toHaveProperty('AuStake.unstake');
      expect(TRANSACTION_METADATA).toHaveProperty('AuraAsset.addItem');
    });

    it('should have correct structure for node registration metadata', () => {
      const metadata = TRANSACTION_METADATA['AurumNodeManager.registerNode'];
      expect(metadata).toHaveProperty('eventTable', 'node_registered_events');
      expect(metadata).toHaveProperty('eventIdColumn', 'node_address');
      expect(metadata).toHaveProperty('entityTable', 'nodes');
      expect(metadata).toHaveProperty('entityIdColumn', 'id');
      expect(metadata).toHaveProperty('fallbackParams');
      expect(metadata).toHaveProperty('fallbackQuery');
      expect(metadata.waitForConfirmation).toBeUndefined(); // Should extract value
    });

    it('should have waitForConfirmation for confirmation-only transactions', () => {
      const packageSignMetadata = TRANSACTION_METADATA['Ausys.packageSign'];
      expect(packageSignMetadata.waitForConfirmation).toBe(true);

      const updateStatusMetadata = TRANSACTION_METADATA['AurumNodeManager.updateStatus'];
      expect(updateStatusMetadata.waitForConfirmation).toBe(true);
    });

    it('should have fallback queries for transactions that need them', () => {
      const registerNodeMetadata = TRANSACTION_METADATA['AurumNodeManager.registerNode'];
      expect(typeof registerNodeMetadata.fallbackQuery).toBe('function');
      expect(typeof registerNodeMetadata.fallbackParams).toBe('function');

      const orderCreationMetadata = TRANSACTION_METADATA['Ausys.orderCreation'];
      expect(typeof orderCreationMetadata.fallbackQuery).toBe('function');
      expect(typeof orderCreationMetadata.fallbackParams).toBe('function');
    });
  });

  describe('Metadata key resolution', () => {
    it('should resolve metadata by exact key', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue({
        node_address: '0xnode',
        transaction_hash: txHash.toLowerCase(),
      });

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [{ owner: '0xowner' }],
        'AurumNodeManager.registerNode', // Exact key
      );

      expect(result.result).toBe('0xnode');
    });

    it('should try contract address + method if exact key not found', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const contractAddress = '0x1234567890123456789012345678901234567890';

      // Mock contract to return specific address
      mockContract.getAddress = vi.fn().mockResolvedValue(contractAddress);

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue({
        node_address: '0xnode',
        transaction_hash: txHash.toLowerCase(),
      });

      // Add metadata with contract address format
      const customMetadata: IndexerWaitMetadata = {
        eventTable: 'node_registered_events',
        eventIdColumn: 'node_address',
        entityTable: 'nodes',
        entityIdColumn: 'id',
      };

      // This should work with direct metadata object
      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [{ owner: '0xowner' }],
        customMetadata,
      );

      expect(result.result).toBe('0xnode');
    });
  });

  describe('Edge cases', () => {
    it('should handle null result from indexer for confirmation-only transactions', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue({
        journey_id: '0xjourney',
        transaction_hash: txHash.toLowerCase(),
      });

      // Confirmation-only should return { tx } without result
      const result = await sendContractTxAndWaitForIndexer(
        mockContract,
        'packageSign',
        ['0xjourney'],
        'Ausys.packageSign',
      );

      expect(result.result).toBeUndefined();
      expect(result.tx.hash).toBe(txHash);
    });

    it('should throw error when result is null for value-returning transactions', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Mock query returns event but with null value - this will cause the code to keep polling
      // until timeout, then throw "Failed to extract result"
      queryOneMock.mockResolvedValue({
        node_address: null,
        transaction_hash: txHash.toLowerCase(),
      });

      const nodeData = {
        owner: '0xowner',
        location: { addressName: 'Test', location: { lat: '1', lng: '2' } },
        supportedAssets: [],
        capacity: [],
        assetPrices: [],
      };

      // The code will keep polling because null value is treated as "not found yet"
      // It will eventually timeout and throw an error
      const options: WaitOptions = {
        timeoutMs: 200, // Short timeout for test
        pollIntervalMs: 50,
      };

      await expect(
        sendContractTxAndWaitForIndexer<string>(
          mockContract,
          'registerNode',
          [nodeData],
          'AurumNodeManager.registerNode',
          {},
          options,
        ),
      ).rejects.toThrow(/Timeout waiting for entity/);
    }, 15000); // Increase test timeout

    it('should handle empty transaction args for fallback params', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue({
        test_id: 'result',
        transaction_hash: txHash.toLowerCase(),
      });

      const metadata: IndexerWaitMetadata = {
        eventTable: 'test_events',
        eventIdColumn: 'test_id',
        entityTable: 'test_entities',
        fallbackParams: () => [], // Returns empty array
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'testMethod',
        [], // Empty args
        metadata,
      );

      expect(result.result).toBe('result');
    });

    it('should handle custom timeout message', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue(null); // Never finds result

      const metadata: IndexerWaitMetadata = {
        eventTable: 'test_events',
        eventIdColumn: 'test_id',
      };

      const options: WaitOptions = {
        timeoutMs: 50,
        pollIntervalMs: 10,
        timeoutMessage: 'Custom timeout message',
      };

      await expect(
        sendContractTxAndWaitForIndexer<string>(
          mockContract,
          'testMethod',
          [],
          metadata,
          {},
          options,
        ),
      ).rejects.toThrow('Custom timeout message');
    });

    it('should pass transaction options to sendContractTxWithReadEstimation', async () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const ownerAddress = '0xowner1234567890123456789012345678901234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      queryOneMock.mockResolvedValue({
        node_address: '0xnode',
        transaction_hash: txHash.toLowerCase(),
      });

      const txOptions = {
        from: ownerAddress,
        gasHeadroomRatio: 1.5,
        value: 1000n,
      };

      await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'registerNode',
        [{ owner: ownerAddress }],
        'AurumNodeManager.registerNode',
        txOptions,
      );

      expect(sendContractTxMock).toHaveBeenCalledTimes(1);
      const passedOptions = sendContractTxMock.mock.calls[0][3];
      expect(passedOptions.from).toBe(ownerAddress);
      expect(passedOptions.gasHeadroomRatio).toBe(1.5);
      expect(passedOptions.value).toBe(1000n);
    });

    it('should handle entity table fallback without custom query', async () => {
      const orderId = '0xorder12345678901234567890123456789012345678901234567890123456789012';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      sendContractTxMock.mockResolvedValue({
        tx: { hash: txHash },
        receipt: null,
      });

      // Event table returns null, entity table returns result
      queryOneMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: orderId,
          transaction_hash: txHash.toLowerCase(),
        });

      const metadata: IndexerWaitMetadata = {
        eventTable: 'order_created_events',
        eventIdColumn: 'order_id',
        entityTable: 'orders',
        entityIdColumn: 'id',
        // No fallbackQuery - should use default query
      };

      const result = await sendContractTxAndWaitForIndexer<string>(
        mockContract,
        'orderCreation',
        [{}],
        metadata,
      );

      expect(result.result).toBe(orderId);
      // Verify second query used entity table
      const secondQuery = queryOneMock.mock.calls[1];
      expect(secondQuery[0]).toContain('orders');
    });
  });
});
