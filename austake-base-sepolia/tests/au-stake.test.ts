import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from 'matchstick-as/assembly/index';
import { Address, Bytes, BigInt } from '@graphprotocol/graph-ts';
import { AdminStatusChanged } from '../generated/schema';
import { AdminStatusChanged as AdminStatusChangedEvent } from '../generated/AuStake/AuStake';
import { handleAdminStatusChanged } from '../src/au-stake';
import { createAdminStatusChangedEvent } from './au-stake-utils';

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe('Describe entity assertions', () => {
  beforeAll(() => {
    let admin = Address.fromString(
      '0x0000000000000000000000000000000000000001',
    );
    let status = 'boolean Not implemented';
    let newAdminStatusChangedEvent = createAdminStatusChangedEvent(
      admin,
      status,
    );
    handleAdminStatusChanged(newAdminStatusChangedEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test('AdminStatusChanged created and stored', () => {
    assert.entityCount('AdminStatusChanged', 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      'AdminStatusChanged',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'admin',
      '0x0000000000000000000000000000000000000001',
    );
    assert.fieldEquals(
      'AdminStatusChanged',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      'status',
      'boolean Not implemented',
    );

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  });
});
