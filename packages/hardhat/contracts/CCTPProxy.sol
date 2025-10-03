// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CCTPProxy
 * @notice Proxy contract that executes CCTP calls on behalf of smart wallets
 * @dev Uses delegatecall to execute CCTP from the context of the calling wallet
 */
contract CCTPProxy {

    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 constant SEPOLIA_DOMAIN = 0;

    event CCTPExecuted(address indexed wallet, uint64 nonce, uint256 amount, address recipient);

    /**
     * @notice Execute CCTP transfer using exact working parameters
     * @param amount Amount of USDC to transfer
     * @param recipient Recipient address on destination chain
     */
    function executeCCTP(uint256 amount, address recipient) external returns (uint64 nonce) {
        IERC20 usdc = IERC20(USDC_ADDRESS);

        // Caller must have approved this proxy to spend their USDC
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Approve TokenMessenger
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Convert recipient to bytes32
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        // Make the exact same call that works directly
        (bool success, bytes memory data) = TOKEN_MESSENGER.call(
            abi.encodeWithSignature(
                "depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)",
                amount,                    // amount
                SEPOLIA_DOMAIN,           // destinationDomain (0)
                mintRecipient,            // mintRecipient
                USDC_ADDRESS,             // burnToken
                0x0000000000000000000000000000000000000000000000000000000000000000, // destinationCaller
                1000,                     // maxFee
                2000                      // minFinalityThreshold
            )
        );

        require(success, "CCTP call failed");

        // Decode the nonce from the return data
        nonce = abi.decode(data, (uint64));

        emit CCTPExecuted(msg.sender, nonce, amount, recipient);
        return nonce;
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