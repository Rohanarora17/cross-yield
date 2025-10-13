// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// V1 Interface matching the example repository (4 parameters)
interface ITokenMessengerV1 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

/**
 * @title WorkingCCTPWalletV1
 * @notice Test V1 interface (4 parameters) matching example repository
 */
contract WorkingCCTPWalletV1 {

    // Exact same addresses that worked in direct call
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 constant SEPOLIA_DOMAIN = 0;

    event CCTPExecuted(uint64 nonce, uint256 amount, address recipient, uint256 timestamp);

    /**
     * @notice Execute CCTP using V1 interface (4 parameters)
     * @param amount Amount of USDC to transfer
     * @param recipient Recipient address on destination chain
     */
    function executeCCTP(uint256 amount, address recipient) external returns (uint64 nonce) {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        ITokenMessengerV1 tokenMessenger = ITokenMessengerV1(TOKEN_MESSENGER);

        // Step 1: Transfer USDC from caller to this contract
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Step 2: Approve TokenMessenger
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Step 3: Call depositForBurn with V1 interface (4 parameters only)
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        nonce = tokenMessenger.depositForBurn(
            amount,                    // Amount
            SEPOLIA_DOMAIN,           // Destination domain (0)
            mintRecipient,            // Recipient format
            USDC_ADDRESS              // Burn token
        );

        emit CCTPExecuted(nonce, amount, recipient, block.timestamp);
        return nonce;
    }

    /**
     * @notice Get USDC balance of this contract
     */
    function getUSDCBalance() external view returns (uint256) {
        return IERC20(USDC_ADDRESS).balanceOf(address(this));
    }

    /**
     * @notice Get allowance to TokenMessenger
     */
    function getAllowance() external view returns (uint256) {
        return IERC20(USDC_ADDRESS).allowance(address(this), TOKEN_MESSENGER);
    }

    /**
     * @notice Emergency function to withdraw USDC
     */
    function emergencyWithdraw() external {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.transfer(msg.sender, balance);
        }
    }
}