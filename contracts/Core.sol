// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
//import "@openzeppelin/contracts/access/AccessControl.sol";
//import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";
import "./MatrixTemplate.sol";

contract Core {
    using SafeMath for uint256;

//    bytes32 public constant MATRIX_ROLE = keccak256("MATRIX_ROLE");

    event Registered(address, uint);
    event Updated(address, uint8, uint);

    // settings
    uint payUnit = 0.01 * (10 ** 18); // first number is bnb amount
    uint maxLevel = 20; // todo: change to actual matrices amount

    // array of matrices (addresses)
    address[20] Matrices;

    address zeroWallet;

    constructor() payable {
        console.log("Core: constructor starting");

        uint256 startGas = gasleft();
        console.log("gasleft:", startGas);

//        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // todo: for multiple level contracts - push to array in range [0..7]
        zeroWallet = msg.sender;

        console.log("constructor(), msg.sender is", msg.sender);

        // initialize 20 matrices
        uint i;
        for (i = 0; i < maxLevel; i++) {
            console.log("");
            console.log("________");
            console.log("I ->", i);
            console.log("address(this)", address(this));
            MatrixTemplate matrixInstance = new MatrixTemplate(msg.sender, i, address(this));
            Matrices[i] = address(matrixInstance);

            console.log("matrixInstance:", address(matrixInstance));

            AddressesGlobal[msg.sender] = UserGlobal(0, 0, i, zeroWallet, true);

            // todo: _register secondWallet and ThirdWallet

//            _setupRole(MATRIX_ROLE, address(matrixInstance));
        }

        uint gasUsed = startGas - gasleft();
        console.log("gasUsed:", gasUsed);

        console.log("Core: Deployed Core with 20 MatrixTemplate instances");
    }

    function isMatrix(address _mt) private view returns(bool) {
        for (uint i = 0; i < Matrices.length; i++) {
            if (Matrices[i] == _mt) {
                return true;
            }
        }

        return false;
    }

    struct UserGlobal {
        uint claims;
        uint gifts;
        uint level;
        address whose; // whose referral is user
        bool isValue;
    }

    mapping(address => UserGlobal) AddressesGlobal;

    // field: 0 - gifts, 1 - claims
    function updateUser(address userAddress, uint matrixIndex, uint8 field) external {
        console.log("Core: _updateUser()");
        console.log("for matrix:", matrixIndex);
        console.log("and user:", userAddress);
        console.log("0 - gifts, 1 - claims", field);

        require(isMatrix(msg.sender), "access denied");

        uint amount = payUnit.mul(matrixIndex.add(1));

        console.log("amount:", amount);

        uint newValue;

        // calculate newValue
        if (field == 0) { // gifts
            newValue = AddressesGlobal[userAddress].gifts.add(amount);
            AddressesGlobal[userAddress].gifts = newValue;
        } else if (field == 1) { // claims
            newValue = AddressesGlobal[userAddress].claims.add(amount);
            AddressesGlobal[userAddress].claims = newValue;
            console.log("matrixIndex:", matrixIndex);
            console.log("newValue:", newValue);
            console.log("need newValue:", amount.mul(2));
            // todo: here uncomment and release
            // if (newValue >= amount.mul(2)) {
            //    matricesRegistration(userAddress, 0);
            // }
        }
        emit Updated(userAddress, field, newValue);
    }

    receive() external payable {
        console.log("Core: receiving from wallet:", msg.sender);
        console.log("value:", msg.value);
        console.log("gasleft:", gasleft());
        matricesRegistration(msg.sender, msg.value);
    }

    // check for enough to _register in multiple matrices, change of amount add to wallet claim
    function matricesRegistration(address wallet, uint transferredAmount) private {
        console.log("Core: _matricesRegistration start");
        uint balance;
        uint level;
        uint registerPrice;

        if (AddressesGlobal[wallet].isValue) {
            balance = transferredAmount.add(AddressesGlobal[wallet].claims);
            level = AddressesGlobal[wallet].level;
            // below calculates initial value of registerPrice for level more than 1
            registerPrice = getLevelPrice(level);

        } else {
            balance = transferredAmount;
            // todo: check also here
            level = 0;
            registerPrice = payUnit;
        }

        // todo: check for many cycles
        require(balance >= registerPrice, "the cost of registration is more expensive than you transferred");

        // make loop for _register and decrement remains
        do {
            console.log("Core: _matricesRegistration cycle begins with:");
            console.log("Core: balance (for next matrix registration)", balance);
            console.log("Core: level", level);
            console.log("Core: registerPrice", registerPrice);
            // todo: run that cycle only if need
            // _register in, decrease balance and increment level
            // local Core registration in UserGlobal and matrix registration
            if (AddressesGlobal[wallet].isValue) {
                level = level.add(1);
                AddressesGlobal[wallet].claims = balance;
                AddressesGlobal[wallet].level = level;
                console.log("Core: wallet:", wallet);
                console.log("registered matrix level is:", level);
                console.log("claims remain:", balance);
            } else {
                level = 0;
                // todo: here after each first cycle isValue == true
                AddressesGlobal[wallet] = UserGlobal(balance, 0, 0, zeroWallet, true);
                console.log("Core: wallet:", wallet);
                console.log("registered matrix level is ZERO");
                console.log("claims remain:", balance);
            }
            require(level <= 19, "max level is 19");

            emit Registered(wallet, level);
            balance = balance.sub(registerPrice);
            AddressesGlobal[wallet].claims = balance;

            registerPrice = registerPrice.mul(2);
            MatrixTemplate(Matrices[level]).register(wallet, false);
        }
        while (balance >= registerPrice);
        console.log("Core: _matricesRegistration end");
    }

    function getLevelPrice(uint level) internal view returns(uint) {

        //console.log("level:", level);

        uint registerPrice = payUnit;
        if (level > 0) {
            for (uint i = 0; i <= level; i++) {
                registerPrice = registerPrice * 2;
                console.log("");
                console.log("registerPrice * 2 =", registerPrice);
            }
        }
        return registerPrice;
    }

    function getLevelContract(uint level) external view returns(address) {
        return Matrices[level];
    }

    function getUserFromMatrix(uint matrixIdx, address userWallet) external view
    returns (MatrixTemplate.User memory user) {
        user = MatrixTemplate(Matrices[matrixIdx]).getUser(userWallet);
    }

    function getUserFromCore(address userAddress) external view
    returns (UserGlobal memory user) {
        user = AddressesGlobal[userAddress];
    }

    function sendHalf(address wallet, uint matrixIndex) external {
        console.log("");
        console.log("Core: sendHalf start");

        require(isMatrix(msg.sender), "access denied");

        uint amount = getLevelPrice(matrixIndex).div(2);
        payable(wallet).transfer(amount); // not recommended
        // (bool sent,) = payable(wallet).call{value: amount}("");
        // require(sent, "Failed to send Ether");

        // https://ethereum.stackexchange.com/questions/118165/how-much-gas-is-forwarded-by-caller-contract-when-calling-a-deployed-contracts

        console.log("Core: sendHalf end");
    }
}
