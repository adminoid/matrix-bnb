// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Matrix is Ownable {
    using SafeMath for uint256;

    constructor() {
        console.log("constructor execute 237");
        console.log(Box.length);
    }

//    event Received(address, uint);

    uint256 divider = 0.01 * (10 ** 18); // first number is bnb amount
    uint256 boxesCount = 8;

//    uint256 Box = new address[](boxesCount);
//    address[][boxesCount] Box;

    receive() external payable {
        require(msg.value.mod(divider) == 0, "You must transfer multiple of 0.01 bnb");
        uint256 level = msg.value.div(divider);
        require(level <= boxesCount, "max level is 0.08");
        register(msg.sender, level);
//        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        console.log("!!!fallback");
        console.log(msg.sender);
        console.log(msg.value);
    }

    function register(address wallet, uint256 level) payable public {
        console.log("register");
        console.log(wallet);
        console.log(level);
    }
}
