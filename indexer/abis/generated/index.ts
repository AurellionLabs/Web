// Auto-generated Diamond ABI - DO NOT EDIT
// Generated at: 2026-01-19T23:20:26.136Z
// 
// This file combines ABIs from all facets with events deduplicated by signature hash.
// For per-facet ABIs, import from the individual files.

export { NodesFacetABI, NodesFacetEvents } from './NodesFacet';
export { CLOBFacetV2ABI, CLOBFacetV2Events } from './CLOBFacetV2';
export { OrderMatchingFacetABI, OrderMatchingFacetEvents } from './OrderMatchingFacet';
export { OrderRouterFacetABI, OrderRouterFacetEvents } from './OrderRouterFacet';
export { BridgeFacetABI, BridgeFacetEvents } from './BridgeFacet';
export { RWYStakingFacetABI, RWYStakingFacetEvents } from './RWYStakingFacet';
export { OperatorFacetABI, OperatorFacetEvents } from './OperatorFacet';
export { CLOBAdminFacetABI, CLOBAdminFacetEvents } from './CLOBAdminFacet';
export { DiamondCutFacetABI, DiamondCutFacetEvents } from './DiamondCutFacet';
export { OwnershipFacetABI, OwnershipFacetEvents } from './OwnershipFacet';

// Combined ABI for Diamond contract (deduplicated events)
export const DiamondABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "clobAddress",
        "type": "address"
      }
    ],
    "name": "ClobApprovalGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "clobAddress",
        "type": "address"
      }
    ],
    "name": "ClobApprovalRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "admin",
        "type": "address"
      }
    ],
    "name": "NodeAdminRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "admin",
        "type": "address"
      }
    ],
    "name": "NodeAdminSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "quantities",
        "type": "uint256[]"
      }
    ],
    "name": "NodeCapacityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      }
    ],
    "name": "NodeDeactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "nodeType",
        "type": "string"
      }
    ],
    "name": "NodeRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "name": "NodeSellOrderPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "nodeType",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "capacity",
        "type": "uint256"
      }
    ],
    "name": "NodeUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "capacity",
        "type": "uint256"
      }
    ],
    "name": "SupportedAssetAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "SupportedAssetsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "depositor",
        "type": "address"
      }
    ],
    "name": "TokensDepositedToNode",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "TokensMintedToNode",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "fromNode",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "toNode",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokensTransferredBetweenNodes",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "TokensWithdrawnFromNode",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "addressName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "lat",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "lng",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "UpdateLocation",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "UpdateOwner",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes1",
        "name": "status",
        "type": "bytes1"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "UpdateStatus",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remainingAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "reason",
        "type": "uint8"
      }
    ],
    "name": "CLOBOrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tradeId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fillAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fillPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remainingAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cumulativeFilled",
        "type": "uint256"
      }
    ],
    "name": "CLOBOrderFilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tradeId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "takerOrderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "makerOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "taker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quoteAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "takerFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "makerFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "takerIsBuy",
        "type": "bool"
      }
    ],
    "name": "CLOBTradeExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      }
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "orderType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      }
    ],
    "name": "OrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiredAt",
        "type": "uint256"
      }
    ],
    "name": "OrderExpired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "orderType",
        "type": "uint8"
      }
    ],
    "name": "OrderPlacedWithTokens",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tradeId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fillAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fillPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remainingAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cumulativeFilled",
        "type": "uint256"
      }
    ],
    "name": "AusysOrderFilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remainingAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "reason",
        "type": "uint8"
      }
    ],
    "name": "MatchingOrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tradeId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "takerOrderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "makerOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quoteAmount",
        "type": "uint256"
      }
    ],
    "name": "TradeExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "orderSource",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      }
    ],
    "name": "OrderRouted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remainingAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "reason",
        "type": "uint8"
      }
    ],
    "name": "RouterOrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "orderType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      }
    ],
    "name": "RouterOrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "orderType",
        "type": "uint8"
      }
    ],
    "name": "RouterOrderPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tradeId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "takerOrderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "makerOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quoteAmount",
        "type": "uint256"
      }
    ],
    "name": "RouterTradeExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BountyPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldRecipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newRecipient",
        "type": "address"
      }
    ],
    "name": "BridgeFeeRecipientUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "previousStatus",
        "type": "uint8"
      }
    ],
    "name": "BridgeOrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "journeyId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "phase",
        "type": "uint8"
      }
    ],
    "name": "JourneyStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "ausysOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32[]",
        "name": "journeyIds",
        "type": "bytes32[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bounty",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "node",
        "type": "address"
      }
    ],
    "name": "LogisticsOrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "sellerAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "driverAmount",
        "type": "uint256"
      }
    ],
    "name": "OrderSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "clobTradeId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "clobOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TradeMatched",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "clobOrderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "name": "UnifiedOrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "CollateralReturned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "staker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalStaked",
        "type": "uint256"
      }
    ],
    "name": "CommodityStaked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "staker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "CommodityUnstaked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "param",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldValue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newValue",
        "type": "uint256"
      }
    ],
    "name": "ConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deliveredAmount",
        "type": "uint256"
      }
    ],
    "name": "DeliveryConfirmed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "journeyId",
        "type": "bytes32"
      }
    ],
    "name": "DeliveryStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "OpportunityCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalProceeds",
        "type": "uint256"
      }
    ],
    "name": "OpportunityCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "inputToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "inputTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "targetAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "promisedYieldBps",
        "type": "uint256"
      }
    ],
    "name": "OpportunityCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalStaked",
        "type": "uint256"
      }
    ],
    "name": "OpportunityFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "outputAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "outputTokenId",
        "type": "uint256"
      }
    ],
    "name": "ProcessingCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      }
    ],
    "name": "ProcessingStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "staker",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stakedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "profitShare",
        "type": "uint256"
      }
    ],
    "name": "ProfitDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "proceeds",
        "type": "uint256"
      }
    ],
    "name": "SaleProceedsRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "OperatorApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldReputation",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newReputation",
        "type": "uint256"
      }
    ],
    "name": "OperatorReputationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "OperatorRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "collateralToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "collateralTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "OperatorSlashed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "successfulOps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalValueProcessed",
        "type": "uint256"
      }
    ],
    "name": "OperatorStatsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "priceChangeThreshold",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cooldownPeriod",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isEnabled",
        "type": "bool"
      }
    ],
    "name": "CircuitBreakerConfigured",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "resetAt",
        "type": "uint256"
      }
    ],
    "name": "CircuitBreakerReset",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "triggerPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "previousPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "changePercent",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cooldownUntil",
        "type": "uint256"
      }
    ],
    "name": "CircuitBreakerTripped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "canceller",
        "type": "address"
      }
    ],
    "name": "EmergencyActionCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "executor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "EmergencyActionExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "initiator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "executeAfter",
        "type": "uint256"
      }
    ],
    "name": "EmergencyActionInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "EmergencyWithdrawal",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldRecipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newRecipient",
        "type": "address"
      }
    ],
    "name": "FeeRecipientUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "takerFeeBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "makerFeeBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "lpFeeBps",
        "type": "uint16"
      }
    ],
    "name": "FeesUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "GlobalPause",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "minRevealDelay",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "commitmentThreshold",
        "type": "uint256"
      }
    ],
    "name": "MEVProtectionUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "MarketPaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "MarketUnpaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxOrdersPerBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxVolumePerBlock",
        "type": "uint256"
      }
    ],
    "name": "RateLimitsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "facetAddress",
            "type": "address"
          },
          {
            "internalType": "enum IDiamondCut.FacetCutAction",
            "name": "action",
            "type": "uint8"
          },
          {
            "internalType": "bytes4[]",
            "name": "functionSelectors",
            "type": "bytes4[]"
          }
        ],
        "indexed": false,
        "internalType": "struct IDiamondCut.FacetCut[]",
        "name": "_diamondCut",
        "type": "tuple[]"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "_init",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "_calldata",
        "type": "bytes"
      }
    ],
    "name": "DiamondCut",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_itemOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "assetClass",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string[]",
                "name": "values",
                "type": "string[]"
              },
              {
                "internalType": "string",
                "name": "description",
                "type": "string"
              }
            ],
            "internalType": "struct DiamondStorage.Attribute[]",
            "name": "attributes",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct DiamondStorage.AssetDefinition",
        "name": "_asset",
        "type": "tuple"
      },
      {
        "internalType": "string",
        "name": "_className",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "_data",
        "type": "bytes"
      }
    ],
    "name": "addNodeItem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_capacity",
        "type": "uint256"
      }
    ],
    "name": "addSupportedAsset",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "assetId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      }
    ],
    "name": "approveAusysForTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_clobAddress",
        "type": "address"
      }
    ],
    "name": "approveClobForTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "creditNodeTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      }
    ],
    "name": "deactivateNode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "debitNodeTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "depositTokensToNode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAuraAssetAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getClobAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      }
    ],
    "name": "getNode",
    "outputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "nodeType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "capacity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "validNode",
        "type": "bool"
      },
      {
        "internalType": "bytes32",
        "name": "assetHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "addressName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "lat",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "lng",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "getNodeAssets",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "capacity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct DiamondStorage.NodeAsset[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "getNodeInventory",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "tokenIds",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "balances",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "getNodeInventoryWithMetadata",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "capacity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct NodesFacet.AssetWithBalance[]",
        "name": "assets",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "getNodeSellableAssets",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "capacity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct NodesFacet.AssetWithBalance[]",
        "name": "assets",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_node",
        "type": "address"
      }
    ],
    "name": "getNodeStatus",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "",
        "type": "bytes1"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "getNodeTokenBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "getNodeTokenIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "getOwnerNodes",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "getTotalNodeAssets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalNodes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isClobApproved",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_admin",
        "type": "address"
      }
    ],
    "name": "isNodeAdmin",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_journeyId",
        "type": "bytes32"
      }
    ],
    "name": "nodeHandOn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_journeyId",
        "type": "bytes32"
      }
    ],
    "name": "nodeHandoff",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_journeyId",
        "type": "bytes32"
      }
    ],
    "name": "nodeSign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "placeSellOrderFromNode",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_quantityToReduce",
        "type": "uint256"
      }
    ],
    "name": "reduceCapacityForOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_nodeType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_capacity",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "_assetHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_addressName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_lat",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_lng",
        "type": "string"
      }
    ],
    "name": "registerNode",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "nodeHash",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      }
    ],
    "name": "revokeAusysApproval",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_clobAddress",
        "type": "address"
      }
    ],
    "name": "revokeClobApproval",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_admin",
        "type": "address"
      }
    ],
    "name": "revokeNodeAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_auraAsset",
        "type": "address"
      }
    ],
    "name": "setAuraAssetAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_clobAddress",
        "type": "address"
      }
    ],
    "name": "setClobAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_admin",
        "type": "address"
      }
    ],
    "name": "setNodeAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_fromNode",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_toNode",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "transferTokensBetweenNodes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_nodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_nodeType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_capacity",
        "type": "uint256"
      }
    ],
    "name": "updateNode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "_quantities",
        "type": "uint256[]"
      }
    ],
    "name": "updateNodeCapacity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_addressName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_lat",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_lng",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "updateNodeLocation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "updateNodeOwner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes1",
        "name": "_status",
        "type": "bytes1"
      },
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      }
    ],
    "name": "updateNodeStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "address[]",
        "name": "_tokens",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_tokenIds",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_prices",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_capacities",
        "type": "uint256[]"
      }
    ],
    "name": "updateSupportedAssets",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32[]",
        "name": "_nodeHashes",
        "type": "bytes32[]"
      }
    ],
    "name": "verifyTokenAccounting",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "diamondBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "sumNodeBalances",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isBalanced",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_node",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "withdrawTokensFromNode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BASIS_POINTS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "_takerFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "_makerFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "_defaultPriceChangeThreshold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_defaultCooldownPeriod",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_emergencyTimelock",
        "type": "uint256"
      }
    ],
    "name": "initializeCLOBV2",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC1155BatchReceived",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC1155Received",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "internalType": "uint40",
        "name": "expiry",
        "type": "uint40"
      }
    ],
    "name": "placeLimitOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "maxSlippageBps",
        "type": "uint256"
      }
    ],
    "name": "placeMarketOrder",
    "outputs": [
      {
        "internalType": "uint96",
        "name": "filledAmount",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "avgPrice",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "nodeOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      },
      {
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "internalType": "uint40",
        "name": "expiry",
        "type": "uint40"
      }
    ],
    "name": "placeNodeSellOrderV2",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "reason",
        "type": "uint8"
      }
    ],
    "name": "cancelOrderInternal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      }
    ],
    "name": "matchOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "orderIds",
        "type": "bytes32[]"
      }
    ],
    "name": "cancelOrders",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "getBestPrices",
    "outputs": [
      {
        "internalType": "uint96",
        "name": "bestBid",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "bestBidSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "bestAsk",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "bestAskSize",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "name": "getOrder",
    "outputs": [
      {
        "internalType": "address",
        "name": "maker",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      },
      {
        "internalType": "uint64",
        "name": "filledAmount",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "internalType": "uint40",
        "name": "expiry",
        "type": "uint40"
      },
      {
        "internalType": "uint40",
        "name": "createdAt",
        "type": "uint40"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      }
    ],
    "name": "placeBuyOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "nodeOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      },
      {
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "internalType": "uint40",
        "name": "expiry",
        "type": "uint40"
      }
    ],
    "name": "placeNodeSellOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "timeInForce",
        "type": "uint8"
      },
      {
        "internalType": "uint40",
        "name": "expiry",
        "type": "uint40"
      }
    ],
    "name": "placeOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "baseToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseTokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteToken",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "price",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "amount",
        "type": "uint96"
      }
    ],
    "name": "placeSellOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "orderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BOUNTY_PERCENTAGE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_FEE_PERCENTAGE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_unifiedOrderId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_clobTradeId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_ausysOrderId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_seller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "bridgeTradeToLogistics",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_unifiedOrderId",
        "type": "bytes32"
      }
    ],
    "name": "cancelUnifiedOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_unifiedOrderId",
        "type": "bytes32"
      }
    ],
    "name": "createLogisticsOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "journeyId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_clobOrderId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_sellerNode",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_quantity",
        "type": "uint256"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "string",
                "name": "lat",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "lng",
                "type": "string"
              }
            ],
            "internalType": "struct DiamondStorage.Location",
            "name": "startLocation",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "lat",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "lng",
                "type": "string"
              }
            ],
            "internalType": "struct DiamondStorage.Location",
            "name": "endLocation",
            "type": "tuple"
          },
          {
            "internalType": "string",
            "name": "startName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "endName",
            "type": "string"
          }
        ],
        "internalType": "struct DiamondStorage.ParcelData",
        "name": "_deliveryData",
        "type": "tuple"
      }
    ],
    "name": "createUnifiedOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "unifiedOrderId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeRecipient",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      }
    ],
    "name": "getBuyerOrders",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      }
    ],
    "name": "getSellerOrders",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalUnifiedOrders",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_orderId",
        "type": "bytes32"
      }
    ],
    "name": "getUnifiedOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "clobOrderId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "clobTradeId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "ausysOrderId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "sellerNode",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokenQuantity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bounty",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "status",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "logisticsStatus",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "matchedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deliveredAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "settledAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "clobOrderId",
        "type": "bytes32"
      }
    ],
    "name": "getUnifiedOrderFromClobOrder",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "clobTradeId",
        "type": "bytes32"
      }
    ],
    "name": "getUnifiedOrderFromClobTrade",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_percentage",
        "type": "uint256"
      }
    ],
    "name": "setBountyPercentage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_newRecipient",
        "type": "address"
      }
    ],
    "name": "setFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_percentage",
        "type": "uint256"
      }
    ],
    "name": "setProtocolFeePercentage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_unifiedOrderId",
        "type": "bytes32"
      }
    ],
    "name": "settleOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_ausys",
        "type": "address"
      }
    ],
    "name": "updateAusysAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_clob",
        "type": "address"
      }
    ],
    "name": "updateClobAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_journeyId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_phase",
        "type": "uint8"
      }
    ],
    "name": "updateJourneyStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "stakeAmount",
        "type": "uint256"
      }
    ],
    "name": "calculateExpectedProfit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "cancelOpportunity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      }
    ],
    "name": "claimProfits",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "outputTokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualOutputAmount",
        "type": "uint256"
      }
    ],
    "name": "completeProcessing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "deliveredAmount",
        "type": "uint256"
      }
    ],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "inputToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "inputTokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "targetAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "outputToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expectedOutputAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "promisedYieldBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "operatorFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSalePrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fundingDays",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "processingDays",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "collateralToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "collateralTokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "collateralAmount",
        "type": "uint256"
      }
    ],
    "name": "createOpportunity",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      }
    ],
    "name": "emergencyClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "forceCancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllOpportunities",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      }
    ],
    "name": "getOpportunity",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "id",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "operator",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "inputToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "inputTokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "targetAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stakedAmount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "outputToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "outputTokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expectedOutputAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "promisedYieldBps",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "operatorFeeBps",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minSalePrice",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "fundingDeadline",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "processingDeadline",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "fundedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "completedAt",
            "type": "uint256"
          },
          {
            "internalType": "enum RWYStorage.OpportunityStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct RWYStorage.CollateralInfo",
            "name": "collateral",
            "type": "tuple"
          }
        ],
        "internalType": "struct RWYStorage.Opportunity",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOpportunityCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      }
    ],
    "name": "getOpportunityStakers",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRWYCLOBAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRWYConfig",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRWYFeeRecipient",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRWYQuoteToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "staker",
        "type": "address"
      }
    ],
    "name": "getRWYStake",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stakedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "claimed",
            "type": "bool"
          }
        ],
        "internalType": "struct RWYStorage.RWYStake",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      }
    ],
    "name": "getSaleProceeds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "proceeds",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "finalized",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "initializeRWYStaking",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isRWYPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pauseRWY",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "proceeds",
        "type": "uint256"
      }
    ],
    "name": "recordSaleProceeds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "days_",
        "type": "uint256"
      }
    ],
    "name": "setDefaultProcessingDays",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "bps",
        "type": "uint256"
      }
    ],
    "name": "setMaxYieldBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "bps",
        "type": "uint256"
      }
    ],
    "name": "setMinCollateralBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "bps",
        "type": "uint256"
      }
    ],
    "name": "setProtocolFeeBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_clob",
        "type": "address"
      }
    ],
    "name": "setRWYCLOBAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_feeRecipient",
        "type": "address"
      }
    ],
    "name": "setRWYFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_quoteToken",
        "type": "address"
      }
    ],
    "name": "setRWYQuoteToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "journeyId",
        "type": "bytes32"
      }
    ],
    "name": "startDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpauseRWY",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "approveOperator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "getOperatorReputation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "getOperatorStats",
    "outputs": [
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "reputation",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "successfulOps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalValueProcessed",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "getOperatorSuccessfulOps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "getOperatorTotalValueProcessed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedOperator",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "revokeOperator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "newReputation",
        "type": "uint256"
      }
    ],
    "name": "setOperatorReputation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "opportunityId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "slashOperator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "name": "cancelEmergencyRecovery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "priceChangeThreshold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cooldownPeriod",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isEnabled",
        "type": "bool"
      }
    ],
    "name": "configureCircuitBreaker",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "orderIds",
        "type": "bytes32[]"
      }
    ],
    "name": "emergencyUserWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "name": "executeEmergencyRecovery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "getCircuitBreaker",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "lastPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceChangeThreshold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cooldownPeriod",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tripTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isTripped",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isEnabled",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "name": "getEmergencyAction",
    "outputs": [
      {
        "internalType": "address",
        "name": "initiator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "initiatedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "executeAfter",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "executed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "cancelled",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFeeConfig",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "takerFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "makerFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "lpFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "feeRecipient",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMEVConfig",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "minRevealDelay",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "commitmentThreshold",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRateLimitConfig",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "maxOrdersPerBlock",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxVolumePerBlock",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "initiateEmergencyRecovery",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "pauseStartTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "pauseMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "resetCircuitBreaker",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "priceChangeThreshold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cooldownPeriod",
        "type": "uint256"
      }
    ],
    "name": "setDefaultCircuitBreakerParams",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "timelock",
        "type": "uint256"
      }
    ],
    "name": "setEmergencyTimelock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "takerFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "makerFeeBps",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "lpFeeBps",
        "type": "uint16"
      }
    ],
    "name": "setFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "minRevealDelay",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "commitmentThreshold",
        "type": "uint256"
      }
    ],
    "name": "setMEVProtection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "maxOrdersPerBlock",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxVolumePerBlock",
        "type": "uint256"
      }
    ],
    "name": "setRateLimits",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "tripCircuitBreaker",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "marketId",
        "type": "bytes32"
      }
    ],
    "name": "unpauseMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "facetAddress",
            "type": "address"
          },
          {
            "internalType": "enum IDiamondCut.FacetCutAction",
            "name": "action",
            "type": "uint8"
          },
          {
            "internalType": "bytes4[]",
            "name": "functionSelectors",
            "type": "bytes4[]"
          }
        ],
        "internalType": "struct IDiamondCut.FacetCut[]",
        "name": "_diamondCut",
        "type": "tuple[]"
      },
      {
        "internalType": "address",
        "name": "_init",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_calldata",
        "type": "bytes"
      }
    ],
    "name": "diamondCut",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Event signature registry for disambiguation
