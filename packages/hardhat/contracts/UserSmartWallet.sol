// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IProtocolAdapter.sol";

/**
 * @title Circle CCTP V2 Interfaces
 * @notice Official Circle Cross-Chain Transfer Protocol V2 interfaces
 */
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 hookData,
        uint256 maxFee,
        uint32 finalityThreshold
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    function receiveMessage(
        bytes memory message,
        bytes memory attestation
    ) external returns (bool success);
}

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

    // CCTP Integration - Circle's official contract addresses
    mapping(uint256 => address) public tokenMessengerAddresses;
    mapping(uint256 => address) public messageTransmitterAddresses;
    mapping(uint256 => uint32) public cctpDomains;

    // CCTP Transfer State Management
    struct CCTPTransfer {
        uint64 nonce;
        uint256 amount;
        uint32 destinationDomain;
        address recipient;
        bytes32 messageHash;
        uint8 status; // 0=pending, 1=burned, 2=completed, 3=failed
        uint256 timestamp;
        uint256 retryCount;
        string destinationChain;
    }

    mapping(uint64 => CCTPTransfer) public cctpTransfers;
    mapping(bytes32 => bool) public processedMessages;
    uint64[] public activeCCTPTransfers;

    // Events
    event Deposited(address indexed user, uint256 amount, string strategy, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 timestamp);
    event ProtocolAllocation(string indexed protocol, address adapter, uint256 amount, uint256 timestamp);
    event ProtocolWithdrawal(string indexed protocol, address adapter, uint256 amount, uint256 timestamp);
    event WalletDeactivated(uint256 timestamp);
    event BackendActionExecuted(string action, bytes data, uint256 timestamp);
    event AllocationExecuted(string[] protocolNames, address[] adapters, uint256[] amounts);

    // Enhanced CCTP Events
    event CCTPBurnExecuted(uint64 indexed nonce, uint256 amount, uint32 destinationDomain, address recipient, string destinationChain, uint256 timestamp);
    event CCTPMintCompleted(uint64 indexed nonce, bytes32 messageHash, uint256 amount, uint256 timestamp);
    event CCTPTransferFailed(uint64 indexed nonce, string reason, uint256 timestamp);
    event CCTPTransferCancelled(uint64 indexed nonce, uint256 timestamp);
    event CCTPConfigUpdated(uint256 chainId, address tokenMessenger, address messageTransmitter, uint32 domain);

    // Errors
    error OnlyOwner();
    error OnlyBackendOrOwner();
    error OnlyFactory();
    error WalletNotActive();
    error CCTPNotSupported();
    error InvalidDestinationDomain();
    error TransferNotFound();
    error TransferAlreadyCompleted();
    error MessageAlreadyProcessed();
    error CCTPMintFailed();
    error InvalidNonce();
    error TransferTooOld();
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

        // Initialize CCTP addresses for current chain
        _initializeCCTPAddresses();
    }

    /**
     * @notice Initialize CCTP contract addresses for supported chains
     * @dev Uses Circle's official contract addresses
     */
    function _initializeCCTPAddresses() internal {
        // Ethereum Sepolia (Testnet)
        tokenMessengerAddresses[11155111] = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
        messageTransmitterAddresses[11155111] = 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275;
        cctpDomains[11155111] = 0;

        // Base Sepolia (Testnet)
        tokenMessengerAddresses[84532] = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
        messageTransmitterAddresses[84532] = 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275;
        cctpDomains[84532] = 6;

        // Arbitrum Sepolia (Testnet)
        tokenMessengerAddresses[421614] = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
        messageTransmitterAddresses[421614] = 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275;
        cctpDomains[421614] = 3;

        // Ethereum Mainnet
        tokenMessengerAddresses[1] = 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d;
        messageTransmitterAddresses[1] = 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64;
        cctpDomains[1] = 0;

        // Base Mainnet
        tokenMessengerAddresses[8453] = 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d;
        messageTransmitterAddresses[8453] = 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64;
        cctpDomains[8453] = 6;

        // Arbitrum One Mainnet
        tokenMessengerAddresses[42161] = 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d;
        messageTransmitterAddresses[42161] = 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64;
        cctpDomains[42161] = 3;
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
        USDC.transferFrom(owner, address(this), amount);

        // Update tracking
        totalDeposited += amount;

        emit Deposited(owner, amount, strategy, block.timestamp);
    }

    /**
     * @notice Execute CCTP cross-chain transfer using Circle's official contracts
     * @param amount Amount to transfer (in USDC wei - 6 decimals)
     * @param destinationChainId Destination chain ID
     * @param recipient Recipient address on destination chain
     * @param destinationChain Human-readable destination chain name
     * @return nonce CCTP nonce for tracking the transfer
     */
    function executeCCTP(
        uint256 amount,
        uint256 destinationChainId,
        address recipient,
        string memory destinationChain
    ) external onlyActive nonReentrant returns (uint64 nonce) {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (USDC.balanceOf(address(this)) < amount) revert InsufficientBalance();

        // Get CCTP contract addresses for current chain
        address tokenMessenger = tokenMessengerAddresses[block.chainid];
        uint32 destinationDomain = cctpDomains[destinationChainId];

        if (tokenMessenger == address(0)) revert CCTPNotSupported();
        if (destinationDomain == 0 && destinationChainId != 11155111 && destinationChainId != 1) {
            revert InvalidDestinationDomain();
        }

        // Convert recipient address to bytes32 format for CCTP (zero-padded)
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        // Approve USDC spending by Circle's TokenMessenger (testing with regular approve)
        USDC.approve(tokenMessenger, amount);

            // Execute burn using Circle's official CCTP V2 contract
            nonce = ITokenMessenger(tokenMessenger).depositForBurn(
                amount,
                destinationDomain,
                mintRecipient,
                address(USDC),
                0x0000000000000000000000000000000000000000000000000000000000000000, // hookData (no hook)
                1000, // maxFee (1000 like Circle's DEFAULT_MAX_FEE)
                2000  // finalityThreshold (2000 for standard transfer)
            );

        // Track the transfer state
        cctpTransfers[nonce] = CCTPTransfer({
            nonce: nonce,
            amount: amount,
            destinationDomain: destinationDomain,
            recipient: recipient,
            messageHash: bytes32(0), // Will be set when completed
            status: 1, // burned
            timestamp: block.timestamp,
            retryCount: 0,
            destinationChain: destinationChain
        });

        activeCCTPTransfers.push(nonce);

        emit CCTPBurnExecuted(nonce, amount, destinationDomain, recipient, destinationChain, block.timestamp);
        return nonce;
    }

    /**
     * @notice Complete CCTP transfer by minting on destination chain
     * @param message Message from source chain burn transaction
     * @param attestation Circle's attestation signature
     * @param nonce CCTP nonce to complete
     * @return success True if mint was successful
     */
    function completeCCTP(
        bytes memory message,
        bytes memory attestation,
        uint64 nonce
    ) external onlyBackendOrOwner onlyActive nonReentrant returns (bool success) {
        // Verify transfer exists and is in correct state
        CCTPTransfer storage transfer = cctpTransfers[nonce];
        if (transfer.amount == 0) revert TransferNotFound();
        if (transfer.status == 2) revert TransferAlreadyCompleted();
        if (transfer.status == 3) revert CCTPMintFailed();

        // Generate message hash for duplicate protection
        bytes32 messageHash = keccak256(message);
        if (processedMessages[messageHash]) revert MessageAlreadyProcessed();

        // Get MessageTransmitter for current chain
        address messageTransmitter = messageTransmitterAddresses[block.chainid];
        if (messageTransmitter == address(0)) revert CCTPNotSupported();

        // Execute mint using Circle's official CCTP contract
        success = IMessageTransmitter(messageTransmitter).receiveMessage(
            message,
            attestation
        );

        if (!success) {
            transfer.retryCount++;
            if (transfer.retryCount >= 3) {
                transfer.status = 3; // failed
                emit CCTPTransferFailed(nonce, "Max retries exceeded", block.timestamp);
            }
            revert CCTPMintFailed();
        }

        // Mark as completed
        transfer.status = 2; // completed
        transfer.messageHash = messageHash;
        processedMessages[messageHash] = true;

        emit CCTPMintCompleted(nonce, messageHash, transfer.amount, block.timestamp);
        return true;
    }

    /**
     * @notice Get CCTP transfer details
     * @param nonce CCTP nonce
     * @return transfer CCTPTransfer struct
     */
    function getCCTPTransfer(uint64 nonce) external view returns (CCTPTransfer memory transfer) {
        return cctpTransfers[nonce];
    }

    /**
     * @notice Verify if a CCTP transfer was completed
     * @param nonce CCTP nonce
     * @return exists True if transfer exists
     * @return completed True if transfer was completed
     * @return amount Transfer amount
     * @return recipient Recipient address
     */
    function verifyCCTPTransfer(uint64 nonce) external view returns (
        bool exists,
        bool completed,
        uint256 amount,
        address recipient
    ) {
        CCTPTransfer memory transfer = cctpTransfers[nonce];
        return (
            transfer.amount > 0,
            transfer.status == 2,
            transfer.amount,
            transfer.recipient
        );
    }

    /**
     * @notice Get all active CCTP transfer nonces
     * @return nonces Array of active transfer nonces
     */
    function getActiveCCTPTransfers() external view returns (uint64[] memory nonces) {
        return activeCCTPTransfers;
    }

    /**
     * @notice Cancel a pending CCTP transfer (emergency only)
     * @param nonce CCTP nonce to cancel
     */
    function cancelCCTPTransfer(uint64 nonce) external onlyOwner {
        CCTPTransfer storage transfer = cctpTransfers[nonce];
        if (transfer.amount == 0) revert TransferNotFound();
        if (transfer.status != 0) revert TransferAlreadyCompleted();

        transfer.status = 3; // failed
        emit CCTPTransferCancelled(nonce, block.timestamp);
    }

    /**
     * @notice Mark a CCTP transfer as failed (backend only)
     * @param nonce CCTP nonce
     * @param reason Failure reason
     */
    function markCCTPFailed(uint64 nonce, string memory reason) external onlyBackendOrOwner {
        CCTPTransfer storage transfer = cctpTransfers[nonce];
        if (transfer.amount == 0) revert TransferNotFound();
        if (transfer.status == 2) revert TransferAlreadyCompleted();

        transfer.status = 3; // failed
        emit CCTPTransferFailed(nonce, reason, block.timestamp);
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
        USDC.transfer(adapter, amount);
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

        USDC.transfer(owner, balance);
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

        USDC.transfer(owner, amount);
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
     * @notice Update CCTP configuration for a chain (admin only)
     * @param chainId Chain ID to update
     * @param tokenMessenger TokenMessenger address
     * @param messageTransmitter MessageTransmitter address
     * @param domain CCTP domain
     */
    function updateCCTPConfig(
        uint256 chainId,
        address tokenMessenger,
        address messageTransmitter,
        uint32 domain
    ) external onlyOwner {
        tokenMessengerAddresses[chainId] = tokenMessenger;
        messageTransmitterAddresses[chainId] = messageTransmitter;
        cctpDomains[chainId] = domain;

        emit CCTPConfigUpdated(chainId, tokenMessenger, messageTransmitter, domain);
    }

    /**
     * @notice Check if CCTP is supported on current chain
     * @return supported True if CCTP is supported
     */
    function isCCTPSupported() external view returns (bool supported) {
        return tokenMessengerAddresses[block.chainid] != address(0);
    }

    /**
     * @notice Get CCTP configuration for current chain
     * @return tokenMessenger TokenMessenger address
     * @return messageTransmitter MessageTransmitter address
     * @return domain CCTP domain
     */
    function getCCTPConfig() external view returns (
        address tokenMessenger,
        address messageTransmitter,
        uint32 domain
    ) {
        return (
            tokenMessengerAddresses[block.chainid],
            messageTransmitterAddresses[block.chainid],
            cctpDomains[block.chainid]
        );
    }

    /**
     * @notice Get contract version
     * @return version Contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0-cctp";
    }
}