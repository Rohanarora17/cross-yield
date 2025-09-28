// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IProtocolAdapter.sol";

/**
 * @title UserSmartWallet
 * @notice Individual smart wallet for non-custodial USDC yield optimization
 * @dev Each user gets their own wallet with automated execution capabilities
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

    // Protocol allocations tracking
    mapping(string => uint256) public protocolBalances;
    mapping(address => uint256) public adapterBalances;
    string[] public activeProtocols;

    // Events
    event Deposited(address indexed user, uint256 amount, string strategy, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event ProtocolAllocation(string indexed protocol, address adapter, uint256 amount, uint256 timestamp);
    event ProtocolWithdrawal(string indexed protocol, address adapter, uint256 amount, uint256 timestamp);
    event CCTPTransferInitiated(uint256 amount, uint32 destinationDomain, address recipient, uint256 timestamp);
    event WalletDeactivated(uint256 timestamp);
    event BackendActionExecuted(string action, bytes data, uint256 timestamp);
    event AllocationExecuted(string[] protocolNames, address[] adapters, uint256[] amounts);

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
    }

    /**
     * @notice Deposit USDC to start yield optimization
     * @param amount Amount of USDC to deposit
     * @param strategy Strategy preference ("conservative", "balanced", "aggressive")
     */
    function deposit(uint256 amount, string memory strategy)
        external
        onlyOwner
        onlyActive
        nonReentrant
    {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDC from owner to this wallet
        USDC.safeTransferFrom(owner, address(this), amount);

        // Update tracking
        totalDeposited += amount;

        emit Deposited(owner, amount, strategy, block.timestamp);
    }

    /**
     * @notice Execute CCTP cross-chain transfer (called by backend)
     * @param amount Amount to transfer
     * @param destinationDomain CCTP destination domain
     * @param recipient Recipient address on destination chain
     */
    function executeCCTP(
        uint256 amount,
        uint32 destinationDomain,
        address recipient
    ) external onlyBackendOrOwner onlyActive nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (USDC.balanceOf(address(this)) < amount) revert InsufficientBalance();

        // For now, we'll implement a simple transfer to recipient
        // In production, this would integrate with Circle's CCTP contracts
        USDC.safeTransfer(recipient, amount);

        emit CCTPTransferInitiated(amount, destinationDomain, recipient, block.timestamp);
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
     * @notice Batch allocate to multiple protocols
     * @param protocolNames Array of protocol names
     * @param adapters Array of adapter addresses
     * @param amounts Array of amounts
     */
    function batchAllocate(
        string[] memory protocolNames,
        address[] memory adapters,
        uint256[] memory amounts
    ) external onlyBackendOrOwner onlyActive nonReentrant {
        uint256 length = protocolNames.length;
        require(
            length == adapters.length && length == amounts.length,
            "Array length mismatch"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < length; i++) {
            totalAmount += amounts[i];
        }

        if (USDC.balanceOf(address(this)) < totalAmount) revert InsufficientBalance();

        // Protocol allocation will be implemented later with chain-specific adapters
        // For now, just emit an event for the backend to track
        emit AllocationExecuted(protocolNames, adapters, amounts);
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

    /**
     * @notice Execute arbitrary backend action (with restrictions)
     * @param target Target contract address
     * @param data Encoded function call data
     */
    function executeBackendAction(address target, bytes calldata data)
        external
        onlyBackendOrOwner
        onlyActive
        nonReentrant
        returns (bytes memory result)
    {
        // Security checks
        require(target != address(USDC), "Cannot call USDC directly");
        require(target != address(this), "Cannot call self");

        (bool success, bytes memory returnData) = target.call(data);
        require(success, "Backend action failed");

        emit BackendActionExecuted("external_call", data, block.timestamp);
        return returnData;
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
    function getTotalValue() external view returns (uint256 totalValue) {
        totalValue = USDC.balanceOf(address(this));

        for (uint256 i = 0; i < activeProtocols.length; i++) {
            totalValue += protocolBalances[activeProtocols[i]];
        }
    }

    /**
     * @notice Get wallet summary
     * @return usdcBalance Current USDC balance
     * @return totalAllocated Total amount allocated to protocols
     * @return protocolCount Number of active protocols
     * @return active Whether the wallet is active
     */
    function getWalletSummary() external view returns (
        uint256 usdcBalance,
        uint256 totalAllocated,
        uint256 protocolCount,
        bool active
    ) {
        usdcBalance = USDC.balanceOf(address(this));

        totalAllocated = 0;
        for (uint256 i = 0; i < activeProtocols.length; i++) {
            totalAllocated += protocolBalances[activeProtocols[i]];
        }

        protocolCount = activeProtocols.length;
        active = isActive;
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
        return "1.0.0";
    }
}