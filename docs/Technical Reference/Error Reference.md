---
tags: [reference, errors, contracts, debugging]
---

# Error Reference

[[🏠 Home]] > Technical Reference > Error Reference

Complete reference of all custom errors defined across Aurellion's Diamond facets. Custom errors (Solidity 0.8.4+) are gas-efficient and ABI-encoded — use them for precise error handling in integrations.

---

## How to Decode Errors

Custom errors have a 4-byte selector (like functions). In ethers.js:

```typescript
try {
  await diamond.placeOrder(...);
} catch (err: any) {
  if (err.data) {
    const iface = new ethers.Interface(DIAMOND_ABI);
    const decoded = iface.parseError(err.data);
    console.log('Error:', decoded.name, decoded.args);
  }
}
```

In viem:

```typescript
import { decodeErrorResult } from 'viem';
const decoded = decodeErrorResult({ abi: diamondAbi, data: err.data });
```

---

## AssetsFacet Errors

| Error                                                            | Selector | Condition                                 | How to Fix                                     |
| ---------------------------------------------------------------- | -------- | ----------------------------------------- | ---------------------------------------------- |
| `InvalidNode()`                                                  | —        | Caller has no active, valid node          | Register and get node validated first          |
| `ClassInactive()`                                                | —        | Asset class is deactivated                | Use an active class; contact admin to activate |
| `ClassAlreadyExists()`                                           | —        | Adding a class that already exists        | Class is already there; use it                 |
| `ClassNotFound()`                                                | —        | Removing a class that doesn't exist       | Check `getSupportedClasses()` first            |
| `AssetAlreadyExists()`                                           | —        | Minting duplicate asset hash              | Asset with identical definition already minted |
| `InsufficientBalance()`                                          | —        | Transfer amount exceeds balance           | Check `balanceOf()` before transferring        |
| `ExceedsCustodyAmount()`                                         | —        | Redemption > custody                      | Verify `tokenCustodyAmount[tokenId]`           |
| `NoCustodian()`                                                  | —        | No custodian for this tokenId             | Token was not minted via `nodeMint`            |
| `CannotRedeemOwnCustody()`                                       | —        | Custodian redeeming their own custody     | Must be a different address from custodian     |
| `ERC1155InvalidReceiver(address)`                                | —        | Recipient contract can't receive ERC-1155 | Implement `IERC1155Receiver` on recipient      |
| `ERC1155InsufficientBalance(address, uint256, uint256, uint256)` | —        | Balance < transfer amount                 | Check balance first                            |
| `ERC1155MissingApprovalForAll(address, address)`                 | —        | Not approved as operator                  | Call `setApprovalForAll(diamond, true)`        |
| `ERC1155InvalidArrayLength(uint256, uint256)`                    | —        | Batch arrays differ in length             | Ensure `ids.length == amounts.length`          |

---

## CLOBCoreFacet / OrderRouterFacet Errors

| Error                         | Condition                                   | How to Fix                                         |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------- |
| `InvalidPrice()`              | `price == 0`                                | Pass a non-zero price                              |
| `InvalidAmount()`             | `amount == 0`                               | Pass a non-zero amount                             |
| `InvalidTimeInForce()`        | TIF value > 3                               | Use 0=GTC, 1=IOC, 2=FOK, 3=GTD                     |
| `OrderNotFound()`             | orderId doesn't exist in storage            | Verify orderId is from a `RouterOrderPlaced` event |
| `OrderNotActive()`            | Order already filled, cancelled, or expired | Check order status before cancelling               |
| `NotOrderMaker()`             | Caller != `order.maker`                     | Only the maker can cancel their order              |
| `MarketPaused()`              | Circuit breaker is active                   | Wait for cooldown period to pass                   |
| `OrderRequiresCommitReveal()` | Order size ≥ `commitmentThreshold`          | Use `CLOBMEVFacet.commitOrder()` + `revealOrder()` |
| `RateLimitExceeded()`         | Too many orders in current block            | Spread orders across blocks or reduce frequency    |
| `OrderExpiredError()`         | GTD order expiry has passed                 | Use a future expiry timestamp                      |
| `InsufficientNodeBalance()`   | Node's internal balance < sell amount       | Deposit or mint tokens to node first               |
| `NotNodeOwner()`              | Caller doesn't own the specified node       | Use your own nodeOwner address                     |
| `NoLiquidityForMarketOrder()` | No counterpart orders in book               | Try a limit order or check market depth            |

