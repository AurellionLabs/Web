// Auto-generated from CLOBFacetV2.sol - DO NOT EDIT
// Generated at: 2026-05-04T13:18:30.539Z

export const CLOBFacetV2ABI = [
  {
    "inputs": [],
    "name": "CircuitBreakerTrippedError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FOKNotFilled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeeBpsTooHigh",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPrice",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTimeInForce",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketPaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotOrderMaker",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OrderExpiredError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OrderNotActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OrderNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RateLimitExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
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
        "internalType": "uint16",
        "name": "bps",
        "type": "uint16"
      }
    ],
    "name": "setCLOBLpFeeBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "bps",
        "type": "uint16"
      }
    ],
    "name": "setCLOBMakerFeeBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "bps",
        "type": "uint16"
      }
    ],
    "name": "setCLOBTakerFeeBps",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const CLOBFacetV2Events = [
  {
    "name": "CLOBOrderCancelled",
    "signature": "CLOBOrderCancelled(bytes32,address,uint256,uint8)",
    "signatureHash": "0x8b4753f7"
  },
  {
    "name": "CLOBOrderFilled",
    "signature": "CLOBOrderFilled(bytes32,bytes32,uint256,uint256,uint256,uint256)",
    "signatureHash": "0x2d540948"
  },
  {
    "name": "CLOBTradeExecuted",
    "signature": "CLOBTradeExecuted(bytes32,bytes32,bytes32,address,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256,bool)",
    "signatureHash": "0x57e60214"
  },
  {
    "name": "MarketCreated",
    "signature": "MarketCreated(bytes32,address,uint256,address)",
    "signatureHash": "0xb59e4751"
  },
  {
    "name": "OrderCreated",
    "signature": "OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)",
    "signatureHash": "0x43fe20c0"
  },
  {
    "name": "OrderExpired",
    "signature": "OrderExpired(bytes32,uint256)",
    "signatureHash": "0xb558d548"
  },
  {
    "name": "OrderPlacedWithTokens",
    "signature": "OrderPlacedWithTokens(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)",
    "signatureHash": "0xe764a4f2"
  }
] as const;
