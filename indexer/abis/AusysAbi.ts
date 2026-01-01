// AuSys Contract ABI - Events for indexing
export const AusysAbi = [
  // JourneyCreated event
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
    ],
    name: 'JourneyCreated',
    type: 'event',
  },
  // JourneyStatusUpdated event
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
        indexed: false,
        internalType: 'uint8',
        name: 'newStatus',
        type: 'uint8',
      },
    ],
    name: 'JourneyStatusUpdated',
    type: 'event',
  },
  // JourneyCanceled event
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
        internalType: 'uint256',
        name: 'refundedAmount',
        type: 'uint256',
      },
    ],
    name: 'JourneyCanceled',
    type: 'event',
  },
  // OrderCreated event
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
        name: 'requestedTokenQuantity',
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
      {
        indexed: false,
        internalType: 'tuple',
        name: 'locationData',
        type: 'tuple',
        components: [
          {
            internalType: 'tuple',
            name: 'startLocation',
            type: 'tuple',
            components: [
              { internalType: 'string', name: 'lat', type: 'string' },
              { internalType: 'string', name: 'lng', type: 'string' },
            ],
          },
          {
            internalType: 'tuple',
            name: 'endLocation',
            type: 'tuple',
            components: [
              { internalType: 'string', name: 'lat', type: 'string' },
              { internalType: 'string', name: 'lng', type: 'string' },
            ],
          },
          { internalType: 'string', name: 'startName', type: 'string' },
          { internalType: 'string', name: 'endName', type: 'string' },
        ],
      },
    ],
    name: 'OrderCreated',
    type: 'event',
  },
  // OrderStatusUpdated event
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
    name: 'OrderStatusUpdated',
    type: 'event',
  },
  // OrderSettled event
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
    name: 'OrderSettled',
    type: 'event',
  },
  // DriverAssigned event
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'driver',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'journeyId',
        type: 'bytes32',
      },
    ],
    name: 'DriverAssigned',
    type: 'event',
  },
  // emitSig (PackageSignature) event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'id', type: 'bytes32' },
    ],
    name: 'emitSig',
    type: 'event',
  },
  // FundsEscrowed event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
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
  // FundsRefunded event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
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
  // SellerPaid event
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
  // NodeFeeDistributed event
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'node', type: 'address' },
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
  // AdminSet event
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
    name: 'AdminSet',
    type: 'event',
  },
  // Read functions for contract calls
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'getjourney',
    outputs: [
      {
        components: [
          {
            components: [
              {
                components: [
                  { internalType: 'string', name: 'lat', type: 'string' },
                  { internalType: 'string', name: 'lng', type: 'string' },
                ],
                internalType: 'struct Ausys.Location',
                name: 'startLocation',
                type: 'tuple',
              },
              {
                components: [
                  { internalType: 'string', name: 'lat', type: 'string' },
                  { internalType: 'string', name: 'lng', type: 'string' },
                ],
                internalType: 'struct Ausys.Location',
                name: 'endLocation',
                type: 'tuple',
              },
              { internalType: 'string', name: 'startName', type: 'string' },
              { internalType: 'string', name: 'endName', type: 'string' },
            ],
            internalType: 'struct Ausys.ParcelData',
            name: 'parcelData',
            type: 'tuple',
          },
          { internalType: 'bytes32', name: 'journeyId', type: 'bytes32' },
          { internalType: 'uint8', name: 'currentStatus', type: 'uint8' },
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'receiver', type: 'address' },
          { internalType: 'address', name: 'driver', type: 'address' },
          { internalType: 'uint256', name: 'journeyStart', type: 'uint256' },
          { internalType: 'uint256', name: 'journeyEnd', type: 'uint256' },
          { internalType: 'uint256', name: 'bounty', type: 'uint256' },
          { internalType: 'uint256', name: 'ETA', type: 'uint256' },
        ],
        internalType: 'struct Ausys.Journey',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'getOrder',
    outputs: [
      {
        components: [
          { internalType: 'bytes32', name: 'id', type: 'bytes32' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'tokenQuantity', type: 'uint256' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
          { internalType: 'uint256', name: 'txFee', type: 'uint256' },
          { internalType: 'address', name: 'buyer', type: 'address' },
          { internalType: 'address', name: 'seller', type: 'address' },
          { internalType: 'bytes32[]', name: 'journeyIds', type: 'bytes32[]' },
          { internalType: 'address[]', name: 'nodes', type: 'address[]' },
          {
            components: [
              {
                components: [
                  { internalType: 'string', name: 'lat', type: 'string' },
                  { internalType: 'string', name: 'lng', type: 'string' },
                ],
                internalType: 'struct Ausys.Location',
                name: 'startLocation',
                type: 'tuple',
              },
              {
                components: [
                  { internalType: 'string', name: 'lat', type: 'string' },
                  { internalType: 'string', name: 'lng', type: 'string' },
                ],
                internalType: 'struct Ausys.Location',
                name: 'endLocation',
                type: 'tuple',
              },
              { internalType: 'string', name: 'startName', type: 'string' },
              { internalType: 'string', name: 'endName', type: 'string' },
            ],
            internalType: 'struct Ausys.ParcelData',
            name: 'locationData',
            type: 'tuple',
          },
          { internalType: 'uint8', name: 'currentStatus', type: 'uint8' },
          {
            internalType: 'bytes32',
            name: 'contractualAgreement',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Ausys.Order',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'journeyToOrderId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
