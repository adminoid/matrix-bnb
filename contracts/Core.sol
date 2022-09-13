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
    uint payUnit = 0.01 * (10 ** 18); // first number is bnb amount
    uint maxLevel = 20; // todo: change to actual matrices amount

    // array of matrices
    MatrixTemplate[] Matrices;

    address zeroWallet;

    constructor() {
        // todo: for multiple level contracts - push to array in range [0..7]
        console.log("");
        console.log("Core: begin constructor() -----------------");
        zeroWallet = msg.sender;
        // initialize 20 matrices
        uint i;
        for (i = 0; i < maxLevel; i++) {
            console.log(i);
            MatrixTemplate matrixInstance = new MatrixTemplate(msg.sender, i, address(this));
            AddressesGlobal[msg.sender] = UserGlobal(0, 0, i, zeroWallet, true);

            // todo: register secondWallet and ThirdWallet

            Matrices.push(matrixInstance);
        }
        console.log("Core: end constructor() -----------------");
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
        console.log("");
        console.log("Core: begin updateUser() -----------------");
        console.log("userAddress", userAddress);
//        console.log("matrixIndex", matrixIndex);
        console.log("fieldName", fieldName);
        uint amount = payUnit.mul(matrixIndex.add(1));
        uint newValue;
        console.log("amount", amount);
        console.log("________________");

        if (keccak256(abi.encodePacked(fieldName)) == keccak256(abi.encodePacked("claims"))) {
            newValue = AddressesGlobal[userAddress].claims.add(amount);
            AddressesGlobal[userAddress].claims = newValue;
        } else if (keccak256(abi.encodePacked(fieldName)) == keccak256(abi.encodePacked("gifts"))) {
            newValue = AddressesGlobal[userAddress].gifts.add(amount);
            AddressesGlobal[userAddress].gifts = newValue;
        }
        // todo: calculate newValue
        emit Updated(userAddress, fieldName, newValue);

        console.log("AddressesGlobal[userAddress].claims ->", AddressesGlobal[userAddress].claims);
        console.log("AddressesGlobal[userAddress].gifts ->", AddressesGlobal[userAddress].gifts);

        console.log("Core: end updateUser() -----------------");
    }

    receive() external payable {
        console.log("");
        console.log("Core: begin receive() -----------------");
        // todo: check for enough to register in multiple matrices, change of amount add to wallet claim
        uint balance;
        uint level;
        uint registerPrice = payUnit;

        console.log("AddressesGlobal[msg.sender].isValue:", AddressesGlobal[msg.sender].isValue);
        console.log("");

        if (AddressesGlobal[msg.sender].isValue) {
            console.log("initial claims", AddressesGlobal[msg.sender].claims);
            balance = msg.value.add(AddressesGlobal[msg.sender].claims);
            level = AddressesGlobal[msg.sender].level;

            console.log("AddressesGlobal[msg.sender].level", AddressesGlobal[msg.sender].level);

            // todo: below calculates initial value of registerPrice for level more than 1
            console.log("Core: begin first value cycle in receive() -----------------");
//            if (level > 0) {
//                for (uint i = 1; i <= level; i++) {
//                    registerPrice = registerPrice*2;
//                    console.log("registerPrice*2...");
//                    console.log(registerPrice);
//                }
//            }
            registerPrice = getLevelPrice(level);
            console.log("Core: end first value cycle in receive() -----------------");
            console.log("");

        } else {
            balance = msg.value;
            level = 1;
        }
        console.log("level:", level);
        console.log("balance:", balance);
        console.log("registerPrice:", registerPrice);

        require(balance >= registerPrice, "the cost of registration is more expensive than you transferred");

        console.log("Core: before do() in receive -----------------");
        // make loop for register and decrement remains
        do {
            // todo: run that cycle only if need
            console.log("");
            console.log("Core: begin do() in receive -----------------");
            console.log("isValue", AddressesGlobal[msg.sender].isValue);
            console.log("claims", AddressesGlobal[msg.sender].claims);
            // register in, decrease balance and increment level
            // local Core registration in UserGlobal and matrix registration
            if (AddressesGlobal[msg.sender].isValue) {
                AddressesGlobal[msg.sender].claims = balance;
                console.log("before. level:", level);
                AddressesGlobal[msg.sender].level = level.add(1);
                console.log("after1. level:", level);
                Matrices[level.add(1)].register(msg.sender, false);
                console.log("after2. level:", level);
                console.log("...not else after check isValue");
            } else {
                // todo: here after each first cycle isValue == true
                AddressesGlobal[msg.sender] = UserGlobal(balance, 0, 0, zeroWallet, true);
                console.log("level==0, isValue == false");
                Matrices[0].register(msg.sender, false);
                console.log("...else after check isValue");
            }
            emit Registered(msg.sender, level);
            balance = balance.sub(registerPrice);
            AddressesGlobal[msg.sender].claims = balance;
            level = level.add(1);
            registerPrice = registerPrice.mul(2);
            console.log("claims", AddressesGlobal[msg.sender].claims);
            console.log("gifts", AddressesGlobal[msg.sender].gifts);
            console.log("level", AddressesGlobal[msg.sender].level);
            console.log("whose", AddressesGlobal[msg.sender].whose);
            console.log("isValue", AddressesGlobal[msg.sender].isValue);
            console.log("-----");
            console.log("next balance");
            console.log(balance);
            console.log("next level");
            console.log(level);
            console.log("next registerPrice");
            console.log(registerPrice);
            console.log("Core: end do() in receive -----------------");
            console.log("");
        }
        while (balance >= registerPrice);
        console.log("Core: after do() in receive -----------------");
        console.log("Core: end receive() -----------------");
    }

    function getLevelPrice(uint level) internal view returns(uint) {
        uint registerPrice = payUnit;
        if (level > 0) {
            for (uint i = 1; i <= level; i++) {
                registerPrice = registerPrice*2;
                console.log("registerPrice*2...");
                console.log(registerPrice);
            }
        }
        return registerPrice;
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
        console.log("Core: begin sendHalf() -----------------");
        console.log("wallet", wallet);
        console.log("payUnit", payUnit);
        console.log("matrixIndex", matrixIndex);
        // todo: multiply to 2 matrixIndex times
//        registerPrice = ;
        uint amount = getLevelPrice(matrixIndex).div(2);
//        uint amount = payUnit.mul(matrixIndex.add(1)).div(2);
//        uint amount = (payUnit*(matrixIndex + 1)) / 2;
        console.log("amount", amount);
        payable(wallet).transfer(amount);
        console.log("Core: end sendHalf() -----------------");
    }
}
