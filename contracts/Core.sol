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
    uint maxLevel = 20; // todo: change to actual matrices amount

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
//            console.log(i);
            MatrixTemplate matrixInstance = new MatrixTemplate(msg.sender, i, address(this));
            // todo: register secondWallet and ThirdWallet
            Matrices.push(matrixInstance);
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
        console.log("@@@@@@@@updateUser@@@@@@@@");
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
        // todo: check for enough to register in multiple matrices, change of amount add to wallet claim
        uint balance;
        uint level;
        uint registerPrice;
        if (AddressesGlobal[msg.sender].isValue) {
            balance = msg.value.add(AddressesGlobal[msg.sender].claims);
            level = AddressesGlobal[msg.sender].level;
            registerPrice = payUnit.mul(level);
        } else {
            balance = msg.value;
            level = 1;
            registerPrice = payUnit;
        }
        require(balance > registerPrice, "the cost of registration is more expensive than you transferred");

        // make loop for register and decrement remains
        uint newBalance;
        do {
            // register in, decrease balance and increment level
            // local Core registration in UserGlobal and matrix registration
            console.log("Core: register cycle begin");
            if (AddressesGlobal[msg.sender].isValue) {
                AddressesGlobal[msg.sender].claims = newBalance;
                Matrices[level - 1].register(msg.sender, false);
            } else {
                AddressesGlobal[msg.sender] = UserGlobal(newBalance, 0, 1, zeroWallet, true);
                Matrices[0].register(msg.sender, true);
            }
            emit Registered(msg.sender, level);
            newBalance = balance.sub(registerPrice);
            level = level.add(1);

            console.log(AddressesGlobal[msg.sender].claims);
            console.log(AddressesGlobal[msg.sender].gifts);
            console.log(AddressesGlobal[msg.sender].level);
            console.log(AddressesGlobal[msg.sender].whose);
            console.log(AddressesGlobal[msg.sender].isValue);

            console.log("Core: register cycle end");
        }
        while (registerPrice > newBalance);
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