---

## CLOBMatchingFacet Errors

| Error                          | Condition                           | How to Fix                                        |
| ------------------------------ | ----------------------------------- | ------------------------------------------------- |
| `OrderNotFound()`              | Unknown orderId                     | Verify from order creation events                 |
| `MarketPaused()`               | Market circuit breaker active       | Wait for cooldown                                 |
| `CircuitBreakerTrippedError()` | Trade price moved too far from last | Reduce order price / wait for market to stabilise |
| `FOKNotFilled()`               | FOK order couldn't be fully filled  | Switch to GTC or IOC, or reduce amount            |

---

## AuSysFacet Errors

| Error                        | Condition                                   | How to Fix                                          |
| ---------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `NotJourneyParticipant()`    | Caller not sender, driver, or receiver      | Only participants can sign or interact              |
| `JourneyNotInProgress()`     | Journey not IN_TRANSIT                      | Check journey status; may need more signatures      |
| `JourneyNotPending()`        | Journey not PENDING (for driver assignment) | Journey may already be assigned or in transit       |
| `JourneyIncomplete()`        | Not all journeys delivered at settlement    | All journey legs must reach DELIVERED first         |
| `AlreadySettled()`           | Order already in SETTLED status             | Order is complete; no further action needed         |
| `DriverNotSigned()`          | Driver pickup signature missing             | Driver must call `packageSign()` before `handOff()` |
| `SenderNotSigned()`          | Sender hasn't signed handoff                | Sender must call `packageSign()`                    |
| `ReceiverNotSigned()`        | Receiver signature missing (if required)    | Receiver must sign                                  |
| `InvalidAddress()`           | Zero address passed                         | Pass valid non-zero addresses                       |
| `InvalidAmount()`            | Zero amount                                 | Use a positive amount                               |
| `InvalidETA()`               | ETA is in the past                          | Pass a future unix timestamp                        |
| `QuantityExceedsRequested()` | Delivery quantity > order quantity          | Reduce quantity to match order                      |
| `InvalidNode()`              | Node address not valid                      | Use a registered, valid node address                |
| `RewardAlreadyPaid()`        | `journeyRewardPaid[journeyId] == true`      | Bounty already distributed to driver                |
| `ArrayLimitExceeded()`       | Too many journeys or nodes                  | Keep journeys ≤ 10, nodes ≤ 20 per order            |

---

## BridgeFacet Errors

BridgeFacet uses `require()` with string messages rather than custom errors:

| Revert Message                  | Condition                                 | How to Fix                                            |
| ------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `'Invalid seller node'`         | `sellerNode == address(0)`                | Pass valid seller node address                        |
| `'Invalid price'`               | `price == 0`                              | Pass positive price                                   |
| `'Invalid quantity'`            | `quantity == 0`                           | Pass positive quantity                                |
| `'Quote token not set'`         | `quoteTokenAddress == address(0)`         | Contract not initialised; contact admin               |
| `'Not authorized'`              | Caller not buyer or owner                 | Only buyer or owner can call `bridgeTradeToLogistics` |
| `'Order not in created status'` | Trying to bridge an already-bridged order | Order already progressed; check status                |
| `'Not seller or node'`          | Caller not seller or seller node          | Use the address that matched the trade                |
| `'Order not bridged'`           | `createLogisticsOrder` on wrong status    | Must call `bridgeTradeToLogistics` first              |

---

## RWYStakingFacet Errors

