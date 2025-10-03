// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Correct Circle CCTP V2 interface from official repo
interface ITokenMessengerV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64 nonce);
}

/**
 * @title WorkingCCTPWallet
 * @notice Minimal smart wallet using EXACT pattern from successful direct CCTP call
 */
contract WorkingCCTPWallet {

    // Exact same addresses that worked in direct call
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 constant SEPOLIA_DOMAIN = 0;

    event CCTPExecuted(uint64 nonce, uint256 amount, address recipient, uint256 timestamp);

    /**
     * @notice Execute CCTP using EXACT same pattern as successful direct call
     * @param amount Amount of USDC to transfer
     * @param recipient Recipient address on destination chain
     */
    function executeCCTP(uint256 amount, address recipient) external returns (uint64 nonce) {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        ITokenMessengerV2 tokenMessenger = ITokenMessengerV2(TOKEN_MESSENGER);

        // Step 1: Transfer USDC from caller to this contract (same as direct call pattern)
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Step 2: Approve TokenMessenger (exact same as successful direct call)
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Step 3: Call depositForBurn with EXACT same parameters that worked
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        nonce = tokenMessenger.depositForBurn(
            amount,                    // Same amount
            SEPOLIA_DOMAIN,           // Same destination domain (0)
            mintRecipient,            // Same recipient format
            USDC_ADDRESS,             // Same burn token
            0x0000000000000000000000000000000000000000000000000000000000000000, // destinationCaller (any)
            1000,                     // Same maxFee
            2000                      // Same minFinalityThreshold
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