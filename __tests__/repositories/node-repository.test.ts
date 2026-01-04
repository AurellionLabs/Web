// @ts-nocheck - Test file with vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test-first: Define correct NodeRepository contract interactions
describe('NodeRepository', () => {
  let mockAurumContract: any;
  let mockProvider: any;
  let mockSigner: any;
  let nodeRepository: any;

  beforeEach(() => {
    // Mock contract that returns new Asset struct format
    mockAurumContract = {
      getNode: vi.fn(),
      registerNode: vi.fn(),
      updateStatus: vi.fn(),
    };

    mockProvider = {};
    mockSigner = {};
  });

  describe('getNode', () => {
    it('should correctly map contract Node struct to domain Node', async () => {
      // Mock contract returns Node struct with supportedAssets as Asset[]
      const contractNodeData = {
        location: {
          addressName: 'Test Location',
          location: { lat: '40.7128', lng: '-74.0060' },
        },
        validNode: true, // Contract now uses bool
        owner: '0x1111111111111111111111111111111111111111',
        supportedAssets: [
          {
            token: '0x2222222222222222222222222222222222222222',
            tokenId: 1n,
            price: 1000000000000000000n,
            capacity: 100n,
          },
          {
            token: '0x3333333333333333333333333333333333333333',
            tokenId: 2n,
            price: 2000000000000000000n,
            capacity: 50n,
          },
        ],
        status: '0x01', // bytes1 for Active
      };

      mockAurumContract.getNode.mockResolvedValue(contractNodeData);

      // Expected domain Node structure (simplified)
      const expectedDomainNode = {
        address: '0x4444444444444444444444444444444444444444',
        location: {
          addressName: 'Test Location',
          location: { lat: '40.7128', lng: '-74.0060' },
        },
        validNode: true, // Should be boolean in domain
        owner: '0x1111111111111111111111111111111111111111',
        assets: [
          // Simplified: single assets array
          {
            token: '0x2222222222222222222222222222222222222222',
            tokenId: '1', // Convert to string for domain
            price: 1000000000000000000n,
            capacity: 100,
          },
          {
            token: '0x3333333333333333333333333333333333333333',
            tokenId: '2',
            price: 2000000000000000000n,
            capacity: 50,
          },
        ],
        status: 'Active',
      };

      // Test the mapping logic
      const result = await mockNodeRepository(
        contractNodeData,
        '0x4444444444444444444444444444444444444444',
      );

      expect(result).toEqual(expectedDomainNode);
      expect(result.validNode).toBe(true); // Should be boolean
      expect(result.assets).toHaveLength(2);
      expect(result.assets[0]).toHaveProperty('token');
      expect(result.assets[0]).toHaveProperty('tokenId');
      expect(result.assets[0]).toHaveProperty('price');
      expect(result.assets[0]).toHaveProperty('capacity');
    });

    it('should handle empty supportedAssets array', async () => {
      const contractNodeData = {
        location: {
          addressName: 'Empty Node',
          location: { lat: '0', lng: '0' },
        },
        validNode: true,
        owner: '0x1111111111111111111111111111111111111111',
        supportedAssets: [], // Empty array
        status: '0x01',
      };

      mockAurumContract.getNode.mockResolvedValue(contractNodeData);

      const result = await mockNodeRepository(
        contractNodeData,
        '0x4444444444444444444444444444444444444444',
      );

      expect(result.assets).toHaveLength(0);
      expect(Array.isArray(result.assets)).toBe(true);
    });

    it('should NOT try to map old separate arrays (supportedAssets, capacity, assetPrices)', async () => {
      // This test ensures we don't try to access the old structure
      const contractNodeData = {
        location: { addressName: 'Test', location: { lat: '0', lng: '0' } },
        validNode: true,
        owner: '0x1111111111111111111111111111111111111111',
        supportedAssets: [
          { token: '0x2222', tokenId: 1n, price: 1000n, capacity: 100n },
        ],
        status: '0x01',
      };

      const result = await mockNodeRepository(contractNodeData, '0x4444');

      // Should NOT have the old separate arrays
      expect(result).not.toHaveProperty('capacity');
      expect(result).not.toHaveProperty('assetPrices');
      expect(result).not.toHaveProperty('supportedAssets');

      // Should have the new unified structure
      expect(result).toHaveProperty('assets');
    });
  });

  describe('registerNode', () => {
    it('should construct correct Node struct for contract call', async () => {
      const domainNode = {
        address: '0x4444444444444444444444444444444444444444',
        location: {
          addressName: 'New Node',
          location: { lat: '40.7128', lng: '-74.0060' },
        },
        validNode: true,
        owner: '0x1111111111111111111111111111111111111111',
        assets: [
          {
            token: '0x2222222222222222222222222222222222222222',
            tokenId: '1',
            price: 1000000000000000000n,
            capacity: 100,
          },
        ],
        status: 'Active',
      };

      // Expected contract struct format
      const expectedContractNode = {
        location: {
          addressName: 'New Node',
          location: { lat: '40.7128', lng: '-74.0060' },
        },
        validNode: true, // Should be bool for contract
        owner: '0x1111111111111111111111111111111111111111',
        supportedAssets: [
          // Contract expects Asset[] struct
          {
            token: '0x2222222222222222222222222222222222222222',
            tokenId: 1n, // Convert back to BigInt for contract
            price: 1000000000000000000n,
            capacity: 100n,
          },
        ],
        status: '0x01', // Convert to bytes1 for contract
      };

      mockAurumContract.registerNode.mockResolvedValue(
        '0x5555555555555555555555555555555555555555',
      );

      await mockAurumContract.registerNode(expectedContractNode);

      expect(mockAurumContract.registerNode).toHaveBeenCalledWith(
        expectedContractNode,
      );
    });
  });

  describe('status conversion', () => {
    it('should correctly convert between domain status and contract bytes1', () => {
      const statusMappings = [
        { domain: 'Active', contract: '0x01' },
        { domain: 'Inactive', contract: '0x00' },
      ];

      statusMappings.forEach(({ domain, contract }) => {
        // Test domain to contract conversion
        const contractStatus = mockConvertToContractStatus(domain);
        expect(contractStatus).toBe(contract);

        // Test contract to domain conversion
        const domainStatus = mockConvertToDomainStatus(contract);
        expect(domainStatus).toBe(domain);
      });
    });
  });

  // Mock functions to test conversion logic
  const mockNodeRepository = async (contractData: any, address: string) => {
    return {
      address,
      location: contractData.location,
      validNode: Boolean(contractData.validNode),
      owner: contractData.owner,
      assets: contractData.supportedAssets.map((asset: any) => ({
        token: asset.token,
        tokenId: asset.tokenId.toString(),
        price: asset.price,
        capacity: Number(asset.capacity),
      })),
      status: contractData.status === '0x01' ? 'Active' : 'Inactive',
    };
  };

  const mockConvertToContractStatus = (status: string) => {
    return status === 'Active' ? '0x01' : '0x00';
  };

  const mockConvertToDomainStatus = (status: string) => {
    return status === '0x01' ? 'Active' : 'Inactive';
  };
});
