// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title CLOBMEVFacet
 * @notice MEV Protection via Commit-Reveal for large orders
 * @dev Split from CLOBFacetV2 to reduce contract size
 */
contract CLOBMEVFacet is ReentrancyGuard {
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event OrderCommitted(
        bytes32 indexed commitmentId,
        address indexed committer,
        uint256 commitBlock
    );
    
    event OrderRevealed(
        bytes32 indexed commitmentId,
        bytes32 indexed orderId,
        address indexed maker
    );
    
    event OrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed marketId,
        address indexed maker,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType,
        uint8 timeInForce,
        uint256 expiry,
        uint256 nonce
    );
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidPrice();
    error InvalidAmount();
    error InvalidTimeInForce();
    error MarketPaused();
    error CommitmentNotFound();
    error CommitmentAlreadyRevealed();
    error RevealTooEarly();
    error RevealTooLate();
    error InvalidCommitment();
    error NotOrderMaker();
    error OrderExpiredError();
    error CircuitBreakerTrippedError();
    
    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    uint256 public constant MAX_REVEAL_DELAY = 50;  // ~10 minutes at 12s blocks
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier whenNotPaused() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.paused) revert MarketPaused();
        _;
    }
    
    // ============================================================================
    // COMMIT-REVEAL FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Commit to placing an order (for large orders to prevent front-running)
     * @param commitment keccak256(abi.encodePacked(marketId, price, amount, isBuy, timeInForce, expiry, salt))
     */
    function commitOrder(bytes32 commitment) external whenNotPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        bytes32 commitmentId = keccak256(abi.encodePacked(msg.sender, commitment, block.number));
        
        s.committedOrders[commitmentId] = DiamondStorage.CommittedOrder({
            commitment: commitment,
            commitBlock: block.number,
            committer: msg.sender,
            revealed: false,
            expired: false
        });
        
        emit OrderCommitted(commitmentId, msg.sender, block.number);
    }
    
    /**
     * @notice Reveal and execute a committed order
     */
    function revealOrder(
        bytes32 commitmentId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry,
        bytes32 salt
    ) external nonReentrant whenNotPaused returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CommittedOrder storage committed = s.committedOrders[commitmentId];
        
        if (committed.commitment == bytes32(0)) revert CommitmentNotFound();
        if (committed.revealed) revert CommitmentAlreadyRevealed();
        if (committed.committer != msg.sender) revert NotOrderMaker();
        if (block.number < committed.commitBlock + s.minRevealDelay) revert RevealTooEarly();
        if (block.number > committed.commitBlock + MAX_REVEAL_DELAY) revert RevealTooLate();
        
        // Verify commitment
        bytes32 marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
        bytes32 expectedCommitment = keccak256(abi.encodePacked(
            marketId, price, amount, isBuy, timeInForce, expiry, salt
        ));
        
        if (committed.commitment != expectedCommitment) revert InvalidCommitment();
        
        committed.revealed = true;
        
        // Place the order via internal logic
        orderId = _placeRevealedOrder(
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            isBuy,
            timeInForce,
            expiry
        );
        
        emit OrderRevealed(commitmentId, orderId, msg.sender);
    }
    
    /**
     * @notice Check if an order requires commit-reveal
     */
    function requiresCommitReveal(uint256 quoteAmount) external view returns (bool) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return quoteAmount >= s.commitmentThreshold;
    }
    
    /**
     * @notice Get commitment threshold
     */
    function getCommitmentThreshold() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.commitmentThreshold;
    }
    
    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================
    
    function _placeRevealedOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) internal returns (bytes32 orderId) {
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (timeInForce > CLOBLib.TIF_GTD) revert InvalidTimeInForce();
        if (timeInForce == CLOBLib.TIF_GTD && expiry <= block.timestamp) revert OrderExpiredError();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
        
        // Ensure market exists
        _ensureMarket(s, marketId, baseToken, baseTokenId, quoteToken);
        
        // Check circuit breaker
        _checkCircuitBreaker(s, marketId, price);
        
        // Transfer tokens to escrow
        if (isBuy) {
            uint256 totalCost = CLOBLib.calculateQuoteAmount(price, amount);
            IERC20(quoteToken).transferFrom(msg.sender, address(this), totalCost);
        } else {
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }
        
        // Generate order ID
        uint256 nonce = s.orderNonce++;
        orderId = keccak256(abi.encodePacked(msg.sender, marketId, nonce, block.timestamp));
        
        // Create packed order
        s.packedOrders[orderId] = DiamondStorage.PackedOrder({
            makerAndFlags: CLOBLib.packMakerAndFlags(
                msg.sender,
                isBuy,
                CLOBLib.TYPE_LIMIT,
                CLOBLib.STATUS_OPEN,
                timeInForce,
                uint88(nonce)
            ),
            priceAmountFilled: CLOBLib.packPriceAmountFilled(price, amount, 0),
            expiryAndMeta: CLOBLib.packExpiryAndMeta(expiry, uint40(block.timestamp), uint32(s.totalMarkets)),
            marketId: marketId
        });
        
        // Add to order book
        _addToOrderBook(s, orderId, marketId, price, amount, isBuy);
        
        emit OrderCreated(
            orderId,
            marketId,
            msg.sender,
            price,
            amount,
            isBuy,
            CLOBLib.TYPE_LIMIT,
            timeInForce,
            expiry,
            nonce
        );
        
        // Note: Matching is done by CLOBFacetV2 or CLOBMatchingFacet
    }
    
    function _ensureMarket(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        if (!s.markets[marketId].active) {
            s.markets[marketId] = DiamondStorage.Market({
                baseToken: _addressToString(baseToken),
                baseTokenId: baseTokenId,
                quoteToken: _addressToString(quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(marketId);
            s.totalMarkets++;
            
            s.circuitBreakers[marketId] = DiamondStorage.CircuitBreaker({
                lastPrice: 0,
                priceChangeThreshold: s.defaultPriceChangeThreshold,
                cooldownPeriod: s.defaultCooldownPeriod,
                tripTimestamp: 0,
                isTripped: false,
                isEnabled: true
            });
        }
    }
    
    function _checkCircuitBreaker(DiamondStorage.AppStorage storage s, bytes32 marketId, uint256 newPrice) internal view {
        DiamondStorage.CircuitBreaker storage cb = s.circuitBreakers[marketId];
        if (!cb.isEnabled) return;
        if (cb.isTripped && block.timestamp < cb.tripTimestamp + cb.cooldownPeriod) {
            revert CircuitBreakerTrippedError();
        }
        if (cb.lastPrice > 0) {
            uint256 changeBps = CLOBLib.calculatePriceChange(cb.lastPrice, newPrice);
            if (changeBps > cb.priceChangeThreshold) {
                revert CircuitBreakerTrippedError();
            }
        }
    }
    
    function _addToOrderBook(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        DiamondStorage.RBTreeMeta storage meta = isBuy ? s.bidTreeMeta[marketId] : s.askTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        if (!nodes[price].exists) {
            _insertPriceLevel(meta, nodes, price);
        }
        
        DiamondStorage.PriceLevel storage level = levels[price];
        DiamondStorage.OrderQueueNode storage node = s.orderQueue[orderId];
        
        node.price = price;
        node.prev = level.tail;
        node.next = bytes32(0);
        
        if (level.tail != bytes32(0)) {
            s.orderQueue[level.tail].next = orderId;
        } else {
            level.head = orderId;
        }
        level.tail = orderId;
        
        level.totalAmount += amount;
        level.orderCount++;
        nodes[price].totalAmount += amount;
        nodes[price].orderCount++;
    }
    
    function _insertPriceLevel(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal {
        nodes[price] = DiamondStorage.RBNode({
            parent: 0,
            left: 0,
            right: 0,
            color: 0,
            exists: true,
            totalAmount: 0,
            orderCount: 0
        });
        
        if (meta.root == 0) {
            meta.root = price;
        } else {
            uint256 current = meta.root;
            while (true) {
                if (price < current) {
                    if (nodes[current].left == 0) {
                        nodes[current].left = price;
                        nodes[price].parent = current;
                        break;
                    }
                    current = nodes[current].left;
                } else {
                    if (nodes[current].right == 0) {
                        nodes[current].right = price;
                        nodes[price].parent = current;
                        break;
                    }
                    current = nodes[current].right;
                }
            }
        }
        meta.count++;
    }
    
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
    
    // ERC1155 Receiver
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

