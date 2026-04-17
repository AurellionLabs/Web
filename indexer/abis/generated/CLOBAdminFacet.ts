// Auto-generated from CLOBAdminFacet.sol - DO NOT EDIT
// Generated at: 2026-04-17T23:44:28.741Z

export const CLOBAdminFacetABI = [
  {
    inputs: [],
    name: 'AlreadyPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EmergencyActionAlreadyExecuted',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EmergencyActionCancelledError',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EmergencyActionNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EmergencyTimelockNotPassed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidConfiguration',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidFeeConfiguration',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MarketNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotOwner',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'SafeERC20FailedOperation',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroAddress',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'priceChangeThreshold',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'cooldownPeriod',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isEnabled',
        type: 'bool',
      },
    ],
    name: 'CircuitBreakerConfigured',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'resetAt',
        type: 'uint256',
      },
    ],
    name: 'CircuitBreakerReset',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'triggerPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'previousPrice',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'changePercent',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'cooldownUntil',
        type: 'uint256',
      },
    ],
    name: 'CircuitBreakerTripped',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'canceller',
        type: 'address',
      },
    ],
    name: 'EmergencyActionCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'EmergencyActionExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'initiator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executeAfter',
        type: 'uint256',
      },
    ],
    name: 'EmergencyActionInitiated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'EmergencyWithdrawal',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'oldRecipient',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newRecipient',
        type: 'address',
      },
    ],
    name: 'FeeRecipientUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'takerFeeBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'makerFeeBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'lpFeeBps',
        type: 'uint16',
      },
    ],
    name: 'FeesUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bool',
        name: 'paused',
        type: 'bool',
      },
    ],
    name: 'GlobalPause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint8',
        name: 'minRevealDelay',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'commitmentThreshold',
        type: 'uint256',
      },
    ],
    name: 'MEVProtectionUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'MarketPaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'MarketUnpaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxOrdersPerBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxVolumePerBlock',
        type: 'uint256',
      },
    ],
    name: 'RateLimitsUpdated',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
    ],
    name: 'cancelEmergencyRecovery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'priceChangeThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'cooldownPeriod',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'isEnabled',
        type: 'bool',
      },
    ],
    name: 'configureCircuitBreaker',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'orderIds',
        type: 'bytes32[]',
      },
    ],
    name: 'emergencyUserWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
    ],
    name: 'executeEmergencyRecovery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'getCircuitBreaker',
    outputs: [
      {
        internalType: 'uint256',
        name: 'lastPrice',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'priceChangeThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'cooldownPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'tripTimestamp',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'isTripped',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'isEnabled',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
    ],
    name: 'getEmergencyAction',
    outputs: [
      {
        internalType: 'address',
        name: 'initiator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'initiatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'executeAfter',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'executed',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'cancelled',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getFeeConfig',
    outputs: [
      {
        internalType: 'uint16',
        name: 'takerFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'uint16',
        name: 'makerFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'uint16',
        name: 'lpFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'address',
        name: 'feeRecipient',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMEVConfig',
    outputs: [
      {
        internalType: 'uint8',
        name: 'minRevealDelay',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'commitmentThreshold',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRateLimitConfig',
    outputs: [
      {
        internalType: 'uint256',
        name: 'maxOrdersPerBlock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxVolumePerBlock',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'initiateEmergencyRecovery',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'actionId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPaused',
    outputs: [
      {
        internalType: 'bool',
        name: 'paused',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'pauseStartTime',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'pauseMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'resetCircuitBreaker',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'priceChangeThreshold',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'cooldownPeriod',
        type: 'uint256',
      },
    ],
    name: 'setDefaultCircuitBreakerParams',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
    ],
    name: 'setEmergencyTimelock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newRecipient',
        type: 'address',
      },
    ],
    name: 'setFeeRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'takerFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'uint16',
        name: 'makerFeeBps',
        type: 'uint16',
      },
      {
        internalType: 'uint16',
        name: 'lpFeeBps',
        type: 'uint16',
      },
    ],
    name: 'setFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: 'minRevealDelay',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'commitmentThreshold',
        type: 'uint256',
      },
    ],
    name: 'setMEVProtection',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'maxOrdersPerBlock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxVolumePerBlock',
        type: 'uint256',
      },
    ],
    name: 'setRateLimits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'tripCircuitBreaker',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'marketId',
        type: 'bytes32',
      },
    ],
    name: 'unpauseMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const CLOBAdminFacetEvents = [
  {
    name: 'CircuitBreakerConfigured',
    signature: 'CircuitBreakerConfigured(bytes32,uint256,uint256,bool)',
    signatureHash: '0x58807e46',
  },
  {
    name: 'CircuitBreakerReset',
    signature: 'CircuitBreakerReset(bytes32,uint256)',
    signatureHash: '0xbae506d4',
  },
  {
    name: 'CircuitBreakerTripped',
    signature: 'CircuitBreakerTripped(bytes32,uint256,uint256,uint256,uint256)',
    signatureHash: '0x5953204a',
  },
  {
    name: 'EmergencyActionCancelled',
    signature: 'EmergencyActionCancelled(bytes32,address)',
    signatureHash: '0x248b189e',
  },
  {
    name: 'EmergencyActionExecuted',
    signature:
      'EmergencyActionExecuted(bytes32,address,address,address,uint256)',
    signatureHash: '0x4579d7c5',
  },
  {
    name: 'EmergencyActionInitiated',
    signature:
      'EmergencyActionInitiated(bytes32,address,address,address,uint256,uint256)',
    signatureHash: '0xca04aa1e',
  },
  {
    name: 'EmergencyWithdrawal',
    signature: 'EmergencyWithdrawal(address,bytes32,address,uint256)',
    signatureHash: '0xc0f6eecd',
  },
  {
    name: 'FeeRecipientUpdated',
    signature: 'FeeRecipientUpdated(address,address)',
    signatureHash: '0xaaebcf1b',
  },
  {
    name: 'FeesUpdated',
    signature: 'FeesUpdated(uint16,uint16,uint16)',
    signatureHash: '0xb3ef341b',
  },
  {
    name: 'GlobalPause',
    signature: 'GlobalPause(bool)',
    signatureHash: '0xa5fea31b',
  },
  {
    name: 'MEVProtectionUpdated',
    signature: 'MEVProtectionUpdated(uint8,uint256)',
    signatureHash: '0x096cc317',
  },
  {
    name: 'MarketPaused',
    signature: 'MarketPaused(bytes32)',
    signatureHash: '0x613681e6',
  },
  {
    name: 'MarketUnpaused',
    signature: 'MarketUnpaused(bytes32)',
    signatureHash: '0xb51d033f',
  },
  {
    name: 'RateLimitsUpdated',
    signature: 'RateLimitsUpdated(uint256,uint256)',
    signatureHash: '0x6675ea6c',
  },
] as const;
