type OrderTupleLike = Record<string, unknown> & {
  [index: number]: unknown;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ORDER_INDEX = {
  price: 4,
  txFee: 5,
  buyer: 6,
  seller: 7,
  locationData: 10,
  isSellerInitiated: 13,
} as const;

const LOCATION_INDEX = {
  startLocation: 0,
  startName: 2,
} as const;

const START_LOCATION_INDEX = {
  lat: 0,
  lng: 1,
} as const;

export function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeAddress(value: unknown): string {
  return normalizeText(value);
}

export function isZeroAddress(value?: string | null): boolean {
  return !value || value.toLowerCase() === ZERO_ADDRESS;
}

function readOrderField(order: unknown, key: string, index: number): unknown {
  const tuple = (order || {}) as OrderTupleLike;
  const named = tuple[key];
  if (named !== undefined && named !== null && normalizeText(named) !== '') {
    return named;
  }
  return tuple[index];
}

function readLocationField(
  locationData: unknown,
  key: string,
  index: number,
): unknown {
  const tuple = (locationData || {}) as OrderTupleLike;
  const named = tuple[key];
  if (named !== undefined && named !== null && normalizeText(named) !== '') {
    return named;
  }
  return tuple[index];
}

export function extractOrderParticipants(order: unknown): {
  buyer: string;
  seller: string;
} {
  return {
    buyer: normalizeAddress(readOrderField(order, 'buyer', ORDER_INDEX.buyer)),
    seller: normalizeAddress(
      readOrderField(order, 'seller', ORDER_INDEX.seller),
    ),
  };
}

export function extractOrderIsSellerInitiated(order: unknown): boolean {
  const value = readOrderField(
    order,
    'isSellerInitiated',
    ORDER_INDEX.isSellerInitiated,
  );
  return Boolean(value);
}

export function extractOrderBigInt(
  order: unknown,
  key: 'price' | 'txFee',
): bigint {
  const index = ORDER_INDEX[key];
  const value = readOrderField(order, key, index);
  try {
    return BigInt(String(value ?? '0'));
  } catch {
    return 0n;
  }
}

export function extractOrderPickupMetadata(order: unknown): {
  startLat: string;
  startLng: string;
  startName: string;
} {
  const locationData = readOrderField(
    order,
    'locationData',
    ORDER_INDEX.locationData,
  );

  const startLocation = readLocationField(
    locationData,
    'startLocation',
    LOCATION_INDEX.startLocation,
  );

  const startLat = normalizeText(
    readLocationField(startLocation, 'lat', START_LOCATION_INDEX.lat),
  );
  const startLng = normalizeText(
    readLocationField(startLocation, 'lng', START_LOCATION_INDEX.lng),
  );
  const startName = normalizeText(
    readLocationField(locationData, 'startName', LOCATION_INDEX.startName),
  );

  return {
    startLat,
    startLng,
    startName,
  };
}
