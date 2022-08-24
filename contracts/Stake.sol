// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Stake is Ownable {
  // Events
  event NewStake(address from, uint256 newAmount, uint256 totalAmount);
  event Unstake(address from, uint256 unstakedAmount, uint256 totalAmount);
  event Harvest(address from, uint256 amount);

  // Errors
  error CanNotStakeOrUnstakeZeroToken();
  error CanNotUnstake();
  error CanNotHarvestBefore7Days();
  error NothingToHarvest();

  // Project's token
  IERC20 public immutable TOKEN;

  // Reward per token per second
  uint256 public RPS = 6337752923;

  // Total Staked Value
  uint256 public total;

  struct Operation {
    uint32 start;
    uint32 allTimes; // if user stake more than one without unstakes, we'll keep his stake time in here
    uint192 amount; // it can contain 6277101735386680763835789423207666416102 amount of tokens
  }

  mapping(address => Operation) private _stakes;

  constructor(address tokenAddress) {
    TOKEN = IERC20(tokenAddress);
  }

  function stake(uint256 amount) external {
    if(amount == 0)
      revert CanNotStakeOrUnstakeZeroToken();

    // take payment
    TOKEN.transferFrom(msg.sender, address(this), amount);

    Operation storage ref = _stakes[msg.sender];
    // if user already staked
    if(ref.start != 0) {
      // user's new stake amount is equal to: old stake amount + rewards + new amount
      // compound staking
      ref.amount += uint192(calculateRewards(msg.sender) + _stakes[msg.sender].amount);
    } else {
      ref.amount = uint192(amount);
    }

    _stakes[msg.sender].start = uint32(block.timestamp);

    total += amount;
    emit NewStake(msg.sender, amount, ref.amount);
  }

  function unstake(uint256 amount) external {
    if(amount == 0)
      revert CanNotStakeOrUnstakeZeroToken();

    Operation storage ref = _stakes[msg.sender];
    if(ref.start == 0) 
      revert CanNotUnstake();

    TOKEN.transfer(msg.sender, calculateRewards(msg.sender) + amount);

    ref.amount -= uint192(amount);
    if(ref.amount == 0) {
      ref.start = 0;
      ref.allTimes = 0;
    } else {
      ref.allTimes += uint32(block.timestamp) - ref.start;
      ref.start = uint32(block.timestamp);
    }

    total -= amount;
    emit Unstake(msg.sender, amount, ref.amount);
  }

  function harvest() external {
    uint256 rewards = calculateRewards(msg.sender);

    if(rewards == 0) revert NothingToHarvest();

    Operation memory ref = _stakes[msg.sender];

    if(block.timestamp - ref.start < 7 days)
      revert CanNotHarvestBefore7Days();

    ref.allTimes = uint32(block.timestamp) - ref.start;
    ref.start = uint32(block.timestamp);

    TOKEN.transfer(msg.sender, rewards);

    emit Harvest(msg.sender, rewards);
  }
  

  // View Functions
  function getTier(address owner) external view returns(uint256) {
    Operation memory userStake = _stakes[owner];
    
    if(block.timestamp - userStake.start < 30 days || userStake.amount == 0)
      return 0;

    if(userStake.amount >= 10_000 ether && userStake.amount < 25_000 ether) {
      return 1;
    } else if(userStake.amount >= 25_000 ether && userStake.amount < 75_000 ether) {
      return 2;
    } else if(userStake.amount >= 75_000 ether && userStake.amount < 150_000 ether) {
      return 3;
    } else if(userStake.amount >= 150_000 ether) {
      return 4;
    } else {
      return 0;
    }
  }

  function calculateRewards(address owner) public view returns(uint256) {
    Operation memory userStake = _stakes[owner];

    uint256 stakeTime = block.timestamp - userStake.start;

    return (stakeTime * userStake.amount * RPS) / 10**18;
  }

  function userInfo(address owner) external view returns(Operation memory) {
    return _stakes[owner];
  }

  // Only Owner Functions
  function changeRPS(uint256 newRPS) external onlyOwner {
    RPS = newRPS;
  }
}
