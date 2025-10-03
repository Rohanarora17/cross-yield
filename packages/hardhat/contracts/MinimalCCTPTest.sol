// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Circle's official TokenMessenger V2 interface
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

/**
 * @title MinimalCCTPTest
 * @notice Minimal CCTP test contract based on Circle's official examples
 */
contract MinimalCCTPTest {

    // Base Sepolia addresses from Circle
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 constant SEPOLIA_DOMAIN = 0; // Sepolia destination domain

    event CCTPTest(uint64 nonce, uint256 amount, address recipient);

    /**
     * @notice Minimal CCTP test function following Circle's exact pattern
     */
    function testCCTP(uint256 amount, address recipient) external returns (uint64 nonce) {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        ITokenMessenger tokenMessenger = ITokenMessenger(TOKEN_MESSENGER);

        // Step 1: Transfer USDC to this contract (like Circle's examples)
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Step 2: Approve TokenMessenger (standard approve like Circle uses)
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Step 3: Call depositForBurn V2 (exactly like Circle's V2 examples)
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));
            nonce = tokenMessenger.depositForBurn(
                amount,
                SEPOLIA_DOMAIN,
                mintRecipient,
                USDC_ADDRESS,
                0x0000000000000000000000000000000000000000000000000000000000000000, // hookData (no hook)
                1000, // maxFee (1000 like Circle's DEFAULT_MAX_FEE)
                2000  // finalityThreshold (2000 for standard transfer)
            );

        emit CCTPTest(nonce, amount, recipient);
        return nonce;
    }

    /**
     * @notice Check USDC balance
     */
    function getUSDCBalance() external view returns (uint256) {
        return IERC20(USDC_ADDRESS).balanceOf(address(this));
    }

    /**
     * @notice Check allowance to TokenMessenger
     */
    function getAllowance() external view returns (uint256) {
        return IERC20(USDC_ADDRESS).allowance(address(this), TOKEN_MESSENGER);
    }
}