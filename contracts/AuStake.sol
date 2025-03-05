pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Aura.sol';

/**
 * @title AuStake
 * @dev A staking contract that allows users to stake tokens and earn percentage-based rewards
 * The reward system is designed to give users a percentage return on their staked amount
 * For example, if reward is set to 100 (100%), a user staking 1 token will receive 2 tokens back
 */
contract AuStake is ReentrancyGuard, Ownable {
  // Operation states track the lifecycle of staking operations
  enum OperationStatus {
    INACTIVE, // Operation not yet started
    ACTIVE, // Operation is ongoing and accepting stakes
    COMPLETE, // Operation finished, ready for rewards
    PAID // All rewards have been distributed
  }

  // Stake struct tracks individual user stakes
  struct Stake {
    uint256 amount; // Amount of tokens staked
    uint256 timestamp; // When the stake was made
    bool isActive; // Whether stake can still be claimed
  }

  // Operation struct defines a staking operation
  struct Operation {
    bytes32 id; // Unique identifier
    string name; // Operation name
    string description; // Operation description
    address token; // Token being staked
    address provider; // Provider of the operation
    uint256 deadline; // Duration in days
    uint256 startDate; // Timestamp when operation started
    string rwaName; // Name of real-world asset
    uint256 reward; // Reward percentage in basis points (1234 = 12.34%)
    uint256 tokenTvl; // Total value locked
    OperationStatus operationStatus; // Current status
    uint256 fundingGoal; // Funding goal in wei (18 decimals)
    uint256 assetPrice; // Asset price in wei (18 decimals)
  }

  // Constants for decimal handling
  uint256 private constant REWARD_DECIMALS = 2;
  uint256 private constant REWARD_PRECISION = 100; // 10^REWARD_DECIMALS
  uint256 private constant TOKEN_DECIMALS = 18;
  uint256 private constant TOKEN_PRECISION = 1e18; // 10^TOKEN_DECIMALS

  // State variables
  address payable public projectWallet;
  bytes32[] public activeOperations;
  mapping(bytes32 => Operation) public idToOperation;
  mapping(address => bool) public admins;
  uint256 public lockPeriod;
  mapping(address => bytes32[]) public providerToOperationIds;
  mapping(address => bytes32) public tokenToOperationIds;
  mapping(address => mapping(address => Stake)) public stakes;
  mapping(bytes32 => mapping(address => Stake)) public operationStakes;
  mapping(address => uint256) public tokenTvl;

  uint256 private operationIdCounter;

  // Events
  event Staked(
    address indexed token,
    address indexed user,
    uint256 amount,
    bytes32 indexed operationId,
    string eType,
    uint time
  );
  event Unstaked(
    address indexed token,
    address indexed user,
    uint256 amount,
    bytes32 indexed operationId,
    string eType,
    uint time
  );
  event RewardPaid(
    address indexed user,
    uint256 amount,
    bytes32 indexed operationId
  );
  event OperationCreated(
    bytes32 indexed operationId,
    string name,
    address token
  );
  event AdminStatusChanged(address indexed admin, bool status);

  constructor(address payable _projectWallet, address initialOwner) Ownable() {
    require(_projectWallet != address(0), 'Invalid project wallet');
    projectWallet = _projectWallet;
    admins[initialOwner] = true;
  }

  modifier adminOnly() {
    require(admins[msg.sender], 'Caller is not an admin');
    _;
  }

  /**
   * @dev Creates a new staking operation
   * @param reward Percentage reward in basis points (1234 = 12.34%)
   * @param fundingGoal Amount in wei (18 decimals)
   * @param assetPrice Amount in wei (18 decimals)
   */
  function createOperation(
    string memory name,
    string memory description,
    address token,
    address provider,
    uint256 deadline,
    uint256 reward,
    string memory rwaName,
    uint256 fundingGoal,
    uint256 assetPrice
  ) public adminOnly returns (bytes32) {
    require(token != address(0), 'Invalid token address');
    require(provider != address(0), 'Invalid provider address');
    require(deadline > 0, 'Invalid length');
    require(
      reward > 0 && reward <= 10000,
      'Reward must be between 0 and 10000 basis points'
    );

    operationIdCounter++;
    bytes32 id = keccak256(abi.encode(operationIdCounter));
    Operation storage operation = idToOperation[id];
    operation.name = name;
    operation.description = description;
    operation.token = token;
    operation.provider = provider;
    operation.deadline = deadline;
    operation.reward = reward; // Stored as basis points (12.34% = 1234)
    operation.operationStatus = OperationStatus.ACTIVE;
    operation.id = id;
    operation.startDate = block.timestamp;
    operation.rwaName = rwaName;
    operation.fundingGoal = fundingGoal; // Stored in wei (18 decimals)
    operation.assetPrice = assetPrice; // Stored in wei (18 decimals)

    providerToOperationIds[provider].push(id);
    tokenToOperationIds[token] = id;
    activeOperations.push(id);

    emit OperationCreated(id, name, token);
    return id;
  }

  /**
   * @dev Allows users to stake tokens in an operation
   */
  function stake(
    address token,
    bytes32 operationId,
    uint256 amount
  ) external nonReentrant {
    require(amount > 0, 'Cannot stake 0');
    require(idToOperation[operationId].token == token, 'Token mismatch');

    IERC20 tokenContract = IERC20(token);
    require(
      tokenContract.transferFrom(msg.sender, address(this), amount),
      'Transfer failed'
    );

    stakes[token][msg.sender] = Stake({
      amount: amount,
      timestamp: block.timestamp,
      isActive: true
    });

    operationStakes[operationId][msg.sender] = Stake({
      amount: amount,
      timestamp: block.timestamp,
      isActive: true
    });

    idToOperation[operationId].tokenTvl += amount;
    tokenTvl[token] += amount;

    emit Staked(
      token,
      msg.sender,
      amount,
      operationId,
      'Staked',
      block.timestamp
    );
  }

  /**
   * @dev Burns staked tokens (admin only)
   */
  function burn(
    address token,
    address user,
    bytes32 operationId
  ) public nonReentrant adminOnly {
    Stake storage userStake = stakes[token][user];
    require(userStake.isActive, 'No active stake');
    require(idToOperation[operationId].token == token, 'Token mismatch');

    uint256 amount = userStake.amount;
    userStake.isActive = false;

    IERC20 tokenContract = IERC20(token);
    require(tokenContract.transfer(projectWallet, amount), 'Failed to transfer tokens');

    tokenTvl[token] -= amount;
    idToOperation[operationId].tokenTvl -= amount;

    emit Unstaked(token, user, amount, operationId, 'Burned', block.timestamp);
  }

  /**
   * @dev Provider unlocks rewards for an operation
   */
  function unlockReward(address token, bytes32 operationId) public {
    require(
      idToOperation[operationId].provider == msg.sender,
      'sender is not the provider'
    );

    IERC20 tokenContract = IERC20(token);
    Operation storage operation = idToOperation[operationId];

    // Calculate total rewards using basis points
    uint256 totalRewardsNeeded = (operation.tokenTvl * operation.reward) / REWARD_PRECISION;

    operation.operationStatus = OperationStatus.COMPLETE;

    require(
      tokenContract.transferFrom(msg.sender, address(this), totalRewardsNeeded),
      'Reward transfer failed'
    );
  }

  /**
   * @dev Users claim their stake plus reward
   */
  function claimReward(
    address token,
    bytes32 operationId,
    address user
  ) external {
    require(idToOperation[operationId].token == token, 'Token mismatch');
    require(
      idToOperation[operationId].operationStatus == OperationStatus.COMPLETE,
      'Operation not complete'
    );

    Stake storage userStake = operationStakes[operationId][user];
    require(userStake.isActive, 'No active stake');

    IERC20 tokenContract = IERC20(token);
    Operation storage operation = idToOperation[operationId];

    // Calculate reward using basis points
    uint256 rewardAmount = (userStake.amount * operation.reward) / REWARD_PRECISION;
    uint256 totalReturn = userStake.amount + rewardAmount;

    userStake.isActive = false; // Prevent double claims
    operation.tokenTvl -= userStake.amount;

    if (operation.tokenTvl == 0) {
      // Remove from active operations when TVL reaches 0
      uint256 swapIndex;
      bool swapFound = false;
      for (uint256 i = 0; i < activeOperations.length; i++) {
        if (activeOperations[i] == operationId) {
          swapIndex = i;
          swapFound = true;
          break;
        }
      }

      if (swapFound) {
        activeOperations[activeOperations.length - 1] = activeOperations[swapIndex];
        activeOperations.pop();
        operation.operationStatus = OperationStatus.PAID;
      }
    }

    require(
      tokenContract.transfer(user, totalReturn),
      'Return transfer failed'
    );
    emit RewardPaid(user, rewardAmount, operationId);
  }

  // Admin functions
  function setOperationReward(bytes32 id, uint256 amount) external adminOnly {
    require(idToOperation[id].token != address(0), 'Operation does not exist');
    require(amount > 0, 'Reward percentage must be greater than 0');
    idToOperation[id].reward = amount;
  }

  function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
    lockPeriod = _lockPeriod;
  }

  function setAdmin(address user, bool status) external onlyOwner {
    require(user != address(0), 'Invalid address');
    admins[user] = status;
    emit AdminStatusChanged(user, status);
  }

  function setProjectWallet(address payable _projectWallet) external onlyOwner {
    require(_projectWallet != address(0), 'Invalid address');
    projectWallet = _projectWallet;
  }

  /**
   * @dev Returns full operation details
   */
  function getOperation(
    bytes32 id
  )
    external
    view
    returns (
      bytes32 returnId,
      string memory name,
      string memory description,
      address token,
      address provider,
      uint256 deadline,
      uint256 startDate,
      string memory rwaName,
      uint256 reward,
      uint256 tokenTvl,
      OperationStatus operationStatus,
      uint256 fundingGoal,
      uint256 assetPrice
    )
  {
    Operation storage operation = idToOperation[id];
    return (
      operation.id,
      operation.name,
      operation.description,
      operation.token,
      operation.provider,
      operation.deadline,
      operation.startDate,
      operation.rwaName,
      operation.reward,
      operation.tokenTvl,
      operation.operationStatus,
      operation.fundingGoal,
      operation.assetPrice
    );
  }
}
