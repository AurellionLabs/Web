export type JourneyRoleConflictType =
  | 'sender_receiver'
  | 'driver_sender'
  | 'driver_receiver';

export interface JourneyRoleConflict {
  hasConflict: boolean;
  type?: JourneyRoleConflictType;
  message?: string;
}

export const DUPLICATE_JOURNEY_ROLE_SELECTOR = '0x89e4b4ad';
export const DUPLICATE_JOURNEY_ROLE_ERROR_NAME = 'DuplicateJourneyRoleAddress';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function normalize(address?: string | null): string {
  return String(address || '')
    .trim()
    .toLowerCase();
}

function isUsableAddress(address?: string | null): boolean {
  const value = normalize(address);
  return value.length > 0 && value !== ZERO_ADDRESS;
}

function roleConflictMessage(type: JourneyRoleConflictType): string {
  if (type === 'sender_receiver') {
    return 'Sender and customer must use different wallet addresses.';
  }
  if (type === 'driver_sender') {
    return 'Driver wallet cannot be the same as the sender wallet.';
  }
  return 'Driver wallet cannot be the same as the customer wallet.';
}

export function detectJourneyRoleConflict(
  sender?: string | null,
  receiver?: string | null,
  driver?: string | null,
): JourneyRoleConflict {
  const s = normalize(sender);
  const r = normalize(receiver);
  const d = normalize(driver);

  if (isUsableAddress(s) && isUsableAddress(r) && s === r) {
    return {
      hasConflict: true,
      type: 'sender_receiver',
      message: roleConflictMessage('sender_receiver'),
    };
  }

  if (isUsableAddress(d) && isUsableAddress(s) && d === s) {
    return {
      hasConflict: true,
      type: 'driver_sender',
      message: roleConflictMessage('driver_sender'),
    };
  }

  if (isUsableAddress(d) && isUsableAddress(r) && d === r) {
    return {
      hasConflict: true,
      type: 'driver_receiver',
      message: roleConflictMessage('driver_receiver'),
    };
  }

  return { hasConflict: false };
}

function hasSelector(value: unknown, selector: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(selector);
}

export function isDuplicateJourneyRoleAddressError(error: unknown): boolean {
  const selector = DUPLICATE_JOURNEY_ROLE_SELECTOR.toLowerCase();
  const errorName = DUPLICATE_JOURNEY_ROLE_ERROR_NAME.toLowerCase();

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (hasSelector(err.data, selector)) return true;
    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase();
      if (msg.includes(selector) || msg.includes(errorName)) return true;
    }

    if (err.error && typeof err.error === 'object') {
      const inner = err.error as Record<string, unknown>;
      if (hasSelector(inner.data, selector)) return true;
      if (typeof inner.message === 'string') {
        const msg = inner.message.toLowerCase();
        if (msg.includes(selector) || msg.includes(errorName)) return true;
      }
    }
  }

  return false;
}

function extractErrorMessages(error: unknown): string[] {
  const messages: string[] = [];

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') {
      messages.push(err.message);
    }
    if (typeof err.data === 'string') {
      messages.push(err.data);
    }

    if (err.error && typeof err.error === 'object') {
      const inner = err.error as Record<string, unknown>;
      if (typeof inner.message === 'string') {
        messages.push(inner.message);
      }
      if (typeof inner.data === 'string') {
        messages.push(inner.data);
      }
    }
  }

  if (messages.length === 0 && typeof error === 'string') {
    messages.push(error);
  }

  return messages;
}

function parseConflictTypeFromMessage(
  message: string,
): JourneyRoleConflictType | null {
  const value = message.toLowerCase();

  if (
    value.includes('sender_receiver') ||
    value.includes('sender and customer must use different wallet addresses')
  ) {
    return 'sender_receiver';
  }

  if (
    value.includes('driver_sender') ||
    value.includes('driver wallet cannot be the same as the sender wallet')
  ) {
    return 'driver_sender';
  }

  if (
    value.includes('driver_receiver') ||
    value.includes('driver wallet cannot be the same as the customer wallet')
  ) {
    return 'driver_receiver';
  }

  return null;
}

function toActionableConflictMessage(type: JourneyRoleConflictType): string {
  if (type === 'sender_receiver') {
    return (
      'Role mismatch: sender and customer wallets are the same. ' +
      'Use different wallets for sender and customer, then retry.'
    );
  }

  if (type === 'driver_sender') {
    return (
      'Role mismatch: driver and sender wallets are the same. ' +
      'Assign a different driver wallet, then retry.'
    );
  }

  if (type === 'driver_receiver') {
    return (
      'Role mismatch: driver and customer wallets are the same. ' +
      'Assign a different driver wallet, then retry.'
    );
  }

  return (
    'Role mismatch: sender, driver, and customer must all use different ' +
    'wallet addresses. Switch one role to a different wallet and retry.'
  );
}

export function getJourneyRoleConflictMessage(error: unknown): string | null {
  const messages = extractErrorMessages(error);

  for (const message of messages) {
    const type = parseConflictTypeFromMessage(message);
    if (type) {
      return toActionableConflictMessage(type);
    }
  }

  const hasGenericRoleConflictText = messages.some((message) =>
    message.toLowerCase().includes('must use different wallet addresses'),
  );

  if (hasGenericRoleConflictText || isDuplicateJourneyRoleAddressError(error)) {
    return (
      'Role mismatch: sender, driver, and customer must all use different ' +
      'wallet addresses. Switch one role to a different wallet and retry.'
    );
  }

  return null;
}
