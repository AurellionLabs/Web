// @ts-nocheck - Test file with type issues
import { expect } from 'chai';
import sinon from 'sinon';

import { PlatformRepository } from '@/infrastructure/repositories/platform-repository';
import * as graphModule from '@/infrastructure/repositories/shared/graph';

describe('PlatformRepository', () => {
  const dummyContract = {
    target: '0x0000000000000000000000000000000000000000',
  } as any;

  const dummyPinata = {
    files: {
      public: {
        list: sinon.stub().returns({
          keyvalues: sinon.stub().returns({
            all: sinon.stub().resolves([]),
          }),
        }),
      },
    },
    gateways: {
      public: {
        get: sinon.stub(),
      },
    },
  } as any;

  let graphqlStub: sinon.SinonStub;

  beforeEach(() => {
    graphqlStub = sinon.stub(graphModule, 'graphqlRequest');
    graphqlStub.resolves({
      diamondSupportedAssetAddedEventss: {
        items: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getSupportedAssets', () => {
    it('should extract assetClass from className field in IPFS metadata', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      const mockPinataList = [
        {
          cid: 'QmClassNameTest123',
          keyvalues: { token: '0x1', tokenId: '1' },
        },
      ];

      (dummyPinata.files.public.list as any).returns({
        keyvalues: sinon.stub().returns({
          all: sinon.stub().resolves(mockPinataList),
        }),
      });

      (dummyPinata.gateways.public.get as any).resolves({
        data: JSON.stringify({
          className: 'Commodities',
          name: 'Gold Bar',
          asset: {
            name: 'Gold Bar',
            attributes: [
              { name: 'purity', values: ['99.9%'], description: 'Gold purity' },
            ],
          },
        }),
      });

      graphqlStub.resolves({
        diamondSupportedAssetAddedEventss: {
          items: [
            {
              token: '0x1',
              token_id: '1',
              price: '1000',
              capacity: '10',
              block_number: '1',
              block_timestamp: '1234567890',
              transaction_hash: '0x123',
              id: '1',
              node_hash: '0xNode',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const result = await repo.getSupportedAssets();

      expect(result).to.have.length(1);
      expect(result[0].assetClass).to.equal('Commodities');
      expect(result[0].name).to.equal('Gold Bar');
      expect(result[0].tokenId).to.equal('1');
      expect(result[0].attributes).to.have.length(1);
      expect(result[0].attributes[0].name).to.equal('purity');
    });

    it('should extract assetClass from class field in IPFS metadata', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      const mockPinataList = [
        { cid: 'QmClassTest456', keyvalues: { token: '0x2', tokenId: '2' } },
      ];

      (dummyPinata.files.public.list as any).returns({
        keyvalues: sinon.stub().returns({
          all: sinon.stub().resolves(mockPinataList),
        }),
      });

      (dummyPinata.gateways.public.get as any).resolves({
        data: JSON.stringify({
          class: 'Electronics',
          name: 'Laptop',
          asset: {
            name: 'Laptop',
            attributes: [],
          },
        }),
      });

      graphqlStub.resolves({
        diamondSupportedAssetAddedEventss: {
          items: [
            {
              token: '0x2',
              token_id: '2',
              price: '2000',
              capacity: '5',
              block_number: '2',
              block_timestamp: '1234567891',
              transaction_hash: '0x124',
              id: '2',
              node_hash: '0xNode',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const result = await repo.getSupportedAssets();

      expect(result).to.have.length(1);
      expect(result[0].assetClass).to.equal('Electronics');
      expect(result[0].name).to.equal('Laptop');
    });

    it('should extract assetClass from asset.assetClass field in IPFS metadata', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      const mockPinataList = [
        {
          cid: 'QmAssetClassTest789',
          keyvalues: { token: '0x3', tokenId: '3' },
        },
      ];

      (dummyPinata.files.public.list as any).returns({
        keyvalues: sinon.stub().returns({
          all: sinon.stub().resolves(mockPinataList),
        }),
      });

      (dummyPinata.gateways.public.get as any).resolves({
        data: JSON.stringify({
          name: 'Vintage Wine',
          asset: {
            name: 'Vintage Wine',
            assetClass: 'Luxury Goods',
            attributes: [
              {
                name: 'vintage',
                values: ['2015'],
                description: 'Year produced',
              },
            ],
          },
        }),
      });

      graphqlStub.resolves({
        diamondSupportedAssetAddedEventss: {
          items: [
            {
              token: '0x3',
              token_id: '3',
              price: '500',
              capacity: '100',
              block_number: '3',
              block_timestamp: '1234567892',
              transaction_hash: '0x125',
              id: '3',
              node_hash: '0xNode',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const result = await repo.getSupportedAssets();

      expect(result).to.have.length(1);
      expect(result[0].assetClass).to.equal('Luxury Goods');
      expect(result[0].name).to.equal('Vintage Wine');
    });

    it('should default to Unknown when no class field exists in IPFS metadata', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      const mockPinataList = [
        { cid: 'QmUnknownTest012', keyvalues: { token: '0x4', tokenId: '4' } },
      ];

      (dummyPinata.files.public.list as any).returns({
        keyvalues: sinon.stub().returns({
          all: sinon.stub().resolves(mockPinataList),
        }),
      });

      (dummyPinata.gateways.public.get as any).resolves({
        data: JSON.stringify({
          name: 'Mystery Item',
          asset: {
            name: 'Mystery Item',
            attributes: [],
          },
        }),
      });

      graphqlStub.resolves({
        diamondSupportedAssetAddedEventss: {
          items: [
            {
              token: '0x4',
              token_id: '4',
              price: '100',
              capacity: '1',
              block_number: '4',
              block_timestamp: '1234567893',
              transaction_hash: '0x126',
              id: '4',
              node_hash: '0xNode',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const result = await repo.getSupportedAssets();

      expect(result).to.have.length(1);
      expect(result[0].assetClass).to.equal('Unknown');
      expect(result[0].name).to.equal('Mystery Item');
    });

    it('should handle IPFS fetch errors gracefully and default to Unknown', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      const mockPinataList = [
        { cid: 'QmErrorTest345', keyvalues: { token: '0x5', tokenId: '5' } },
      ];

      (dummyPinata.files.public.list as any).returns({
        keyvalues: sinon.stub().returns({
          all: sinon.stub().resolves(mockPinataList),
        }),
      });

      (dummyPinata.gateways.public.get as any).rejects(
        new Error('IPFS fetch failed'),
      );

      graphqlStub.resolves({
        diamondSupportedAssetAddedEventss: {
          items: [
            {
              token: '0x5',
              token_id: '5',
              price: '50',
              capacity: '10',
              block_number: '5',
              block_timestamp: '1234567894',
              transaction_hash: '0x127',
              id: '5',
              node_hash: '0xNode',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const result = await repo.getSupportedAssets();

      expect(result).to.have.length(1);
      expect(result[0].assetClass).to.equal('Unknown');
      expect(result[0].name).to.equal('');
    });

    it('should deduplicate assets by token and token_id', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      const mockPinataList = [
        {
          cid: 'QmDuplicateTest678',
          keyvalues: { token: '0x6', tokenId: '6' },
        },
      ];

      (dummyPinata.files.public.list as any).returns({
        keyvalues: sinon.stub().returns({
          all: sinon.stub().resolves(mockPinataList),
        }),
      });

      (dummyPinata.gateways.public.get as any).resolves({
        data: JSON.stringify({
          className: 'Documents',
          name: 'Test Document',
          asset: { name: 'Test Document', attributes: [] },
        }),
      });

      graphqlStub.resolves({
        diamondSupportedAssetAddedEventss: {
          items: [
            {
              token: '0x6',
              token_id: '6',
              price: '10',
              capacity: '100',
              block_number: '6',
              block_timestamp: '1234567895',
              transaction_hash: '0x128',
              id: '6',
              node_hash: '0xNode',
            },
            {
              token: '0x6',
              token_id: '6',
              price: '10',
              capacity: '100',
              block_number: '7',
              block_timestamp: '1234567896',
              transaction_hash: '0x129',
              id: '7',
              node_hash: '0xNode',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const result = await repo.getSupportedAssets();

      expect(result).to.have.length(1);
      expect(result[0].assetClass).to.equal('Documents');
    });
  });

  describe('getSupportedAssetClasses', () => {
    it('should return active asset classes from SupportedClassAdded events', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      graphqlStub
        .withArgs(
          sinon.match.any,
          sinon.match.string.includes('SupportedClassAdded'),
          sinon.match.any,
        )
        .resolves({
          diamondSupportedClassAddedEventss: {
            items: [
              {
                id: '1',
                class_name_hash: '0xhash1',
                class_name: 'Commodities',
                block_number: '1',
                block_timestamp: '1234567890',
                transaction_hash: '0xabc',
              },
              {
                id: '2',
                class_name_hash: '0xhash2',
                class_name: 'Electronics',
                block_number: '2',
                block_timestamp: '1234567891',
                transaction_hash: '0xdef',
              },
            ],
          },
        });

      graphqlStub
        .withArgs(
          sinon.match.any,
          sinon.match.string.includes('SupportedClassRemoved'),
          sinon.match.any,
        )
        .resolves({
          diamondSupportedClassRemovedEventss: {
            items: [],
          },
        });

      const result = await repo.getSupportedAssetClasses();

      expect(result).to.include('Commodities');
      expect(result).to.include('Electronics');
      expect(result).to.have.length(2);
    });

    it('should exclude removed asset classes', async () => {
      const repo = new PlatformRepository(dummyContract, dummyPinata);

      graphqlStub
        .withArgs(
          sinon.match.any,
          sinon.match.string.includes('SupportedClassAdded'),
          sinon.match.any,
        )
        .resolves({
          diamondSupportedClassAddedEventss: {
            items: [
              {
                id: '1',
                class_name_hash: '0xhash1',
                class_name: 'Commodities',
                block_number: '1',
                block_timestamp: '1234567890',
                transaction_hash: '0xabc',
              },
              {
                id: '2',
                class_name_hash: '0xhash2',
                class_name: 'Electronics',
                block_number: '2',
                block_timestamp: '1234567891',
                transaction_hash: '0xdef',
              },
            ],
          },
        });

      graphqlStub
        .withArgs(
          sinon.match.any,
          sinon.match.string.includes('SupportedClassRemoved'),
          sinon.match.any,
        )
        .resolves({
          diamondSupportedClassRemovedEventss: {
            items: [
              {
                id: '3',
                class_name_hash: '0xhash1',
                class_name: 'Commodities',
                block_number: '3',
                block_timestamp: '1234567892',
                transaction_hash: '0xghi',
              },
            ],
          },
        });

      const result = await repo.getSupportedAssetClasses();

      expect(result).to.not.include('Commodities');
      expect(result).to.include('Electronics');
      expect(result).to.have.length(1);
    });
  });
});
