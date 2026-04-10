import type {
  AuSysOrderStatusUpdatedRawEvent,
  EmitSigRawEvent,
  JourneyCreatedForOrderRawEvent,
  JourneyStatusUpdateRawEvent,
  P2POfferAcceptedRawEvent,
  P2POfferCreatedRawEvent,
} from '@/infrastructure/shared/graph-queries';

export type P2PStep =
  | 'accepted'
  | 'journey-pending'
  | 'in-transit'
  | 'awaiting-confirmation'
  | 'settled';

export interface P2POrderStepTransaction {
  txHash: string;
  timestamp: number;
  blockNumber: number;
  eventLabels: string[];
  actorLabels: string[];
  journeyId?: string;
}

export type P2PStepTransactionMap = Partial<
  Record<P2PStep, P2POrderStepTransaction[]>
>;

export interface P2PJourneyTransactionContext {
  journeyStart: number;
  sender?: string;
  receiver?: string;
  driver?: string;
}

interface BuildP2PStepTransactionMapParams {
  createdEvents: P2POfferCreatedRawEvent[];
  acceptedEvents: P2POfferAcceptedRawEvent[];
  orderStatusUpdates: AuSysOrderStatusUpdatedRawEvent[];
  journeyEvents: JourneyCreatedForOrderRawEvent[];
  journeyStatusUpdates: JourneyStatusUpdateRawEvent[];
  emitSigEventsByJourney: Record<string, EmitSigRawEvent[]>;
  journeyContexts?: Record<string, P2PJourneyTransactionContext>;
}

type StepAccumulator = Record<P2PStep, P2POrderStepTransaction[]>;

const STEP_IDS: P2PStep[] = [
  'accepted',
  'journey-pending',
  'in-transit',
  'awaiting-confirmation',
  'settled',
];

function createStepAccumulator(): StepAccumulator {
  return {
    accepted: [],
    'journey-pending': [],
    'in-transit': [],
    'awaiting-confirmation': [],
    settled: [],
  };
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAddress(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function formatShortAddress(value: string): string {
  if (value.length < 10) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function resolveEmitSigActorLabel(
  user: string,
  context?: P2PJourneyTransactionContext,
): string {
  const normalizedUser = normalizeAddress(user);
  if (!normalizedUser) {
    return 'Participant';
  }

  if (normalizedUser === normalizeAddress(context?.sender)) {
    return 'Sender';
  }

  if (normalizedUser === normalizeAddress(context?.receiver)) {
    return 'Customer';
  }

  if (normalizedUser === normalizeAddress(context?.driver)) {
    return 'Driver';
  }

  return formatShortAddress(user);
}

function pushTransaction(
  accumulator: StepAccumulator,
  stepId: P2PStep,
  transaction: P2POrderStepTransaction,
) {
  if (!transaction.txHash) {
    return;
  }

  accumulator[stepId].push(transaction);
}

function finalizeStepTransactions(
  accumulator: StepAccumulator,
): P2PStepTransactionMap {
  const result: P2PStepTransactionMap = {};

  for (const stepId of STEP_IDS) {
    const grouped = new Map<string, P2POrderStepTransaction>();

    for (const transaction of accumulator[stepId]) {
      const key = transaction.txHash.toLowerCase();
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          ...transaction,
          eventLabels: [...transaction.eventLabels],
          actorLabels: [...transaction.actorLabels],
        });
        continue;
      }

      existing.timestamp = Math.min(existing.timestamp, transaction.timestamp);
      existing.blockNumber = Math.min(
        existing.blockNumber,
        transaction.blockNumber,
      );

      for (const label of transaction.eventLabels) {
        if (!existing.eventLabels.includes(label)) {
          existing.eventLabels.push(label);
        }
      }

      for (const label of transaction.actorLabels) {
        if (!existing.actorLabels.includes(label)) {
          existing.actorLabels.push(label);
        }
      }

      if (!existing.journeyId && transaction.journeyId) {
        existing.journeyId = transaction.journeyId;
      }
    }

    const transactions = Array.from(grouped.values()).sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return left.timestamp - right.timestamp;
      }

      if (left.blockNumber !== right.blockNumber) {
        return left.blockNumber - right.blockNumber;
      }

      return left.txHash.localeCompare(right.txHash);
    });

    result[stepId] = transactions;
  }

  return result;
}

