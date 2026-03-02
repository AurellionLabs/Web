---
tags: [reference, events, contracts, indexer]
---

# Events Reference

[[🏠 Home]] > Technical Reference > Events Reference

Complete reference of all events emitted by the Aurellion Diamond. Events are the source of truth for the Ponder indexer and can be used for off-chain monitoring, webhooks, and analytics.

---

## AssetsFacet Events

| Event                   | Parameters                                                                                                                 | Emitted When                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `MintedAsset`           | `address indexed account, bytes32 indexed hash, uint256 indexed tokenId, string name, string assetClass, string className` | `nodeMint()` succeeds           |
| `AssetAttributeAdded`   | `bytes32 indexed hash, uint256 indexed attributeIndex, string name, string[] values, string description`                   | Attribute added to asset        |
| `CustodyEstablished`    | `uint256 indexed tokenId, address indexed custodian, uint256 amount`                                                       | Tokens minted into custody      |
| `CustodyReleased`       | `uint256 indexed tokenId, address indexed custodian, uint256 amount, address indexed redeemer`                             | Custody released via redemption |
| `SupportedClassAdded`   | `bytes32 indexed classNameHash, string className`                                                                          | New asset class activated       |
| `SupportedClassRemoved` | `bytes32 indexed classNameHash, string className`                                                                          | Asset class deactivated         |
| `TransferSingle`        | `address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value`                            | ERC-1155 single transfer        |
| `TransferBatch`         | `address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values`                      | ERC-1155 batch transfer         |
| `ApprovalForAll`        | `address indexed account, address indexed operator, bool approved`                                                         | ERC-1155 approval changed       |

---

## NodesFacet Events

| Event                           | Parameters                                                                                                                                                       | Emitted When                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `NodeRegistered`                | `bytes32 indexed nodeHash, address indexed owner, string nodeType`                                                                                               | `registerNode()` called         |
| `NodeUpdated`                   | `bytes32 indexed nodeHash, string nodeType, uint256 capacity`                                                                                                    | Node data updated               |
| `NodeDeactivated`               | `bytes32 indexed nodeHash`                                                                                                                                       | Node deactivated                |
| `UpdateLocation`                | `string indexed addressName, string lat, string lng, bytes32 indexed node`                                                                                       | Location updated                |
| `UpdateOwner`                   | `address indexed owner, bytes32 indexed node`                                                                                                                    | Ownership transferred           |
| `UpdateStatus`                  | `bytes1 indexed status, bytes32 indexed node`                                                                                                                    | Node status changed             |
| `NodeCapacityUpdated`           | `bytes32 indexed nodeHash, uint256[] quantities`                                                                                                                 | Capacity updated                |
| `SupportedAssetAdded`           | `bytes32 indexed nodeHash, address token, uint256 tokenId, uint256 price, uint256 capacity`                                                                      | Asset support added             |
| `SupportedAssetsUpdated`        | `bytes32 indexed nodeHash, uint256 count`                                                                                                                        | Assets batch updated            |
| `TokensMintedToNode`            | `bytes32 indexed nodeHash, uint256 indexed tokenId, uint256 amount, address indexed minter`                                                                      | Tokens minted to node inventory |
| `TokensTransferredBetweenNodes` | `bytes32 indexed fromNode, bytes32 indexed toNode, uint256 indexed tokenId, uint256 amount`                                                                      | Inter-node transfer             |
| `TokensWithdrawnFromNode`       | `bytes32 indexed nodeHash, uint256 indexed tokenId, uint256 amount, address indexed recipient`                                                                   | Withdrawal from node            |
| `TokensDepositedToNode`         | `bytes32 indexed nodeHash, uint256 indexed tokenId, uint256 amount, address indexed depositor`                                                                   | Deposit to node                 |
| `SupportingDocumentAdded`       | `bytes32 indexed nodeHash, string url, string title, string description, string documentType, bool isFrozen, uint256 indexed timestamp, address indexed addedBy` | Document attached               |
| `SupportingDocumentRemoved`     | `bytes32 indexed nodeHash, string url, uint256 indexed timestamp, address indexed removedBy`                                                                     | Document removed                |

