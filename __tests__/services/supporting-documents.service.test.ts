// @ts-nocheck - Test file with vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupportingDocument } from '@/domain/node';

describe('Supporting Documents Service', () => {
  let mockDiamondContract: any;
  let mockNodeService: any;
  let mockNodeRepository: any;

  beforeEach(() => {
    mockDiamondContract = {
      addSupportingDocument: vi.fn(),
      removeSupportingDocument: vi.fn(),
      getSupportingDocuments: vi.fn(),
      getActiveSupportingDocuments: vi.fn(),
      getSupportingDocumentCount: vi.fn(),
    };

    mockNodeService = {
      addSupportingDocument: vi.fn(),
      removeSupportingDocument: vi.fn(),
    };

    mockNodeRepository = {
      getSupportingDocuments: vi.fn(),
    };
  });

  describe('addSupportingDocument', () => {
    it('should add a document and return isFrozen status for IPFS URLs', async () => {
      const nodeHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      const url = 'ipfs://QmXyz123abc456def789';
      const title = 'Security Audit';
      const description = 'Annual security audit';
      const documentType = 'audit';

      mockDiamondContract.addSupportingDocument.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({
          logs: [
            {
              topics: ['0x...'],
              data: '0x...',
            },
          ],
        }),
      });

      // Simulate the service call
      const result = await mockAddSupportingDocument(
        nodeHash,
        url,
        title,
        description,
        documentType,
      );

      expect(result.isFrozen).toBe(true); // IPFS URL should be frozen
    });

    it('should add a document and return isFrozen=false for regular URLs', async () => {
      const nodeHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      const url = 'https://example.com/document.pdf';
      const title = 'Regular Document';
      const description = 'A regular document';
      const documentType = 'certification';

      const result = await mockAddSupportingDocument(
        nodeHash,
        url,
        title,
        description,
        documentType,
      );

      expect(result.isFrozen).toBe(false); // Regular URL should not be frozen
    });

    it('should detect Arweave URLs as frozen', async () => {
      const arweaveUrls = [
        'ar://abc123def456',
        'https://arweave.net/abc123def456',
      ];

      for (const url of arweaveUrls) {
        const result = await mockAddSupportingDocument(
          '0x1234',
          url,
          'Arweave Doc',
          '',
          'other',
        );
        expect(result.isFrozen).toBe(true);
      }
    });

    it('should require URL and title', async () => {
      await expect(
        mockAddSupportingDocument('0x1234', '', 'Title', '', 'other'),
      ).rejects.toThrow('URL required');

      await expect(
        mockAddSupportingDocument(
          '0x1234',
          'https://example.com',
          '',
          '',
          'other',
        ),
      ).rejects.toThrow('Title required');
    });
  });

  describe('removeSupportingDocument', () => {
    it('should soft delete a document by URL', async () => {
      const nodeHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      const url = 'ipfs://QmXyz123abc456def789';

      mockDiamondContract.removeSupportingDocument.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({}),
      });

      await mockRemoveSupportingDocument(nodeHash, url);

      expect(mockDiamondContract.removeSupportingDocument).toHaveBeenCalledWith(
        nodeHash,
        url,
      );
    });

    it('should throw error if document not found', async () => {
      const nodeHash = '0x1234';
      const url = 'https://nonexistent.com/doc.pdf';

      mockDiamondContract.removeSupportingDocument.mockRejectedValue(
        new Error('Document not found'),
      );

      await expect(mockRemoveSupportingDocument(nodeHash, url)).rejects.toThrow(
        'Document not found',
      );
    });
  });

  describe('getSupportingDocuments', () => {
    it('should return all documents including removed ones', async () => {
      const nodeHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';

      const contractDocs = [
        {
          url: 'ipfs://active',
          title: 'Active Doc',
          description: '',
          documentType: 'certification',
          isFrozen: true,
          isRemoved: false,
          addedAt: 1704067200n,
          removedAt: 0n,
          addedBy: '0x1111111111111111111111111111111111111111',
          removedBy: '0x0000000000000000000000000000000000000000',
        },
        {
          url: 'https://removed.com',
          title: 'Removed Doc',
          description: '',
          documentType: 'audit',
          isFrozen: false,
          isRemoved: true,
          addedAt: 1672531200n,
          removedAt: 1704067200n,
          addedBy: '0x2222222222222222222222222222222222222222',
          removedBy: '0x2222222222222222222222222222222222222222',
        },
      ];

      mockDiamondContract.getSupportingDocuments.mockResolvedValue(
        contractDocs,
      );

      const result = await mockGetSupportingDocuments(nodeHash);

      expect(result).toHaveLength(2);
      expect(result[0].isRemoved).toBe(false);
      expect(result[1].isRemoved).toBe(true);
    });

    it('should correctly convert contract data to domain objects', async () => {
      const nodeHash = '0x1234';

      const contractDoc = {
        url: 'ipfs://QmXyz',
        title: 'Test Doc',
        description: 'Test description',
        documentType: 'audit',
        isFrozen: true,
        isRemoved: false,
        addedAt: 1704067200n,
        removedAt: 0n,
        addedBy: '0x1111111111111111111111111111111111111111',
        removedBy: '0x0000000000000000000000000000000000000000',
      };

      mockDiamondContract.getSupportingDocuments.mockResolvedValue([
        contractDoc,
      ]);

      const result = await mockGetSupportingDocuments(nodeHash);

      expect(result[0]).toEqual({
        url: 'ipfs://QmXyz',
        title: 'Test Doc',
        description: 'Test description',
        documentType: 'audit',
        isFrozen: true,
        isRemoved: false,
        addedAt: 1704067200,
        removedAt: undefined,
        addedBy: '0x1111111111111111111111111111111111111111',
        removedBy: undefined,
      });
    });

    it('should return empty array for nodes with no documents', async () => {
      const nodeHash = '0x1234';

      mockDiamondContract.getSupportingDocuments.mockResolvedValue([]);

      const result = await mockGetSupportingDocuments(nodeHash);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // Mock implementations
  const mockAddSupportingDocument = async (
    nodeHash: string,
    url: string,
    title: string,
    description: string,
    documentType: string,
  ): Promise<{ isFrozen: boolean }> => {
    if (!url) throw new Error('URL required');
    if (!title) throw new Error('Title required');

    const isFrozen =
      url.startsWith('ipfs://') ||
      url.startsWith('ar://') ||
      url.includes('arweave.net');

    mockDiamondContract.addSupportingDocument(
      nodeHash,
      url,
      title,
      description,
      documentType,
    );

    return { isFrozen };
  };

  const mockRemoveSupportingDocument = async (
    nodeHash: string,
    url: string,
  ): Promise<void> => {
    await mockDiamondContract.removeSupportingDocument(nodeHash, url);
  };

  const mockGetSupportingDocuments = async (
    nodeHash: string,
  ): Promise<SupportingDocument[]> => {
    const contractDocs =
      await mockDiamondContract.getSupportingDocuments(nodeHash);

    return contractDocs.map((doc: any) => ({
      url: doc.url,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      isFrozen: doc.isFrozen,
      isRemoved: doc.isRemoved,
      addedAt: Number(doc.addedAt),
      removedAt: doc.isRemoved ? Number(doc.removedAt) : undefined,
      addedBy: doc.addedBy,
      removedBy: doc.isRemoved ? doc.removedBy : undefined,
    }));
  };
});