export function buildP2PStepTransactionMap({
  createdEvents,
  acceptedEvents,
  orderStatusUpdates,
  journeyEvents,
  journeyStatusUpdates,
  emitSigEventsByJourney,
  journeyContexts = {},
}: BuildP2PStepTransactionMapParams): P2PStepTransactionMap {
  const accumulator = createStepAccumulator();

  for (const event of createdEvents) {
    pushTransaction(accumulator, 'accepted', {
      txHash: event.transaction_hash,
      timestamp: toNumber(event.block_timestamp),
      blockNumber: toNumber(event.block_number),
      eventLabels: ['Offer Created'],
      actorLabels: [event.is_seller_initiated ? 'Seller' : 'Buyer'],
    });
  }

  for (const event of acceptedEvents) {
    pushTransaction(accumulator, 'accepted', {
      txHash: event.transaction_hash,
      timestamp: toNumber(event.block_timestamp),
      blockNumber: toNumber(event.block_number),
      eventLabels: ['Offer Accepted'],
      actorLabels: ['Acceptor'],
    });
  }

  for (const event of orderStatusUpdates) {
    const status = toNumber(event.new_status);

    if (status === 1) {
      pushTransaction(accumulator, 'journey-pending', {
        txHash: event.transaction_hash,
        timestamp: toNumber(event.block_timestamp),
        blockNumber: toNumber(event.block_number),
        eventLabels: ['Order Processing'],
        actorLabels: ['System'],
      });
    }

    if (status === 2) {
      pushTransaction(accumulator, 'settled', {
        txHash: event.transaction_hash,
        timestamp: toNumber(event.block_timestamp),
        blockNumber: toNumber(event.block_number),
        eventLabels: ['Order Settled'],
        actorLabels: ['System'],
      });
    }
  }

  for (const event of journeyEvents) {
    pushTransaction(accumulator, 'journey-pending', {
      txHash: event.transaction_hash,
      timestamp: toNumber(event.block_timestamp),
      blockNumber: toNumber(event.block_number),
      eventLabels: ['Journey Created'],
      actorLabels: ['Sender'],
      journeyId: event.journey_id,
    });
  }

  for (const event of journeyStatusUpdates) {
    const status = toNumber(event.new_status);

    if (status === 1) {
      pushTransaction(accumulator, 'in-transit', {
        txHash: event.transaction_hash,
        timestamp: toNumber(event.block_timestamp),
        blockNumber: toNumber(event.block_number),
        eventLabels: ['Journey Started'],
        actorLabels: ['Driver'],
        journeyId: event.journey_id,
      });
    }

    if (status === 2) {
      pushTransaction(accumulator, 'awaiting-confirmation', {
        txHash: event.transaction_hash,
        timestamp: toNumber(event.block_timestamp),
        blockNumber: toNumber(event.block_number),
        eventLabels: ['Journey Delivered'],
        actorLabels: ['Driver'],
        journeyId: event.journey_id,
      });
    }
  }

  for (const [journeyId, events] of Object.entries(emitSigEventsByJourney)) {
    const context =
      journeyContexts[journeyId.toLowerCase()] ?? journeyContexts[journeyId];
    const journeyStart = context?.journeyStart ?? 0;

    for (const event of events) {
      const timestamp = toNumber(event.block_timestamp);
      const isDeliveryPhase = journeyStart > 0 && timestamp > journeyStart;

      pushTransaction(
        accumulator,
        isDeliveryPhase ? 'awaiting-confirmation' : 'journey-pending',
        {
          txHash: event.transaction_hash,
          timestamp,
          blockNumber: toNumber(event.block_number),
          eventLabels: [isDeliveryPhase ? 'Delivery Signed' : 'Pickup Signed'],
          actorLabels: [resolveEmitSigActorLabel(event.user, context)],
          journeyId,
        },
      );
    }
  }

  return finalizeStepTransactions(accumulator);
}
