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

        if (level > 1) {
            // todo: check registered in previous matrices before register actual
            // loop levels from 1 to level and check exist registration according matrices
            uint i = 0;
            while(i + 1 < level) {
                bool isRegistered = Matrices[i].hasRegistered(msg.sender);

                console.log("O: ", i, level, isRegistered); // 0, 2, true

//                if (i + 1 == level) {
//                    console.log("break");
//                    break;
//                }

                if (!isRegistered) {
                    console.log("--> ", i, level, isRegistered); // 0, 2, true
                    revert("You don't registered in previous level");
                }

                i++;
            }
//            for (i = 0; i < level; i++) {
//                bool isRegistered = Matrices[i].hasRegistered(msg.sender);
//                console.log(level + 1, i, isRegistered);
//                if (level + 1 < i && !isRegistered) {
//                    revert("You don't registered in previous level");
//                }
//            }
        }

        Matrices[level - 1].register(msg.sender);
        emit Registered(msg.sender, level);
    }

    function getLevelContract(uint level) external view returns(MatrixTemplate) {
        return Matrices[level - 1];
    }

    // todo: delete later, that for experiment
    fallback() external payable {
        console.log("!!!fallback");
        console.log(msg.value);
        console.log(msg.sender);
    }
}
