// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./MatrixTemplate.sol";

contract Core is Ownable {
    using SafeMath for uint256;

    MatrixTemplate M;

    constructor() {
        // todo: for multiple level contracts - push to array in range [0..7]
        console.log("Core constructor");
        M = new MatrixTemplate(msg.sender);
    }

    event Registered(address, uint);

    uint256 divider = 0.01 * (10 ** 18); // first number is bnb amount

    uint maxLevel = 8;

    receive() external payable {
        require(msg.value.mod(divider) == 0, "You must transfer multiple of 0.01 bnb");
        uint256 level = msg.value.div(divider);
        require(level <= maxLevel, "max level is 8 (0.08 bnb)");
        if (level == 1) {
            M.register(msg.sender);
        }
        emit Registered(msg.sender, level);
    }

    function getLevelContract(uint level) external view returns(MatrixTemplate) {
//        if (level == 1) {
//            return M;
//        }
        console.log(level);
        return M;
    }

    // todo: delete later, that for experiment
    fallback() external payable {
        console.log("!!!fallback");
        console.log(msg.value);
        console.log(msg.sender);
    }
}
