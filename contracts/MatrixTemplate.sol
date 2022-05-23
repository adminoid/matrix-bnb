// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract MatrixTemplate {
    using SafeMath for uint256;

    address Deployer;

    constructor(address _deployer) {
        console.log("MatrixTemplate constructor");
        register(_deployer);
        Deployer = _deployer;
    }

    struct User {
        uint balance;
    }

    mapping(address => User) Addresses;
    address[] Indices;

    function register(address wallet) payable public {
        console.log("MatrixTemplate register");

        Addresses[wallet] = User(0);
        Indices.push(wallet);
    }

    function getBalance(address wallet) public view returns(User memory user) {
        user = Addresses[wallet];
    }

    function getLength() public view returns(uint length) {
        length = Indices.length;
    }
}
