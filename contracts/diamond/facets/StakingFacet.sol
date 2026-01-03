// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title StakingFacet
 * @notice Business logic facet for staking operations
 * @dev Combines AuStake functionality
 */
contract StakingFacet is Initializable {
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    uint256 public constant REWARD_DURATION = 7 days;

    function initialize() public initializer {}

    function stake(uint256 _amount) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(_amount > 0, 'Cannot stake 0');

        // Update rewards before staking
        _updateReward(msg.sender);

        s.stakes[msg.sender].amount += _amount;
        s.stakes[msg.sender].stakedAt = block.timestamp;
        s.totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.stakes[msg.sender].amount >= _amount, 'Insufficient stake');

        _updateReward(msg.sender);

        s.stakes[msg.sender].amount -= _amount;
        s.totalStaked -= _amount;

        emit Withdrawn(msg.sender, _amount);
    }

    function claimRewards() external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        _updateReward(msg.sender);

        uint256 reward = s.rewards[msg.sender];
        if (reward > 0) {
            s.rewards[msg.sender] = 0;
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    function _updateReward(address _account) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        if (s.totalStaked == 0) {
            return;
        }

        s.rewards[_account] += earned(_account);
        s.userRewardPerTokenPaid[_account] = s.rewardPerTokenStored;
    }

    function earned(address _account) public view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        uint256 currentRewardPerToken = s.rewardPerTokenStored;
        if (s.totalStaked == 0) {
            return s.rewards[_account];
        }

        uint256 rewardPerToken = currentRewardPerToken - s.userRewardPerTokenPaid[_account];
        uint256 pendingRewards = (s.stakes[_account].amount * rewardPerToken) / 1e18;

        return s.rewards[_account] + pendingRewards;
    }

    function getStake(address _user)
        external
        view
        returns (
            uint256 amount,
            uint256 earnedRewards,
            uint256 stakedAt
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return (
            s.stakes[_user].amount,
            s.stakes[_user].rewards + earned(_user),
            s.stakes[_user].stakedAt
        );
    }

    function getTotalStaked() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalStaked;
    }

    function setRewardRate(uint256 _newRate) external {
        LibDiamond.enforceIsContractOwner();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 oldRate = s.rewardRate;
        s.rewardRate = _newRate;
        s.lastUpdateTime = block.timestamp;
        emit RewardRateUpdated(oldRate, _newRate);
    }

    function getRewardRate() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.rewardRate;
    }
}
