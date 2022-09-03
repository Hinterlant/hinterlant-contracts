// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LockedStake is Ownable {
    // Events
    event NewStake(address from, uint256 stakeAmount, uint256 totalAmount);
    event Unstake(address from, uint256 remainingAmount);
    event Harvest(address from, uint256 amount);

    // Errors
    error CanNotStakeOrUnstakeZeroToken();
    error CanNotUnstake();
    error NothingToHarvest();
    error CannotLockMoreThanOnce(); // for reward calculation purposes

    // Enum for lock
    enum LockTime {
        SEVEN_DAYS,
        THIRTY_DAYS,
        ONE_YEAR
    }

    // Project's token
    IERC20 public immutable TOKEN;

    // Reward per token per second
    uint256 public RPS = 6337752923;

    // Total Staked Value
    uint256 public total;

    struct Operation {
        uint32 start;
        uint216 amount;
        LockTime lockTime;
    }

    mapping(address => Operation) private _stakes;

    constructor(address tokenAddress) {
        TOKEN = IERC20(tokenAddress);
    }

    function stake(uint256 amount, LockTime lockTime) external {
        if (amount == 0) revert CanNotStakeOrUnstakeZeroToken();

        // take tokens
        TOKEN.transferFrom(msg.sender, address(this), amount);

        Operation storage ref = _stakes[msg.sender];
        // if user already staked
        if (ref.start != 0) {
            revert CannotLockMoreThanOnce();
        }

        ref.start = uint32(block.timestamp);
        ref.amount = uint216(amount);
        ref.lockTime = lockTime;

        total += amount;
        emit NewStake(msg.sender, amount, ref.amount);
    }

    function claim() external {
        Operation storage ref = _stakes[msg.sender];
        if (ref.start == 0) revert CanNotUnstake();

        uint256 lockTime;
        if (ref.lockTime == LockTime.SEVEN_DAYS) {
            lockTime = 7 days;
        } else if (ref.lockTime == LockTime.THIRTY_DAYS) {
            lockTime = 30 days;
        } else if (ref.lockTime == LockTime.ONE_YEAR) {
            lockTime = 365 days;
        }

        if (block.timestamp < ref.start + lockTime) {
            revert CanNotUnstake();
        }

        TOKEN.transfer(msg.sender, calculateRewards(msg.sender) + ref.amount);

        ref.start = 0;

        total -= ref.amount;
        emit Unstake(msg.sender, ref.amount);
    }

    // View Functions
    function getTier(address owner) external view returns (uint256) {
        Operation memory userStake = _stakes[owner];

        if (
            userStake.amount >= 10_000 ether && userStake.amount < 25_000 ether
        ) {
            return 1;
        } else if (
            userStake.amount >= 25_000 ether && userStake.amount < 75_000 ether
        ) {
            return 2;
        } else if (
            userStake.amount >= 75_000 ether && userStake.amount < 150_000 ether
        ) {
            return 3;
        } else if (userStake.amount >= 150_000 ether) {
            return 4;
        } else {
            return 0;
        }
    }

    function calculateRewards(address owner) public view returns (uint256) {
        Operation memory userStake = _stakes[owner];

        uint256 stakeTime = block.timestamp - userStake.start;

        return (stakeTime * userStake.amount * RPS) / 10**18;
    }

    function userInfo(address owner) external view returns (Operation memory) {
        return _stakes[owner];
    }

    // Only Owner Functions
    function changeRPS(uint256 newRPS) external onlyOwner {
        RPS = newRPS;
    }
}
