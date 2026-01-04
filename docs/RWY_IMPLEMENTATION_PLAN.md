# RWY (Real World Yield) Vault Implementation Plan

## Overview

This document outlines the implementation plan for adding RWY Vault functionality to Aurellion. The RWY system allows users to stake tokenized commodities (ERC1155 assets) into processing opportunities, where operators transform raw commodities into processed goods and distribute profits automatically via the CLOB exchange.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RWY VAULT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐  │
│  │  AuraAsset  │────▶│  RWYVault   │────▶│   CLOB      │────▶│  Aurum    │  │
│  │  (ERC1155)  │     │  (New)      │     │  (Existing) │     │  (ERC20)  │  │
│  └─────────────┘     └─────────────┘     └─────────────┘     └───────────┘  │
│        │                   │                   │                   │        │
│        │                   │                   │                   │        │
│        ▼                   ▼                   ▼                   ▼        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Node Network                                  │   │
│  │  (Physical delivery tracking via existing infrastructure)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Smart Contract (RWYVault.sol)

### 1.1 Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title RWYVault
 * @notice Real World Yield Vault for commodity staking and processing
 * @dev Users stake ERC1155 commodities, operators process them, profits distributed via CLOB
 */
contract RWYVault is ERC1155Holder, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============ ENUMS ============

    enum OpportunityStatus {
        PENDING,      // Created, awaiting funding
        FUNDING,      // Accepting stakes
        FUNDED,       // Fully funded, ready for delivery
        IN_TRANSIT,   // Commodities being delivered to operator
        PROCESSING,   // Operator processing commodities
        SELLING,      // Processed goods listed on CLOB
        DISTRIBUTING, // Profits being distributed
        COMPLETED,    // All profits distributed
        CANCELLED     // Opportunity cancelled, refunds available
    }

    // ============ STRUCTS ============

    struct Opportunity {
        bytes32 id;
        address operator;
        string name;
        string description;

        // Input commodity (what stakers provide)
        address inputToken;           // AuraAsset contract
        uint256 inputTokenId;         // Token ID for input commodity
        uint256 targetAmount;         // Total amount needed
        uint256 stakedAmount;         // Current amount staked

        // Output commodity (what operator produces)
        address outputToken;          // AuraAsset contract (can be same)
        uint256 outputTokenId;        // Token ID for processed commodity
        uint256 expectedOutputAmount; // Expected output quantity

        // Economics
        uint256 promisedYieldBps;     // Promised yield in basis points (1500 = 15%)
        uint256 operatorFeeBps;       // Operator fee in basis points
        uint256 minSalePrice;         // Minimum acceptable sale price per unit

        // Timeline
        uint256 fundingDeadline;      // Deadline to reach funding goal
        uint256 processingDeadline;   // Deadline for processing completion
        uint256 createdAt;
        uint256 fundedAt;
        uint256 completedAt;

        // Status
        OpportunityStatus status;

        // Collateral
        uint256 operatorCollateral;   // Operator's staked collateral
    }

    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        bool claimed;
    }

    struct StakerInfo {
        address staker;
        uint256 amount;
    }

    // ============ STATE VARIABLES ============

    // Opportunity tracking
    mapping(bytes32 => Opportunity) public opportunities;
    bytes32[] public opportunityIds;
    uint256 public opportunityCounter;

    // Staking tracking: opportunityId => staker => Stake
    mapping(bytes32 => mapping(address => Stake)) public stakes;
    // Track all stakers per opportunity for iteration
    mapping(bytes32 => address[]) public opportunityStakers;
    mapping(bytes32 => mapping(address => bool)) public isStaker;

    // Operator registry
    mapping(address => bool) public approvedOperators;
    mapping(address => uint256) public operatorReputation;
    mapping(address => uint256) public operatorSuccessfulOps;

    // Configuration
    uint256 public minOperatorCollateralBps = 2000; // 20% minimum collateral
    uint256 public maxYieldBps = 5000;              // 50% max promised yield
    uint256 public protocolFeeBps = 100;            // 1% protocol fee
    address public feeRecipient;
    address public clobAddress;
    address public quoteToken;                       // AURUM token for payments

    // ============ EVENTS ============

    event OpportunityCreated(
        bytes32 indexed opportunityId,
        address indexed operator,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        uint256 promisedYieldBps
    );

    event CommodityStaked(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 amount,
        uint256 totalStaked
    );

    event CommodityUnstaked(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 amount
    );

    event OpportunityFunded(
        bytes32 indexed opportunityId,
        uint256 totalAmount
    );

    event DeliveryStarted(
        bytes32 indexed opportunityId,
        bytes32 journeyId
    );

    event DeliveryConfirmed(
        bytes32 indexed opportunityId,
        uint256 deliveredAmount
    );

    event ProcessingStarted(
        bytes32 indexed opportunityId
    );

    event ProcessingCompleted(
        bytes32 indexed opportunityId,
        uint256 outputAmount,
        uint256 outputTokenId
    );

    event SaleOrderCreated(
        bytes32 indexed opportunityId,
        bytes32 indexed clobOrderId,
        uint256 amount,
        uint256 price
    );

    event ProfitDistributed(
        bytes32 indexed opportunityId,
        address indexed staker,
        uint256 principal,
        uint256 profit
    );

    event OpportunityCancelled(
        bytes32 indexed opportunityId,
        string reason
    );

    event OperatorSlashed(
        bytes32 indexed opportunityId,
        address indexed operator,
        uint256 slashedAmount
    );

    // ============ MODIFIERS ============

    modifier onlyOperator(bytes32 opportunityId) {
        require(opportunities[opportunityId].operator == msg.sender, "Not operator");
        _;
    }

    modifier onlyApprovedOperator() {
        require(approvedOperators[msg.sender], "Not approved operator");
        _;
    }

    modifier opportunityExists(bytes32 opportunityId) {
        require(opportunities[opportunityId].id != bytes32(0), "Opportunity not found");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _feeRecipient,
        address _clobAddress,
        address _quoteToken
    ) {
        feeRecipient = _feeRecipient;
        clobAddress = _clobAddress;
        quoteToken = _quoteToken;
    }

    // ============ OPERATOR FUNCTIONS ============

    /**
     * @notice Create a new RWY opportunity
     * @param name Name of the opportunity
     * @param description Description of the processing operation
     * @param inputToken AuraAsset contract address for input commodity
     * @param inputTokenId Token ID of input commodity
     * @param targetAmount Total amount of input commodity needed
     * @param outputToken AuraAsset contract for output (can be same as input)
     * @param expectedOutputAmount Expected amount of processed output
     * @param promisedYieldBps Promised yield in basis points
     * @param operatorFeeBps Operator's fee in basis points
     * @param minSalePrice Minimum acceptable sale price per unit
     * @param fundingDays Days until funding deadline
     * @param processingDays Days for processing after funding
     */
    function createOpportunity(
        string memory name,
        string memory description,
        address inputToken,
        uint256 inputTokenId,
        uint256 targetAmount,
        address outputToken,
        uint256 expectedOutputAmount,
        uint256 promisedYieldBps,
        uint256 operatorFeeBps,
        uint256 minSalePrice,
        uint256 fundingDays,
        uint256 processingDays
    ) external payable onlyApprovedOperator nonReentrant returns (bytes32) {
        require(targetAmount > 0, "Invalid target amount");
        require(promisedYieldBps <= maxYieldBps, "Yield too high");
        require(fundingDays > 0 && processingDays > 0, "Invalid timeline");

        // Calculate required collateral
        uint256 requiredCollateral = (targetAmount * minSalePrice * minOperatorCollateralBps) / 10000;
        require(msg.value >= requiredCollateral, "Insufficient collateral");

        bytes32 opportunityId = keccak256(abi.encodePacked(
            opportunityCounter++,
            msg.sender,
            block.timestamp
        ));

        opportunities[opportunityId] = Opportunity({
            id: opportunityId,
            operator: msg.sender,
            name: name,
            description: description,
            inputToken: inputToken,
            inputTokenId: inputTokenId,
            targetAmount: targetAmount,
            stakedAmount: 0,
            outputToken: outputToken,
            outputTokenId: 0, // Set when processing completes
            expectedOutputAmount: expectedOutputAmount,
            promisedYieldBps: promisedYieldBps,
            operatorFeeBps: operatorFeeBps,
            minSalePrice: minSalePrice,
            fundingDeadline: block.timestamp + (fundingDays * 1 days),
            processingDeadline: 0, // Set when funded
            createdAt: block.timestamp,
            fundedAt: 0,
            completedAt: 0,
            status: OpportunityStatus.FUNDING,
            operatorCollateral: msg.value
        });

        opportunityIds.push(opportunityId);

        emit OpportunityCreated(
            opportunityId,
            msg.sender,
            inputToken,
            inputTokenId,
            targetAmount,
            promisedYieldBps
        );

        return opportunityId;
    }

    /**
     * @notice Confirm delivery of commodities to operator facility
     * @param opportunityId The opportunity ID
     * @param deliveredAmount Amount actually delivered (for verification)
     */
    function confirmDelivery(
        bytes32 opportunityId,
        uint256 deliveredAmount
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        require(opp.status == OpportunityStatus.IN_TRANSIT, "Not in transit");
        require(deliveredAmount <= opp.stakedAmount, "Invalid amount");

        // TODO: In production, require multi-sig or node attestation

        opp.status = OpportunityStatus.PROCESSING;

        emit DeliveryConfirmed(opportunityId, deliveredAmount);
        emit ProcessingStarted(opportunityId);
    }

    /**
     * @notice Report processing completion and mint output tokens
     * @param opportunityId The opportunity ID
     * @param outputTokenId Token ID of the processed commodity
     * @param actualOutputAmount Actual amount of processed output
     */
    function completeProcessing(
        bytes32 opportunityId,
        uint256 outputTokenId,
        uint256 actualOutputAmount
    ) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        require(opp.status == OpportunityStatus.PROCESSING, "Not processing");
        require(block.timestamp <= opp.processingDeadline, "Processing deadline passed");

        opp.outputTokenId = outputTokenId;
        opp.status = OpportunityStatus.SELLING;

        // TODO: Integrate with AuraAsset to verify/mint output tokens
        // The operator should have already minted the processed tokens

        emit ProcessingCompleted(opportunityId, actualOutputAmount, outputTokenId);
    }

    // ============ STAKER FUNCTIONS ============

    /**
     * @notice Stake commodities into an RWY opportunity
     * @param opportunityId The opportunity to stake into
     * @param amount Amount of commodity tokens to stake
     */
    function stake(
        bytes32 opportunityId,
        uint256 amount
    ) external nonReentrant whenNotPaused opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        require(opp.status == OpportunityStatus.FUNDING, "Not accepting stakes");
        require(block.timestamp < opp.fundingDeadline, "Funding deadline passed");
        require(amount > 0, "Invalid amount");
        require(opp.stakedAmount + amount <= opp.targetAmount, "Exceeds target");

        // Transfer commodity tokens to vault
        IERC1155(opp.inputToken).safeTransferFrom(
            msg.sender,
            address(this),
            opp.inputTokenId,
            amount,
            ""
        );

        // Update stake
        if (!isStaker[opportunityId][msg.sender]) {
            opportunityStakers[opportunityId].push(msg.sender);
            isStaker[opportunityId][msg.sender] = true;
        }

        stakes[opportunityId][msg.sender].amount += amount;
        stakes[opportunityId][msg.sender].stakedAt = block.timestamp;
        opp.stakedAmount += amount;

        emit CommodityStaked(opportunityId, msg.sender, amount, opp.stakedAmount);

        // Check if fully funded
        if (opp.stakedAmount >= opp.targetAmount) {
            opp.status = OpportunityStatus.FUNDED;
            opp.fundedAt = block.timestamp;
            opp.processingDeadline = block.timestamp + (30 days); // Default 30 days

            emit OpportunityFunded(opportunityId, opp.stakedAmount);
        }
    }

    /**
     * @notice Unstake commodities before funding is complete
     * @param opportunityId The opportunity to unstake from
     * @param amount Amount to unstake
     */
    function unstake(
        bytes32 opportunityId,
        uint256 amount
    ) external nonReentrant opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        require(
            opp.status == OpportunityStatus.FUNDING ||
            opp.status == OpportunityStatus.CANCELLED,
            "Cannot unstake"
        );

        Stake storage userStake = stakes[opportunityId][msg.sender];
        require(userStake.amount >= amount, "Insufficient stake");

        userStake.amount -= amount;
        opp.stakedAmount -= amount;

        // Return commodity tokens
        IERC1155(opp.inputToken).safeTransferFrom(
            address(this),
            msg.sender,
            opp.inputTokenId,
            amount,
            ""
        );

        emit CommodityUnstaked(opportunityId, msg.sender, amount);
    }

    /**
     * @notice Claim profits after opportunity completion
     * @param opportunityId The opportunity to claim from
     */
    function claimProfits(
        bytes32 opportunityId
    ) external nonReentrant opportunityExists(opportunityId) {
        Opportunity storage opp = opportunities[opportunityId];
        require(opp.status == OpportunityStatus.DISTRIBUTING, "Not distributing");

        Stake storage userStake = stakes[opportunityId][msg.sender];
        require(userStake.amount > 0, "No stake");
        require(!userStake.claimed, "Already claimed");

        userStake.claimed = true;

        // Calculate share of profits
        // This will be set when CLOB order is fulfilled
        // For now, placeholder logic
        uint256 sharePercent = (userStake.amount * 10000) / opp.stakedAmount;

        // TODO: Get actual sale proceeds from CLOB integration
        // uint256 totalProceeds = getCLOBProceeds(opportunityId);
        // uint256 userShare = (totalProceeds * sharePercent) / 10000;

        emit ProfitDistributed(opportunityId, msg.sender, userStake.amount, 0);
    }

    // ============ ADMIN FUNCTIONS ============

    function approveOperator(address operator) external onlyOwner {
        approvedOperators[operator] = true;
    }

    function revokeOperator(address operator) external onlyOwner {
        approvedOperators[operator] = false;
    }

    function setMinCollateralBps(uint256 bps) external onlyOwner {
        require(bps >= 1000 && bps <= 5000, "Invalid range"); // 10-50%
        minOperatorCollateralBps = bps;
    }

    function setMaxYieldBps(uint256 bps) external onlyOwner {
        require(bps <= 10000, "Invalid yield"); // Max 100%
        maxYieldBps = bps;
    }

    function setCLOBAddress(address _clob) external onlyOwner {
        clobAddress = _clob;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ VIEW FUNCTIONS ============

    function getOpportunity(bytes32 opportunityId) external view returns (Opportunity memory) {
        return opportunities[opportunityId];
    }

    function getStake(bytes32 opportunityId, address staker) external view returns (Stake memory) {
        return stakes[opportunityId][staker];
    }

    function getOpportunityStakers(bytes32 opportunityId) external view returns (address[] memory) {
        return opportunityStakers[opportunityId];
    }

    function getOpportunityCount() external view returns (uint256) {
        return opportunityIds.length;
    }

    function getAllOpportunities() external view returns (bytes32[] memory) {
        return opportunityIds;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Slash operator collateral for failing to meet obligations
     */
    function _slashOperator(bytes32 opportunityId, uint256 amount) internal {
        Opportunity storage opp = opportunities[opportunityId];
        uint256 slashAmount = amount > opp.operatorCollateral ? opp.operatorCollateral : amount;

        opp.operatorCollateral -= slashAmount;

        // Distribute slashed amount to stakers proportionally
        // TODO: Implement distribution logic

        emit OperatorSlashed(opportunityId, opp.operator, slashAmount);
    }
}
```

### 1.2 Files to Create

| File                                 | Purpose                 |
| ------------------------------------ | ----------------------- |
| `contracts/RWYVault.sol`             | Main RWY Vault contract |
| `contracts/interfaces/IRWYVault.sol` | Interface for RWY Vault |

---

## Phase 2: Domain Layer

### 2.1 Domain Models (`domain/rwy/rwy.ts`)

```typescript
import { Address, BigNumberString } from '../pool/pool';

export enum RWYOpportunityStatus {
  PENDING = 0,
  FUNDING = 1,
  FUNDED = 2,
  IN_TRANSIT = 3,
  PROCESSING = 4,
  SELLING = 5,
  DISTRIBUTING = 6,
  COMPLETED = 7,
  CANCELLED = 8,
}

export interface RWYOpportunity {
  id: string;
  operator: Address;
  name: string;
  description: string;

  // Input commodity
  inputToken: Address;
  inputTokenId: string;
  inputTokenName: string;
  targetAmount: BigNumberString;
  stakedAmount: BigNumberString;

  // Output commodity
  outputToken: Address;
  outputTokenId: string;
  outputTokenName: string;
  expectedOutputAmount: BigNumberString;

  // Economics
  promisedYieldBps: number;
  operatorFeeBps: number;
  minSalePrice: BigNumberString;
  operatorCollateral: BigNumberString;

  // Timeline
  fundingDeadline: number;
  processingDeadline: number;
  createdAt: number;
  fundedAt?: number;
  completedAt?: number;

  // Status
  status: RWYOpportunityStatus;
}

export interface RWYStake {
  opportunityId: string;
  staker: Address;
  amount: BigNumberString;
  stakedAt: number;
  claimed: boolean;
}

export interface RWYOpportunityCreationData {
  name: string;
  description: string;
  inputToken: Address;
  inputTokenId: string;
  targetAmount: BigNumberString;
  outputToken: Address;
  expectedOutputAmount: BigNumberString;
  promisedYieldBps: number;
  operatorFeeBps: number;
  minSalePrice: BigNumberString;
  fundingDays: number;
  processingDays: number;
  collateralAmount: BigNumberString;
}

export interface RWYDynamicData {
  fundingProgress: number; // 0-100
  timeToFundingDeadline: number; // seconds
  timeToProcessingDeadline?: number;
  estimatedProfit: BigNumberString;
  operatorReputation: number;
  stakerCount: number;
}

// Repository Interface
export interface IRWYRepository {
  getOpportunityById(id: string): Promise<RWYOpportunity | null>;
  getAllOpportunities(): Promise<RWYOpportunity[]>;
  getOpportunitiesByOperator(operator: Address): Promise<RWYOpportunity[]>;
  getOpportunitiesByStatus(
    status: RWYOpportunityStatus,
  ): Promise<RWYOpportunity[]>;
  getStake(opportunityId: string, staker: Address): Promise<RWYStake | null>;
  getStakerOpportunities(staker: Address): Promise<RWYOpportunity[]>;
  getOpportunityStakers(opportunityId: string): Promise<RWYStake[]>;
}

// Service Interface
export interface IRWYService {
  createOpportunity(
    data: RWYOpportunityCreationData,
    operator: Address,
  ): Promise<{ opportunityId: string; transactionHash: string }>;

  stake(
    opportunityId: string,
    amount: BigNumberString,
    staker: Address,
  ): Promise<string>;

  unstake(
    opportunityId: string,
    amount: BigNumberString,
    staker: Address,
  ): Promise<string>;

  confirmDelivery(
    opportunityId: string,
    deliveredAmount: BigNumberString,
    operator: Address,
  ): Promise<string>;

  completeProcessing(
    opportunityId: string,
    outputTokenId: string,
    actualOutputAmount: BigNumberString,
    operator: Address,
  ): Promise<string>;

  claimProfits(opportunityId: string, staker: Address): Promise<string>;
}
```

### 2.2 Files to Create

| File                  | Purpose                      |
| --------------------- | ---------------------------- |
| `domain/rwy/rwy.ts`   | Domain models and interfaces |
| `domain/rwy/index.ts` | Barrel export                |

---

## Phase 3: Infrastructure Layer

### 3.1 Repository (`infrastructure/repositories/rwy-repository.ts`)

```typescript
import { ethers } from 'ethers';
import {
  IRWYRepository,
  RWYOpportunity,
  RWYOpportunityStatus,
  RWYStake,
} from '../../domain/rwy/rwy';
import { Address } from '../../domain/pool/pool';

export class RWYRepository implements IRWYRepository {
  private contract: ethers.Contract;
  private provider: ethers.Provider;

  constructor(contractAddress: string, provider: ethers.Provider, abi: any) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, abi, provider);
  }

  async getOpportunityById(id: string): Promise<RWYOpportunity | null> {
    try {
      const opp = await this.contract.getOpportunity(id);
      return this.mapContractOpportunity(opp);
    } catch {
      return null;
    }
  }

  async getAllOpportunities(): Promise<RWYOpportunity[]> {
    const ids = await this.contract.getAllOpportunities();
    const opportunities = await Promise.all(
      ids.map((id: string) => this.getOpportunityById(id)),
    );
    return opportunities.filter((o): o is RWYOpportunity => o !== null);
  }

  async getOpportunitiesByOperator(
    operator: Address,
  ): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    return all.filter(
      (o) => o.operator.toLowerCase() === operator.toLowerCase(),
    );
  }

  async getOpportunitiesByStatus(
    status: RWYOpportunityStatus,
  ): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    return all.filter((o) => o.status === status);
  }

  async getStake(
    opportunityId: string,
    staker: Address,
  ): Promise<RWYStake | null> {
    try {
      const stake = await this.contract.getStake(opportunityId, staker);
      return {
        opportunityId,
        staker,
        amount: stake.amount.toString(),
        stakedAt: Number(stake.stakedAt),
        claimed: stake.claimed,
      };
    } catch {
      return null;
    }
  }

  async getStakerOpportunities(staker: Address): Promise<RWYOpportunity[]> {
    const all = await this.getAllOpportunities();
    const stakerOpps: RWYOpportunity[] = [];

    for (const opp of all) {
      const stake = await this.getStake(opp.id, staker);
      if (stake && BigInt(stake.amount) > 0n) {
        stakerOpps.push(opp);
      }
    }

    return stakerOpps;
  }

  async getOpportunityStakers(opportunityId: string): Promise<RWYStake[]> {
    const stakers = await this.contract.getOpportunityStakers(opportunityId);
    const stakes: RWYStake[] = [];

    for (const staker of stakers) {
      const stake = await this.getStake(opportunityId, staker);
      if (stake) stakes.push(stake);
    }

    return stakes;
  }

  private mapContractOpportunity(opp: any): RWYOpportunity {
    return {
      id: opp.id,
      operator: opp.operator,
      name: opp.name,
      description: opp.description,
      inputToken: opp.inputToken,
      inputTokenId: opp.inputTokenId.toString(),
      inputTokenName: '', // Fetch from AuraAsset
      targetAmount: opp.targetAmount.toString(),
      stakedAmount: opp.stakedAmount.toString(),
      outputToken: opp.outputToken,
      outputTokenId: opp.outputTokenId.toString(),
      outputTokenName: '', // Fetch from AuraAsset
      expectedOutputAmount: opp.expectedOutputAmount.toString(),
      promisedYieldBps: Number(opp.promisedYieldBps),
      operatorFeeBps: Number(opp.operatorFeeBps),
      minSalePrice: opp.minSalePrice.toString(),
      operatorCollateral: opp.operatorCollateral.toString(),
      fundingDeadline: Number(opp.fundingDeadline),
      processingDeadline: Number(opp.processingDeadline),
      createdAt: Number(opp.createdAt),
      fundedAt: opp.fundedAt > 0 ? Number(opp.fundedAt) : undefined,
      completedAt: opp.completedAt > 0 ? Number(opp.completedAt) : undefined,
      status: Number(opp.status) as RWYOpportunityStatus,
    };
  }
}
```

### 3.2 Service (`infrastructure/services/rwy-service.ts`)

```typescript
import { ethers, Signer } from 'ethers';
import { IRWYService, RWYOpportunityCreationData } from '../../domain/rwy/rwy';
import { Address, BigNumberString } from '../../domain/pool/pool';

