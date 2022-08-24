// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStake {
    function getTier(address owner) external view returns (uint256);
}

interface IToken is IERC20 {
    function decimals() external view returns (uint8);
}

contract Launchpad is Ownable {
    // Token Price
    uint256 public TP;

    // Total amount in Tokens to sale
    uint256 public TOTAL_SALE_VALUE;

    // deposited money
    mapping(address => uint256) public balances;

    // claimed tokens
    mapping(address => uint256) public claimed;

    // Our stake contract for getting tier information
    IStake public STAKE;

    // Token to distribute
    IToken public TOKEN;

    // Base Point
    uint256 public constant BP = 10000;

    // Allocations
    uint256[] public ALLOCATIONS;

    // Sale Start
    uint256 public SALE_START;

    // Sale End
    uint256 public SALE_END;

    // For vesting
    uint256[] public PERCENTAGES;

    // Times for vesting
    uint256[] public TIMES;

    uint256 public TOTAL_RECEIVED;

    // errors
    error InvalidAmount();
    error InsufficientTier();
    error InsufficientPayment();
    error AmountExceedsAllocation();
    error SaleIsNotStartedYet();
    error SaleIsFinished();
    error NothingToClaim();
    error AmountExceedsMaxAmount();
    error SaleIsNotFinishedYet();

    // events
    event Bought(address buyer, uint256 amount);
    event Claimed(address claimer, uint256 amount);

    constructor(
        uint256 _tp,
        uint256 _totalSaleValue,
        address _stakeAddress,
        address _tokenAddress,
        uint256[] memory _allocs,
        uint256 _saleStart,
        uint256 _saleEnd,
        uint256[] memory _percentages,
        uint256[] memory _times
    ) {
        TP = _tp;
        TOTAL_SALE_VALUE = _totalSaleValue;

        STAKE = IStake(_stakeAddress);
        TOKEN = IToken(_tokenAddress);

        SALE_START = _saleStart;
        SALE_END = _saleEnd;

        uint256 _totalPerc;
        for (uint256 i; i < _percentages.length; i++) {
            _totalPerc += _percentages[i];
        }
        require(_totalPerc == BP, "invalid percentages list");
        PERCENTAGES = _percentages;

        require(
            _percentages.length == _times.length,
            "invalid times or percentages list"
        );
        TIMES = _times;

        ALLOCATIONS = _allocs;
    }

    function buy(uint256 amount) external payable {
        if (block.timestamp < SALE_START) revert SaleIsNotStartedYet();

        if (block.timestamp > SALE_END) revert SaleIsFinished();

        if (amount == 0) revert InvalidAmount();

        if (msg.value < (amount * TP) / 10**TOKEN.decimals())
            revert InsufficientPayment();

        if (TOTAL_RECEIVED + amount > TOTAL_SALE_VALUE)
            revert AmountExceedsMaxAmount();

        uint256 userTier = STAKE.getTier(msg.sender);
        if (userTier == 0) revert InsufficientTier();

        if (balances[msg.sender] + amount > ALLOCATIONS[userTier - 1])
            revert AmountExceedsAllocation();

        balances[msg.sender] += amount;

        TOTAL_RECEIVED += amount;

        emit Bought(msg.sender, amount);
    }

    function claim() external {
        if (balances[msg.sender] == 0) revert NothingToClaim();

        if (block.timestamp < SALE_END) revert SaleIsNotFinishedYet();

        uint256 userCanClaim = userClaimable(msg.sender);

        if (userCanClaim == 0) revert InvalidAmount();

        claimed[msg.sender] += userCanClaim;

        TOKEN.transfer(msg.sender, userCanClaim);

        emit Claimed(msg.sender, userCanClaim);
    }

    function userClaimable(address user) public view returns (uint256 res) {
        uint256 userBalance = balances[user];

        uint256[] memory _percentages = PERCENTAGES;
        uint256[] memory _times = TIMES;
        for (uint256 i; i < _times.length; i++) {
            if (block.timestamp < _times[i]) break;

            res += ((userBalance * _percentages[i]) / BP);
        }

        res -= claimed[user];
    }

    // Only Owner functions
    function withdrawToken(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20(_tokenAddress).transfer(msg.sender, _amount);
    }

    function withdrawNativeToken(uint256 _amount) external onlyOwner {
        payable(msg.sender).transfer(_amount);
    }

    function setTokenAddress(address _newAddress) external onlyOwner {
        TOKEN = IToken(_newAddress);
    }

    function setStakeAddress(address _newAddress) external onlyOwner {
        STAKE = IStake(_newAddress);
    }

    function setAllocations(uint256[] memory _newAllocs) external onlyOwner {
        ALLOCATIONS = _newAllocs;
    }

    function setSaleStart(uint256 _newSaleStart) external onlyOwner {
        SALE_START = _newSaleStart;
    }

    function setSaleEnd(uint256 _newSaleEnd) external onlyOwner {
        SALE_END = _newSaleEnd;
    }

    function setPercentages(uint256[] memory _newPercentages)
        external
        onlyOwner
    {
        PERCENTAGES = _newPercentages;
    }

    function setTimes(uint256[] memory _newTimes) external onlyOwner {
        TIMES = _newTimes;
    }

    function setTP(uint256 _newTP) external onlyOwner {
        TP = _newTP;
    }

    function setTotalSaleValue(uint256 _newTSS) external onlyOwner {
        TOTAL_SALE_VALUE = _newTSS;
    }
}
