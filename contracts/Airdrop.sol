// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Airdrop is Ownable {
    IERC20 public alex;

    constructor(address alexAddress) Ownable(msg.sender) {
        alex = IERC20(alexAddress);
    }

    function claim(uint256 amount) external {
        require(alex.balanceOf(address(this)) >= amount, "Insufficient balance");
        alex.transfer(msg.sender, amount);
    }

    function fund(uint256 amount) external onlyOwner {
        alex.transferFrom(msg.sender, address(this), amount);
    }
}