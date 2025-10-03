// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IProtocolAdapter.sol";

/**
 * @title UserSmartWallet - Optimized for Yield Strategies
 * @notice Individual smart wallet focused on automated USDC yield optimization
 * @dev Clean architecture - NO CCTP integration (handled in frontend)
 */
contract UserSmartWallet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    address public immutable owner;
    address public immutable backendCoordinator;
    address public immutable factory;

    // USDC token address (will be set per chain)
    IERC20 public immutable USDC;

    // Wallet state
    bool public isActive;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalYieldEarned;

    // Protocol allocations tracking
    mapping(string => uint256) public protocolBalances;
    mapping(address => uint256) public adapterBalances;
    string[] public activeProtocols;

    // Strategy configuration
    struct StrategyConfig {
        string strategyType; // "conservative", "balanced", "aggressive"
        uint256 maxSingleProtocolPercent; // Max % in any single protocol (basis points)
        uint256 minYieldThreshold; // Minimum APY to consider (basis points)
        bool autoCompoundEnabled;
        bool autoRebalanceEnabled;
        uint256 lastRebalance;
        uint256 rebalanceInterval; // Seconds between rebalances
    }

    StrategyConfig public strategy;

    // Events
    event Deposited(address indexed user, uint256 amount, string strategyType, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event ProtocolAllocation(string indexed protocol, address adapter, uint256 amount, uint256 timestamp);
    event ProtocolWithdrawal(string indexed protocol, address adapter, uint256 amount, uint256 timestamp);
    event YieldHarvested(uint256 amount, uint256 timestamp);
    event AutoCompoundExecuted(uint256 amount, uint256 timestamp);
    event AutoRebalanceExecuted(string[] protocols, uint256[] amounts, uint256 timestamp);
    event StrategyUpdated(string oldStrategy, string newStrategy, uint256 timestamp);
    event WalletDeactivated(uint256 timestamp);
    event BackendActionExecuted(string action, bytes data, uint256 timestamp);

    // Errors
    error OnlyOwner();
    error OnlyBackendOrOwner();
    error OnlyFactory();
    error WalletNotActive();
    error InsufficientBalance();
    error InvalidAmount();
    error InvalidProtocol();
    error TransferFailed();
    error ZeroAddress();
    error InvalidStrategy();
    error RebalanceTooSoon();

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyBackendOrOwner() {
        if (msg.sender != backendCoordinator && msg.sender != owner) revert OnlyBackendOrOwner();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    modifier onlyActive() {
        if (!isActive) revert WalletNotActive();
        _;
    }

    /**
     * @notice Constructor
     * @param _owner Address of the wallet owner (user)
     * @param _backendCoordinator Address of the backend coordinator
     * @param _factory Address of the factory contract
     * @param _usdcAddress Address of the USDC token for this chain
     */
    constructor(
        address _owner,
        address _backendCoordinator,
        address _factory,
        address _usdcAddress
    ) {
        if (_owner == address(0) || _backendCoordinator == address(0) || _factory == address(0) || _usdcAddress == address(0)) {
            revert ZeroAddress();
        }

        owner = _owner;
        backendCoordinator = _backendCoordinator;
        factory = _factory;
        USDC = IERC20(_usdcAddress);
        isActive = true;

        // Initialize default strategy
        strategy = StrategyConfig({
            strategyType: "balanced",
            maxSingleProtocolPercent: 4000, // 40% max in any protocol
            minYieldThreshold: 200, // 2% minimum APY
            autoCompoundEnabled: true,
            autoRebalanceEnabled: true,
            lastRebalance: block.timestamp,
            rebalanceInterval: 86400 // 24 hours
        });
    }

    /**
     * @notice Deposit USDC to start yield optimization
     * @param amount Amount of USDC to deposit
     * @param strategyType Strategy preference ("conservative", "balanced", "aggressive")
     */
    function deposit(uint256 amount, string memory strategyType)
        external
        onlyOwner
        onlyActive
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();
        if (!_isValidStrategy(strategyType)) revert InvalidStrategy();

        // Transfer USDC from owner to this wallet
        USDC.safeTransferFrom(owner, address(this), amount);

        // Update tracking
        totalDeposited += amount;

        // Update strategy if different
        if (keccak256(bytes(strategy.strategyType)) != keccak256(bytes(strategyType))) {
            _updateStrategy(strategyType);
        }

        emit Deposited(owner, amount, strategyType, block.timestamp);
    }

    /**
     * @notice Allocate funds to a DeFi protocol
     * @param protocolName Name of the protocol
     * @param adapter Address of the protocol adapter
     * @param amount Amount to allocate
     */
    function allocateToProtocol(
        string memory protocolName,
        address adapter,
        uint256 amount
    ) external onlyBackendOrOwner onlyActive nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (adapter == address(0)) revert ZeroAddress();
        if (USDC.balanceOf(address(this)) < amount) revert InsufficientBalance();

        // Check strategy limits
        uint256 totalValue = getTotalValue();
        uint256 maxAllowed = (totalValue * strategy.maxSingleProtocolPercent) / 10000;
        if (protocolBalances[protocolName] + amount > maxAllowed) {
            revert InvalidAmount();
        }

        // Approve and deposit to protocol
        USDC.safeTransfer(adapter, amount);
        IProtocolAdapter(adapter).deposit(owner, amount);

        // Update tracking
        if (protocolBalances[protocolName] == 0) {
            activeProtocols.push(protocolName);
        }
        protocolBalances[protocolName] += amount;
        adapterBalances[adapter] += amount;

        emit ProtocolAllocation(protocolName, adapter, amount, block.timestamp);
    }

    /**
     * @notice Withdraw funds from a DeFi protocol
     * @param protocolName Name of the protocol
     * @param adapter Address of the protocol adapter
     * @param amount Amount to withdraw
     */
    function withdrawFromProtocol(
        string memory protocolName,
        address adapter,
        uint256 amount
    ) external onlyBackendOrOwner onlyActive nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (adapter == address(0)) revert ZeroAddress();
        if (protocolBalances[protocolName] < amount) revert InsufficientBalance();

        // Withdraw from protocol
        IProtocolAdapter(adapter).withdraw(owner, amount);

        // Update tracking
        protocolBalances[protocolName] -= amount;
        adapterBalances[adapter] -= amount;

        // Remove from active protocols if balance is zero
        if (protocolBalances[protocolName] == 0) {
            _removeProtocol(protocolName);
        }

        emit ProtocolWithdrawal(protocolName, adapter, amount, block.timestamp);
    }

    /**
     * @notice Harvest yield from all protocols and auto-compound
     * @dev Can be called by backend for automation or owner manually
     */
    function harvestAndCompound() external onlyBackendOrOwner onlyActive nonReentrant {
        if (!strategy.autoCompoundEnabled) revert InvalidAmount();

        uint256 initialBalance = USDC.balanceOf(address(this));

        // Backend will call harvest on all adapters
        // For now, this is a placeholder that emits events for tracking

        uint256 finalBalance = USDC.balanceOf(address(this));
        uint256 yieldEarned = finalBalance > initialBalance ? finalBalance - initialBalance : 0;

        if (yieldEarned > 0) {
            totalYieldEarned += yieldEarned;
            emit YieldHarvested(yieldEarned, block.timestamp);
            emit AutoCompoundExecuted(yieldEarned, block.timestamp);
        }
    }

    /**
     * @notice Rebalance portfolio based on current strategy
     * @dev Automatically called by backend based on rebalanceInterval
     */
    function rebalancePortfolio() external onlyBackendOrOwner onlyActive nonReentrant {
        if (!strategy.autoRebalanceEnabled) revert InvalidAmount();
        if (block.timestamp < strategy.lastRebalance + strategy.rebalanceInterval) {
            revert RebalanceTooSoon();
        }

        // Update last rebalance time
        strategy.lastRebalance = block.timestamp;

        // Backend handles the actual rebalancing logic
        // Emit event for tracking
        emit AutoRebalanceExecuted(activeProtocols, new uint256[](activeProtocols.length), block.timestamp);
    }

    /**
     * @notice Update strategy configuration
     * @param strategyType New strategy type
     * @param maxSingleProtocolPercent Max percentage in single protocol (basis points)
     * @param minYieldThreshold Minimum yield threshold (basis points)
     * @param autoCompoundEnabled Enable auto-compounding
     * @param autoRebalanceEnabled Enable auto-rebalancing
     * @param rebalanceInterval Interval between rebalances (seconds)
     */
    function updateStrategy(
        string memory strategyType,
        uint256 maxSingleProtocolPercent,
        uint256 minYieldThreshold,
        bool autoCompoundEnabled,
        bool autoRebalanceEnabled,
        uint256 rebalanceInterval
    ) external onlyOwner {
        if (!_isValidStrategy(strategyType)) revert InvalidStrategy();
        if (maxSingleProtocolPercent > 8000) revert InvalidAmount(); // Max 80%
        if (rebalanceInterval < 3600) revert InvalidAmount(); // Min 1 hour

        string memory oldStrategy = strategy.strategyType;

        strategy.strategyType = strategyType;
        strategy.maxSingleProtocolPercent = maxSingleProtocolPercent;
        strategy.minYieldThreshold = minYieldThreshold;
        strategy.autoCompoundEnabled = autoCompoundEnabled;
        strategy.autoRebalanceEnabled = autoRebalanceEnabled;
        strategy.rebalanceInterval = rebalanceInterval;

        emit StrategyUpdated(oldStrategy, strategyType, block.timestamp);
    }

    /**
     * @notice Emergency withdrawal by owner (bypass all restrictions)
     * @dev Withdraws all USDC balance to owner
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = USDC.balanceOf(address(this));
        if (balance == 0) revert InsufficientBalance();

        USDC.safeTransfer(owner, balance);
        totalWithdrawn += balance;

        emit EmergencyWithdrawal(owner, balance, block.timestamp);
    }

    /**
     * @notice Regular withdrawal by owner
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner onlyActive nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (USDC.balanceOf(address(this)) < amount) revert InsufficientBalance();

        USDC.safeTransfer(owner, amount);
        totalWithdrawn += amount;

        emit Withdrawn(owner, amount, block.timestamp);
    }

    /**
     * @notice Batch execute multiple operations for gas efficiency
     * @param calls Array of encoded function calls
     * @dev Can only be called by backend or owner for automation
     */
    function batchExecute(bytes[] calldata calls)
        external
        onlyBackendOrOwner
        onlyActive
        nonReentrant
    {
        require(calls.length > 0, "No calls provided");
        require(calls.length <= 10, "Too many calls"); // Prevent gas limit issues

        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = address(this).call(calls[i]);
            if (!success) {
                // Decode revert reason
                if (result.length < 68) revert("Call failed");
                assembly {
                    result := add(result, 0x04)
                }
                revert(abi.decode(result, (string)));
            }
        }

        emit BackendActionExecuted("batch_execute", abi.encode(calls.length), block.timestamp);
    }

    /**
     * @notice Deactivate wallet (emergency only, by owner)
     */
    function deactivateWallet() external onlyOwner {
        isActive = false;
        emit WalletDeactivated(block.timestamp);
    }

    /**
     * @notice Reactivate wallet (can be called by owner or factory)
     */
    function reactivateWallet() external {
        if (msg.sender != owner && msg.sender != factory) {
            revert OnlyBackendOrOwner();
        }
        isActive = true;
    }

    // View functions

    /**
     * @notice Get USDC balance of this wallet
     * @return balance Current USDC balance
     */
    function getBalance() external view returns (uint256 balance) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Get protocol balance for a specific protocol
     * @param protocolName Name of the protocol
     * @return balance Balance in that protocol
     */
    function getProtocolBalance(string memory protocolName)
        external
        view
        returns (uint256 balance)
    {
        return protocolBalances[protocolName];
    }

    /**
     * @notice Get all active protocols
     * @return protocols Array of active protocol names
     */
    function getActiveProtocols() external view returns (string[] memory protocols) {
        return activeProtocols;
    }

    /**
     * @notice Get total value across all protocols and wallet
     * @return totalValue Total value in USDC
     */
    function getTotalValue() public view returns (uint256 totalValue) {
        totalValue = USDC.balanceOf(address(this));

        for (uint256 i = 0; i < activeProtocols.length; i++) {
            totalValue += protocolBalances[activeProtocols[i]];
        }
    }

    /**
     * @notice Get wallet summary with yield information
     * @return usdcBalance Current USDC balance
     * @return totalAllocated Total amount allocated to protocols
     * @return protocolCount Number of active protocols
     * @return active Whether the wallet is active
     * @return totalYield Total yield earned
     * @return currentAPY Estimated current APY (basis points)
     */
    function getWalletSummary() external view returns (
        uint256 usdcBalance,
        uint256 totalAllocated,
        uint256 protocolCount,
        bool active,
        uint256 totalYield,
        uint256 currentAPY
    ) {
        usdcBalance = USDC.balanceOf(address(this));

        totalAllocated = 0;
        for (uint256 i = 0; i < activeProtocols.length; i++) {
            totalAllocated += protocolBalances[activeProtocols[i]];
        }

        protocolCount = activeProtocols.length;
        active = isActive;
        totalYield = totalYieldEarned;

        // Calculate APY based on historical performance
        // This is a simple estimation - real calculation would be more complex
        if (totalDeposited > 0) {
            currentAPY = (totalYieldEarned * 10000) / totalDeposited;
        }
    }

    /**
     * @notice Get current strategy configuration
     * @return config Current strategy configuration
     */
    function getStrategy() external view returns (StrategyConfig memory config) {
        return strategy;
    }

    /**
     * @notice Check if rebalance is due
     * @return due True if rebalance is due
     * @return timeUntilNext Seconds until next rebalance
     */
    function isRebalanceDue() external view returns (bool due, uint256 timeUntilNext) {
        uint256 nextRebalance = strategy.lastRebalance + strategy.rebalanceInterval;
        due = block.timestamp >= nextRebalance;
        timeUntilNext = due ? 0 : nextRebalance - block.timestamp;
    }

    /**
     * @notice Check if wallet has sufficient balance for amount
     * @param amount Amount to check
     * @return sufficient True if balance is sufficient
     */
    function hasSufficientBalance(uint256 amount) external view returns (bool sufficient) {
        return USDC.balanceOf(address(this)) >= amount;
    }

    // Internal functions

    /**
     * @notice Validate strategy type
     * @param strategyType Strategy to validate
     * @return valid True if strategy is valid
     */
    function _isValidStrategy(string memory strategyType) internal pure returns (bool valid) {
        return (
            keccak256(bytes(strategyType)) == keccak256(bytes("conservative")) ||
            keccak256(bytes(strategyType)) == keccak256(bytes("balanced")) ||
            keccak256(bytes(strategyType)) == keccak256(bytes("aggressive"))
        );
    }

    /**
     * @notice Update strategy configuration
     * @param strategyType New strategy type
     */
    function _updateStrategy(string memory strategyType) internal {
        string memory oldStrategy = strategy.strategyType;
        strategy.strategyType = strategyType;

        // Update strategy-specific parameters
        if (keccak256(bytes(strategyType)) == keccak256(bytes("conservative"))) {
            strategy.maxSingleProtocolPercent = 2500; // 25%
            strategy.minYieldThreshold = 150; // 1.5%
        } else if (keccak256(bytes(strategyType)) == keccak256(bytes("balanced"))) {
            strategy.maxSingleProtocolPercent = 4000; // 40%
            strategy.minYieldThreshold = 200; // 2%
        } else if (keccak256(bytes(strategyType)) == keccak256(bytes("aggressive"))) {
            strategy.maxSingleProtocolPercent = 6000; // 60%
            strategy.minYieldThreshold = 300; // 3%
        }

        emit StrategyUpdated(oldStrategy, strategyType, block.timestamp);
    }

    /**
     * @notice Remove protocol from active list
     * @param protocolName Protocol to remove
     */
    function _removeProtocol(string memory protocolName) internal {
        for (uint256 i = 0; i < activeProtocols.length; i++) {
            if (keccak256(bytes(activeProtocols[i])) == keccak256(bytes(protocolName))) {
                activeProtocols[i] = activeProtocols[activeProtocols.length - 1];
                activeProtocols.pop();
                break;
            }
        }
    }

    /**
     * @notice Receive ETH (for gas if needed)
     */
    receive() external payable {
        // Allow receiving ETH for gas payments
    }

    /**
     * @notice Get contract version
     * @return version Contract version
     */
    function version() external pure returns (string memory) {
        return "3.0.0-yield-optimized";
    }
}