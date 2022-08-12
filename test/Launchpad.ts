import {
  time as htime,
  loadFixture,
} from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

const ether = (number: string) => {
  return ethers.utils.parseEther(number);
};

const wei = (number: string) => {
  return ethers.utils.formatEther(number);
};

const TP = ether("0.01");
const ALLOCATIONS = [
  ether("1000"),
  ether("2000"),
  ether("3000"),
  ether("4000"),
];
const PERCENTAGES = [4000, 2000, 2000, 2000];
const TOTAL_SALE_VALUE = ether("5000");

const oneYear = 31556926;
const fifteenDays = 1296000;
const oneMonth = 2629743;
const twoMonths = 5259488;

describe("Launchpad", function () {
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const tokenContract = await Token.deploy("Awesome Token", "AWT");
    await tokenContract.deployed();

    const Stake = await ethers.getContractFactory("Stake");
    const stakeContract = await Stake.deploy(tokenContract.address);
    await stakeContract.deployed();

    const Launchpad = await ethers.getContractFactory("Launchpad");
    const latestTime = await htime.latest();
    const launchpadContract = await Launchpad.deploy(
      TP,
      TOTAL_SALE_VALUE,
      stakeContract.address,
      tokenContract.address,
      ALLOCATIONS,
      latestTime + 10,
      latestTime + 3 * oneMonth,
      PERCENTAGES,
      [
        latestTime + 4 * oneMonth,
        latestTime + 5 * oneMonth,
        latestTime + 6 * oneMonth,
        latestTime + 7 * oneMonth,
      ]
    );
    await launchpadContract.deployed();

    // feed contract
    await tokenContract.transfer(launchpadContract.address, ether("1000000"));

    return {
      stakeContract,
      tokenContract,
      launchpadContract,
      owner,
      otherAccount,
    };
  }

  describe("Deployment", function () {
    it("Check constant variables", async function () {
      const { launchpadContract, stakeContract, tokenContract } =
        await loadFixture(deployFixture);

      expect(await launchpadContract.STAKE()).to.equal(stakeContract.address);
      expect(await launchpadContract.TOKEN()).to.equal(tokenContract.address);
      expect(await launchpadContract.TP()).to.equal(TP);
    });
  });

  describe("Buy Operations", function () {
    it("Try to buy before sale start", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await expect(
        launchpadContract.buy(ether("1"), { value: ether("1") })
      ).to.be.revertedWithCustomError(launchpadContract, "SaleIsNotStartedYet");
    });

    it("Try to buy zero amount of tokens", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await htime.increase(11);

      await expect(
        launchpadContract.buy(0, { value: 0 })
      ).to.be.revertedWithCustomError(launchpadContract, "InvalidAmount");
    });

    it("Try to buy after sale", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await htime.increase(oneYear + 1);

      await expect(
        launchpadContract.buy(1, { value: 1 })
      ).to.be.revertedWithCustomError(launchpadContract, "SaleIsFinished");
    });

    it("Try to buy with insufficient fund", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await htime.increase(11);

      await expect(
        launchpadContract.buy(ether("1"), { value: 5 })
      ).to.be.revertedWithCustomError(launchpadContract, "InsufficientPayment");
    });

    it("Try to buy without tier", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await htime.increase(11);

      await expect(
        launchpadContract.buy(ether("1"), { value: TP })
      ).to.be.revertedWithCustomError(launchpadContract, "InsufficientTier");
    });

    it("Try to buy more than allocation ~ tier 1", async function () {
      const { launchpadContract, stakeContract, tokenContract } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(twoMonths);

      await expect(
        launchpadContract.buy(ether("100100"), { value: ether("1001") })
      ).to.be.revertedWithCustomError(launchpadContract, "CanNotBuyMore");
    });

    it("Try to buy more than allocation ~ tier 2", async function () {
      const { launchpadContract, stakeContract, tokenContract } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("25000"));

      // get tier
      await htime.increase(twoMonths);

      await expect(
        launchpadContract.buy(ether("200100"), { value: ether("2001") })
      ).to.be.revertedWithCustomError(launchpadContract, "CanNotBuyMore");
    });

    it("Try to buy more than allocation ~ tier 3", async function () {
      const { launchpadContract, stakeContract, tokenContract } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("75000"));

      // get tier
      await htime.increase(twoMonths);

      await expect(
        launchpadContract.buy(ether("300100"), { value: ether("3001") })
      ).to.be.revertedWithCustomError(launchpadContract, "CanNotBuyMore");
    });

    it("Try to buy more than allocation ~ tier 4", async function () {
      const { launchpadContract, stakeContract, tokenContract } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("150000"));

      // get tier
      await htime.increase(twoMonths);

      await expect(
        launchpadContract.buy(ether("400100"), { value: ether("4001") })
      ).to.be.revertedWithCustomError(launchpadContract, "CanNotBuyMore");
    });

    it("Legally buy with tier 1", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(twoMonths);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );
    });

    it("Legally buy with tier 2", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(twoMonths);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );
    });

    it("Legally buy with tier 3", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(twoMonths);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );
    });

    it("Legally buy with tier 4", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(twoMonths);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );
    });
  });

  describe("Claim Operations", function () {
    it("Claim first period", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(oneMonth + 1);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      // get claim date
      await htime.increase(3 * oneMonth + 1);

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );

      const latestBalance = await tokenContract.balanceOf(owner.address);
      await launchpadContract.claim();

      expect(await tokenContract.balanceOf(owner.address)).to.equal(
        latestBalance.add(ether("400"))
      );
    });

    it("Claim first two periods", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(oneMonth + 1);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      // get claim date
      await htime.increase(4 * oneMonth + 1);

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );

      const latestBalance = await tokenContract.balanceOf(owner.address);
      await launchpadContract.claim();

      expect(await tokenContract.balanceOf(owner.address)).to.equal(
        latestBalance.add(ether("600"))
      );
    });

    it("Claim all periods", async function () {
      const { launchpadContract, stakeContract, tokenContract, owner } =
        await loadFixture(deployFixture);

      // approve
      await tokenContract.approve(
        stakeContract.address,
        ethers.constants.MaxUint256
      );
      // stake
      await stakeContract.stake(ether("10000"));

      // get tier
      await htime.increase(oneMonth + 1);

      await launchpadContract.buy(ether("1000"), { value: TP.mul(1000) });

      // get claim date
      await htime.increase(oneMonth * 6 + 1);

      expect(await launchpadContract.balances(owner.address)).to.equal(
        TP.mul(1000)
      );

      const latestBalance = await tokenContract.balanceOf(owner.address);
      await launchpadContract.claim();

      expect(await tokenContract.balanceOf(owner.address)).to.equal(
        latestBalance.add(ether("1000"))
      );
    });
  });

  describe("Authorized functions", function () {
    it("Set Total Sale Value", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      expect(await launchpadContract.TOTAL_SALE_VALUE()).to.equal(
        TOTAL_SALE_VALUE
      );

      await launchpadContract.setTotalSaleValue(ether("10000"));

      expect(await launchpadContract.TOTAL_SALE_VALUE()).to.equal(
        ether("10000")
      );
    });

    it("Set Token Price", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      expect(await launchpadContract.TP()).to.equal(TP);

      await launchpadContract.setTP(ether("10000"));

      expect(await launchpadContract.TP()).to.equal(ether("10000"));
    });

    it("Set Percentages", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      expect(await launchpadContract.PERCENTAGES(0)).to.equal(PERCENTAGES[0]);

      await launchpadContract.setPercentages([ether("10000")]);

      expect(await launchpadContract.PERCENTAGES(0)).to.equal(ether("10000"));
    });

    it("Set Sale Start", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await launchpadContract.setSaleStart(3);

      expect(await launchpadContract.SALE_START()).to.equal(3);
    });

    it("Set Sale End", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      await launchpadContract.setSaleEnd(5);

      expect(await launchpadContract.SALE_END()).to.equal(5);
    });

    it("Set Allocations", async function () {
      const { launchpadContract } = await loadFixture(deployFixture);

      expect(await launchpadContract.ALLOCATIONS(0)).to.equal(ALLOCATIONS[0]);

      await launchpadContract.setAllocations([ether("1")]);

      expect(await launchpadContract.ALLOCATIONS(0)).to.equal(ether("1"));
    });

    it("Set Token Address", async function () {
      const { launchpadContract, tokenContract, owner } = await loadFixture(
        deployFixture
      );

      expect(await launchpadContract.TOKEN()).to.equal(tokenContract.address);

      await launchpadContract.setTokenAddress(owner.address);

      expect(await launchpadContract.TOKEN()).to.equal(owner.address);
    });

    it("Set Stake Address", async function () {
      const { launchpadContract, stakeContract, owner } = await loadFixture(
        deployFixture
      );

      expect(await launchpadContract.TOKEN()).to.equal(stakeContract.address);

      await launchpadContract.setTokenAddress(owner.address);

      expect(await launchpadContract.TOKEN()).to.equal(owner.address);
    });
  });
});
