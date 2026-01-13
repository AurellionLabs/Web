// Auto-generated from DiamondCutFacet.sol - DO NOT EDIT
// Generated at: 2026-01-13T22:55:31.501Z

export const DiamondCutFacetABI = [
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'enum IDiamondCut.FacetCutAction',
            name: 'action',
            type: 'uint8',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
        ],
        indexed: false,
        internalType: 'struct IDiamondCut.FacetCut[]',
        name: '_diamondCut',
        type: 'tuple[]',
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_init',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: '_calldata',
        type: 'bytes',
      },
    ],
    name: 'DiamondCut',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'facetAddress',
            type: 'address',
          },
          {
            internalType: 'enum IDiamondCut.FacetCutAction',
            name: 'action',
            type: 'uint8',
          },
          {
            internalType: 'bytes4[]',
            name: 'functionSelectors',
            type: 'bytes4[]',
          },
        ],
        internalType: 'struct IDiamondCut.FacetCut[]',
        name: '_diamondCut',
        type: 'tuple[]',
      },
      {
        internalType: 'address',
        name: '_init',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_calldata',
        type: 'bytes',
      },
    ],
    name: 'diamondCut',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const DiamondCutFacetEvents = [
  {
    name: 'DiamondCut',
    signature: 'DiamondCut(tuple[],address,bytes)',
    signatureHash: '0xe785b7d4',
  },
] as const;
