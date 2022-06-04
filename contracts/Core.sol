// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./MatrixTemplate.sol";

contract Core is Ownable {
    using SafeMath for uint256;

    event Registered(address, uint);

    // settings
    uint256 divider = 0.01 * (10 ** 18); // first number is bnb amount
    uint maxLevel = 20;

    // array of matrices
    MatrixTemplate[] Matrices;

    struct User {
        bool isValue;
        uint parent;
        bool isRight;
        uint plateau;
    }

    constructor() {
        // todo: for multiple level contracts - push to array in range [0..7]
        console.log("Core constructor");
        // initialize 20 matrices
        uint i;
        for (i = 0; i < 20; i++) {
            console.log(i);
            Matrices.push(new MatrixTemplate(msg.sender));
        }
    }

    receive() external payable {
        require(msg.value.mod(divider) == 0, "You must transfer multiple of 0.01 bnb");
        uint256 level = msg.value.div(divider);
        require(level <= maxLevel, "min level is 0.01, max level is 20 (0.2 bnb)");

        // check registered in previous matrices before register actual
        if (level > 1) {
            // loop levels from 1 to level and check exist registration according matrices
            uint i = 0;
            while(i + 1 < level) {
                bool isRegistered = Matrices[i].hasRegistered(msg.sender);

                if (!isRegistered) {
                    console.log("--> ", i, level, isRegistered); // 0, 2, true
                    revert("You don't registered in previous level");
                }

                i++;
            }
        }

        Matrices[level - 1].register(msg.sender, false);
        emit Registered(msg.sender, level);
    }

    function getLevelContract(uint level) external view returns(MatrixTemplate) {
        return Matrices[level - 1];
    }

    function getUserFromMatrix(uint matrixIdx, address userWallet) external view
    returns (MatrixTemplate.User memory user){
        user = Matrices[matrixIdx].getUser(userWallet);
    }

    // todo: delete later, that for experiment
    fallback() external payable {
        console.log("!!!fallback");
        console.log(msg.value);
        console.log(msg.sender);
    }
}
