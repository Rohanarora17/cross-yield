// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ChainRegistry.sol";
import "./SmartWalletFactory.sol";

/**
 * @title YieldRouter
 * @notice Simplified yield router for portfolio tracking and coordination
 * @dev No longer handles fund custody - that's moved to UserSmartWallet
 */
contract YieldRouter is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant AI_BACKEND_ROLE = keccak256("AI_BACKEND_ROLE");
    bytes32 public constant ANALYTICS_ROLE = keccak256("ANALYTICS_ROLE");

    ChainRegistry public registry;
    SmartWalletFactory public walletFactory;

    // Portfolio tracking (no fund custody)
    mapping(address => UserPortfolio) public userPortfolios;
    mapping(address => mapping(string => uint256)) public userProtocolBalances;
    mapping(address => mapping(uint256 => uint256)) public userChainBalances;
    
    // Analytics and tracking
    mapping(address => OptimizationHistory) public optimizationHistory;
    mapping(address => StrategyPreference) public userStrategies;
    uint256 public totalOptimizations;
    uint256 public totalUsers;

    struct UserPortfolio {
        uint256 totalValue;
        uint256 lastOptimization;
        uint256 optimizationCount;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        string currentStrategy;
        address smartWallet;
    }

    struct StrategyPreference {
        string riskTolerance; // "conservative", "balanced", "aggressive"
        uint256 preferredChains; // Bitmask of preferred chains
        uint256 maxProtocolAllocation; // Max % in single protocol (basis points)
        uint256 rebalanceThreshold; // Threshold for auto-rebalancing (basis points)
        bool autoRebalanceEnabled;
    }
    
    struct OptimizationHistory {
        uint256 timestamp;
        uint256 expectedAPY;
        uint256 actualAPY;
        string[] protocols;
        uint256[] chainIds;
        uint256[] allocations;
        uint256 gasCost;
        uint256 transferCost;
        bool success;
        string strategy;
    }
    
    struct RebalanceParams {
        address user;
        string[] fromProtocols;
        string[] toProtocols;
        uint256[] amounts;
        uint256[] fromChainIds;
        uint256[] toChainIds;
        uint256 expectedAPY;
        uint256 maxGasCost;
    }
    
    struct AIStrategy {
        address user;
        uint256 totalAmount;
        string[] protocols;
        uint256[] amounts;
        uint256[] chainIds;
        uint256 expectedAPY;
        uint256 riskScore;
        uint256 executionDeadline;
    }

    // Events for portfolio tracking and analytics
    event OptimizationRequested(address indexed user, uint256 amount, string strategy, uint256 timestamp);
    event OptimizationCompleted(address indexed user, uint256 strategyId, uint256 expectedAPY, uint256 actualCost);
    event PortfolioUpdated(address indexed user, uint256 totalValue, uint256 protocolCount, uint256 timestamp);
    event AllocationReported(address indexed user, string protocol, uint256 chainId, uint256 amount, uint256 timestamp);
    event RebalanceExecuted(address indexed user, uint256 oldValue, uint256 newValue, uint256 improvement);
    event StrategyPreferenceUpdated(address indexed user, string newStrategy);
    event SmartWalletLinked(address indexed user, address indexed smartWallet);

    function initialize(
        address _registry,
        address _walletFactory,
        address admin
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        registry = ChainRegistry(_registry);
        walletFactory = SmartWalletFactory(_walletFactory);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AI_BACKEND_ROLE, admin); // Admin can act as backend initially
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ===== PORTFOLIO TRACKING FUNCTIONS =====

    /**
     * @notice Link user's smart wallet for tracking
     * @param user User address
     * @param smartWallet Smart wallet address
     */
    function linkSmartWallet(address user, address smartWallet) external onlyRole(AI_BACKEND_ROLE) {
        require(walletFactory.isWalletValid(smartWallet), "Invalid smart wallet");
        require(walletFactory.getWalletOwner(smartWallet) == user, "Wallet owner mismatch");

        userPortfolios[user].smartWallet = smartWallet;

        if (userPortfolios[user].lastOptimization == 0) {
            totalUsers++;
        }

        emit SmartWalletLinked(user, smartWallet);
    }
    
    /**
     * @notice Request portfolio optimization (called when user deposits)
     * @param user User address
     * @param amount Amount being deposited
     * @param strategy Strategy preference
     */
    function requestOptimization(
        address user,
        uint256 amount,
        string memory strategy
    ) external {
        // Can be called by user's smart wallet or user directly
        require(
            msg.sender == user ||
            msg.sender == userPortfolios[user].smartWallet ||
            hasRole(AI_BACKEND_ROLE, msg.sender),
            "Unauthorized"
        );

        userPortfolios[user].currentStrategy = strategy;
        userPortfolios[user].totalDeposited += amount;

        emit OptimizationRequested(user, amount, strategy, block.timestamp);
    }
    
    /**
     * @notice Report allocation result from backend (after execution)
     * @param user User address
     * @param protocol Protocol name
     * @param chainId Chain ID
     * @param amount Amount allocated
     */
    function reportAllocation(
        address user,
        string memory protocol,
        uint256 chainId,
        uint256 amount
    ) external onlyRole(AI_BACKEND_ROLE) {
        userProtocolBalances[user][protocol] += amount;
        userChainBalances[user][chainId] += amount;

        emit AllocationReported(user, protocol, chainId, amount, block.timestamp);
    }
    
    /**
     * @notice Report optimization completion
     * @param user User address
     * @param expectedAPY Expected APY from strategy
     * @param protocols Array of protocols used
     * @param chainIds Array of chain IDs
     * @param allocations Array of allocation amounts
     * @param totalCost Total execution cost
     */
    function reportOptimizationComplete(
        address user,
        uint256 expectedAPY,
        string[] memory protocols,
        uint256[] memory chainIds,
        uint256[] memory allocations,
        uint256 totalCost
    ) external onlyRole(AI_BACKEND_ROLE) {
        uint256 strategyId = totalOptimizations++;

        // Update portfolio
        UserPortfolio storage portfolio = userPortfolios[user];
        portfolio.lastOptimization = block.timestamp;
        portfolio.optimizationCount++;

        uint256 totalValue = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            totalValue += allocations[i];
        }
        portfolio.totalValue = totalValue;

        // Record optimization history
        optimizationHistory[user] = OptimizationHistory({
            timestamp: block.timestamp,
            expectedAPY: expectedAPY,
            actualAPY: 0, // Will be updated later
            protocols: protocols,
            chainIds: chainIds,
            allocations: allocations,
            gasCost: totalCost,
            transferCost: 0,
            success: true,
            strategy: portfolio.currentStrategy
        });

        emit OptimizationCompleted(user, strategyId, expectedAPY, totalCost);
    }
    
    /**
     * @notice Update user's portfolio value (called periodically by backend)
     * @param user User address
     * @param newTotalValue New total portfolio value
     * @param protocolCount Number of active protocols
     */
    function updatePortfolioValue(
        address user,
        uint256 newTotalValue,
        uint256 protocolCount
    ) external onlyRole(AI_BACKEND_ROLE) {
        userPortfolios[user].totalValue = newTotalValue;
        emit PortfolioUpdated(user, newTotalValue, protocolCount, block.timestamp);
    }

    /**
     * @notice Set user's strategy preference
     * @param user User address
     * @param strategy Strategy preference
     * @param preferences Detailed strategy preferences
     */
    function setStrategyPreference(
        address user,
        string memory strategy,
        StrategyPreference memory preferences
    ) external {
        require(
            msg.sender == user ||
            hasRole(AI_BACKEND_ROLE, msg.sender),
            "Unauthorized"
        );

        userStrategies[user] = preferences;
        userPortfolios[user].currentStrategy = strategy;

        emit StrategyPreferenceUpdated(user, strategy);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get user's complete portfolio information
     * @param user User address
     * @return portfolio UserPortfolio struct
     */
    function getUserPortfolio(address user)
        external
        view
        returns (UserPortfolio memory portfolio)
    {
        return userPortfolios[user];
    }
    /**
     * @notice Get user's balance in a specific protocol
     * @param user User address
     * @param protocol Protocol name
     * @return balance Balance in that protocol
     */
    function getUserProtocolBalance(address user, string memory protocol)
        external
        view
        returns (uint256 balance)
    {
        return userProtocolBalances[user][protocol];
    }

    /**
     * @notice Get user's total balance on a specific chain
     * @param user User address
     * @param chainId Chain ID
     * @return balance Total balance on that chain
     */
    function getUserChainBalance(address user, uint256 chainId)
        external
        view
        returns (uint256 balance)
    {
        return userChainBalances[user][chainId];
    }

    /**
     * @notice Get user's strategy preferences
     * @param user User address
     * @return preferences StrategyPreference struct
     */
    function getUserStrategyPreferences(address user)
        external
        view
        returns (StrategyPreference memory preferences)
    {
        return userStrategies[user];
    }

    /**
     * @notice Get user's optimization history
     * @param user User address
     * @return history OptimizationHistory struct
     */
    function getOptimizationHistory(address user)
        external
        view
        returns (OptimizationHistory memory history)
    {
        return optimizationHistory[user];
    }
    
    /**
     * @notice Update actual APY after some time has passed
     * @param user User address
     * @param actualAPY Measured actual APY
     */
    function updateActualAPY(address user, uint256 actualAPY)
        external
        onlyRole(AI_BACKEND_ROLE)
    {
        OptimizationHistory storage history = optimizationHistory[user];
        uint256 oldAPY = history.actualAPY;
        history.actualAPY = actualAPY;

        uint256 improvement = actualAPY > oldAPY ? actualAPY - oldAPY : 0;

        emit RebalanceExecuted(
            user,
            userPortfolios[user].totalValue,
            userPortfolios[user].totalValue, // Same value, different APY
            improvement
        );
    }
    
    // ===== ANALYTICS AND ADMIN FUNCTIONS =====

    /**
     * @notice Get platform statistics
     * @return totalOptimizations_ Total optimizations executed
     * @return totalUsers_ Total number of users
     * @return averagePortfolioSize Average portfolio size
     */
    function getPlatformStats()
        external
        view
        returns (
            uint256 totalOptimizations_,
            uint256 totalUsers_,
            uint256 averagePortfolioSize
        )
    {
        totalOptimizations_ = totalOptimizations;
        totalUsers_ = totalUsers;

        // Calculate average portfolio size (simplified)
        averagePortfolioSize = totalUsers > 0 ? (address(this).balance / totalUsers) : 0;
    }

    /**
     * @notice Check if user has a smart wallet
     * @param user User address
     * @return hasWallet True if user has a smart wallet
     * @return walletAddress Address of the smart wallet
     */
    function hasSmartWallet(address user)
        external
        view
        returns (bool hasWallet, address walletAddress)
    {
        walletAddress = userPortfolios[user].smartWallet;
        hasWallet = walletAddress != address(0);
    }

    /**
     * @notice Get user's smart wallet address
     * @param user User address
     * @return smartWallet Smart wallet address
     */
    function getUserSmartWallet(address user)
        external
        view
        returns (address smartWallet)
    {
        return userPortfolios[user].smartWallet;
    }

    /**
     * @notice Update contract addresses (admin only)
     * @param newRegistry New ChainRegistry address
     * @param newWalletFactory New SmartWalletFactory address
     */
    function updateContracts(
        address newRegistry,
        address newWalletFactory
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newRegistry != address(0)) {
            registry = ChainRegistry(newRegistry);
        }
        if (newWalletFactory != address(0)) {
            walletFactory = SmartWalletFactory(newWalletFactory);
        }
    }

    /**
     * @notice Grant AI backend role to address
     * @param backend Backend address to grant role
     */
    function grantBackendRole(address backend) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(AI_BACKEND_ROLE, backend);
    }

    /**
     * @notice Revoke AI backend role from address
     * @param backend Backend address to revoke role
     */
    function revokeBackendRole(address backend) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(AI_BACKEND_ROLE, backend);
    }

    /**
     * @notice Get contract version
     * @return version Contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
