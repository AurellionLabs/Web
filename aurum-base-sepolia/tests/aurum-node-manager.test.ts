import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from 'matchstick-as/assembly/index';
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { NodeCapacityUpdated } from '../generated/schema';
import { NodeCapacityUpdated as NodeCapacityUpdatedEvent } from '../generated/AurumNodeManager/AurumNodeManager';
import { handleNodeCapacityUpdated } from '../src/aurum-node-manager';
import { createNodeCapacityUpdatedEvent } from './aurum-node-manager-utils';

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe('Describe entity assertions', () => {
  beforeAll(() => {
    let node = Address.fromString('0x0000000000000000000000000000000000000001');
    let quantities = [BigInt.fromI32(234)];
    let newNodeCapacityUpdatedEvent = createNodeCapacityUpdatedEvent(
      node,
      quantities,
    );
    handleNodeCapacityUpdated(newNodeCapacityUpdatedEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test('NodeCapacityUpdated created and stored', () => {
    assert.entityCount('NodeCapacityUpdated', 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      'NodeCapacityUpdated',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'node',
      '0x0000000000000000000000000000000000000001',
    );
    assert.fieldEquals(
      'NodeCapacityUpdated',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'quantities',
      '[234]',
    );

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  });
});
