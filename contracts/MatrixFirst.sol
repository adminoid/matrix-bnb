// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract MatrixFirst {
    using SafeMath for uint256;

    address Deployer;

    constructor(address _deployer) {
        console.log("Matrix constructor");
        Deployer = _deployer;
    }

    struct User {
        uint balance;
    }

    mapping(address => User) Addresses;
    address[] Indices;

    function register(address wallet) payable public {
        console.log("MatrixFirst register");

        Addresses[wallet] = User(237);
        Indices.push(wallet);
    }

    function getBalance(address wallet) public view returns(User memory user) {
        user = Addresses[wallet];
    }

    function getLength() public view returns(uint length) {
        length = Indices.length;
    }
}
