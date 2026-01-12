/**
 * Journeys Handler
 *
 * Handles all journey-related events from BridgeFacet.
 * Journeys are created when unified orders are bridged to logistics.
 *
 * Note: Stores only raw events - repositories handle aggregation at query time.
 */

import { ponder } from '@/generated';
import {
  journeys,
  journeyCreatedEvents,
  journeyStatusUpdates,
  driverAssignments,
  packageSignatures,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// Journey phases map to statuses:
// 0 = Pending (no driver)
// 1 = InTransit (driver assigned, journey started)
// 2 = Delivered (journey completed)
// 3 = Cancelled

const JourneyStatus = {
  Pending: 0,
  InTransit: 1,
  Delivered: 2,
  Cancelled: 3,
} as const;

// ============================================================================
// JOURNEY CREATION - Store only raw events
// ============================================================================

ponder.on('Diamond:LogisticsOrderCreated', async ({ event, context }) => {
  const { unifiedOrderId, ausysOrderId, journeyIds, bounty, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(
    `[journeys] LogisticsOrderCreated: unifiedOrder=${unifiedOrderId}, journeys=${journeyIds.length}`,
  );

  // Create a journey for each journeyId in the array
  for (let i = 0; i < journeyIds.length; i++) {
    const journeyId = journeyIds[i];

    // Try to read journey data from contract
    let driver = '0x0000000000000000000000000000000000000000' as `0x${string}`;
    let phase = 0;
    let createdAt = event.block.timestamp;
    let updatedAt = event.block.timestamp;

    try {
      const journey = await context.client.readContract({
        abi: context.contracts.Diamond.abi,
        address: context.contracts.Diamond.address,
        functionName: 'getJourney',
        args: [journeyId],
        blockNumber: event.block.number,
      });

      if (journey) {
        const j = journey as any;
        driver = (j.driver ||
          '0x0000000000000000000000000000000000000000') as `0x${string}`;
        phase = Number(j.phase || 0);
        createdAt = j.createdAt || event.block.timestamp;
        updatedAt = j.updatedAt || event.block.timestamp;
      }
    } catch (e) {
      console.warn(
        `[journeys] Could not read journey data for ${journeyId}:`,
        e,
      );
    }

    // Try to read unified order data for location info
    let startLocationLat = '';
    let startLocationLng = '';
    let endLocationLat = '';
    let endLocationLng = '';
    let startName = '';
    let endName = '';
    let sender = '0x0000000000000000000000000000000000000000' as `0x${string}`;
    let receiver =
      '0x0000000000000000000000000000000000000000' as `0x${string}`;

    try {
      const unifiedOrder = await context.client.readContract({
        abi: context.contracts.Diamond.abi,
        address: context.contracts.Diamond.address,
        functionName: 'getUnifiedOrder',
        args: [unifiedOrderId],
        blockNumber: event.block.number,
      });

      if (unifiedOrder) {
        const order = unifiedOrder as any;
        sender = (order.sellerNode ||
          order.seller ||
          '0x0000000000000000000000000000000000000000') as `0x${string}`;
        receiver = (order.buyer ||
          '0x0000000000000000000000000000000000000000') as `0x${string}`;
      }
    } catch (e) {
      console.warn(`[journeys] Could not read unified order data:`, e);
    }

    // Create journey entity
    await context.db
      .insert(journeys)
      .values({
        id: journeyId,
        sender,
        receiver,
        driver,
        currentStatus: phase,
        bounty,
        journeyStart:
          phase >= JourneyStatus.InTransit ? event.block.timestamp : 0n,
        journeyEnd:
          phase >= JourneyStatus.Delivered ? event.block.timestamp : 0n,
        eta: 0n,
        startLocationLat,
        startLocationLng,
        endLocationLat,
        endLocationLng,
        startName,
        endName,
        orderId: ausysOrderId || unifiedOrderId,
        createdAt,
        updatedAt,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoUpdate({
        set: {
          driver,
          currentStatus: phase,
          updatedAt,
        },
      });

    // Create journey created event
    await context.db
      .insert(journeyCreatedEvents)
      .values({
        id: `${id}-${i}`,
        journeyId,
        sender,
        receiver,
        bounty,
        eta: 0n,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  }
});

// ============================================================================
// JOURNEY STATUS UPDATES - Store only raw events
// ============================================================================

ponder.on('Diamond:JourneyStatusUpdated', async ({ event, context }) => {
  const { unifiedOrderId, journeyId, phase } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[journeys] JourneyStatusUpdated: ${journeyId}, phase=${phase}`);

  // Get current journey status
  const existingJourney = await context.db.find(journeys, { id: journeyId });
  const oldStatus = existingJourney?.currentStatus ?? 0;

  // Update journey status
  const updates: any = {
    currentStatus: phase,
    updatedAt: event.block.timestamp,
  };

  // Set journeyStart when transitioning to InTransit
  if (
    phase === JourneyStatus.InTransit &&
    oldStatus < JourneyStatus.InTransit
  ) {
    updates.journeyStart = event.block.timestamp;
  }

  // Set journeyEnd when transitioning to Delivered
  if (
    phase === JourneyStatus.Delivered &&
    oldStatus < JourneyStatus.Delivered
  ) {
    updates.journeyEnd = event.block.timestamp;
  }

  await context.db.update(journeys, { id: journeyId }).set(updates);

  // Create status update event record
  await context.db
    .insert(journeyStatusUpdates)
    .values({
      id,
      journeyId,
      oldStatus,
      newStatus: phase,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // If driver is being assigned (phase 1 and no driver yet), create driver assignment
  if (phase === JourneyStatus.InTransit && !existingJourney?.driver) {
    try {
      const journey = await context.client.readContract({
        abi: context.contracts.Diamond.abi,
        address: context.contracts.Diamond.address,
        functionName: 'getJourney',
        args: [journeyId],
        blockNumber: event.block.number,
      });

      if (journey) {
        const j = journey as any;
        const driver = j.driver as `0x${string}`;
        if (driver && driver !== '0x0000000000000000000000000000000000000000') {
          const assignmentId = `${id}-assignment`;
          await context.db
            .insert(driverAssignments)
            .values({
              id: assignmentId,
              driver,
              journeyId,
              assignedBy: event.transaction.from,
              blockNumber: event.block.number,
              blockTimestamp: event.block.timestamp,
              transactionHash: event.transaction.hash,
            })
            .onConflictDoNothing();

          // Update journey with driver
          await context.db.update(journeys, { id: journeyId }).set({
            driver,
          });
        }
      }
    } catch (e) {
      console.warn(`[journeys] Could not read driver assignment:`, e);
    }
  }
});
