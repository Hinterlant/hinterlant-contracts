import {
  time as htime,
  loadFixture,
} from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const ether = (number: string) => {
  return ethers.utils.parseEther(number);
};

describe('Stake', function () {
  const stake = async (time: number, amount: string) => {
    const { stakeContract, tokenContract } = await loadFixture(
      deployOneYearLockFixture
    );

    await tokenContract.approve(
      stakeContract.address,
      ethers.constants.MaxUint256
    );

    await stakeContract.stake(ether(amount), 0);

    await htime.increase(time);
  };

  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const tokenContract = await Token.deploy('Awesome Token', 'AWT');
    await tokenContract.deployed();

    const Stake = await ethers.getContractFactory('LockedStake');
    const stakeContract = await Stake.deploy(tokenContract.address);

    return { stakeContract, tokenContract, owner, otherAccount };
  }

  describe('Deployment', function () {
    it("Check stake contract's constant variables", async function () {
      const { stakeContract, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );

      // positive
      expect(await stakeContract.TOKEN()).to.equal(tokenContract.address);

      // negative
      expect(await stakeContract.TOKEN()).to.not.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe('Reward Calculation ~ 1m staked value', function () {
    it('Stake one month ~ rewards 16666', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '1000000');

      const rewards = await stakeContract.calculateRewards(owner.address);
      expect(rewards.gt(ether('16666'))).to.equal(true);
      expect(rewards.lt(ether('16668'))).to.equal(true);
    });

    it('Stake 6 months ~ rewards 100k', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(15778463, '1000000');

      const rewards = await stakeContract.calculateRewards(owner.address);
      expect(rewards.gte(ether('99999'))).to.equal(true);
      expect(rewards.lte(ether('100001'))).to.equal(true);
    });

    it('Stake 1 year ~ rewards 200k', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(31556926, '1000000');

      const rewards = await stakeContract.calculateRewards(owner.address);
      expect(rewards.gte(ether('199999'))).to.equal(true);
      expect(rewards.lte(ether('200001'))).to.equal(true);
    });
  });

  describe('Unstake', function () {
    it('Stake 1 month and unstake', async function () {
      const { stakeContract, owner, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '1000000');

      await tokenContract.transfer(stakeContract.address, ether('5000000'));

      await stakeContract.claim();
      const balance = await tokenContract.balanceOf(owner.address);

      expect(balance.gte(ether('95016666'))).to.equal(true);
      expect(balance.lte(ether('95016667'))).to.equal(true);
    });

    it('Stake 6 month and unstake', async function () {
      const { stakeContract, owner, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(15778463, '1000000');

      await tokenContract.transfer(stakeContract.address, ether('5000000'));

      await stakeContract.claim();
      const balance = await tokenContract.balanceOf(owner.address);

      expect(balance.gte(ether('95099999'))).to.equal(true);
      expect(balance.lte(ether('95100001'))).to.equal(true);
    });

    it('Stake 1 year and unstake', async function () {
      const { stakeContract, owner, tokenContract } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(31556926, '1000000');

      await tokenContract.transfer(stakeContract.address, ether('5000000'));

      await stakeContract.claim();
      const balance = await tokenContract.balanceOf(owner.address);

      expect(balance.gte(ether('95199999'))).to.equal(true);
      expect(balance.lte(ether('95200001'))).to.equal(true);
    });
  });

  describe('Tiers', function () {
    it('Check tier 1 ~ with 10,000 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '10000');

      expect(await stakeContract.getTier(owner.address)).to.equal(1);
    });

    it('Check tier 1 ~ with 24,999 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '24999');

      expect(await stakeContract.getTier(owner.address)).to.equal(1);
    });

    it('Check tier 2 ~ with 25,000 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '25000');

      expect(await stakeContract.getTier(owner.address)).to.equal(2);
    });

    it('Check tier 2 ~ with 74,999 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '74999');

      expect(await stakeContract.getTier(owner.address)).to.equal(2);
    });

    it('Check tier 3 ~ with 75,000 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '75000');

      expect(await stakeContract.getTier(owner.address)).to.equal(3);
    });

    it('Check tier 3 ~ with 149,999 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '149999');

      expect(await stakeContract.getTier(owner.address)).to.equal(3);
    });

    it('Check tier 4 ~ with 150,000 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '150000');

      expect(await stakeContract.getTier(owner.address)).to.equal(4);
    });

    it('Check tier 4 ~ with 1,000,000 stake', async function () {
      const { stakeContract, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      await stake(2629743, '1000000');

      expect(await stakeContract.getTier(owner.address)).to.equal(4);
    });
  });

  describe('Authorized Functions', function () {
    it('Change RPS', async function () {
      const { stakeContract } = await loadFixture(deployOneYearLockFixture);

      const before = await stakeContract.RPS();

      await stakeContract.changeRPS(ether('1'));

      expect(await stakeContract.RPS()).to.equal(ether('1'));
      expect(await stakeContract.RPS()).to.not.equal(before);
    });
  });
});
