// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./MatrixTemplate.sol";

contract Core is Ownable {
    using SafeMath for uint256;

    event Registered(address, uint);
    event Updated(address, string, uint);

    // settings
    uint256 payUnit = 0.01 * (10 ** 18); // first number is bnb amount
    uint maxLevel = 3; // todo: change to actual matrices amount

    // array of matrices
    MatrixTemplate[] Matrices;

    address zeroWallet;

    constructor() {
        // todo: for multiple level contracts - push to array in range [0..7]
        console.log("Core constructor");
        zeroWallet = msg.sender;
        // initialize 20 matrices
        uint i;
        for (i = 0; i < maxLevel; i++) {
            console.log(i);
            Matrices.push(new MatrixTemplate(msg.sender, i, address(this)));
        }
    }

    struct UserGlobal {
        uint claims;
        uint gifts;
        uint level;
        address whose; // whose referral is user
        bool isValue;
    }

    mapping(address => UserGlobal) AddressesGlobal;

    function updateUser(address userAddress, uint matrixIndex, string calldata fieldName) external {
        console.log("@@@@@@@@@@@@@@@@");
        console.log(userAddress);
        console.log(matrixIndex);
        console.log(fieldName);
        console.log("________________");
        uint amount = payUnit.mul(matrixIndex.add(1));
        uint newValue;

        if (keccak256(abi.encodePacked(fieldName)) == keccak256(abi.encodePacked("claims"))) {
            newValue = AddressesGlobal[userAddress].claims.add(amount);
            AddressesGlobal[userAddress].claims = newValue;
        } else if (keccak256(abi.encodePacked(fieldName)) == keccak256(abi.encodePacked("gifts"))) {
            newValue = AddressesGlobal[userAddress].gifts.add(amount);
            AddressesGlobal[userAddress].gifts = newValue;
        }
        // todo: calculate newValue
        emit Updated(userAddress, fieldName, newValue);
    }

    receive() external payable {
        require(msg.value.mod(payUnit) == 0, "You must transfer multiple of 0.01 bnb");
        uint256 level = msg.value.div(payUnit);
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

//        struct UsersGlobal {
//        uint claims;
//        uint gifts;
//        uint level;
//        address whose; // whose referral is user
//        bool isValue;
//        }

        // todo: check is already registered
//        localRegister(level - 1,)

        // add local Core registration in UserGlobal
        AddressesGlobal[msg.sender] = UserGlobal(0, 0, level - 1, zeroWallet, true);
        Matrices[level - 1].register(msg.sender, false);
        emit Registered(msg.sender, level);
    }

    function getLevelContract(uint level) external view returns(MatrixTemplate) {
        return Matrices[level - 1];
    }

    function getUserFromMatrix(uint matrixIdx, address userWallet) external view
    returns (MatrixTemplate.User memory user) {
        user = Matrices[matrixIdx].getUser(userWallet);
    }

    function getUserFromCore(address userAddress) external view
    returns (UserGlobal memory user) {
        user = AddressesGlobal[userAddress];
    }

    // todo: delete later, that for experiment
    fallback() external payable {
        console.log("!!!fallback");
        console.log(msg.value);
        console.log(msg.sender);
    }

    function sendHalf(address wallet, uint matrixIndex) external {
        uint amount = payUnit.mul(matrixIndex.add(1)).div(2);
        payable(wallet).transfer(amount);
    }
}
