// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Core.sol";

//import "hardhat/console.sol";

contract MatrixTemplate {
    using SafeMath for uint256;

    uint public immutable matrixIndex;
    address public immutable CoreAddress;

    struct User {
        uint index;
        uint parent;
        bool isRight;
        uint plateau;
        bool isValue;
    }

    // getting user by address
    mapping(address => User) public Addresses;
    // getting address by index
    mapping(uint => address) public Indices;
    // total registered in matrix
    uint public IndicesTotal;

    // for logging native send to up one
    event SentHalf(address indexed sender, address indexed receiver, uint indexed matrixIndex);

    // for logging claims from descendants in each matrix
    event SentClaims(address indexed sender, address indexed receiver, uint indexed matrixIndex);

    // todo: isRight, index(number), parent - don't set, make it set
    constructor(uint _index, address _coreAddress, address[6] memory _sixFounders) {
        // registration of first top six investors/maintainers without balances
        // _sixFounders.length must be equal to 6
        for (uint8 i = 0; i < 6; i++) {
            // calculate base user data
            uint parentIndex;
            uint plateau;
            uint mod;
            (parentIndex, plateau, mod) = calcUserData();
            User memory user = User(IndicesTotal, parentIndex, false, plateau, true);
            if (mod == 0) {
                user.isRight = true;
            }
            Addresses[_sixFounders[i]] = user;
            Indices[i] = _sixFounders[i];
            IndicesTotal = IndicesTotal.add(1);
        }
        // initiations
        matrixIndex = _index;
        CoreAddress = _coreAddress;
    }

    // stubs to hide unrecognized-selector messages
    receive() external payable {}
    fallback() external payable {}

    /*
        methods below is modern getters
    */

    // getting user by his index (0..n) in matrix
    function getUserAddressByIndex(uint _index)
    view public returns(address) {
        // _index is 0 for first user
        return Indices[_index];
    }

    /*
        methods below is important interactions includes base logic
    */

    function register(address _wallet) external {
        // make it protected (available calls only from Core contract)
        require(msg.sender == CoreAddress, "access denied 02");
        // calculate base user data
        uint parentIndex;
        uint plateau;
        uint mod;
        (parentIndex, plateau, mod) = calcUserData();
        User memory user = User(IndicesTotal, parentIndex, false, plateau, true);
        if (mod == 0) {
            user.isRight = true;
            if (parentIndex > 0) {
                goUp(parentIndex, _wallet);
            }
        }
        Addresses[_wallet] = user;
        addUser(_wallet);

        address parentWallet = Indices[parentIndex];
        Core(payable(CoreAddress)).sendHalf(parentWallet, matrixIndex);

        // logging for send half to an up one
        emit SentHalf(_wallet, parentWallet, matrixIndex);
//        console.log("SentHalf");
//        console.log(_wallet, parentWallet, matrixIndex);
//        console.log(parentIndex);
    }

    // parentIndex, plateau, mod
    function calcUserData()
    private view returns (uint, uint, uint) {
        // plateau number calculation (for current registration)
        uint plateau = log2(IndicesTotal.add(2));

        uint subPreviousTotal;
        if (plateau < 2) {
            subPreviousTotal = 0;
        } else {
            subPreviousTotal = getSumOfPlateau(0, plateau.sub(2));
        }

        // get total in current plateau
        // uint totalPlateau = 2 ** (plateau - 1);

        // get total in start to sub previous plateau
        uint previousTotal = getSumOfPlateau(0, plateau.sub(1));
        // get current number in current plateau
        uint currentNum = IndicesTotal - previousTotal + 1;
        // and check mod for detect left or right on parent
        uint mod = currentNum.mod(2);
        // detect parentNum
        uint parentNum = currentNum.div(2);
        if (parentNum < 1) {
            parentNum = 1;
        } else {
            parentNum = parentNum.add(mod);
        }
        uint parentIndex = subPreviousTotal.add(parentNum.sub(1));
        return (parentIndex, plateau, mod);
    }

    function goUp(uint _parentIndex, address registeredWallet) private {
        address parentWallet = Indices[_parentIndex];
        User memory nextUser = Addresses[parentWallet];
        for (uint i = 2; i <= 5; i++) {
            if (!nextUser.isRight) {
                break;
            }
            address updatedUserAddress = Indices[nextUser.parent]; // address of nextUser.parent
            if (i <= 3) {
                if (matrixIndex == 0) {
                    Core(payable(CoreAddress)).updateUser(updatedUserAddress, matrixIndex, 0); // gifts
                } else {
                    if (i == 2) {
                        Core(payable(CoreAddress)).updateUser(updatedUserAddress, matrixIndex, 2); // whose (ref bringer) claims
                    } else { // i == 3
                        Core(payable(CoreAddress)).updateUser(updatedUserAddress, matrixIndex, 1); // holder claims
                        emit SentClaims(registeredWallet, updatedUserAddress, matrixIndex);
//                        console.log("SentClaims");
//                        console.log(registeredWallet, updatedUserAddress, matrixIndex);
                    }
                }
            } else { // 4 >= i <= 5 (either 4 or 5)
                Core(payable(CoreAddress)).updateUser(updatedUserAddress, matrixIndex, 1); // holder claims
                emit SentClaims(registeredWallet, updatedUserAddress, matrixIndex);
//                console.log("SentClaims");
//                console.log(registeredWallet, updatedUserAddress, matrixIndex);
            if (i == 5) {
                    break;
                }
            }
            nextUser = Addresses[Indices[nextUser.parent]];
        }
    }

    /*
        methods below is service ones
    */

    function addUser(address _userAddress)
    private {
        Indices[IndicesTotal] = _userAddress;
        IndicesTotal = IndicesTotal.add(1);
    }

    // todo: check if needed
    function getUser(address _wallet)
    view external returns(User memory user, uint total) {
        user = Addresses[_wallet];
        total = IndicesTotal;
    }

    function getSumOfPlateau(uint _from, uint _to)
    private pure returns(uint sum) {
        sum = 0;
        for (uint j = _from; j < _to; j++) {
            sum += 2 ** (j);
        }
    }

    function log2(uint x)
    private pure returns(uint y) {
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
