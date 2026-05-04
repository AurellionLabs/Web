import {
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  type EmitSigEventsByJourneyResponse,
} from '@/infrastructure/shared/graph-queries';
import { detectJourneyRoleConflict } from '@/utils/journey-role-conflicts';

export interface P2PSignatureState {
  buyerSigned: boolean;
  driverDeliverySigned: boolean;
  senderPickupSigned?: boolean;
  driverPickupSigned?: boolean;
  roleConflict?: boolean;
  roleConflictReason?: string;
}

interface JourneyLike {
  currentStatus?: bigint | number | string;
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

interface LoadP2PSignatureStateParams {
  journeyId: string;
  indexerUrl: string;
  graphqlRequest: GraphqlRequestFn;
  getJourney: (journeyId: string) => Promise<JourneyLike>;
  logger?: Pick<Console, 'warn'>;
}

function toLowerAddress(value?: string): string {
  return value?.toLowerCase() ?? '';
}

export async function loadP2PSignatureState({
  journeyId,
  indexerUrl,
  graphqlRequest,
  getJourney,
  logger = console,
}: LoadP2PSignatureStateParams): Promise<P2PSignatureState> {
  try {
    const journey = await getJourney(journeyId);
    const status = Number(journey.currentStatus);
    const roleConflict = detectJourneyRoleConflict(
      journey.sender,
      journey.receiver,
      journey.driver,
    );

    if (status >= 2) {
      return {
        buyerSigned: true,
        driverDeliverySigned: true,
        senderPickupSigned: true,
        driverPickupSigned: true,
        roleConflict: false,
      };
    }

    try {
      const sigResponse = await graphqlRequest<EmitSigEventsByJourneyResponse>(
        indexerUrl,
        GET_EMIT_SIG_EVENTS_BY_JOURNEY,
        { journeyId, limit: 50 },
      );

      const sigEvents = sigResponse.diamondEmitSigEventss?.items || [];
      const sender = toLowerAddress(journey.sender);
      const receiver = toLowerAddress(journey.receiver);
      const driver = toLowerAddress(journey.driver);
      const pickupTimestamp = Number(journey.journeyStart) || 0;

      if (status === 0) {
        const senderPickupSigned = sigEvents.some(
          (event) => event.user.toLowerCase() === sender,
        );
        const driverPickupSigned = sigEvents.some(
          (event) => event.user.toLowerCase() === driver,
        );

        return {
          buyerSigned: false,
          driverDeliverySigned: false,
          senderPickupSigned,
          driverPickupSigned,
          roleConflict: roleConflict.hasConflict,
          roleConflictReason: roleConflict.message,
        };
      }

      if (status === 1) {
        const deliverySigs = sigEvents.filter(
          (event) => Number(event.block_timestamp) > pickupTimestamp,
        );

        return {
          buyerSigned: deliverySigs.some(
            (event) => event.user.toLowerCase() === receiver,
          ),
          driverDeliverySigned: deliverySigs.some(
            (event) => event.user.toLowerCase() === driver,
          ),
          senderPickupSigned: true,
          driverPickupSigned: true,
          roleConflict: roleConflict.hasConflict,
          roleConflictReason: roleConflict.message,
        };
      }
    } catch (error) {
      logger.warn('[loadP2PSignatureState] EmitSig query failed:', error);
    }

    return {
      buyerSigned: false,
      driverDeliverySigned: false,
      roleConflict: roleConflict.hasConflict,
      roleConflictReason: roleConflict.message,
    };
  } catch (error) {
    logger.warn(
      '[loadP2PSignatureState] Failed to load signature state:',
      error,
    );
    return { buyerSigned: false, driverDeliverySigned: false };
  }
}
