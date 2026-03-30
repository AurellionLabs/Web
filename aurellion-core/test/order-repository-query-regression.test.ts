import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('orders-repository inline query regression', () => {
  it('uses snake_case fields in the order and journey detail queries', () => {
    const repositoryPath = path.resolve(
      __dirname,
      '../../infrastructure/repositories/orders-repository.ts',
    );
    const source = fs.readFileSync(repositoryPath, 'utf8');

    expect(source).toContain(
      'diamondUnifiedOrderCreatedEventss(where: { unified_order_id: $orderId }',
    );
    expect(source).toContain(
      'diamondLogisticsOrderCreatedEventss(where: { unified_order_id: $orderId }',
    );
    expect(source).toContain(
      'diamondLogisticsOrderCreatedEventss(where: { journey_ids: $journeyId }',
    );

    expect(source).not.toContain(
      'diamondUnifiedOrderCreatedEventss(where: { unifiedOrderId: $orderId }',
    );
    expect(source).not.toContain(
      'diamondLogisticsOrderCreatedEventss(where: { unifiedOrderId: $orderId }',
    );
    expect(source).not.toContain(
      'diamondLogisticsOrderCreatedEventss(where: { journeyIds: $journeyId }',
    );
  });
});
