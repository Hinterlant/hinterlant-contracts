import {
  time as htime,
  loadFixture,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const DAY = 60 * 60 * 24;

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
      expect(await stakeContract.BP()).to.equal(10000);
    });
  });

  describe("Reward Calculation", function () {
    it("Stake one month", async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(180 * DAY, "1000000");

      console.log(
        wei((await stakeContract.calculateRewards(owner.address)).toString())
      );

      console.log(await stakeContract.userInfo(owner.address));
    });
  });
});
