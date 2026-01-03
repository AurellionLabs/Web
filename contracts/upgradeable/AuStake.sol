// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract AuStakeUpgradeable is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    // Operation states
    enum OperationStatus {
        INACTIVE,
        ACTIVE,
        COMPLETE,
        PAID
    }

    // Stake struct
    struct Stake {
        uint256 amount;
        uint256 timestamp;
        bool isActive;
    }

    // Operation struct
    struct Operation {
        bytes32 id;
        string name;
        string description;
        address token;
        address provider;
        uint256 deadline;
        uint256 startDate;
        string rwaName;
        uint256 reward;
        uint256 tokenTvl;
        OperationStatus operationStatus;
        uint256 fundingGoal;
        uint256 assetPrice;
    }

    uint256 private constant REWARD_DECIMALS = 2;
    uint256 private constant REWARD_PRECISION = 100;
    uint256 private constant TOKEN_DECIMALS = 18;
    uint256 private constant TOKEN_PRECISION = 1e18;

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

    // Storage gap for future upgrades
    uint256[50] private __gap_storage_v1;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address payable _projectWallet, address initialOwner) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init();
        require(_projectWallet != address(0), 'Invalid project wallet');
        projectWallet = _projectWallet;
        admins[initialOwner] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier adminOnly() {
        require(admins[msg.sender], 'Caller is not an admin');
        _;
    }

    event Staked(
        address indexed token,
        address indexed user,
        uint256 amount,
        bytes32 indexed operationId,
        string eType,
        uint256 time
    );
    event Unstaked(
        address indexed token,
        address indexed user,
        uint256 amount,
        bytes32 indexed operationId,
        string eType,
        uint256 time
    );
    event RewardPaid(address indexed user, uint256 amount, bytes32 indexed operationId);
    event OperationCreated(bytes32 indexed operationId, string name, address token);
    event AdminStatusChanged(address indexed admin, bool status);

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
        require(reward > 0 && reward <= 10000, 'Reward must be between 0 and 10000 basis points');

        operationIdCounter++;
        bytes32 id = keccak256(abi.encode(operationIdCounter));
        Operation storage operation = idToOperation[id];
        operation.name = name;
        operation.description = description;
        operation.token = token;
        operation.provider = provider;
        operation.deadline = deadline;
        operation.reward = reward;
        operation.operationStatus = OperationStatus.ACTIVE;
        operation.id = id;
        operation.startDate = block.timestamp;
        operation.rwaName = rwaName;
        operation.fundingGoal = fundingGoal;
        operation.assetPrice = assetPrice;

        providerToOperationIds[provider].push(id);
        tokenToOperationIds[token] = id;
        activeOperations.push(id);

        emit OperationCreated(id, name, token);
        return id;
    }

    function stake(
        address token,
        bytes32 operationId,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, 'Cannot stake 0');
        require(idToOperation[operationId].token == token, 'Token mismatch');

        IERC20 tokenContract = IERC20(token);
        require(tokenContract.transferFrom(msg.sender, address(this), amount), 'Transfer failed');

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

        emit Staked(token, msg.sender, amount, operationId, 'Staked', block.timestamp);
    }

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

    function unlockReward(address token, bytes32 operationId) public {
        require(idToOperation[operationId].provider == msg.sender, 'sender is not the provider');

        IERC20 tokenContract = IERC20(token);
        Operation storage operation = idToOperation[operationId];

        uint256 totalRewardsNeeded = (operation.tokenTvl * operation.reward) / REWARD_PRECISION;
        operation.operationStatus = OperationStatus.COMPLETE;

        require(
            tokenContract.transferFrom(msg.sender, address(this), totalRewardsNeeded),
            'Reward transfer failed'
        );
    }

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

        uint256 rewardAmount = (userStake.amount * operation.reward) / REWARD_PRECISION;
        uint256 totalReturn = userStake.amount + rewardAmount;

        userStake.isActive = false;
        operation.tokenTvl -= userStake.amount;

        if (operation.tokenTvl == 0) {
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
                activeOperations[swapIndex] = activeOperations[activeOperations.length - 1];
                activeOperations.pop();
                operation.operationStatus = OperationStatus.PAID;
            }
        }

        require(tokenContract.transfer(user, totalReturn), 'Return transfer failed');
        emit RewardPaid(user, rewardAmount, operationId);
    }

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

    function getOperation(bytes32 id) external view returns (Operation memory operation) {
        operation = idToOperation[id];
        return operation;
    }
}