---

## AuSysFacet Events

| Event                       | Parameters                                                                                                                                                                                                                                                                      | Emitted When               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `AuSysOrderCreated`         | `bytes32 indexed orderId, address indexed buyer, address indexed seller, address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, uint256 txFee, uint8 currentStatus, address[] nodes`                                                                             | Logistics order created    |
| `JourneyCreated`            | `bytes32 indexed journeyId, address indexed sender, address indexed receiver, address driver, uint256 bounty, uint256 ETA, bytes32 orderId, string startLat, string startLng, string endLat, string endLng, string startName, string endName`                                   | Journey leg created        |
| `DriverAssigned`            | `bytes32 indexed journeyId, address indexed driver, address sender, address receiver, uint256 bounty, uint256 ETA, string startLat, string startLng, string endLat, string endLng, string startName, string endName`                                                            | Driver assigned            |
| `EmitSig`                   | `address indexed user, bytes32 indexed id`                                                                                                                                                                                                                                      | Custody signature recorded |
| `AuSysJourneyStatusUpdated` | `bytes32 indexed journeyId, uint8 indexed newStatus, address sender, address receiver, address driver, uint256 bounty, uint256 ETA, uint256 journeyStart, uint256 journeyEnd, string startLat, string startLng, string endLat, string endLng, string startName, string endName` | Journey status changed     |
| `JourneyCanceled`           | `bytes32 indexed journeyId, address indexed sender, address receiver, address driver, uint256 refundedAmount, uint256 bounty, string startLat, string startLng, string endLat, string endLng, string startName, string endName`                                                 | Journey cancelled          |
| `AuSysOrderStatusUpdated`   | `bytes32 indexed orderId, uint8 newStatus`                                                                                                                                                                                                                                      | Order status changed       |
| `AuSysOrderSettled`         | `bytes32 indexed orderId`                                                                                                                                                                                                                                                       | Order fully settled        |
| `AuSysAdminSet`             | `address indexed admin`                                                                                                                                                                                                                                                         | Admin granted              |
| `AuSysAdminRevoked`         | `address indexed admin`                                                                                                                                                                                                                                                         | Admin revoked              |
| `FundsEscrowed`             | `address indexed from, uint256 amount`                                                                                                                                                                                                                                          | Payment locked             |
| `FundsRefunded`             | `address indexed to, uint256 amount`                                                                                                                                                                                                                                            | Payment refunded           |
| `SellerPaid`                | `address indexed seller, uint256 amount`                                                                                                                                                                                                                                        | Seller received payment    |
| `NodeFeeDistributed`        | `address indexed node, uint256 amount`                                                                                                                                                                                                                                          | Node received fee          |
| `P2POfferCreated`           | `bytes32 indexed orderId, address indexed creator, bool isSellerInitiated, address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, address targetCounterparty, uint256 expiresAt`                                                                                 | P2P offer created          |
| `P2POfferAccepted`          | `bytes32 indexed orderId, address indexed acceptor, bool isSellerInitiated`                                                                                                                                                                                                     | Offer accepted             |
| `P2POfferCanceled`          | `bytes32 indexed orderId, address indexed creator`                                                                                                                                                                                                                              | Offer cancelled            |

---

## BridgeFacet Events

