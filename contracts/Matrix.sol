// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Matrix is ERC20, Ownable {
    using SafeMath for uint256;

    constructor() ERC20("Matrix", "XUSD") {
        console.log("constructor execute 237");
    }

//    event Received(address, uint);

    uint divider = 0.01 * (10 ** 18);
    uint boxesCount = 8;

    receive() external payable {
        require(msg.value.mod(divider) == 0, "You must transfer multiple of 0.01 bnb");
        require(msg.value.div(divider) <= boxesCount, "max level is 0.08");
        register("do register");
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        console.log("!!!fallback");
        console.log(msg.sender);
        console.log(msg.value);
    }

    function register(string memory _message) payable public {
        console.log("register");
        console.log(_message);
    }
}
