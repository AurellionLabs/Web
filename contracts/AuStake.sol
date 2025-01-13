pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AuraGoat20.sol";

contract AuStake is ReentrancyGuard, Ownable {
    struct Stake {
        uint256 amount;
        uint256 timestamp;
        bool isActive;
    }
    
    struct Operation {
        string name;
        address token;
        address provider;
        uint256 lengthInDays;
        uint256 reward;
        uint256 tokenTvl;
    }
    
    address payable public projectWallet;
    mapping(bytes32 => Operation) public idToOperation;
    mapping(address => bool) public admins;
    uint256 public lockPeriod;
    mapping(address => bytes32[]) public providerToOperationIds;
    mapping(address => bytes32) public tokenToOperationIds;
    mapping(address => mapping(address => Stake)) public stakes;
    mapping(bytes32 => mapping(address => Stake)) public operationStakes;
    mapping(address => uint256) public tokenTvl;
    
    uint256 private operationIdCounter;
    
    event Staked(address indexed token, address indexed user, uint256 amount, bytes32 indexed operationId);
    event Unstaked(address indexed token, address indexed user, uint256 amount, bytes32 indexed operationId);
    event RewardPaid(address indexed user, uint256 amount, bytes32 indexed operationId);
    event OperationCreated(bytes32 indexed operationId, string name, address token);
    event AdminStatusChanged(address indexed admin, bool status);
    
    constructor(
        address payable _projectWallet,
        address initialOwner
    ) Ownable() {
        require(_projectWallet != address(0), "Invalid project wallet");
        projectWallet = _projectWallet;
        admins[initialOwner] = true;
    }
    
    modifier adminOnly() {
        require(admins[msg.sender], "Caller is not an admin");
        _;
    }
    
    function createOperation(
        string memory name,
        address token,
        address provider,
        uint256 lengthInDays,
        uint256 reward
    ) public adminOnly returns (bytes32) {
        require(token != address(0), "Invalid token address");
        require(provider != address(0), "Invalid provider address");
        require(lengthInDays > 0, "Invalid length");
        
        operationIdCounter++;
        bytes32 id = keccak256(abi.encode(operationIdCounter));
        
        Operation storage operation = idToOperation[id];
        operation.name = name;
        operation.token = token;
        operation.provider = provider;
        operation.lengthInDays = lengthInDays;
        operation.reward = reward;
        
        providerToOperationIds[provider].push(id);
        tokenToOperationIds[token] = id;
        
        emit OperationCreated(id, name, token);
        return id;
    }
    
    function stake(address token, bytes32 operationId, uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(idToOperation[operationId].token == token, "Token mismatch");
        
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
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
        
        emit Staked(token, msg.sender, amount, operationId);
    }
    
    function burn(address token, address user, bytes32 operationId) public nonReentrant adminOnly {
        Stake storage userStake = stakes[token][user];
        require(userStake.isActive, "No active stake");
        require(idToOperation[operationId].token == token, "Token mismatch");
        
        uint256 amount = userStake.amount;
        userStake.isActive = false;
        
        AuraGoat tokenContract = AuraGoat(token);
        require(tokenContract.burn(user, amount), "Failed to burn tokens");
        
        tokenTvl[token] -= amount;
        idToOperation[operationId].tokenTvl -= amount;
        
        emit Unstaked(token, user, amount, operationId);
    }
    
    function triggerReward(address token, bytes32 operationId, address user) external adminOnly {
        require(idToOperation[operationId].token == token, "Token mismatch");
        Stake storage userStake = operationStakes[operationId][user];
        require(userStake.isActive, "No active stake");
        
        Operation storage operation = idToOperation[operationId];
        uint256 userShare = (userStake.amount * 1e18) / operation.tokenTvl;
        uint256 reward = (operation.reward * userShare) / 1e18;
        
        burn(token, user, operationId);
        
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.transfer(user, reward), "Reward transfer failed");
        
        emit RewardPaid(user, reward, operationId);
    }
    
    function setOperationReward(bytes32 id, uint256 amount) external adminOnly {
        require(idToOperation[id].token != address(0), "Operation does not exist");
        idToOperation[id].reward = amount;
    }
    
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        lockPeriod = _lockPeriod;
    }
    
    function setAdmin(address user, bool status) external onlyOwner {
        require(user != address(0), "Invalid address");
        admins[user] = status;
        emit AdminStatusChanged(user, status);
    }
    
    function setProjectWallet(address payable _projectWallet) external onlyOwner {
        require(_projectWallet != address(0), "Invalid address");
        projectWallet = _projectWallet;
    }
    
    function getOperation(bytes32 id) external view returns (
        string memory name,
        address token,
        address provider,
        uint256 lengthInDays,
        uint256 reward,
        uint256 tokenTvl
    ) {
        Operation storage operation = idToOperation[id];
        return (
            operation.name,
            operation.token,
            operation.provider,
            operation.lengthInDays,
            operation.reward,
            operation.tokenTvl
        );
    }
}
