// Auto-generated from AuSysFacet.sol - DO NOT EDIT
// Generated at: 2026-04-17T23:44:28.742Z

export const AuSysFacetABI = [
  {
    inputs: [],
    name: 'AlreadySettled',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ArrayLimitExceeded',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CallerMustBeBuyer',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CallerMustBeSeller',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CannotAcceptOwnOffer',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ContractPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'DriverMaxAssignment',
    type: 'error',
  },
  {
    inputs: [],
    name: 'DriverNotSigned',
    type: 'error',
  },
  {
    inputs: [],
    name: 'DuplicateJourneyRoleAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ExceedsNodeSellableAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'FeeBpsTooHigh',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidCaller',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidETA',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidJourneyRoute',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidNode',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidOrderStatus',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'JourneyAlreadyAssigned',
    type: 'error',
  },
  {
    inputs: [],
    name: 'JourneyIncomplete',
    type: 'error',
  },
  {
    inputs: [],
    name: 'JourneyNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'JourneyNotInProgress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'JourneyNotPending',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoPendingDestination',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NodeRequired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NonceAlreadyUsed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotJourneyParticipant',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotNodeOwner',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotTargetCounterparty',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NothingToClaim',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferExpired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferNotOpen',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OnlyCreatorCanCancel',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OrderNotFound',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PayTokenNotSet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'QuantityExceedsRequested',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReceiverNotSigned',
    type: 'error',
  },
  {
    inputs: [],
    name: 'RecoveryTooEarly',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    inputs: [],
    name: 'RewardAlreadyPaid',
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
    name: 'SenderNotSigned',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SignatureExpired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'TrustedSignerNotSet',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'AuSysAdminRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'AuSysAdminSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint8',
        name: 'newStatus',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'journeyStart',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'journeyEnd',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'AuSysJourneyStatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
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
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenQuantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'txFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'currentStatus',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'nodes',
        type: 'address[]',
      },
    ],
    name: 'AuSysOrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'AuSysOrderSettled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'newStatus',
        type: 'uint8',
      },
    ],
    name: 'AuSysOrderStatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'DriverAssigned',
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
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'EmitSig',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'FundsEscrowed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'FundsRefunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'refundedAmount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'JourneyCanceled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLat',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endLng',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'startName',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'endName',
        type: 'string',
      },
    ],
    name: 'JourneyCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'oldBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'newBps',
        type: 'uint16',
      },
    ],
    name: 'NodeFeeBpsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'node',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'NodeFeeDistributed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oldQuantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newQuantity',
        type: 'uint256',
      },
    ],
    name: 'OrderQuantityCorrected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'acceptor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isSellerInitiated',
        type: 'bool',
      },
    ],
    name: 'P2POfferAccepted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
    ],
    name: 'P2POfferCanceled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isSellerInitiated',
        type: 'bool',
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
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenQuantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'targetCounterparty',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiresAt',
        type: 'uint256',
      },
    ],
    name: 'P2POfferCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'SellerPaid',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'buyer',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
    ],
    name: 'TokenDestinationPending',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'nodeId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'burned',
        type: 'bool',
      },
    ],
    name: 'TokenDestinationSelected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TreasuryFeeAccrued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'oldBps',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'newBps',
        type: 'uint16',
      },
    ],
    name: 'TreasuryFeeBpsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TreasuryFeeClaimed',
    type: 'event',
  },
  {
    inputs: [],
    name: 'ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DISPATCHER_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DRIVER_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_DRIVER_JOURNEYS',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_JOURNEYS_PER_ORDER',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_NODES_PER_ORDER',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'acceptP2POffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'pickupNodeRef',
        type: 'bytes32',
      },
    ],
    name: 'acceptP2POfferWithPickupNode',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    name: 'assignDriverToJourney',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    name: 'cancelP2POffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'id',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenQuantity',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'price',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'txFee',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'buyer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'seller',
            type: 'address',
          },
          {
            internalType: 'bytes32[]',
            name: 'journeyIds',
            type: 'bytes32[]',
          },
          {
            internalType: 'address[]',
            name: 'nodes',
            type: 'address[]',
          },
          {
            components: [
              {
                components: [
                  {
                    internalType: 'string',
                    name: 'lat',
                    type: 'string',
                  },
                  {
                    internalType: 'string',
                    name: 'lng',
                    type: 'string',
                  },
                ],
                internalType: 'struct DiamondStorage.Location',
                name: 'startLocation',
                type: 'tuple',
              },
              {
                components: [
                  {
                    internalType: 'string',
                    name: 'lat',
                    type: 'string',
                  },
                  {
                    internalType: 'string',
                    name: 'lng',
                    type: 'string',
                  },
                ],
                internalType: 'struct DiamondStorage.Location',
                name: 'endLocation',
                type: 'tuple',
              },
              {
                internalType: 'string',
                name: 'startName',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'endName',
                type: 'string',
              },
            ],
            internalType: 'struct DiamondStorage.ParcelData',
            name: 'locationData',
            type: 'tuple',
          },
          {
            internalType: 'uint8',
            name: 'currentStatus',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'contractualAgreement',
            type: 'bytes32',
          },
          {
            internalType: 'bool',
            name: 'isSellerInitiated',
            type: 'bool',
          },
          {
            internalType: 'address',
            name: 'targetCounterparty',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'expiresAt',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'snapshotTreasuryBps',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'snapshotNodeBps',
            type: 'uint16',
          },
          {
            internalType: 'bytes32',
            name: 'sellerNode',
            type: 'bytes32',
          },
        ],
        internalType: 'struct DiamondStorage.AuSysOrder',
        name: 'order',
        type: 'tuple',
      },
    ],
    name: 'createAuSysOrder',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'string',
                name: 'lat',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'lng',
                type: 'string',
              },
            ],
            internalType: 'struct DiamondStorage.Location',
            name: 'startLocation',
            type: 'tuple',
          },
          {
            components: [
              {
                internalType: 'string',
                name: 'lat',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'lng',
                type: 'string',
              },
            ],
            internalType: 'struct DiamondStorage.Location',
            name: 'endLocation',
            type: 'tuple',
          },
          {
            internalType: 'string',
            name: 'startName',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'endName',
            type: 'string',
          },
        ],
        internalType: 'struct DiamondStorage.ParcelData',
        name: '_data',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
    ],
    name: 'createJourney',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'string',
                name: 'lat',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'lng',
                type: 'string',
              },
            ],
            internalType: 'struct DiamondStorage.Location',
            name: 'startLocation',
            type: 'tuple',
          },
          {
            components: [
              {
                internalType: 'string',
                name: 'lat',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'lng',
                type: 'string',
              },
            ],
            internalType: 'struct DiamondStorage.Location',
            name: 'endLocation',
            type: 'tuple',
          },
          {
            internalType: 'string',
            name: 'startName',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'endName',
            type: 'string',
          },
        ],
        internalType: 'struct DiamondStorage.ParcelData',
        name: '_data',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'bounty',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'ETA',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'tokenQuantity',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'assetId',
        type: 'uint256',
      },
    ],
    name: 'createOrderJourney',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'handOff',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'handOn',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'packageSign',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'maxIterations',
        type: 'uint256',
      },
    ],
    name: 'pruneExpiredOffers',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'nodeId',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: 'burn',
        type: 'bool',
      },
    ],
    name: 'selectTokenDestination',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const AuSysFacetEvents = [
  {
    name: 'AuSysAdminRevoked',
    signature: 'AuSysAdminRevoked(address)',
    signatureHash: '0xd66a521a',
  },
  {
    name: 'AuSysAdminSet',
    signature: 'AuSysAdminSet(address)',
    signatureHash: '0x4762a0c8',
  },
  {
    name: 'AuSysJourneyStatusUpdated',
    signature:
      'AuSysJourneyStatusUpdated(bytes32,uint8,address,address,address,uint256,uint256,uint256,uint256,string,string,string,string,string,string)',
    signatureHash: '0x3ad95bcd',
  },
  {
    name: 'AuSysOrderCreated',
    signature:
      'AuSysOrderCreated(bytes32,address,address,address,uint256,uint256,uint256,uint256,uint8,address[])',
    signatureHash: '0xda4150a1',
  },
  {
    name: 'AuSysOrderSettled',
    signature: 'AuSysOrderSettled(bytes32)',
    signatureHash: '0xf29c25eb',
  },
  {
    name: 'AuSysOrderStatusUpdated',
    signature: 'AuSysOrderStatusUpdated(bytes32,uint8)',
    signatureHash: '0x4892b23d',
  },
  {
    name: 'DriverAssigned',
    signature:
      'DriverAssigned(bytes32,address,address,address,uint256,uint256,string,string,string,string,string,string)',
    signatureHash: '0x038b3745',
  },
  {
    name: 'EmitSig',
    signature: 'EmitSig(address,bytes32)',
    signatureHash: '0x49d0f794',
  },
  {
    name: 'FundsEscrowed',
    signature: 'FundsEscrowed(address,uint256)',
    signatureHash: '0x4fbba82c',
  },
  {
    name: 'FundsRefunded',
    signature: 'FundsRefunded(address,uint256)',
    signatureHash: '0xbada1a1b',
  },
  {
    name: 'JourneyCanceled',
    signature:
      'JourneyCanceled(bytes32,address,address,address,uint256,uint256,string,string,string,string,string,string)',
    signatureHash: '0x08a09942',
  },
  {
    name: 'JourneyCreated',
    signature:
      'JourneyCreated(bytes32,address,address,address,uint256,uint256,bytes32,string,string,string,string,string,string)',
    signatureHash: '0x5508139b',
  },
  {
    name: 'NodeFeeBpsUpdated',
    signature: 'NodeFeeBpsUpdated(uint16,uint16)',
    signatureHash: '0x3944e88e',
  },
  {
    name: 'NodeFeeDistributed',
    signature: 'NodeFeeDistributed(address,uint256)',
    signatureHash: '0x03dec068',
  },
  {
    name: 'OrderQuantityCorrected',
    signature: 'OrderQuantityCorrected(bytes32,uint256,uint256)',
    signatureHash: '0x454c9f3d',
  },
  {
    name: 'P2POfferAccepted',
    signature: 'P2POfferAccepted(bytes32,address,bool)',
    signatureHash: '0x53038a93',
  },
  {
    name: 'P2POfferCanceled',
    signature: 'P2POfferCanceled(bytes32,address)',
    signatureHash: '0x7abcf385',
  },
  {
    name: 'P2POfferCreated',
    signature:
      'P2POfferCreated(bytes32,address,bool,address,uint256,uint256,uint256,address,uint256)',
    signatureHash: '0x4c52c233',
  },
  {
    name: 'SellerPaid',
    signature: 'SellerPaid(address,uint256)',
    signatureHash: '0xcb4a9094',
  },
  {
    name: 'TokenDestinationPending',
    signature: 'TokenDestinationPending(bytes32,address,uint256,uint256)',
    signatureHash: '0x390f5c7f',
  },
  {
    name: 'TokenDestinationSelected',
    signature: 'TokenDestinationSelected(bytes32,address,bytes32,bool)',
    signatureHash: '0xd695fe01',
  },
  {
    name: 'TreasuryFeeAccrued',
    signature: 'TreasuryFeeAccrued(bytes32,uint256)',
    signatureHash: '0x6c06b95c',
  },
  {
    name: 'TreasuryFeeBpsUpdated',
    signature: 'TreasuryFeeBpsUpdated(uint16,uint16)',
    signatureHash: '0x78f1229d',
  },
  {
    name: 'TreasuryFeeClaimed',
    signature: 'TreasuryFeeClaimed(address,uint256)',
    signatureHash: '0xda24974c',
  },
] as const;
