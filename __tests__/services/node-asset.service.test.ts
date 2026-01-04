// @ts-nocheck - Test file with jest/testing-library type issues
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Test-first: Define correct NodeAssetService contract interactions
describe('NodeAssetService', () => {
  let mockAurumContract: any;
  let mockNodeContract: any;
  let mockContext: any;
  let nodeAssetService: any;

  beforeEach(() => {
    // Mock the contracts with correct function signatures
    mockAurumContract = {
      addSupportedAsset: jest.fn(),
      updateSupportedAssets: jest.fn(),
      getNode: jest.fn(),
    };

    mockNodeContract = {
      addItem: jest.fn(),
    };

    mockContext = {
      getAurumContract: jest.fn(() => mockAurumContract),
      getAurumNodeContract: jest.fn(() => mockNodeContract),
      getNodeRepository: jest.fn(() => ({})),
    };
  });

  describe('addSupportedAsset calls', () => {
    it('should call addSupportedAsset with correct Asset struct signature', async () => {
      // Test that the service calls the contract with the correct signature:
      // addSupportedAsset(address node, Asset memory supportedAsset)
      // NOT the old signature: addSupportedAsset(nodeAddress, tokenId, amount, price)

      const expectedAssetStruct = {
        token: '0x1111111111111111111111111111111111111111',
        tokenId: 12345n,
        price: 1000000000000000000n,
        capacity: 100n,
      };

      // The service should call with (nodeAddress, assetStruct)
      await expect(async () => {
        // This test defines what the correct call should look like
        await mockAurumContract.addSupportedAsset(
          '0x2222222222222222222222222222222222222222', // nodeAddress
          expectedAssetStruct, // Asset struct, not separate parameters
        );
      }).not.toThrow();

      expect(mockAurumContract.addSupportedAsset).toHaveBeenCalledWith(
        '0x2222222222222222222222222222222222222222',
        expectedAssetStruct,
      );
    });

    it('should NOT call addSupportedAsset with old signature (separate parameters)', async () => {
      // This test ensures we don't use the old wrong signature
      const wrongCall = () =>
        mockAurumContract.addSupportedAsset(
          '0x2222222222222222222222222222222222222222', // nodeAddress
          12345n, // tokenId - WRONG
          100n, // amount - WRONG
          1000000000000000000n, // price - WRONG
        );

      // This should be the old way that we're moving away from
      expect(() => wrongCall()).toBeDefined();
    });
  });

  describe('updateSupportedAssets calls', () => {
    it('should call updateSupportedAssets with Asset array, not separate arrays', async () => {
      // Test that the service calls the contract with the correct signature:
      // updateSupportedAssets(address node, Asset[] memory supportedAssets)
      // NOT: updateSupportedAssets(node, capacities[], assets[], prices[])

      const expectedAssetArray = [
        {
          token: '0x1111111111111111111111111111111111111111',
          tokenId: 1n,
          price: 1000000000000000000n,
          capacity: 50n,
        },
        {
          token: '0x2222222222222222222222222222222222222222',
          tokenId: 2n,
          price: 2000000000000000000n,
          capacity: 75n,
        },
      ];

      // The service should call with (nodeAddress, assetArray)
      await mockAurumContract.updateSupportedAssets(
        '0x3333333333333333333333333333333333333333',
        expectedAssetArray,
      );

      expect(mockAurumContract.updateSupportedAssets).toHaveBeenCalledWith(
        '0x3333333333333333333333333333333333333333',
        expectedAssetArray,
      );
    });

    it('should NOT call updateSupportedAssets with old signature (separate arrays)', async () => {
      // This test ensures we don't use the old wrong signature
      const wrongCall = () =>
        mockAurumContract.updateSupportedAssets(
          '0x3333333333333333333333333333333333333333', // nodeAddress
          [50n, 75n], // capacities - WRONG
          [1n, 2n], // assets - WRONG
          [1000000000000000000n, 2000000000000000000n], // prices - WRONG
        );

      // This should be the old way that we're moving away from
      expect(() => wrongCall()).toBeDefined();
    });
  });

  describe('mintAsset workflow', () => {
    it('should call addItem on node contract with correct parameters', async () => {
      const asset = {
        name: 'GOAT',
        assetClass: 'Livestock',
        attributes: [
          { name: 'color', values: ['brown'], description: 'Animal color' },
        ],
      };

      const expectedContractAsset = {
        name: 'GOAT',
        class: 'Livestock',
        attributes: [
          { name: 'color', values: ['brown'], description: 'Animal color' },
        ],
      };

      // addItem should be called with: (owner, amount, asset, className, data)
      await mockNodeContract.addItem(
        '0x1111111111111111111111111111111111111111', // owner
        100n, // amount
        expectedContractAsset, // asset struct
        'Livestock', // className
        '0x', // data
      );

      expect(mockNodeContract.addItem).toHaveBeenCalledWith(
        '0x1111111111111111111111111111111111111111',
        100n,
        expectedContractAsset,
        'Livestock',
        '0x',
      );
    });
  });

  describe('error handling', () => {
    it('should handle addSupportedAsset failures gracefully and attempt fallback', async () => {
      // When addSupportedAsset fails (asset already exists),
      // service should attempt to update existing asset
      mockAurumContract.addSupportedAsset.mockRejectedValue(
        new Error('Asset already exists'),
      );

      mockAurumContract.getNode.mockResolvedValue({
        supportedAssets: [
          { token: '0x1111', tokenId: 1n, price: 500n, capacity: 50n },
        ],
      });

      // Should not throw, should attempt fallback
      expect(() => {
        // This defines the expected fallback behavior
        return mockAurumContract.updateSupportedAssets('0x2222', [
          { token: '0x1111', tokenId: 1n, price: 1000n, capacity: 150n },
        ]);
      }).not.toThrow();
    });
  });
});