export const EventSignatureRegistry = {
  "0xd5126df4": {
    "name": "ClobApprovalGranted",
    "facet": "NodesFacet",
    "signature": "ClobApprovalGranted(bytes32,address)"
  },
  "0xbdd45b26": {
    "name": "ClobApprovalRevoked",
    "facet": "NodesFacet",
    "signature": "ClobApprovalRevoked(bytes32,address)"
  },
  "0xc7f505b2": {
    "name": "Initialized",
    "facet": "NodesFacet",
    "signature": "Initialized(uint64)"
  },
  "0xd75e887b": {
    "name": "NodeAdminRevoked",
    "facet": "NodesFacet",
    "signature": "NodeAdminRevoked(address)"
  },
  "0x73fad87b": {
    "name": "NodeAdminSet",
    "facet": "NodesFacet",
    "signature": "NodeAdminSet(address)"
  },
  "0x0ba8897d": {
    "name": "NodeCapacityUpdated",
    "facet": "NodesFacet",
    "signature": "NodeCapacityUpdated(bytes32,uint256[])"
  },
  "0x62b30865": {
    "name": "NodeDeactivated",
    "facet": "NodesFacet",
    "signature": "NodeDeactivated(bytes32)"
  },
  "0x8326de45": {
    "name": "NodeRegistered",
    "facet": "NodesFacet",
    "signature": "NodeRegistered(bytes32,address,string)"
  },
  "0x3de5f088": {
    "name": "NodeSellOrderPlaced",
    "facet": "NodesFacet",
    "signature": "NodeSellOrderPlaced(bytes32,uint256,address,uint256,uint256,bytes32)"
  },
  "0x9c97a401": {
    "name": "NodeUpdated",
    "facet": "NodesFacet",
    "signature": "NodeUpdated(bytes32,string,uint256)"
  },
  "0x9f0a9fa6": {
    "name": "SupportedAssetAdded",
    "facet": "NodesFacet",
    "signature": "SupportedAssetAdded(bytes32,address,uint256,uint256,uint256)"
  },
  "0x1af735b1": {
    "name": "SupportedAssetsUpdated",
    "facet": "NodesFacet",
    "signature": "SupportedAssetsUpdated(bytes32,uint256)"
  },
  "0x9d994707": {
    "name": "TokensDepositedToNode",
    "facet": "NodesFacet",
    "signature": "TokensDepositedToNode(bytes32,uint256,uint256,address)"
  },
  "0x1177d829": {
    "name": "TokensMintedToNode",
    "facet": "NodesFacet",
    "signature": "TokensMintedToNode(bytes32,uint256,uint256,address)"
  },
  "0x5cee2a26": {
    "name": "TokensTransferredBetweenNodes",
    "facet": "NodesFacet",
    "signature": "TokensTransferredBetweenNodes(bytes32,bytes32,uint256,uint256)"
  },
  "0x59947f68": {
    "name": "TokensWithdrawnFromNode",
    "facet": "NodesFacet",
    "signature": "TokensWithdrawnFromNode(bytes32,uint256,uint256,address)"
  },
  "0x6d4f5fd0": {
    "name": "UpdateLocation",
    "facet": "NodesFacet",
    "signature": "UpdateLocation(string,string,string,bytes32)"
  },
  "0xea9df86c": {
    "name": "UpdateOwner",
    "facet": "NodesFacet",
    "signature": "UpdateOwner(address,bytes32)"
  },
  "0xcf4e8a63": {
    "name": "UpdateStatus",
    "facet": "NodesFacet",
    "signature": "UpdateStatus(bytes1,bytes32)"
  },
  "0x8b4753f7": {
    "name": "CLOBOrderCancelled",
    "facet": "CLOBFacetV2",
    "signature": "CLOBOrderCancelled(bytes32,address,uint256,uint8)"
  },
  "0x2d540948": {
    "name": "CLOBOrderFilled",
    "facet": "CLOBFacetV2",
    "signature": "CLOBOrderFilled(bytes32,bytes32,uint256,uint256,uint256,uint256)"
  },
  "0x57e60214": {
    "name": "CLOBTradeExecuted",
    "facet": "CLOBFacetV2",
    "signature": "CLOBTradeExecuted(bytes32,bytes32,bytes32,address,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256,bool)"
  },
  "0xb59e4751": {
    "name": "MarketCreated",
    "facet": "CLOBFacetV2",
    "signature": "MarketCreated(bytes32,address,uint256,address)"
  },
  "0x43fe20c0": {
    "name": "OrderCreated",
    "facet": "CLOBFacetV2",
    "signature": "OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)"
  },
  "0xb558d548": {
    "name": "OrderExpired",
    "facet": "CLOBFacetV2",
    "signature": "OrderExpired(bytes32,uint256)"
  },
  "0xe764a4f2": {
    "name": "OrderPlacedWithTokens",
    "facet": "CLOBFacetV2",
    "signature": "OrderPlacedWithTokens(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)"
  },
  "0x3e2e10ef": {
    "name": "AusysOrderFilled",
    "facet": "OrderMatchingFacet",
    "signature": "AusysOrderFilled(bytes32,bytes32,uint256,uint256,uint256,uint256)"
  },
  "0x6f7d737d": {
    "name": "MatchingOrderCancelled",
    "facet": "OrderMatchingFacet",
    "signature": "MatchingOrderCancelled(bytes32,address,uint256,uint8)"
  },
  "0x4692eb38": {
    "name": "TradeExecuted",
    "facet": "OrderMatchingFacet",
    "signature": "TradeExecuted(bytes32,bytes32,bytes32,uint256,uint256,uint256)"
  },
  "0x138298a5": {
    "name": "OrderRouted",
    "facet": "OrderRouterFacet",
    "signature": "OrderRouted(bytes32,address,uint8,bool)"
  },
  "0x8f112c49": {
    "name": "RouterOrderCancelled",
    "facet": "OrderRouterFacet",
    "signature": "RouterOrderCancelled(bytes32,address,uint256,uint8)"
  },
  "0x7398300e": {
    "name": "RouterOrderCreated",
    "facet": "OrderRouterFacet",
    "signature": "RouterOrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)"
  },
  "0x0e2e2fa3": {
    "name": "RouterOrderPlaced",
    "facet": "OrderRouterFacet",
    "signature": "RouterOrderPlaced(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)"
  },
  "0x54931e7e": {
    "name": "RouterTradeExecuted",
    "facet": "OrderRouterFacet",
    "signature": "RouterTradeExecuted(bytes32,bytes32,bytes32,uint256,uint256,uint256)"
  },
  "0x8e7bc4ed": {
    "name": "BountyPaid",
    "facet": "BridgeFacet",
    "signature": "BountyPaid(bytes32,uint256)"
  },
  "0xd240f26b": {
    "name": "BridgeFeeRecipientUpdated",
    "facet": "BridgeFacet",
    "signature": "BridgeFeeRecipientUpdated(address,address)"
  },
  "0xfb630ff8": {
    "name": "BridgeOrderCancelled",
    "facet": "BridgeFacet",
    "signature": "BridgeOrderCancelled(bytes32,uint8)"
  },
  "0xf7da2d1a": {
    "name": "JourneyStatusUpdated",
    "facet": "BridgeFacet",
    "signature": "JourneyStatusUpdated(bytes32,bytes32,uint8)"
  },
  "0x9c831fa4": {
    "name": "LogisticsOrderCreated",
    "facet": "BridgeFacet",
    "signature": "LogisticsOrderCreated(bytes32,bytes32,bytes32[],uint256,address)"
  },
  "0xe72627b4": {
    "name": "OrderSettled",
    "facet": "BridgeFacet",
    "signature": "OrderSettled(bytes32,address,uint256,address,uint256)"
  },
  "0x51d0a1e6": {
    "name": "TradeMatched",
    "facet": "BridgeFacet",
    "signature": "TradeMatched(bytes32,bytes32,bytes32,address,uint256,uint256)"
  },
  "0xc8b6af07": {
    "name": "UnifiedOrderCreated",
    "facet": "BridgeFacet",
    "signature": "UnifiedOrderCreated(bytes32,bytes32,address,address,address,uint256,uint256,uint256)"
  },
  "0x8606a781": {
    "name": "CollateralReturned",
    "facet": "RWYStakingFacet",
    "signature": "CollateralReturned(bytes32,address,uint256)"
  },
  "0xdbd49b34": {
    "name": "CommodityStaked",
    "facet": "RWYStakingFacet",
    "signature": "CommodityStaked(bytes32,address,uint256,uint256)"
  },
  "0x24b492cf": {
    "name": "CommodityUnstaked",
    "facet": "RWYStakingFacet",
    "signature": "CommodityUnstaked(bytes32,address,uint256)"
  },
  "0xd7474166": {
    "name": "ConfigUpdated",
    "facet": "RWYStakingFacet",
    "signature": "ConfigUpdated(string,uint256,uint256)"
  },
  "0x1c0fcf44": {
    "name": "DeliveryConfirmed",
    "facet": "RWYStakingFacet",
    "signature": "DeliveryConfirmed(bytes32,uint256)"
  },
  "0xec8d4528": {
    "name": "DeliveryStarted",
    "facet": "RWYStakingFacet",
    "signature": "DeliveryStarted(bytes32,bytes32)"
  },
  "0xd3955fc1": {
    "name": "OpportunityCancelled",
    "facet": "RWYStakingFacet",
    "signature": "OpportunityCancelled(bytes32,string)"
  },
  "0x5d494cc2": {
    "name": "OpportunityCompleted",
    "facet": "RWYStakingFacet",
    "signature": "OpportunityCompleted(bytes32,uint256)"
  },
  "0x1e5c8915": {
    "name": "OpportunityCreated",
    "facet": "RWYStakingFacet",
    "signature": "OpportunityCreated(bytes32,address,address,uint256,uint256,uint256)"
  },
  "0xef294796": {
    "name": "OpportunityFunded",
    "facet": "RWYStakingFacet",
    "signature": "OpportunityFunded(bytes32,uint256)"
  },
  "0x85ee5e30": {
    "name": "ProcessingCompleted",
    "facet": "RWYStakingFacet",
    "signature": "ProcessingCompleted(bytes32,uint256,uint256)"
  },
  "0xcc013089": {
    "name": "ProcessingStarted",
    "facet": "RWYStakingFacet",
    "signature": "ProcessingStarted(bytes32)"
  },
  "0x275d0197": {
    "name": "ProfitDistributed",
    "facet": "RWYStakingFacet",
    "signature": "ProfitDistributed(bytes32,address,uint256,uint256)"
  },
  "0x4f6725f3": {
    "name": "SaleProceedsRecorded",
    "facet": "RWYStakingFacet",
    "signature": "SaleProceedsRecorded(bytes32,uint256)"
  },
  "0xf338da91": {
    "name": "OperatorApproved",
    "facet": "OperatorFacet",
    "signature": "OperatorApproved(address)"
  },
  "0x8320ad02": {
    "name": "OperatorReputationUpdated",
    "facet": "OperatorFacet",
    "signature": "OperatorReputationUpdated(address,uint256,uint256)"
  },
  "0xa5f3b762": {
    "name": "OperatorRevoked",
    "facet": "OperatorFacet",
    "signature": "OperatorRevoked(address)"
  },
  "0x90e68b2e": {
    "name": "OperatorSlashed",
    "facet": "OperatorFacet",
    "signature": "OperatorSlashed(bytes32,address,address,uint256,uint256)"
  },
  "0xd6d54f61": {
    "name": "OperatorStatsUpdated",
    "facet": "OperatorFacet",
    "signature": "OperatorStatsUpdated(address,uint256,uint256)"
  },
  "0x58807e46": {
    "name": "CircuitBreakerConfigured",
    "facet": "CLOBAdminFacet",
    "signature": "CircuitBreakerConfigured(bytes32,uint256,uint256,bool)"
  },
  "0xbae506d4": {
    "name": "CircuitBreakerReset",
    "facet": "CLOBAdminFacet",
    "signature": "CircuitBreakerReset(bytes32,uint256)"
  },
  "0x5953204a": {
    "name": "CircuitBreakerTripped",
    "facet": "CLOBAdminFacet",
    "signature": "CircuitBreakerTripped(bytes32,uint256,uint256,uint256,uint256)"
  },
  "0x248b189e": {
    "name": "EmergencyActionCancelled",
    "facet": "CLOBAdminFacet",
    "signature": "EmergencyActionCancelled(bytes32,address)"
  },
  "0x4579d7c5": {
    "name": "EmergencyActionExecuted",
    "facet": "CLOBAdminFacet",
    "signature": "EmergencyActionExecuted(bytes32,address,address,address,uint256)"
  },
  "0xca04aa1e": {
    "name": "EmergencyActionInitiated",
    "facet": "CLOBAdminFacet",
    "signature": "EmergencyActionInitiated(bytes32,address,address,address,uint256,uint256)"
  },
  "0xc0f6eecd": {
    "name": "EmergencyWithdrawal",
    "facet": "CLOBAdminFacet",
    "signature": "EmergencyWithdrawal(address,bytes32,address,uint256)"
  },
  "0xaaebcf1b": {
    "name": "FeeRecipientUpdated",
    "facet": "CLOBAdminFacet",
    "signature": "FeeRecipientUpdated(address,address)"
  },
  "0xb3ef341b": {
    "name": "FeesUpdated",
    "facet": "CLOBAdminFacet",
    "signature": "FeesUpdated(uint16,uint16,uint16)"
  },
  "0xa5fea31b": {
    "name": "GlobalPause",
    "facet": "CLOBAdminFacet",
    "signature": "GlobalPause(bool)"
  },
  "0x096cc317": {
    "name": "MEVProtectionUpdated",
    "facet": "CLOBAdminFacet",
    "signature": "MEVProtectionUpdated(uint8,uint256)"
  },
  "0x613681e6": {
    "name": "MarketPaused",
    "facet": "CLOBAdminFacet",
    "signature": "MarketPaused(bytes32)"
  },
  "0xb51d033f": {
    "name": "MarketUnpaused",
    "facet": "CLOBAdminFacet",
    "signature": "MarketUnpaused(bytes32)"
  },
  "0x6675ea6c": {
    "name": "RateLimitsUpdated",
    "facet": "CLOBAdminFacet",
    "signature": "RateLimitsUpdated(uint256,uint256)"
  },
  "0xe785b7d4": {
    "name": "DiamondCut",
    "facet": "DiamondCutFacet",
    "signature": "DiamondCut(tuple[],address,bytes)"
  },
  "0x8be0079c": {
    "name": "OwnershipTransferred",
    "facet": "OwnershipFacet",
    "signature": "OwnershipTransferred(address,address)"
  }
} as const;