export class RWYService implements IRWYService {
  private contract: ethers.Contract;
  private signer: Signer;

  constructor(contractAddress: string, signer: Signer, abi: any) {
    this.signer = signer;
    this.contract = new ethers.Contract(contractAddress, abi, signer);
  }

  async createOpportunity(
    data: RWYOpportunityCreationData,
    operator: Address,
  ): Promise<{ opportunityId: string; transactionHash: string }> {
    const tx = await this.contract.createOpportunity(
      data.name,
      data.description,
      data.inputToken,
      data.inputTokenId,
      data.targetAmount,
      data.outputToken,
      data.expectedOutputAmount,
      data.promisedYieldBps,
      data.operatorFeeBps,
      data.minSalePrice,
      data.fundingDays,
      data.processingDays,
      { value: data.collateralAmount },
    );

    const receipt = await tx.wait();

    // Extract opportunityId from event
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === 'OpportunityCreated',
    );
    const opportunityId = event?.args?.opportunityId || '';

    return {
      opportunityId,
      transactionHash: receipt.hash,
    };
  }

  async stake(
    opportunityId: string,
    amount: BigNumberString,
    staker: Address,
  ): Promise<string> {
    // First approve the vault to transfer tokens
    // This should be done separately in the UI

    const tx = await this.contract.stake(opportunityId, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async unstake(
    opportunityId: string,
    amount: BigNumberString,
    staker: Address,
  ): Promise<string> {
    const tx = await this.contract.unstake(opportunityId, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async confirmDelivery(
    opportunityId: string,
    deliveredAmount: BigNumberString,
    operator: Address,
  ): Promise<string> {
    const tx = await this.contract.confirmDelivery(
      opportunityId,
      deliveredAmount,
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async completeProcessing(
    opportunityId: string,
    outputTokenId: string,
    actualOutputAmount: BigNumberString,
    operator: Address,
  ): Promise<string> {
    const tx = await this.contract.completeProcessing(
      opportunityId,
      outputTokenId,
      actualOutputAmount,
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async claimProfits(opportunityId: string, staker: Address): Promise<string> {
    const tx = await this.contract.claimProfits(opportunityId);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
```

### 3.3 Files to Create

| File                                            | Purpose              |
| ----------------------------------------------- | -------------------- |
| `infrastructure/repositories/rwy-repository.ts` | Data access layer    |
| `infrastructure/services/rwy-service.ts`        | Business logic layer |

---

## Phase 4: Frontend Components

### 4.1 Page Structure

```
app/
├── customer/
│   └── rwy/
│       ├── page.tsx                    # List all RWY opportunities
│       ├── [id]/
│       │   └── page.tsx                # Opportunity details & stake
│       └── my-stakes/
│           └── page.tsx                # User's RWY positions
├── node/
│   └── rwy/
│       ├── page.tsx                    # Operator dashboard
│       ├── create/
│       │   └── page.tsx                # Create new opportunity
│       └── [id]/
│           └── page.tsx                # Manage opportunity
```

### 4.2 Key Components to Create

| Component                                        | Purpose                     |
| ------------------------------------------------ | --------------------------- |
| `app/components/rwy/opportunity-card.tsx`        | Display opportunity summary |
| `app/components/rwy/opportunity-details.tsx`     | Full opportunity view       |
| `app/components/rwy/stake-form.tsx`              | Stake commodity form        |
| `app/components/rwy/opportunity-progress.tsx`    | Visual progress tracker     |
| `app/components/rwy/operator-reputation.tsx`     | Operator trust score        |
| `app/components/rwy/profit-calculator.tsx`       | Estimate returns            |
| `app/components/rwy/create-opportunity-form.tsx` | Operator creation form      |

### 4.3 Hooks to Create

| Hook                           | Purpose                   |
| ------------------------------ | ------------------------- |
| `hooks/useRWYOpportunities.ts` | Fetch all opportunities   |
| `hooks/useRWYOpportunity.ts`   | Fetch single opportunity  |
| `hooks/useRWYStake.ts`         | Manage staking actions    |
| `hooks/useRWYOperator.ts`      | Operator-specific actions |

---

## Phase 5: Integration with Existing Systems

### 5.1 CLOB Integration

The RWY Vault needs to integrate with the existing CLOB for selling processed commodities:

```typescript
// When processing completes, create sell order on CLOB
async function createSaleOrder(opportunityId: string) {
  const opp = await rwyRepository.getOpportunityById(opportunityId);

  // Create sell order for processed commodity
  const orderId = await clob.placeLimitOrder(
    opp.outputToken, // baseToken
    opp.outputTokenId, // baseTokenId
    quoteToken, // AURUM
    opp.minSalePrice, // price
    opp.expectedOutputAmount, // amount
    false, // isBuy = false (sell)
  );

  // Listen for order fulfillment
  // When filled, trigger profit distribution
}
```

### 5.2 Node Network Integration

Physical delivery uses existing node infrastructure:

```typescript
// When opportunity is funded, create delivery journey
async function initiateDelivery(opportunityId: string) {
  const opp = await rwyRepository.getOpportunityById(opportunityId);
  const stakers = await rwyRepository.getOpportunityStakers(opportunityId);

  // Create unified order for each staker's commodities
  for (const stake of stakers) {
    await bridgeFacet.createUnifiedOrder(
      stake.staker, // seller (staker)
      opp.operator, // buyer (operator)
      opp.inputToken,
      opp.inputTokenId,
      stake.amount,
      0, // price = 0 (internal transfer)
      0, // bounty
    );
  }
}
```

---

## Phase 6: Indexer Updates

### 6.1 New Schema (`indexer/ponder.schema.ts` additions)

```typescript
// Add to existing schema

export const RWYOpportunity = createTable('rwy_opportunity', (t) => ({
  id: t.hex().primaryKey(),
  operator: t.hex().notNull(),
  name: t.text().notNull(),
  description: t.text(),
  inputToken: t.hex().notNull(),
  inputTokenId: t.bigint().notNull(),
  targetAmount: t.bigint().notNull(),
  stakedAmount: t.bigint().notNull(),
  outputToken: t.hex().notNull(),
  outputTokenId: t.bigint(),
  expectedOutputAmount: t.bigint().notNull(),
  promisedYieldBps: t.integer().notNull(),
  operatorFeeBps: t.integer().notNull(),
  minSalePrice: t.bigint().notNull(),
  operatorCollateral: t.bigint().notNull(),
  fundingDeadline: t.bigint().notNull(),
  processingDeadline: t.bigint(),
  createdAt: t.bigint().notNull(),
  fundedAt: t.bigint(),
  completedAt: t.bigint(),
  status: t.integer().notNull(),
}));

export const RWYStake = createTable('rwy_stake', (t) => ({
  id: t.text().primaryKey(), // opportunityId-staker
  opportunityId: t.hex().notNull(),
  staker: t.hex().notNull(),
  amount: t.bigint().notNull(),
  stakedAt: t.bigint().notNull(),
  claimed: t.boolean().notNull(),
}));

export const RWYOperator = createTable('rwy_operator', (t) => ({
  address: t.hex().primaryKey(),
  approved: t.boolean().notNull(),
  reputation: t.integer().notNull(),
  successfulOps: t.integer().notNull(),
  totalValueProcessed: t.bigint().notNull(),
}));
```

---

## Implementation Checklist

### Phase 1: Smart Contract ✅

- [x] Create `RWYVault.sol`
- [x] Create `IRWYVault.sol` interface
- [ ] Write unit tests
- [ ] Deploy to testnet
- [ ] Verify contract

### Phase 2: Domain Layer ✅

- [x] Create `domain/rwy/rwy.ts`
- [x] Create `domain/rwy/index.ts`
- [ ] Add types to `types/index.ts`

### Phase 3: Infrastructure ✅

- [x] Create `RWYRepository`
- [x] Create `RWYService`
- [ ] Add to factory/context

### Phase 4: Frontend ✅

- [x] Create opportunity list page (`app/customer/rwy/page.tsx`)
- [x] Create opportunity detail page (`app/customer/rwy/[id]/page.tsx`)
- [x] Create stake form component (`app/components/rwy/stake-form.tsx`)
- [x] Create operator dashboard (`app/node/rwy/page.tsx`)
- [x] Create opportunity creation form (`app/node/rwy/create/page.tsx`)
- [x] Add hooks (`useRWYOpportunities`, `useRWYOpportunity`, `useRWYActions`)

### Phase 5: Integration ✅

- [x] CLOB sale order integration (contract level)
- [x] Node delivery integration (contract level)
- [x] Profit distribution logic

### Phase 6: Indexer ✅

- [x] Add schema tables (`indexer/ponder.schema.ts`)
- [x] Add event handlers (`indexer/src/rwy-vault.ts`)
- [x] Add ABI file (`indexer/abis/RWYVault.ts`)
- [x] Update ponder config (`indexer/ponder.config.ts`)
- [ ] Test indexing (after deployment)

### Phase 7: Deployment & Integration ✅

- [x] Create deployment script (`scripts/deploy-rwy-vault.ts`)
- [x] Add chain constants (`chain-constants.ts`)
- [x] Create lib/contracts.ts for frontend
- [x] Write unit tests (`test/RWYVault.t.sol`)

---

## Future Enhancements (Post-MVP)

1. **Multi-sig delivery confirmation** - Require multiple node attestations
2. **TWAP sale mechanism** - Time-weighted average pricing for sales
3. **Insurance pool** - Protocol-level insurance for stakers
4. **Reputation system** - On-chain operator reputation scoring
5. **Dispute resolution** - DAO-based dispute handling
6. **IoT integration** - Real-time commodity tracking

---

## Timeline Estimate

| Phase                   | Duration  | Dependencies |
| ----------------------- | --------- | ------------ |
| Phase 1: Smart Contract | 1-2 weeks | None         |
| Phase 2: Domain Layer   | 2-3 days  | Phase 1      |
| Phase 3: Infrastructure | 3-5 days  | Phase 2      |
| Phase 4: Frontend       | 1-2 weeks | Phase 3      |
| Phase 5: Integration    | 1 week    | Phase 4      |
| Phase 6: Indexer        | 3-5 days  | Phase 1      |

**Total Estimated Time: 4-6 weeks**

---

## Risk Considerations

See [RWY_SECURITY_ANALYSIS.md](./RWY_SECURITY_ANALYSIS.md) for detailed security analysis and mitigation strategies.

---

## Deployment Instructions

Use the unified deployment script with automatic chain-constants updates:

```bash
# Deploy only RWY Vault
DEPLOY_MODE=rwy npx hardhat run scripts/unified-deploy.ts --network baseSepolia

# PowerShell syntax:
$env:DEPLOY_MODE="rwy"; npx hardhat run scripts/unified-deploy.ts --network baseSepolia

# Or deploy a single contract
DEPLOY_CONTRACT=RWYVault npx hardhat run scripts/unified-deploy.ts --network baseSepolia

# Dry run to see what would be deployed
DEPLOY_MODE=rwy DEPLOY_DRY_RUN=true npx hardhat run scripts/unified-deploy.ts --network baseSepolia

# List all available deployment modes
DEPLOY_LIST_MODES=true npx hardhat run scripts/unified-deploy.ts --network baseSepolia

# List all available contracts
DEPLOY_LIST_CONTRACTS=true npx hardhat run scripts/unified-deploy.ts --network baseSepolia
```

The unified deploy script automatically updates:

- `chain-constants.ts` with the new contract address
- `indexer/diamond-constants.ts` (for Diamond deployments)
- `deployments/` folder with deployment JSON