| Error                        | Condition                           | How to Fix                                          |
| ---------------------------- | ----------------------------------- | --------------------------------------------------- |
| `NotContractOwner()`         | Not Diamond owner                   | Owner-only function                                 |
| `NotApprovedOperator()`      | Not in `approvedOperators`          | Contact admin to be approved as operator            |
| `NotOperator()`              | Not the opportunity creator         | Only the creating operator can manage               |
| `OpportunityNotFound()`      | Unknown opportunity ID              | Verify from `OpportunityCreated` event              |
| `InvalidStatus()`            | Wrong lifecycle state for action    | Check current status via `getOpportunity()`         |
| `InvalidAmount()`            | `amount == 0`                       | Use positive amount                                 |
| `FundingDeadlinePassed()`    | `block.timestamp > fundingDeadline` | Staking window is closed                            |
| `ProcessingDeadlinePassed()` | Processing deadline exceeded        | Operator overdue; opportunity may need cancellation |
| `ExceedsTarget()`            | Stake would exceed `targetAmount`   | Reduce stake to remaining capacity                  |
| `InsufficientStake()`        | Unstake more than staked            | Check `getStakerPosition()` first                   |
| `AlreadyClaimed()`           | Already called `claimProfit()`      | Profit already distributed                          |
| `NoStake()`                  | No staking position exists          | Must stake before claiming                          |
| `CannotUnstake()`            | Opportunity no longer OPEN          | Can only unstake while OPEN                         |
| `ContractPaused()`           | Diamond is paused                   | Wait for unpausing                                  |
| `NotAuthorized()`            | General authorization failure       | Check role requirements                             |
| `ReentrancyGuard()`          | Reentrancy attempt detected         | Don't call back into contract during execution      |

---

## NodesFacet / General Errors

| Revert Message            | Condition                             |
| ------------------------- | ------------------------------------- |
| `'Node not found'`        | nodeHash not in storage               |
| `'Not node owner'`        | Caller is not `nodes[nodeHash].owner` |
| `'Node not active'`       | `nodes[nodeHash].active == false`     |
| `'Node not valid'`        | `nodes[nodeHash].validNode == false`  |
| `'Insufficient capacity'` | Order quantity > node capacity        |
| `'Asset not supported'`   | Token/tokenId not in `nodeAssets`     |

---

## Diamond/Ownership Errors

| Revert Message                                     | Condition                                    |
| -------------------------------------------------- | -------------------------------------------- |
| `'Diamond: Function does not exist'`               | Calling an unknown selector                  |
| `'LibDiamond: Must be contract owner'`             | Calling owner-only function as non-owner     |
| `'Initializable: contract is already initialized'` | Double-initializing an `Initializable` facet |

---

## Error Handling Best Practices

### In TypeScript Integrations

```typescript
async function safePlace(params: OrderParams): Promise<Result> {
  try {
    const tx = await diamond.placeOrder(...params);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err: any) {
    // Decode custom error
    if (err.data) {
      try {
        const decoded = diamondInterface.parseError(err.data);
        return { success: false, error: decoded.name, args: decoded.args };
      } catch {
        // Unknown error format
      }
    }
    // User rejection or network error
    if (err.code === 'ACTION_REJECTED') {
      return { success: false, error: 'UserRejected' };
    }
    return { success: false, error: err.message };
  }
}
```

### Common Error → User Message Mapping

| Error                         | User-Facing Message                                        |
| ----------------------------- | ---------------------------------------------------------- |
| `InvalidNode()`               | "Your node must be validated before minting assets"        |
| `MarketPaused()`              | "Trading is temporarily paused. Please try again shortly." |
| `OrderRequiresCommitReveal()` | "This order size requires a two-step placement process"    |
| `RateLimitExceeded()`         | "Too many orders placed. Please wait for the next block."  |
| `FOKNotFilled()`              | "Not enough liquidity to fill your order completely"       |
| `FundingDeadlinePassed()`     | "The staking window for this opportunity has closed"       |
| `ExceedsTarget()`             | "You're trying to stake more than the remaining capacity"  |
| `AlreadyClaimed()`            | "You've already claimed your rewards for this opportunity" |

---

## Related Pages

- [[Technical Reference/Events Reference]]
- [[Smart Contracts/Overview]]
- [[Smart Contracts/Facets/AuSysFacet]]
- [[Smart Contracts/Facets/CLOBCoreFacet]]
