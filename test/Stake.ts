import {
  time as htime,
  loadFixture,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const ether = (number: string) => {
  return ethers.utils.parseEther(number);
};

const wei = (number: string) => {
  return ethers.utils.formatEther(number);
};

describe("Stake", function () {
  const stake = async (time: number, amount: string) => {
    const { stakeContract, tokenContract } = await loadFixture(
      deployOneYearLockFixture
    );

    await tokenContract.approve(
      stakeContract.address,
      ethers.constants.MaxUint256
    );

    await stakeContract.stake(ether(amount));

    await htime.increase(time);
  };

  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const tokenContract = await Token.deploy("Awesome Token", "AWT");
    await tokenContract.deployed();

    const Stake = await ethers.getContractFactory("Stake");
    const stakeContract = await Stake.deploy(tokenContract.address);

    return { stakeContract, tokenContract, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Check stake contract's constant variables", async function () {
      const { stakeContract, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await stakeContract.TOKEN()).to.equal(tokenContract.address);
    });
  });

  describe("Reward Calculation ~ 1m staked value", function () {
    it("Stake one month ~ rewards 16666", async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, "1000000");

      const rewards = await stakeContract.calculateRewards(owner.address);
      expect(rewards.gt(ether("16666"))).to.equal(true);
      expect(rewards.lt(ether("16668"))).to.equal(true);
    });

    it("Stake 6 months ~ rewards 100k", async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(15778463, "1000000");

      const rewards = await stakeContract.calculateRewards(owner.address);
      expect(rewards.gte(ether("99999"))).to.equal(true);
      expect(rewards.lte(ether("100001"))).to.equal(true);
    });

    it("Stake 1 year ~ rewards 200k", async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(31556926, "1000000");

      const rewards = await stakeContract.calculateRewards(owner.address);
      expect(rewards.gte(ether("199999"))).to.equal(true);
      expect(rewards.lte(ether("200001"))).to.equal(true);
    });
  });

  describe("Unstake", function () {
    it("Stake 1 month and unstake", async function () {
      const { stakeContract, owner, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, "1000000");
      await stakeContract.calculateRewards(owner.address);

      await tokenContract.transfer(stakeContract.address, ether("5000000"));

      await stakeContract.unstake(ether("1000000"));
      const balance = await tokenContract.balanceOf(owner.address);

      expect(balance.gte(ether("95016666"))).to.equal(true);
      expect(balance.lte(ether("95016667"))).to.equal(true);
    });

    it("Stake 6 month and unstake", async function () {
      const { stakeContract, owner, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(15778463, "1000000");
      await stakeContract.calculateRewards(owner.address);

      await tokenContract.transfer(stakeContract.address, ether("5000000"));

      await stakeContract.unstake(ether("1000000"));
      const balance = await tokenContract.balanceOf(owner.address);

      expect(balance.gte(ether("95099999"))).to.equal(true);
      expect(balance.lte(ether("95100001"))).to.equal(true);
    });

    it("Stake 1 year and unstake", async function () {
      const { stakeContract, owner, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(31556926, "1000000");
      await stakeContract.calculateRewards(owner.address);

      await tokenContract.transfer(stakeContract.address, ether("5000000"));

      await stakeContract.unstake(ether("1000000"));
      const balance = await tokenContract.balanceOf(owner.address);

      expect(balance.gte(ether("95199999"))).to.equal(true);
      expect(balance.lte(ether("95200001"))).to.equal(true);
    });
  });
});
