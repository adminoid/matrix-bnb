// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";
import "./Core.sol";

contract MatrixTemplate {
    using SafeMath for uint256;

    address Deployer;
    uint matrixIndex;
    address CoreAddress;

    constructor(address _deployer, uint index, address _coreAddress) {
        console.log("MatrixTemplate constructor");
        register(_deployer, true);
        Deployer = _deployer;
        matrixIndex = index;
        CoreAddress = _coreAddress;
    }

    struct User {
        uint index;
        uint parent;
        bool isRight;
        uint plateau;
        bool isValue;
        uint calm;
        uint gift;
    }

    mapping(address => User) Addresses;
    address[] Indices;

    function register(address wallet, bool isTop) public {
        // todo: disable for 20 top matrix

        User memory user;

        if (isTop) {
            console.log("MatrixTemplate::register(isTop)");
            user = User(0, 0, false, 0, true, 0, 0);
        } else {
            console.log("MatrixTemplate::register(isnTTop)");
            // plateau number calculation (for current registration)
            uint plateau = log2(Indices.length + 2);
            uint subPreviousTotal;
            if (plateau < 2) {
                subPreviousTotal = 0;
            } else {
                subPreviousTotal = getSumOfPlateau(0, plateau - 2);
            }

            // get total in current plateau
            //        uint totalPlateau = 2 ** (plateau - 1);
            //        console.log("Total in plateau:", totalPlateau);

            // get total in start to sub previous plateau
            uint previousTotal = getSumOfPlateau(0, plateau - 1);

            // get current number in current plateau
            uint currentNum = Indices.length - previousTotal + 1;

            // and check mod for detect left or right on parent
            uint mod = currentNum.mod(2);

            // detect parentNum
            uint parentNum = currentNum.div(2);
            if (parentNum < 1) {
                parentNum = 1;
            } else {
                parentNum = parentNum + mod;
            }
            uint parentIndex = subPreviousTotal + parentNum - 1;
            user = User(Indices.length, parentIndex, false, plateau, true, 0, 0);
            if (mod == 0) {
                if (parentIndex > 0) {
                    goUp(parentIndex, Indices.length);
                }
                user.isRight = true;
            }

            address parentWallet = Indices[parentIndex];
            Core CoreInstance = Core(payable(CoreAddress));
            CoreInstance.sendHalf(parentWallet, matrixIndex);
        }

        Addresses[wallet] = user;
        Indices.push(wallet);
    }

    function goUp(uint parentIndex, uint startIndex) private {
        address parentWallet = Indices[parentIndex];
        User memory nextUser = Addresses[parentWallet];
        uint8 i = 2;
        while (i <= 5) {
            console.log("toUp iteration");
            if (!nextUser.isRight || nextUser.parent == 0) {
                break;
            }
            // todo: think about remove this variable (nextUser)
            nextUser = Addresses[Indices[nextUser.parent]];
            if (i == 2 || i == 3) {
                Addresses[Indices[nextUser.parent]].gift = nextUser.gift.add(0.01 ether);
                console.log("from", startIndex);
                console.log("added gift to", nextUser.index);
                console.log(nextUser.gift);
            }
            if (i == 4 || i == 5) {
                Addresses[Indices[nextUser.parent]].calm = nextUser.calm.add(0.01 ether);
                console.log("from", startIndex);
                console.log("added calm to", nextUser.index);
                console.log(nextUser.calm);
            }
            i++;
        }
    }

    function hasRegistered(address wallet) view public returns(bool) {
        return Addresses[wallet].isValue;
    }

    function getUser(address wallet) view public returns(User memory user) {
        user = Addresses[wallet];
    }

    function getLength() external view returns(uint length) {
        length = Indices.length;
    }

    function getSumOfPlateau(uint _from, uint _to) private pure returns(uint sum) {
        sum = 0;
        for (uint j = _from; j < _to; j++) {
            sum += 2 ** (j);
        }
    }

    function log2(uint x) private pure returns(uint y) {
        assembly {
            let arg := x
            x := sub(x,1)
            x := or(x, div(x, 0x02))
            x := or(x, div(x, 0x04))
            x := or(x, div(x, 0x10))
            x := or(x, div(x, 0x100))
            x := or(x, div(x, 0x10000))
            x := or(x, div(x, 0x100000000))
            x := or(x, div(x, 0x10000000000000000))
            x := or(x, div(x, 0x100000000000000000000000000000000))
            x := add(x, 1)
            let m := mload(0x40)
            mstore(m,           0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
            mstore(add(m,0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
            mstore(add(m,0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
            mstore(add(m,0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
            mstore(add(m,0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
            mstore(add(m,0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
            mstore(add(m,0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
            mstore(add(m,0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
            mstore(0x40, add(m, 0x100))
            let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
            let shift := 0x100000000000000000000000000000000000000000000000000000000000000
            let a := div(mul(x, magic), shift)
            y := div(mload(add(m,sub(255,a))), shift)
            y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
        }
    }
}
