import { expect } from 'chai';
import sinon from 'sinon';

import { OrderRepository } from '@/infrastructure/repositories/orders-repository';
import * as graphModule from '@/infrastructure/repositories/shared/graph';
import {
  type JourneyGraphResponse,
  type OrderGraphResponse,
} from '@/infrastructure/shared/graph-queries-updated';

describe('OrderRepository (GraphQL)', () => {
  const dummyProvider = {} as any; // BrowserProvider is not used in Graph paths
  const dummySigner = {
    getAddress: sinon
      .stub()
      .resolves('0xABCDEFabcdef0000000000000000000000000001'),
  } as any;

  const dummyContract = {
    target: '0x0000000000000000000000000000000000000000',
  } as any;

  let graphqlStub: sinon.SinonStub;

  beforeEach(() => {
    graphqlStub = sinon.stub(graphModule, 'graphqlRequest');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getNodeOrders: passes lowercased nodeAddress and maps response', async () => {
    const repo = new OrderRepository(dummyContract, dummyProvider, dummySigner);

    const order: OrderGraphResponse = {
      id: '0xorder1',
      buyer: '0xBuyer',
      seller: '0xSeller',
      token: '0xToken',
      tokenId: '1',
      tokenQuantity: '10',
      requestedTokenQuantity: '5',
      price: '1000',
      txFee: '10',
      currentStatus: '1',
      locationData: {
        startLocation: { lat: '1', lng: '2' },
        endLocation: { lat: '3', lng: '4' },
        startName: 'A',
        endName: 'B',
      },
      journeys: [],
      nodes: ['0xNode'],
      createdAt: '0',
      updatedAt: '0',
    };

    graphqlStub.resolves({ orders: [order] });

    const result = await repo.getNodeOrders('0xNode');

    expect(graphqlStub.calledOnce).to.equal(true);
    const vars = graphqlStub.firstCall.args[2];
    expect(vars.nodeAddress).to.equal('0xnode');

    expect(result).to.have.length(1);
    expect(result[0].id).to.equal('0xorder1');
    expect(result[0].tokenId).to.equal(1n);
    expect(result[0].price).to.equal(1000n);
  });

  it('getCustomerJourneys: uses signer when address omitted and lowercases', async () => {
    const repo = new OrderRepository(dummyContract, dummyProvider, dummySigner);

    const journey: JourneyGraphResponse = {
      id: '0xjourney1',
      sender: '0xS',
      receiver: '0xR',
      driver: '0xD',
      currentStatus: '0',
      bounty: '100',
      journeyStart: '11',
      journeyEnd: '22',
      eta: '33',
      parcelData: {
        startLocation: { lat: '1', lng: '2' },
        endLocation: { lat: '3', lng: '4' },
        startName: 'Start',
        endName: 'End',
      },
      createdAt: '0',
      updatedAt: '0',
    };

    graphqlStub.resolves({ journeys: [journey] });

    const res = await repo.getCustomerJourneys();

    expect(graphqlStub.calledOnce).to.equal(true);
    const vars = graphqlStub.firstCall.args[2];
    expect(vars.senderAddress).to.equal(
      '0xabcdefabcdef0000000000000000000000000001',
    );

    expect(res[0].journeyId).to.equal('0xjourney1');
    expect(res[0].bounty).to.equal(100n);
    expect(res[0].ETA).to.equal(33n);
  });

  it('getReceiverJourneys: uses provided address lowercased', async () => {
    const repo = new OrderRepository(dummyContract, dummyProvider, dummySigner);
    graphqlStub.resolves({ journeys: [] });

    await repo.getReceiverJourneys('0xFfFf');
    const vars = graphqlStub.firstCall.args[2];
    expect(vars.receiverAddress).to.equal('0xffff');
  });

  it('fetchAllJourneys: forwards pagination params', async () => {
    const repo = new OrderRepository(dummyContract, dummyProvider, dummySigner);
    graphqlStub.resolves({ journeys: [] });

    await repo.fetchAllJourneys();
    const vars = graphqlStub.firstCall.args[2];
    expect(vars.first).to.equal(1000);
    expect(vars.skip).to.equal(0);
  });

  it('getOrderById: returns mapped order', async () => {
    const repo = new OrderRepository(dummyContract, dummyProvider, dummySigner);
    const order: OrderGraphResponse = {
      id: '0xorder2',
      buyer: '0xBuyer',
      seller: '0xSeller',
      token: '0xToken',
      tokenId: '2',
      tokenQuantity: '20',
      requestedTokenQuantity: '10',
      price: '2000',
      txFee: '20',
      currentStatus: '2',
      locationData: {
        startLocation: { lat: '5', lng: '6' },
        endLocation: { lat: '7', lng: '8' },
        startName: 'X',
        endName: 'Y',
      },
      journeys: [],
      nodes: [],
      createdAt: '0',
      updatedAt: '0',
    };

    graphqlStub.resolves({ order });

    const res = await repo.getOrderById('0x1234' as any);
    expect(graphqlStub.calledOnce).to.equal(true);
    const vars = graphqlStub.firstCall.args[2];
    expect(vars.orderId).to.equal('0x1234');
    expect(res.id).to.equal('0xorder2');
    expect(res.tokenId).to.equal(2n);
    expect(res.currentStatus).to.equal(2n);
  });

  it('getJourneyById: returns mapped journey', async () => {
    const repo = new OrderRepository(dummyContract, dummyProvider, dummySigner);
    const journey: JourneyGraphResponse = {
      id: '0xjourney999',
      sender: '0xS',
      receiver: '0xR',
      driver: '0xD',
      currentStatus: '1',
      bounty: '42',
      journeyStart: '100',
      journeyEnd: '200',
      eta: '300',
      parcelData: {
        startLocation: { lat: '0', lng: '0' },
        endLocation: { lat: '1', lng: '1' },
        startName: 'S',
        endName: 'E',
      },
      createdAt: '0',
      updatedAt: '0',
    };

    graphqlStub.resolves({ journey });

    const res = await repo.getJourneyById('0xabc' as any);
    expect(graphqlStub.calledOnce).to.equal(true);
    const vars = graphqlStub.firstCall.args[2];
    expect(vars.journeyId).to.equal('0xabc');
    expect(res.journeyId).to.equal('0xjourney999');
    expect(res.bounty).to.equal(42n);
  });
});
