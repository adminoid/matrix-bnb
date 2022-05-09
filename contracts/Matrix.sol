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

    event Received(address, uint);

    receive() external payable {
//        uint256 amount = _amount.mul(1e18);
//        payable(msg.sender).transfer(amount / 1e18);

        console.log(msg.sender);
        console.log(msg.value);

        emit Received(msg.sender, msg.value);
    }

    function register(string memory _message) payable public {
        console.log(_message);
    }
}