| Event                       | Parameters                                                                                                                                                    | Emitted When              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `UnifiedOrderCreated`       | `bytes32 indexed unifiedOrderId, bytes32 indexed clobOrderId, address buyer, address seller, address token, uint256 tokenId, uint256 quantity, uint256 price` | Unified order created     |
| `TradeMatched`              | `bytes32 indexed unifiedOrderId, bytes32 clobTradeId, bytes32 clobOrderId, address maker, uint256 price, uint256 amount`                                      | CLOB trade linked         |
| `LogisticsOrderCreated`     | `bytes32 indexed unifiedOrderId, bytes32 ausysOrderId, bytes32[] journeyIds, uint256 bounty, address node`                                                    | Logistics order initiated |
| `JourneyStatusUpdated`      | `bytes32 indexed unifiedOrderId, bytes32 indexed journeyId, uint8 phase`                                                                                      | Journey phase updated     |
| `OrderSettled`              | `bytes32 indexed unifiedOrderId, address seller, uint256 sellerAmount, address driver, uint256 driverAmount`                                                  | Order settled             |
| `BridgeOrderCancelled`      | `bytes32 indexed unifiedOrderId, uint8 previousStatus`                                                                                                        | Bridge order cancelled    |
| `BountyPaid`                | `bytes32 indexed unifiedOrderId, uint256 amount`                                                                                                              | Driver bounty paid        |
| `FundsEscrowed`             | `address indexed buyer, uint256 amount`                                                                                                                       | Buyer funds locked        |
| `FundsRefunded`             | `address indexed recipient, uint256 amount`                                                                                                                   | Funds returned            |
| `BridgeFeeRecipientUpdated` | `address indexed oldRecipient, address indexed newRecipient`                                                                                                  | Fee recipient changed     |

---

## CLOB Events (OrderRouterFacet / CLOBCoreFacet / CLOBMatchingFacet)

| Event                  | Parameters                                                                                                                                                                                                                                                        | Emitted When                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `RouterOrderPlaced`    | `bytes32 indexed orderId, address indexed maker, address indexed baseToken, uint256 baseTokenId, address quoteToken, uint256 price, uint256 amount, bool isBuy, uint8 orderType`                                                                                  | Order placed via router      |
| `RouterOrderCreated`   | `bytes32 indexed orderId, bytes32 indexed marketId, address indexed maker, uint256 price, uint256 amount, bool isBuy, uint8 orderType, uint8 TIF, uint256 expiry, uint256 nonce`                                                                                  | Order record created         |
| `RouterOrderCancelled` | `bytes32 indexed orderId, address indexed maker, uint256 remainingAmount, uint8 reason`                                                                                                                                                                           | Order cancelled via router   |
| `OrderRouted`          | `bytes32 indexed orderId, address indexed maker, uint8 orderSource, bool isBuy`                                                                                                                                                                                   | Order routed                 |
| `OrderCreated`         | `bytes32 indexed orderId, bytes32 indexed marketId, address indexed maker, uint256 price, uint256 amount, bool isBuy, uint8 orderType, uint8 TIF, uint256 expiry, uint256 nonce`                                                                                  | CLOBCoreFacet order created  |
| `CLOBOrderCancelled`   | `bytes32 indexed orderId, address indexed maker, uint256 remainingAmount, uint8 reason`                                                                                                                                                                           | Order cancelled              |
| `OrderExpired`         | `bytes32 indexed orderId, uint256 expiredAt`                                                                                                                                                                                                                      | GTD order expired            |
| `MarketCreated`        | `bytes32 indexed marketId, address indexed baseToken, uint256 baseTokenId, address indexed quoteToken`                                                                                                                                                            | New market created           |
| `MatchingOrderFilled`  | `bytes32 indexed orderId, bytes32 indexed tradeId, uint256 fillAmount, uint256 fillPrice, uint256 remainingAmount, uint256 cumulativeFilled`                                                                                                                      | Order partially/fully filled |
| `TradeExecuted`        | `bytes32 indexed tradeId, bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, address taker, address maker, bytes32 marketId, uint256 price, uint256 amount, uint256 quoteAmount, uint256 takerFee, uint256 makerFee, uint256 timestamp, bool takerIsBuy` | Trade settled                |
| `MarketDepthChanged`   | `bytes32 indexed marketId, uint256 bestBid, uint256 bestBidSize, uint256 bestAsk, uint256 bestAskSize, uint256 spread`                                                                                                                                            | Order book depth changed     |
| `PoolCreated`          | `bytes32 indexed poolId, string baseToken, uint256 baseTokenId, string quoteToken`                                                                                                                                                                                | AMM pool created             |
| `LiquidityAdded`       | `bytes32 indexed poolId, address indexed provider, uint256 baseAmount, uint256 quoteAmount, uint256 lpTokensMinted`                                                                                                                                               | Liquidity provided           |
| `LiquidityRemoved`     | `bytes32 indexed poolId, address indexed provider, uint256 baseAmount, uint256 quoteAmount, uint256 lpTokensBurned`                                                                                                                                               | Liquidity withdrawn          |
| `FeesCollected`        | `bytes32 indexed tradeId, uint256 takerFeeAmount, uint256 makerFeeAmount, uint256 lpFeeAmount`                                                                                                                                                                    | Trading fees collected       |

