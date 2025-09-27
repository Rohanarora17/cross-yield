// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IProtocolAdapter
 * @notice Interface for protocol adapters in the CrossYield system
 * @dev All protocol adapters must implement this interface
 */
interface IProtocolAdapter {
    /**
     * @notice Deposit assets into the protocol on behalf of a user
     * @param user Address of the user
     * @param amount Amount to deposit
     */
    function deposit(address user, uint256 amount) external;

    /**
     * @notice Withdraw assets from the protocol for a user
     * @param user Address of the user
     * @param amount Amount to withdraw
     */
    function withdraw(address user, uint256 amount) external;

    /**
     * @notice Get the balance of a user in this protocol
     * @param user Address of the user
     * @return balance User's balance in the protocol
     */
    function balanceOf(address user) external view returns (uint256 balance);

    /**
     * @notice Get the current APY offered by this protocol
     * @return apy Current APY in basis points (e.g., 500 = 5%)
     */
    function getCurrentAPY() external view returns (uint256 apy);

    /**
     * @notice Get protocol information
     * @return name Protocol name
     * @return riskScore Risk score (0-100, lower is safer)
     * @return tvl Total value locked in USD
     */
    function getProtocolInfo() external view returns (
        string memory name,
        uint256 riskScore,
        uint256 tvl
    );

    /**
     * @notice Check if deposits are currently allowed
     * @return allowed True if deposits are allowed
     */
    function isDepositAllowed() external view returns (bool allowed);

    /**
     * @notice Check if withdrawals are currently allowed
     * @return allowed True if withdrawals are allowed
     */
    function isWithdrawAllowed() external view returns (bool allowed);
}