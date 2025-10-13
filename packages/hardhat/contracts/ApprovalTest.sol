// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ApprovalTest {
    IERC20 public immutable USDC;
    
    constructor(address _usdc) {
        USDC = IERC20(_usdc);
    }
    
    function testApproval(address spender, uint256 amount) external returns (bool) {
        return USDC.approve(spender, amount);
    }
    
    function testBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }
}