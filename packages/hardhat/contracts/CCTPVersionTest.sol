// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// V1 Interface (4 parameters)
interface ITokenMessengerV1 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

// V2 Interface (7 parameters)
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
 * @title CCTPVersionTest
 * @notice Test contract to determine if Base Sepolia uses CCTP V1 or V2
 */
contract CCTPVersionTest {
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 constant SEPOLIA_DOMAIN = 0;

    event CCTPV1Test(uint64 nonce, string version);
    event CCTPV2Test(uint64 nonce, string version);
    event TestFailed(string version, string reason);

    /**
     * @notice Test CCTP V1 interface
     */
    function testV1(uint256 amount, address recipient) external returns (bool success) {
        try this._testV1Internal(amount, recipient) returns (uint64 nonce) {
            emit CCTPV1Test(nonce, "V1");
            return true;
        } catch Error(string memory reason) {
            emit TestFailed("V1", reason);
            return false;
        } catch {
            emit TestFailed("V1", "Unknown error");
            return false;
        }
    }

    /**
     * @notice Test CCTP V2 interface
     */
    function testV2(uint256 amount, address recipient) external returns (bool success) {
        try this._testV2Internal(amount, recipient) returns (uint64 nonce) {
            emit CCTPV2Test(nonce, "V2");
            return true;
        } catch Error(string memory reason) {
            emit TestFailed("V2", reason);
            return false;
        } catch {
            emit TestFailed("V2", "Unknown error");
            return false;
        }
    }

    /**
     * @notice Internal V1 test (public for try/catch)
     */
    function _testV1Internal(uint256 amount, address recipient) external returns (uint64 nonce) {
        require(msg.sender == address(this), "Only self");

        IERC20 usdc = IERC20(USDC_ADDRESS);
        ITokenMessengerV1 tokenMessenger = ITokenMessengerV1(TOKEN_MESSENGER);

        // Transfer and approve
        require(usdc.transferFrom(tx.origin, address(this), amount), "Transfer failed");
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Test V1 call
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));
        nonce = tokenMessenger.depositForBurn(
            amount,
            SEPOLIA_DOMAIN,
            mintRecipient,
            USDC_ADDRESS
        );

        return nonce;
    }

    /**
     * @notice Internal V2 test (public for try/catch)
     */
    function _testV2Internal(uint256 amount, address recipient) external returns (uint64 nonce) {
        require(msg.sender == address(this), "Only self");

        IERC20 usdc = IERC20(USDC_ADDRESS);
        ITokenMessengerV2 tokenMessenger = ITokenMessengerV2(TOKEN_MESSENGER);

        // Transfer and approve
        require(usdc.transferFrom(tx.origin, address(this), amount), "Transfer failed");
        require(usdc.approve(TOKEN_MESSENGER, amount), "Approve failed");

        // Test V2 call
        bytes32 mintRecipient = bytes32(uint256(uint160(recipient)));
        nonce = tokenMessenger.depositForBurn(
            amount,
            SEPOLIA_DOMAIN,
            mintRecipient,
            USDC_ADDRESS,
            0x0000000000000000000000000000000000000000000000000000000000000000, // destinationCaller (any)
            1000, // maxFee
            2000  // minFinalityThreshold
        );

        return nonce;
    }

    /**
     * @notice Get USDC balance
     */
    function getUSDCBalance() external view returns (uint256) {
        return IERC20(USDC_ADDRESS).balanceOf(address(this));
    }
}