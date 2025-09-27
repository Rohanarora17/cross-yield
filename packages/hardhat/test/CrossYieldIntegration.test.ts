import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SmartWalletFactory, UserSmartWallet, YieldRouter, ChainRegistry } from "../typechain-types";

describe("CrossYield Integration Tests", function () {
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let backend: SignerWithAddress;

  let smartWalletFactory: SmartWalletFactory;
  let yieldRouter: YieldRouter;
  let chainRegistry: ChainRegistry;
  let userSmartWallet: UserSmartWallet;

  before(async function () {
    [deployer, user, backend] = await ethers.getSigners();
  });

  beforeEach(async function () {
    // Deploy ChainRegistry
    const ChainRegistryFactory = await ethers.getContractFactory("ChainRegistry");
    chainRegistry = await ChainRegistryFactory.deploy();
    await chainRegistry.initialize(deployer.address);

    // Deploy SmartWalletFactory
    const SmartWalletFactoryContract = await ethers.getContractFactory("SmartWalletFactory");
    smartWalletFactory = await SmartWalletFactoryContract.deploy(
      backend.address, // Backend coordinator
      deployer.address, // Owner
    );

    // Deploy YieldRouter implementation
    const YieldRouterFactory = await ethers.getContractFactory("YieldRouter");
    const yieldRouterImpl = await YieldRouterFactory.deploy();

    // Deploy proxy
    const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await ERC1967ProxyFactory.deploy(yieldRouterImpl.address, "0x");

    // Get YieldRouter interface
    yieldRouter = YieldRouterFactory.attach(proxy.address);

    // Initialize YieldRouter
    await yieldRouter.initialize(chainRegistry.address, smartWalletFactory.address, deployer.address);

    // Grant backend role
    await yieldRouter.grantBackendRole(backend.address);
  });

  describe("Smart Wallet Creation", function () {
    it("Should create a smart wallet for user", async function () {
      // Check user doesn't have wallet initially
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await smartWalletFactory.hasWallet(user.address)).to.be.false;

      // Create wallet
      const tx = await smartWalletFactory.createWallet(user.address);
      await tx.wait();

      // Verify wallet created
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await smartWalletFactory.hasWallet(user.address)).to.be.true;

      const walletAddress = await smartWalletFactory.getWallet(user.address);

      expect(walletAddress).to.not.equal(ethers.constants.AddressZero);

      // Get wallet contract instance
      const UserSmartWalletFactory = await ethers.getContractFactory("UserSmartWallet");
      userSmartWallet = UserSmartWalletFactory.attach(walletAddress);

      // Verify wallet properties

      expect(await userSmartWallet.owner()).to.equal(user.address);

      expect(await userSmartWallet.backendCoordinator()).to.equal(backend.address);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(await userSmartWallet.isActive()).to.be.true;
    });

    it("Should not allow creating duplicate wallets", async function () {
      // Create first wallet
      await smartWalletFactory.createWallet(user.address);

      // Try to create second wallet - should revert
      await expect(smartWalletFactory.createWallet(user.address)).to.be.revertedWithCustomError(
        smartWalletFactory,
        "WalletAlreadyExists",
      );
    });

    it("Should predict wallet address correctly", async function () {
      const predictedAddress = await smartWalletFactory.predictWalletAddress(user.address);

      const tx = await smartWalletFactory.createWallet(user.address);
      await tx.wait();

      const actualAddress = await smartWalletFactory.getWallet(user.address);

      expect(actualAddress).to.equal(predictedAddress);
    });
  });

  describe("YieldRouter Integration", function () {
    beforeEach(async function () {
      // Create smart wallet for tests
      await smartWalletFactory.createWallet(user.address);
      const walletAddress = await smartWalletFactory.getWallet(user.address);

      const UserSmartWalletFactory = await ethers.getContractFactory("UserSmartWallet");
      userSmartWallet = UserSmartWalletFactory.attach(walletAddress);

      // Link smart wallet to YieldRouter
      await yieldRouter.connect(backend).linkSmartWallet(user.address, walletAddress);
    });

    it("Should handle optimization request", async function () {
      const amount = ethers.utils.parseEther("1000"); // 1000 USDC (assuming 18 decimals for test)
      const strategy = "balanced";

      // Request optimization
      const tx = await yieldRouter.connect(user).requestOptimization(user.address, amount, strategy);

      const receipt = await tx.wait();

      // Check event was emitted
      const optimizationEvent = receipt.events?.find(e => e.event === "OptimizationRequested");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(optimizationEvent).to.not.be.undefined;
      expect(optimizationEvent?.args?.user).to.equal(user.address);
      expect(optimizationEvent?.args?.amount).to.equal(amount);
      expect(optimizationEvent?.args?.strategy).to.equal(strategy);

      // Check portfolio updated
      const portfolio = await yieldRouter.getUserPortfolio(user.address);
      expect(portfolio.currentStrategy).to.equal(strategy);
      expect(portfolio.totalDeposited).to.equal(amount);
    });

    it("Should allow backend to report allocations", async function () {
      const protocol = "aave_v3";
      const chainId = 1; // Ethereum
      const amount = ethers.utils.parseEther("500");

      // Backend reports allocation
      const tx = await yieldRouter.connect(backend).reportAllocation(user.address, protocol, chainId, amount);

      await tx.wait();

      // Verify allocation recorded
      const protocolBalance = await yieldRouter.getUserProtocolBalance(user.address, protocol);
      expect(protocolBalance).to.equal(amount);

      const chainBalance = await yieldRouter.getUserChainBalance(user.address, chainId);
      expect(chainBalance).to.equal(amount);
    });

    it("Should allow backend to report optimization completion", async function () {
      const expectedAPY = 1200; // 12% APY
      const protocols = ["aave_v3", "moonwell"];
      const chainIds = [1, 8453]; // Ethereum, Base
      const allocations = [ethers.utils.parseEther("600"), ethers.utils.parseEther("400")];
      const totalCost = ethers.utils.parseEther("5"); // $5 gas cost

      const tx = await yieldRouter
        .connect(backend)
        .reportOptimizationComplete(user.address, expectedAPY, protocols, chainIds, allocations, totalCost);

      const receipt = await tx.wait();

      // Check event emitted
      const completionEvent = receipt.events?.find(e => e.event === "OptimizationCompleted");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(completionEvent).to.not.be.undefined;

      // Check portfolio updated
      const portfolio = await yieldRouter.getUserPortfolio(user.address);

      expect(portfolio.optimizationCount).to.equal(1);

      expect(portfolio.totalValue).to.equal(allocations[0].add(allocations[1]));

      // Check optimization history
      const history = await yieldRouter.getOptimizationHistory(user.address);

      expect(history.expectedAPY).to.equal(expectedAPY);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(history.success).to.be.true;
    });
  });

  describe("Smart Wallet Functionality", function () {
    beforeEach(async function () {
      // Create smart wallet
      await smartWalletFactory.createWallet(user.address);
      const walletAddress = await smartWalletFactory.getWallet(user.address);

      const UserSmartWalletFactory = await ethers.getContractFactory("UserSmartWallet");
      userSmartWallet = UserSmartWalletFactory.attach(walletAddress);
    });

    it("Should allow owner to deposit", async function () {
      const amount = ethers.utils.parseEther("100");
      const strategy = "conservative";

      // Note: In real scenario, user would first transfer USDC to wallet
      // For test, we'll just emit the event

      const tx = await userSmartWallet.connect(user).deposit(amount, strategy);
      const receipt = await tx.wait();

      const depositEvent = receipt.events?.find(e => e.event === "Deposited");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(depositEvent).to.not.be.undefined;
      expect(depositEvent?.args?.user).to.equal(user.address);
      expect(depositEvent?.args?.amount).to.equal(amount);
      expect(depositEvent?.args?.strategy).to.equal(strategy);
    });

    it("Should allow backend to execute CCTP transfer", async function () {
      const amount = ethers.utils.parseEther("50");
      const destinationDomain = 2; // Base domain
      const recipient = "0x1234567890123456789012345678901234567890";

      const tx = await userSmartWallet.connect(backend).executeCCTP(amount, destinationDomain, recipient);

      const receipt = await tx.wait();
      const cctpEvent = receipt.events?.find(e => e.event === "CCTPTransferInitiated");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(cctpEvent).to.not.be.undefined;
    });

    it("Should allow emergency withdrawal by owner", async function () {
      const tx = await userSmartWallet.connect(user).emergencyWithdraw();
      const receipt = await tx.wait();

      const emergencyEvent = receipt.events?.find(e => e.event === "EmergencyWithdrawal");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(emergencyEvent).to.not.be.undefined;
    });

    it("Should not allow unauthorized access", async function () {
      const amount = ethers.utils.parseEther("100");
      const [unauthorized] = await ethers.getSigners();

      // Unauthorized user cannot deposit
      await expect(userSmartWallet.connect(unauthorized).deposit(amount, "balanced")).to.be.revertedWithCustomError(
        userSmartWallet,
        "OnlyOwner",
      );

      // Unauthorized user cannot execute CCTP
      await expect(
        userSmartWallet.connect(unauthorized).executeCCTP(amount, 2, user.address),
      ).to.be.revertedWithCustomError(userSmartWallet, "OnlyBackendOrOwner");
    });
  });

  describe("Access Control", function () {
    it("Should properly manage backend roles", async function () {
      const [newBackend] = await ethers.getSigners();

      // Grant role
      await yieldRouter.grantBackendRole(newBackend.address);

      // New backend should be able to report allocations
      await expect(
        yieldRouter
          .connect(newBackend)
          .reportAllocation(user.address, "test_protocol", 1, ethers.utils.parseEther("100")),
      ).to.not.be.reverted;

      // Revoke role
      await yieldRouter.revokeBackendRole(newBackend.address);

      // Should no longer be able to report allocations
      await expect(
        yieldRouter
          .connect(newBackend)
          .reportAllocation(user.address, "test_protocol", 1, ethers.utils.parseEther("100")),
      ).to.be.reverted;
    });
  });
});
