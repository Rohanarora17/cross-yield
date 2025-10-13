// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FinalCCTPAttempt
 * @notice Final attempt to make smart contract CCTP work with proper gas limits and low-level calls
 */
contract FinalCCTPAttempt {

    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 constant SEPOLIA_DOMAIN = 0;

    event CCTPExecuted(uint64 nonce, uint256 amount, address recipient, uint256 gasUsed);
    event CCTPFailed(string reason, bytes data);

    /**
     * @notice Execute CCTP with proper gas management and error handling
     */
    function executeCCTP(uint256 amount, address recipient) external returns (uint64 nonce) {
        IERC20 usdc = IERC20(USDC_ADDRESS);

        // Step 1: Transfer USDC from caller
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Step 2: Approve TokenMessenger with extra gas
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Step 3: Execute CCTP with low-level call and proper gas
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        bytes memory callData = abi.encodeWithSignature(
            "depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)",
            amount,                    // amount
            SEPOLIA_DOMAIN,           // destinationDomain (0)
            mintRecipient,            // mintRecipient
            USDC_ADDRESS,             // burnToken
            bytes32(0),               // destinationCaller (0x0)
            1000,                     // maxFee
            2000                      // minFinalityThreshold
        );

        // Use low-level call with explicit gas limit
        uint256 gasStart = gasleft();
        (bool success, bytes memory returnData) = TOKEN_MESSENGER.call{gas: 200000}(callData);
        uint256 gasUsed = gasStart - gasleft();

        if (success) {
            nonce = abi.decode(returnData, (uint64));
            emit CCTPExecuted(nonce, amount, recipient, gasUsed);
            return nonce;
        } else {
            // Emit detailed failure information
            string memory reason = "Low-level call failed";
            if (returnData.length >= 68) {
                // Try to decode revert reason (0x08c379a0 selector + offset + length + data)
                bytes4 selector;
                assembly {
                    selector := mload(add(returnData, 0x20))
                }
                if (selector == 0x08c379a0) {
                    // Standard revert with message - extract from bytes
                    assembly {
                        let dataPtr := add(returnData, 0x44) // Skip selector (4) + offset (32) + length (32)
                        let length := mload(add(returnData, 0x24))
                        reason := mload(0x40) // Free memory pointer
                        mstore(reason, length) // Store length
                        let dataEnd := add(dataPtr, length)
                        for { let i := dataPtr } lt(i, dataEnd) { i := add(i, 0x20) } {
                            mstore(add(reason, sub(i, sub(dataPtr, 0x20))), mload(i))
                        }
                        mstore(0x40, add(reason, add(0x20, length))) // Update free memory pointer
                    }
                }
            }
            emit CCTPFailed(reason, returnData);
            revert(reason);
        }
    }

    /**
     * @notice Test function to try CCTP with different approaches
     */
    function testMultipleApproaches(uint256 amount, address recipient) external returns (bool) {
        IERC20 usdc = IERC20(USDC_ADDRESS);

        // Ensure we have the funds
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));

        // Approach 1: Direct interface call
        try this._tryDirectCall(amount, mintRecipient) returns (uint64 nonce) {
            emit CCTPExecuted(nonce, amount, recipient, 0);
            return true;
        } catch Error(string memory reason) {
            emit CCTPFailed(string.concat("Direct call failed: ", reason), "");
        } catch (bytes memory data) {
            emit CCTPFailed("Direct call failed: unknown", data);
        }

        // Approach 2: Low-level call with different gas limits
        for (uint256 gasLimit = 150000; gasLimit <= 300000; gasLimit += 50000) {
            if (_tryLowLevelCall(amount, mintRecipient, gasLimit)) {
                return true;
            }
        }

        return false;
    }

    function _tryDirectCall(uint256 amount, bytes32 mintRecipient) external returns (uint64) {
        require(msg.sender == address(this), "Only self");

        IERC20(USDC_ADDRESS).approve(TOKEN_MESSENGER, amount);

        // Direct interface call
        (bool success, bytes memory data) = TOKEN_MESSENGER.call(
            abi.encodeWithSignature(
                "depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)",
                amount, SEPOLIA_DOMAIN, mintRecipient, USDC_ADDRESS,
                bytes32(0), 1000, 2000
            )
        );

        require(success, "Direct call failed");
        return abi.decode(data, (uint64));
    }

    function _tryLowLevelCall(uint256 amount, bytes32 mintRecipient, uint256 gasLimit) internal returns (bool) {
        IERC20(USDC_ADDRESS).approve(TOKEN_MESSENGER, amount);

        bytes memory callData = abi.encodeWithSignature(
            "depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)",
            amount, SEPOLIA_DOMAIN, mintRecipient, USDC_ADDRESS,
            bytes32(0), 1000, 2000
        );

        (bool success, bytes memory data) = TOKEN_MESSENGER.call{gas: gasLimit}(callData);

        if (success) {
            uint64 nonce = abi.decode(data, (uint64));
            emit CCTPExecuted(nonce, amount, address(0), gasLimit);
            return true;
        }

        return false;
    }

    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw() external {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.transfer(msg.sender, balance);
        }
    }
}