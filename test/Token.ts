import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const ether = (number: string) => {
  return ethers.utils.parseEther(number);
};

describe("Token", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const tokenContract = await Token.deploy("Awesome Token", "AWT");
    await tokenContract.deployed();

    return { tokenContract, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Check token supply", async function () {
      const { tokenContract } = await loadFixture(deployOneYearLockFixture);

      expect(await tokenContract.totalSupply()).to.equal(ether("100000000"));
    });
  });
});
