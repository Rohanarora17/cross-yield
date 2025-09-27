// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserSmartWallet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SmartWalletFactory
 * @notice Factory contract for creating deterministic user smart wallets
 * @dev Uses CREATE2 for predictable wallet addresses across chains
 */
contract SmartWalletFactory is Ownable {

    // State variables
    mapping(address => address) public userWallets;
    mapping(address => bool) public isValidWallet;
    address public immutable backendCoordinator;

    // Events
    event WalletCreated(address indexed user, address indexed wallet, bytes32 salt);
    event BackendCoordinatorUpdated(address indexed oldCoordinator, address indexed newCoordinator);

    // Errors
    error WalletAlreadyExists();
    error InvalidUser();
    error WalletCreationFailed();

    /**
     * @notice Constructor
     * @param _backendCoordinator Address of the backend coordinator
     * @param _owner Address of the contract owner
     */
    constructor(address _backendCoordinator, address _owner) Ownable(_owner) {
        require(_backendCoordinator != address(0), "Invalid backend coordinator");
        backendCoordinator = _backendCoordinator;
    }

    /**
     * @notice Create a smart wallet for a user
     * @param user Address of the user
     * @return wallet Address of the created smart wallet
     */
    function createWallet(address user) external returns (address wallet) {
        if (user == address(0)) revert InvalidUser();
        if (userWallets[user] != address(0)) revert WalletAlreadyExists();

        // Generate deterministic salt based on user address
        bytes32 salt = _generateSalt(user);

        // Deploy smart wallet using CREATE2
        wallet = address(new UserSmartWallet{salt: salt}(
            user,
            backendCoordinator,
            address(this)
        ));

        if (wallet == address(0)) revert WalletCreationFailed();

        // Store wallet mapping
        userWallets[user] = wallet;
        isValidWallet[wallet] = true;

        emit WalletCreated(user, wallet, salt);
    }

    /**
     * @notice Get the smart wallet address for a user
     * @param user Address of the user
     * @return wallet Address of the user's smart wallet (0x0 if doesn't exist)
     */
    function getWallet(address user) external view returns (address wallet) {
        return userWallets[user];
    }

    /**
     * @notice Predict the smart wallet address for a user (before creation)
     * @param user Address of the user
     * @return predictedAddress The predicted wallet address
     */
    function predictWalletAddress(address user) external view returns (address predictedAddress) {
        bytes32 salt = _generateSalt(user);

        bytes memory bytecode = abi.encodePacked(
            type(UserSmartWallet).creationCode,
            abi.encode(user, backendCoordinator, address(this))
        );

        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        ));

        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Check if a wallet exists for a user
     * @param user Address of the user
     * @return exists True if wallet exists
     */
    function hasWallet(address user) external view returns (bool exists) {
        return userWallets[user] != address(0);
    }

    /**
     * @notice Check if an address is a valid smart wallet created by this factory
     * @param wallet Address to check
     * @return valid True if it's a valid wallet
     */
    function isWalletValid(address wallet) external view returns (bool valid) {
        return isValidWallet[wallet];
    }

    /**
     * @notice Get the owner of a smart wallet
     * @param wallet Address of the smart wallet
     * @return owner Address of the wallet owner
     */
    function getWalletOwner(address wallet) external view returns (address owner) {
        if (!isValidWallet[wallet]) return address(0);
        return UserSmartWallet(payable(wallet)).owner();
    }

    /**
     * @notice Get total number of wallets created
     * @return count Total wallet count
     */
    function getTotalWallets() external view returns (uint256 count) {
        // This would require additional tracking in production
        // For now, we'll implement a basic counter
        return 0; // TODO: Implement counter
    }

    /**
     * @notice Emergency function to disable a compromised wallet
     * @param wallet Address of the wallet to disable
     * @dev Only owner can call this function
     */
    function disableWallet(address wallet) external onlyOwner {
        require(isValidWallet[wallet], "Wallet not valid");
        isValidWallet[wallet] = false;

        // Find and remove from userWallets mapping
        // This is gas-intensive but needed for security
        // In production, consider using a different approach
    }

    /**
     * @notice Create smart wallet for multiple users in batch
     * @param users Array of user addresses
     * @return wallets Array of created wallet addresses
     */
    function createWalletsBatch(address[] calldata users)
        external
        returns (address[] memory wallets)
    {
        uint256 length = users.length;
        require(length > 0 && length <= 100, "Invalid batch size"); // Limit batch size

        wallets = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            // Skip if wallet already exists
            if (userWallets[users[i]] != address(0)) {
                wallets[i] = userWallets[users[i]];
                continue;
            }

            wallets[i] = this.createWallet(users[i]);
        }
    }

    /**
     * @notice Generate deterministic salt for CREATE2
     * @param user Address of the user
     * @return salt The generated salt
     */
    function _generateSalt(address user) internal pure returns (bytes32 salt) {
        return keccak256(abi.encodePacked("CrossYield_SmartWallet_", user));
    }

    /**
     * @notice Get wallet creation bytecode hash (for verification)
     * @return hash The bytecode hash
     */
    function getWalletBytecodeHash() external pure returns (bytes32 hash) {
        return keccak256(type(UserSmartWallet).creationCode);
    }

    /**
     * @notice Get contract version
     * @return version The contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}