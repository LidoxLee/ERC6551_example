import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFTWallet Test", function () {
  async function deployNFTWalletFixture() {
    // Contracts are deployed using the first signer/account by default
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const caller1 = signers[1];
    const caller2 = signers[2];

    const network = 31337;

    // deploy Account dependency Contract.
    const AccountGuardian_factory = await ethers.getContractFactory("AccountGuardian");
    const EntryPoint_factory = await ethers.getContractFactory("EntryPoint");
    const AccountProxy_factory = await ethers.getContractFactory("AccountProxy");
    const Account_factory = await ethers.getContractFactory("Account");

    const AccountGuardian_instance = await AccountGuardian_factory.deploy();
    const EntryPoint_instance = await EntryPoint_factory.deploy();
    const Account_instance = await Account_factory.deploy(
      AccountGuardian_instance.address,
      EntryPoint_instance.address
    );

    const AccountProxy_instance = await AccountProxy_factory.deploy(Account_instance.address);
    await AccountProxy_instance.initialize();

    // deploy ERC6551 contract
    const ERC6551Registry_factory = await ethers.getContractFactory("ERC6551Registry");
    const ERC6551Test_factory = await ethers.getContractFactory("ERC6551Test");

    const ERC6551Registry_impl = await ERC6551Registry_factory.deploy();
    const ERC6551Test_impl = await ERC6551Test_factory.deploy();

    // use ERC1967 deploy Upgradeable of ERC6551 contract
    const ERC6551TestProxy_factory = await ethers.getContractFactory("ERC1967Proxy");

    const BaseURI = "ipfs://QmZcH4YvBVVRJtdn4RdbaqgspFU8gH6P9vomDpBVpAL3u4/";

    const RegistryAddress = ERC6551Registry_impl.address;
    const bytecode = ERC6551Test_factory.interface.encodeFunctionData("initialize", [
      RegistryAddress,
      AccountProxy_instance.address,
      BaseURI,
      network,
    ]);

    // deploy ERC6551 Upgradeable contract
    const ERC6551TestProxy_impl = await ERC6551TestProxy_factory.deploy(
      ERC6551Test_impl.address,
      bytecode
    );

    // 將代理合約指向 ERC6551 實例，這樣之後可以直接調用。
    const ERC6551TestV1 = ERC6551Test_factory.attach(ERC6551TestProxy_impl.address);

    const baseURI = await ERC6551TestV1.baseURI();
    const erc6551AccountImplementation = await ERC6551TestV1.erc6551AccountImplementation();
    const chainId = await ERC6551TestV1.chainId();

    expect(baseURI).equals(BaseURI);
    expect(erc6551AccountImplementation).equals(AccountProxy_instance.address);
    expect(chainId).equals(network);

    // deploy MockERC20 contract
    const MockERC20_factory = await ethers.getContractFactory("MockERC20");
    const MockERC20 = await MockERC20_factory.deploy();

    return {
      deployer,
      caller1,
      caller2,
      network,
      Account_factory,
      AccountProxy_instance,
      ERC6551Registry_impl,
      ERC6551TestV1,
      MockERC20_factory,
      MockERC20,
    };
  }

  describe("Deployment", function () {
    it("Should success deploy NFTWallet", async function () {
      const {} = await loadFixture(deployNFTWalletFixture);
    });
  });

  describe("ERC6551TestV1 test", function () {
    describe("mintNFTwithWallet function", function () {
      it("Should success call mintNFTwithWallet", async function () {
        const { deployer, caller1, network, MockERC20, MockERC20_factory, ERC6551TestV1 } =
          await loadFixture(deployNFTWalletFixture);

        await expect(ERC6551TestV1.connect(deployer).mintNFTwithWallet(deployer.address))
          .emit(ERC6551TestV1, "MintNFTWallet")
          .withArgs(
            0, //tokenID
            network,
            ERC6551TestV1.address,
            "0xBd8740da33Ca9D2BC596bD1df2B59beEcB59F70e"
          );

        await expect(ERC6551TestV1.connect(caller1).mintNFTwithWallet(caller1.address))
          .emit(ERC6551TestV1, "MintNFTWallet")
          .withArgs(
            1, //tokenID
            network,
            ERC6551TestV1.address,
            "0xa1D78040732aDc00770D061F560F9786311f108D"
          );

        const token_0_walletAccount = await ethers.getContractAt(
          "Account",
          "0xBd8740da33Ca9D2BC596bD1df2B59beEcB59F70e"
        );

        const token_1_walletAccount = await ethers.getContractAt(
          "Account",
          "0xa1D78040732aDc00770D061F560F9786311f108D"
        );

        const token0 = await token_0_walletAccount.token();
        const token1 = await token_1_walletAccount.token();

        expect(token0.chainId).equals(network);
        expect(token1.chainId).equals(network);
        expect(token0.tokenContract).equals(ERC6551TestV1.address);
        expect(token1.tokenContract).equals(ERC6551TestV1.address);
        expect(token0.tokenId).equals(0);
        expect(token1.tokenId).equals(1);

        // use NFT wallet mint ERC20 token
        const mintBytecode = MockERC20_factory.interface.encodeFunctionData("mint", []);
        await MockERC20.connect(deployer).mint();
        await MockERC20.connect(caller1).mint();

        await token_0_walletAccount
          .connect(deployer)
          .executeCall(MockERC20.address, 0, mintBytecode);

        await token_1_walletAccount
          .connect(caller1)
          .executeCall(MockERC20.address, 0, mintBytecode);

        const wallet0Balance = await MockERC20.balanceOf(token_0_walletAccount.address);

        await MockERC20.connect(caller1).transfer(
          token_1_walletAccount.address,
          ethers.utils.parseEther("10000")
        );

        const wallet1Balance = await MockERC20.balanceOf(token_1_walletAccount.address);

        expect(wallet0Balance).equals(ethers.utils.parseEther("10000"));
        expect(wallet1Balance).equals(ethers.utils.parseEther("10000").mul(2));

        const transferBytecode = MockERC20_factory.interface.encodeFunctionData("transfer", [
          caller1.address,
          ethers.utils.parseEther("1000"),
        ]);

        await token_1_walletAccount
          .connect(caller1)
          .executeCall(MockERC20.address, 0, transferBytecode);

        const wallet1BalanceAfterTransfer = await MockERC20.balanceOf(
          token_1_walletAccount.address
        );

        expect(wallet1BalanceAfterTransfer).equals(
          wallet1Balance.sub(ethers.utils.parseEther("1000"))
        );
      });
    });
  });
});
