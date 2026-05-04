import {
  buildP2PStepTransactionMap,
  type P2PJourneyTransactionContext,
  type P2PStepTransactionMap,
} from '@/app/components/p2p/p2p-order-step-transactions';
import type {
  AuSysOrderStatusUpdatesByOrderIdResponse,
  EmitSigEventsByJourneyResponse,
  JourneyStatusUpdatesByIdsResponse,
  P2PAcceptedEventsByOrderIdResponse,
  P2PJourneysByOrderIdResponse,
  P2POfferByOrderIdResponse,
} from '@/infrastructure/shared/graph-queries';
import {
  GET_AUSYS_ORDER_STATUS_UPDATES_BY_ORDER_ID,
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  GET_JOURNEY_STATUS_UPDATES_BY_IDS,
  GET_P2P_ACCEPTED_EVENTS_BY_ORDER_ID,
  GET_P2P_JOURNEYS_BY_ORDER_ID,
  GET_P2P_OFFER_BY_ORDER_ID,
} from '@/infrastructure/shared/graph-queries';

interface JourneyLike {
  journeyStart?: bigint | number | string;
  sender?: string;
  receiver?: string;
  driver?: string;
}

interface GraphqlRequestFn {
  <TResponse>(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TResponse>;
}

interface LoadP2PStepTransactionMapParams {
  order: {
    id: string;
    journeyIds: string[];
  };
  indexerUrl: string;
  graphqlRequest: GraphqlRequestFn;
  getJourney: (journeyId: string) => Promise<JourneyLike>;
  logger?: Pick<Console, 'warn'>;
}

export async function loadP2PStepTransactionMap({
  order,
  indexerUrl,
  graphqlRequest,
  getJourney,
  logger = console,
}: LoadP2PStepTransactionMapParams): Promise<P2PStepTransactionMap> {
  const [
    createdResponse,
    acceptedResponse,
    orderStatusResponse,
    journeysResponse,
  ] = await Promise.all([
    graphqlRequest<P2POfferByOrderIdResponse>(
      indexerUrl,
      GET_P2P_OFFER_BY_ORDER_ID,
      { orderId: order.id },
    ),
    graphqlRequest<P2PAcceptedEventsByOrderIdResponse>(
      indexerUrl,
      GET_P2P_ACCEPTED_EVENTS_BY_ORDER_ID,
      { orderId: order.id, limit: 50 },
    ),
    graphqlRequest<AuSysOrderStatusUpdatesByOrderIdResponse>(
      indexerUrl,
      GET_AUSYS_ORDER_STATUS_UPDATES_BY_ORDER_ID,
      { orderId: order.id, limit: 50 },
    ),
    graphqlRequest<P2PJourneysByOrderIdResponse>(
      indexerUrl,
      GET_P2P_JOURNEYS_BY_ORDER_ID,
      { orderId: order.id, limit: 50 },
    ),
  ]);

  const journeyIds = Array.from(
    new Set([
      ...order.journeyIds,
      ...(journeysResponse.diamondJourneyCreatedEventss?.items || []).map(
        (journey) => journey.journey_id,
      ),
    ]),
  );

  const [journeyStatusResponse, emitSigEntries, journeyContextEntries] =
    await Promise.all([
      journeyIds.length > 0
        ? graphqlRequest<JourneyStatusUpdatesByIdsResponse>(
            indexerUrl,
            GET_JOURNEY_STATUS_UPDATES_BY_IDS,
            { journeyIds, limit: 100 },
          )
        : Promise.resolve({
            diamondAuSysJourneyStatusUpdatedEventss: { items: [] },
          } satisfies JourneyStatusUpdatesByIdsResponse),
      Promise.all(
        journeyIds.map(async (journeyId) => {
          try {
            const response =
              await graphqlRequest<EmitSigEventsByJourneyResponse>(
                indexerUrl,
                GET_EMIT_SIG_EVENTS_BY_JOURNEY,
                { journeyId, limit: 50 },
              );

            return [
              journeyId,
              response.diamondEmitSigEventss?.items || [],
            ] as const;
          } catch (error) {
            logger.warn(
              '[loadP2PStepTransactionMap] Failed to load emit signature events:',
              journeyId,
              error,
            );
            return [journeyId, []] as const;
          }
        }),
      ),
      Promise.all(
        journeyIds.map(async (journeyId) => {
          try {
            const journey = await getJourney(journeyId);

            return [
              journeyId,
              {
                journeyStart: Number(journey.journeyStart) || 0,
                sender: journey.sender,
                receiver: journey.receiver,
                driver: journey.driver,
              } satisfies P2PJourneyTransactionContext,
            ] as const;
          } catch (error) {
            logger.warn(
              '[loadP2PStepTransactionMap] Failed to load journey context:',
              journeyId,
              error,
            );
            return [
              journeyId,
              { journeyStart: 0 } satisfies P2PJourneyTransactionContext,
            ] as const;
          }
        }),
      ),
    ]);

  return buildP2PStepTransactionMap({
    createdEvents: createdResponse.diamondP2POfferCreatedEventss?.items || [],
    acceptedEvents:
      acceptedResponse.diamondP2POfferAcceptedEventss?.items || [],
    orderStatusUpdates:
      orderStatusResponse.diamondAuSysOrderStatusUpdatedEventss?.items || [],
    journeyEvents: journeysResponse.diamondJourneyCreatedEventss?.items || [],
    journeyStatusUpdates:
      journeyStatusResponse.diamondAuSysJourneyStatusUpdatedEventss?.items ||
      [],
    emitSigEventsByJourney: Object.fromEntries(emitSigEntries),
    journeyContexts: Object.fromEntries(
      journeyContextEntries.map(([journeyId, context]) => [
        journeyId.toLowerCase(),
        context,
      ]),
    ),
  });
}
