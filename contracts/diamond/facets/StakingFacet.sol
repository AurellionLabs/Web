// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title StakingFacet
 * @notice Business logic facet for staking operations
 * @dev Combines AuStake functionality
 */
contract StakingFacet is AppStorage, Initializable {
    event Staked(
        address indexed user,
        uint256 amount,
        uint256 totalStaked
    );
    event Unstaked(
        address indexed user,
        uint256 amount,
        uint256 remainingStaked
    );
    event RewardsClaimed(
        address indexed user,
        uint256 rewards
    );

    // Reward rate (e.g., 100 = 10% APY)
    uint256 public rewardRate; // Basis points (10000 = 100%)
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    function initialize() public initializer {
        rewardRate = 1000; // 10% APY default
        lastUpdateTime = block.timestamp;
    }

    function stake(uint256 _amount) external {
        require(_amount > 0, 'Cannot stake 0');

        updateReward(msg.sender);

        s.stakes[msg.sender].amount += _amount;
        s.totalStaked += _amount;

        emit Staked(msg.sender, _amount, s.totalStaked);
    }

    function unstake(uint256 _amount) external {
        require(_amount > 0, 'Cannot unstake 0');
        require(
            s.stakes[msg.sender].amount >= _amount,
            'Insufficient stake'
        );

        updateReward(msg.sender);

        s.stakes[msg.sender].amount -= _amount;
        s.totalStaked -= _amount;

        emit Unstaked(msg.sender, _amount, s.totalStaked);
    }

    function claimRewards() external {
        updateReward(msg.sender);

        uint256 reward = s.stakes[msg.sender].rewards;
        if (reward > 0) {
            s.stakes[msg.sender].rewards = 0;
            // Transfer rewards (would interact with token contract)
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    function updateReward(address _account) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
    }

    function rewardPerToken() public view returns (uint256) {
        if (s.totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) /
            s.totalStaked /
            365 days;
    }

    function earned(address _account) public view returns (uint256) {
        return
            ((s.stakes[_account].amount *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) /
                1e18) + rewards[_account];
    }

    function getStake(address _user)
        external
        view
        returns (
            uint256 amount,
            uint256 rewards,
            uint256 stakedAt
        )
    {
        return (
            s.stakes[_user].amount,
            s.stakes[_user].rewards + earned(_user),
            s.stakes[_user].stakedAt
        );
    }

    function getTotalStaked() external view returns (uint256) {
        return s.totalStaked;
    }

    function setRewardRate(uint256 _newRate) external {
        LibDiamond.enforceIsContractOwner();
        updateReward(address(0));
        rewardRate = _newRate;
    }
}

