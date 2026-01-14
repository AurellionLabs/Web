// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title CLOBAdminFacet
 * @notice Admin functions for CLOB management, circuit breakers, and emergency recovery
 * @dev Separated from main CLOB facet for cleaner upgrades and gas efficiency
 */
contract CLOBAdminFacet is ReentrancyGuard {
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event CircuitBreakerConfigured(
        bytes32 indexed marketId,
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod,
        bool isEnabled
    );
    
    event CircuitBreakerTripped(
        bytes32 indexed marketId,
        uint256 triggerPrice,
        uint256 previousPrice,
        uint256 changePercent,
        uint256 cooldownUntil
    );
    
    event CircuitBreakerReset(
        bytes32 indexed marketId,
        uint256 resetAt
    );
    
    event EmergencyActionInitiated(
        bytes32 indexed actionId,
        address indexed initiator,
        address token,
        address recipient,
        uint256 amount,
        uint256 executeAfter
    );
    
    event EmergencyActionExecuted(
        bytes32 indexed actionId,
        address indexed executor,
        address token,
        address recipient,
        uint256 amount
    );
    
    event EmergencyActionCancelled(
        bytes32 indexed actionId,
        address indexed canceller
    );
    
    event EmergencyWithdrawal(
        address indexed user,
        bytes32 indexed orderId,
        address token,
        uint256 amount
    );
    
    event FeesUpdated(
        uint16 takerFeeBps,
        uint16 makerFeeBps,
        uint16 lpFeeBps
    );
    
    event FeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );
    
    event RateLimitsUpdated(
        uint256 maxOrdersPerBlock,
        uint256 maxVolumePerBlock
    );
    
    event MEVProtectionUpdated(
        uint8 minRevealDelay,
        uint256 commitmentThreshold
    );
    
    event MarketPaused(bytes32 indexed marketId);
    event MarketUnpaused(bytes32 indexed marketId);
    event GlobalPause(bool paused);
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error NotOwner();
    error InvalidConfiguration();
    error EmergencyActionNotFound();
    error EmergencyTimelockNotPassed();
    error EmergencyActionAlreadyExecuted();
    error EmergencyActionCancelledError();
    error NotPaused();
    error AlreadyPaused();
    error MarketNotFound();
    error InvalidFeeConfiguration();
    error ZeroAddress();
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier whenPaused() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (!s.paused) revert NotPaused();
        _;
    }
    
    // ============================================================================
    // CIRCUIT BREAKER MANAGEMENT
    // ============================================================================
    
    /**
     * @notice Configure circuit breaker for a market
     * @param marketId Market identifier
     * @param priceChangeThreshold Maximum allowed price change in basis points (1000 = 10%)
     * @param cooldownPeriod Time to wait after circuit breaker trips
     * @param isEnabled Whether circuit breaker is active
     */
    function configureCircuitBreaker(
        bytes32 marketId,
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod,
        bool isEnabled
    ) external onlyOwner {
        if (priceChangeThreshold == 0 || priceChangeThreshold > 5000) {
            revert InvalidConfiguration();  // Max 50% change
        }
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        s.circuitBreakers[marketId] = DiamondStorage.CircuitBreaker({
            lastPrice: s.circuitBreakers[marketId].lastPrice,
            priceChangeThreshold: priceChangeThreshold,
            cooldownPeriod: cooldownPeriod,
            tripTimestamp: s.circuitBreakers[marketId].tripTimestamp,
            isTripped: s.circuitBreakers[marketId].isTripped,
            isEnabled: isEnabled
        });
        
        emit CircuitBreakerConfigured(marketId, priceChangeThreshold, cooldownPeriod, isEnabled);
    }
    
    /**
     * @notice Manually trip circuit breaker (emergency)
     * @param marketId Market to trip
     */
    function tripCircuitBreaker(bytes32 marketId) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CircuitBreaker storage cb = s.circuitBreakers[marketId];
        
        cb.isTripped = true;
        cb.tripTimestamp = block.timestamp;
        
        emit CircuitBreakerTripped(
            marketId,
            cb.lastPrice,
            cb.lastPrice,
            0,
            block.timestamp + cb.cooldownPeriod
        );
    }
    
    /**
     * @notice Reset circuit breaker after cooldown
     * @param marketId Market to reset
     */
    function resetCircuitBreaker(bytes32 marketId) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CircuitBreaker storage cb = s.circuitBreakers[marketId];
        
        cb.isTripped = false;
        
        emit CircuitBreakerReset(marketId, block.timestamp);
    }
    
    /**
     * @notice Set default circuit breaker parameters for new markets
     * @param priceChangeThreshold Default threshold in basis points
     * @param cooldownPeriod Default cooldown in seconds
     */
    function setDefaultCircuitBreakerParams(
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod
    ) external onlyOwner {
        if (priceChangeThreshold == 0 || priceChangeThreshold > 5000) {
            revert InvalidConfiguration();
        }
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.defaultPriceChangeThreshold = priceChangeThreshold;
        s.defaultCooldownPeriod = cooldownPeriod;
    }
    
    // ============================================================================
    // EMERGENCY RECOVERY
    // ============================================================================
    
    /**
     * @notice Initiate emergency token recovery (requires timelock)
     * @param token Token address to recover
     * @param recipient Recipient address
     * @param amount Amount to recover
     */
    function initiateEmergencyRecovery(
        address token,
        address recipient,
        uint256 amount
    ) external onlyOwner returns (bytes32 actionId) {
        if (token == address(0) || recipient == address(0)) revert ZeroAddress();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        actionId = keccak256(abi.encodePacked(
            token, recipient, amount, block.timestamp, msg.sender
        ));
        
        s.pendingEmergencyActions[actionId] = DiamondStorage.EmergencyAction({
            initiator: msg.sender,
            token: token,
            recipient: recipient,
            amount: amount,
            initiatedAt: block.timestamp,
            executed: false,
            cancelled: false
        });
        
        emit EmergencyActionInitiated(
            actionId,
            msg.sender,
            token,
            recipient,
            amount,
            block.timestamp + s.emergencyTimelock
        );
    }
    
    /**
     * @notice Execute emergency recovery after timelock
     * @param actionId Action to execute
     */
    function executeEmergencyRecovery(bytes32 actionId) external onlyOwner nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.EmergencyAction storage action = s.pendingEmergencyActions[actionId];
        
        if (action.initiator == address(0)) revert EmergencyActionNotFound();
        if (action.executed) revert EmergencyActionAlreadyExecuted();
        if (action.cancelled) revert EmergencyActionCancelledError();
        if (block.timestamp < action.initiatedAt + s.emergencyTimelock) {
            revert EmergencyTimelockNotPassed();
        }
        
        action.executed = true;
        
        // Transfer tokens
        IERC20(action.token).transfer(action.recipient, action.amount);
        
        emit EmergencyActionExecuted(
            actionId,
            msg.sender,
            action.token,
            action.recipient,
            action.amount
        );
    }
    
    /**
     * @notice Cancel pending emergency action
     * @param actionId Action to cancel
     */
    function cancelEmergencyRecovery(bytes32 actionId) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.EmergencyAction storage action = s.pendingEmergencyActions[actionId];
        
        if (action.initiator == address(0)) revert EmergencyActionNotFound();
        if (action.executed) revert EmergencyActionAlreadyExecuted();
        
        action.cancelled = true;
        
        emit EmergencyActionCancelled(actionId, msg.sender);
    }
    
    /**
     * @notice Allow users to withdraw their funds when system is paused
     * @param orderIds Orders to withdraw from
     */
    function emergencyUserWithdraw(bytes32[] calldata orderIds) external nonReentrant whenPaused {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            bytes32 orderId = orderIds[i];
            DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
            
            if (order.makerAndFlags == 0) continue;
            
            address maker = CLOBLib.unpackMaker(order.makerAndFlags);
            if (maker != msg.sender) continue;
            
            uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
            if (status != CLOBLib.STATUS_OPEN && status != CLOBLib.STATUS_PARTIAL) continue;
            
            uint96 remaining = CLOBLib.getRemainingAmount(order.priceAmountFilled);
            if (remaining == 0) continue;
            
            // Mark as cancelled
            order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, CLOBLib.STATUS_CANCELLED);
            
            // Track withdrawal
            s.userEmergencyWithdrawals[msg.sender] += remaining;
            
            emit EmergencyWithdrawal(msg.sender, orderId, address(0), remaining);
        }
    }
    
    /**
     * @notice Set emergency timelock duration
     * @param timelock New timelock in seconds
     */
    function setEmergencyTimelock(uint256 timelock) external onlyOwner {
        if (timelock < 1 hours || timelock > 7 days) revert InvalidConfiguration();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.emergencyTimelock = timelock;
    }
    
    // ============================================================================
    // FEE MANAGEMENT
    // ============================================================================
    
    /**
     * @notice Update trading fees
     * @param takerFeeBps Taker fee in basis points
     * @param makerFeeBps Maker fee in basis points
     * @param lpFeeBps LP fee in basis points
     */
    function setFees(
        uint16 takerFeeBps,
        uint16 makerFeeBps,
        uint16 lpFeeBps
    ) external onlyOwner {
        if (takerFeeBps > 500 || makerFeeBps > 500 || lpFeeBps > 500) {
            revert InvalidFeeConfiguration();  // Max 5% each
        }
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.takerFeeBps = takerFeeBps;
        s.makerFeeBps = makerFeeBps;
        s.lpFeeBps = lpFeeBps;
        
        emit FeesUpdated(takerFeeBps, makerFeeBps, lpFeeBps);
    }
    
    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        address oldRecipient = s.feeRecipient;
        s.feeRecipient = newRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    // ============================================================================
    // RATE LIMITING
    // ============================================================================
    
    /**
     * @notice Update rate limits
     * @param maxOrdersPerBlock Maximum orders per user per block
     * @param maxVolumePerBlock Maximum volume per user per block
     */
    function setRateLimits(
        uint256 maxOrdersPerBlock,
        uint256 maxVolumePerBlock
    ) external onlyOwner {
        if (maxOrdersPerBlock == 0) revert InvalidConfiguration();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.maxOrdersPerBlock = maxOrdersPerBlock;
        s.maxVolumePerBlock = maxVolumePerBlock;
        
        emit RateLimitsUpdated(maxOrdersPerBlock, maxVolumePerBlock);
    }
    
    // ============================================================================
    // MEV PROTECTION CONFIG
    // ============================================================================
    
    /**
     * @notice Update MEV protection parameters
     * @param minRevealDelay Minimum blocks between commit and reveal
     * @param commitmentThreshold Order size requiring commit-reveal
     */
    function setMEVProtection(
        uint8 minRevealDelay,
        uint256 commitmentThreshold
    ) external onlyOwner {
        if (minRevealDelay == 0 || minRevealDelay > 10) revert InvalidConfiguration();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.minRevealDelay = minRevealDelay;
        s.commitmentThreshold = commitmentThreshold;
        
        emit MEVProtectionUpdated(minRevealDelay, commitmentThreshold);
    }
    
    // ============================================================================
    // PAUSE MANAGEMENT
    // ============================================================================
    
    /**
     * @notice Pause all trading
     */
    function pause() external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.paused) revert AlreadyPaused();
        
        s.paused = true;
        s.pauseStartTime = block.timestamp;
        
        emit GlobalPause(true);
    }
    
    /**
     * @notice Unpause trading
     */
    function unpause() external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (!s.paused) revert NotPaused();
        
        s.paused = false;
        
        emit GlobalPause(false);
    }
    
    /**
     * @notice Pause a specific market
     * @param marketId Market to pause
     */
    function pauseMarket(bytes32 marketId) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (!s.markets[marketId].active) revert MarketNotFound();
        
        s.markets[marketId].active = false;
        
        emit MarketPaused(marketId);
    }
    
    /**
     * @notice Unpause a specific market
     * @param marketId Market to unpause
     */
    function unpauseMarket(bytes32 marketId) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        s.markets[marketId].active = true;
        
        emit MarketUnpaused(marketId);
    }
    
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Get circuit breaker status for a market
     */
    function getCircuitBreaker(bytes32 marketId) external view returns (
        uint256 lastPrice,
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod,
        uint256 tripTimestamp,
        bool isTripped,
        bool isEnabled
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CircuitBreaker storage cb = s.circuitBreakers[marketId];
        
        return (
            cb.lastPrice,
            cb.priceChangeThreshold,
            cb.cooldownPeriod,
            cb.tripTimestamp,
            cb.isTripped,
            cb.isEnabled
        );
    }
    
    /**
     * @notice Get pending emergency action details
     */
    function getEmergencyAction(bytes32 actionId) external view returns (
        address initiator,
        address token,
        address recipient,
        uint256 amount,
        uint256 initiatedAt,
        uint256 executeAfter,
        bool executed,
        bool cancelled
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.EmergencyAction storage action = s.pendingEmergencyActions[actionId];
        
        return (
            action.initiator,
            action.token,
            action.recipient,
            action.amount,
            action.initiatedAt,
            action.initiatedAt + s.emergencyTimelock,
            action.executed,
            action.cancelled
        );
    }
    
    /**
     * @notice Get current fee configuration
     */
    function getFeeConfig() external view returns (
        uint16 takerFeeBps,
        uint16 makerFeeBps,
        uint16 lpFeeBps,
        address feeRecipient
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (s.takerFeeBps, s.makerFeeBps, s.lpFeeBps, s.feeRecipient);
    }
    
    /**
     * @notice Get rate limit configuration
     */
    function getRateLimitConfig() external view returns (
        uint256 maxOrdersPerBlock,
        uint256 maxVolumePerBlock
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (s.maxOrdersPerBlock, s.maxVolumePerBlock);
    }
    
    /**
     * @notice Get MEV protection configuration
     */
    function getMEVConfig() external view returns (
        uint8 minRevealDelay,
        uint256 commitmentThreshold
    ) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (s.minRevealDelay, s.commitmentThreshold);
    }
    
    /**
     * @notice Check if system is paused
     */
    function isPaused() external view returns (bool paused, uint256 pauseStartTime) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (s.paused, s.pauseStartTime);
    }
}