---

## RWYStakingFacet Events

| Event                  | Parameters                                                                                                                               | Emitted When                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `OpportunityCreated`   | `bytes32 indexed id, address indexed operator, address inputToken, uint256 inputTokenId, uint256 targetAmount, uint256 promisedYieldBps` | Opportunity created           |
| `OpportunityFunded`    | `bytes32 indexed id, uint256 totalStaked`                                                                                                | Funding target reached        |
| `OpportunityCancelled` | `bytes32 indexed id, string reason`                                                                                                      | Opportunity cancelled         |
| `CommodityStaked`      | `bytes32 indexed opportunityId, address indexed staker, uint256 amount, uint256 totalStaked`                                             | Tokens staked                 |
| `CommodityUnstaked`    | `bytes32 indexed opportunityId, address indexed staker, uint256 amount`                                                                  | Tokens withdrawn              |
| `DeliveryStarted`      | `bytes32 indexed opportunityId, bytes32 journeyId`                                                                                       | Delivery to processor started |
| `DeliveryConfirmed`    | `bytes32 indexed opportunityId, uint256 deliveredAmount`                                                                                 | Delivery confirmed            |
| `ProcessingStarted`    | `bytes32 indexed opportunityId`                                                                                                          | Processing begun              |
| `ProcessingCompleted`  | `bytes32 indexed opportunityId, uint256 outputAmount, uint256 outputTokenId`                                                             | Processing complete           |
| `SaleProceedsRecorded` | `bytes32 indexed opportunityId, uint256 proceeds`                                                                                        | Revenue recorded              |
| `ProfitDistributed`    | `bytes32 indexed opportunityId, address indexed staker, uint256 stakedAmount, uint256 profitShare`                                       | Profit claimed                |
| `ConfigUpdated`        | `string indexed param, uint256 oldValue, uint256 newValue`                                                                               | Config changed                |

---

## Diamond Management Events

| Event                  | Parameters                                                | Facet           | Emitted When      |
| ---------------------- | --------------------------------------------------------- | --------------- | ----------------- |
| `DiamondCut`           | `FacetCut[] _diamondCut, address _init, bytes _calldata`  | DiamondCutFacet | Facets upgraded   |
| `OwnershipTransferred` | `address indexed previousOwner, address indexed newOwner` | OwnershipFacet  | Ownership changed |

---

## Monitoring

To listen to all Diamond events off-chain:

```typescript
import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Watch for MintedAsset
const unwatch = client.watchContractEvent({
  address: DIAMOND_ADDRESS,
  abi: parseAbi([
    'event MintedAsset(address indexed account, bytes32 indexed hash, uint256 indexed tokenId, string name, string assetClass, string className)',
  ]),
  eventName: 'MintedAsset',
  onLogs: (logs) => {
    console.log('New asset minted:', logs);
  },
});
```

---

## Related Pages

- [[Technical Reference/Error Reference]]
- [[Indexer/Ponder Setup]]
- [[Indexer/Schema and Queries]]
