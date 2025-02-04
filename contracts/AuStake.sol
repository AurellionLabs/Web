pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './AuraGoat20.sol';

contract AuStake is ReentrancyGuard, Ownable {
  enum OperationStatus {
    INACTIVE,
    ACTIVE,
    COMPLETE,
    PAID
  }
  struct Stake {
    uint256 amount;
    uint256 timestamp;
    bool isActive;
  }

  struct Operation {
    bytes32 id;
    string name;
    address token;
    address provider;
    uint256 deadline;
    uint256 startDate;
    string rwaName;
    // implement a rep score
    uint256 reward;
    uint256 tokenTvl;
    OperationStatus operationStatus;
  }

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

  function createOperation(
    string memory name,
    address token,
    address provider,
    uint256 deadline,
    uint256 reward,
    string memory rwaName
  ) public adminOnly returns (bytes32) {
    require(token != address(0), 'Invalid token address');
    require(provider != address(0), 'Invalid provider address');
    require(deadline> 0, 'Invalid length');

    operationIdCounter++;
    bytes32 id = keccak256(abi.encode(operationIdCounter));
    Operation storage operation = idToOperation[id];
    operation.name = name;
    operation.token = token;
    operation.provider = provider;
    operation.deadline= deadline;
    operation.reward = reward;
    operation.operationStatus = OperationStatus.ACTIVE;
    operation.id = id;
    operation.startDate = block.timestamp;
    operation.rwaName = rwaName;
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

    emit Staked(token, msg.sender, amount, operationId, "Staked", block.timestamp);
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

    AuraGoat tokenContract = AuraGoat(token);
    require(tokenContract.burn(user, amount), 'Failed to burn tokens');

    tokenTvl[token] -= amount;
    idToOperation[operationId].tokenTvl -= amount;

    emit Unstaked(token, user, amount, operationId, "Staked",block.timestamp);
  }

  function unlockReward(address token, bytes32 operationId) public {
    require(
      idToOperation[operationId].provider == msg.sender,
      'sender is not the provider'
    );
    IERC20 tokenContract = IERC20(token);
    idToOperation[operationId].operationStatus = OperationStatus.COMPLETE;
    require(
      tokenContract.transferFrom(
        msg.sender,
        address(this),
        idToOperation[operationId].reward
      ),
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
      idToOperation[operationId].operationStatus == OperationStatus.COMPLETE
    );

    Stake storage userStake = operationStakes[operationId][user];
    require(userStake.isActive, 'No active stake');
    IERC20 tokenContract = IERC20(token);
    Operation storage operation = idToOperation[operationId];
    uint256 userShare = (userStake.amount * 1e18) / operation.tokenTvl;
    uint256 reward = (operation.reward * userShare) / 1e18;
    operation.tokenTvl -= reward;
    if(operation.tokenTvl == 0){
        uint swapIndex;
        bool swapFound = false;
        for (uint i = 0; i < activeOperations.length; i++) {
            if (activeOperations[i] == operationId) {
                swapIndex = i;
                swapFound = true;
                break;
            }
        }
        require(swapFound == true, 'Operation Id not found');
        activeOperations[activeOperations.length - 1] = activeOperations[swapIndex];
        activeOperations.pop();
        operation.operationStatus = OperationStatus.PAID;
    }
    require(tokenContract.transfer(user, reward), 'Reward transfer failed');
    emit RewardPaid(user, reward, operationId);
  }

  function setOperationReward(bytes32 id, uint256 amount) external adminOnly {
    require(idToOperation[id].token != address(0), 'Operation does not exist');
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

  function getOperation(
    bytes32 id
  )
    external
    view
    returns (
    bytes32 returnId,
    string memory name,
    address token,
    address provider,
    uint256 deadline,
    uint256 startDate,
    string memory rwaName,
    // implement a rep score
    uint256 reward,
    uint256 tokenTvl,
    OperationStatus operationStatus
    )
  {
    Operation storage operation = idToOperation[id];
    return (
      operation.id,
      operation.name,
      operation.token,
      operation.provider,
      operation.deadline,
      operation.startDate,
      operation.rwaName,
      operation.reward,
      operation.tokenTvl,
      operation.operationStatus
    );
  }
}


