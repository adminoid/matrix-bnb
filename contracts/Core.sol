// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";
import "./MatrixTemplate.sol";

contract Core {
    using SafeMath for uint256;

    event UserRegistered(address, uint);
    event UserUpdated(address, uint8, uint);

    // settings
    uint payUnit = 0.01 * (10 ** 18); // first number is bnb amount
    uint maxLevel = 19; // 0..19 (total 20)

    // array of matrices (addresses)
    address[20] Matrices;

    address zeroWallet;

    struct UserGlobal {
        uint claims;
        uint gifts;
        uint level;
        address whose; // whose referral is user
        bool isValue;
    }

    mapping(address => UserGlobal) AddressesGlobal;

    constructor() payable {
        console.log("C: constructor starting");

        uint256 startGas = gasleft();
        console.log("gasleft:", startGas);
        zeroWallet = msg.sender;

        console.log("constructor(), msg.sender is", msg.sender);

        // initialize 20 matrices
        uint i;
        for (i = 0; i <= maxLevel; i++) {
            console.log("");
            console.log("________");
            console.log("I ->", i);
            console.log("address(this)", address(this));
            MatrixTemplate matrixInstance = new MatrixTemplate(msg.sender, i, address(this));
            Matrices[i] = address(matrixInstance);
            console.log("matrixInstance:", address(matrixInstance));
            // todo: _register secondWallet and ThirdWallet
        }

        AddressesGlobal[msg.sender] = UserGlobal(0, 0, maxLevel, zeroWallet, true);

        uint gasUsed = startGas - gasleft();
        console.log("gasUsed:", gasUsed);

        console.log("C: Deployed Core with 20 MatrixTemplate instances");
    }

    function isMatrix(address _mt) private view returns(bool) {
        for (uint i = 0; i < Matrices.length; i++) {
            if (Matrices[i] == _mt) {
                return true;
            }
        }

        return false;
    }

    // field: 0 - gifts, 1 - claims
    function updateUser(address userAddress, uint matrixIndex, uint8 field) external {
        console.log("C: _updateUser()");
        console.log("for matrix:", matrixIndex);
        console.log("and user:", userAddress);
        console.log("0 - gifts, 1 - claims ->", field);

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
            if (newValue >= amount.mul(2)) {
                matricesRegistration(userAddress, 0);
            }
        }
        emit UserUpdated(userAddress, field, newValue);
    }

    receive() external payable {
        console.log("C: receiving from wallet:", msg.sender);
        console.log("value:", msg.value);
        console.log("gasleft:", gasleft());
        matricesRegistration(msg.sender, msg.value);
    }

    // check for enough to _register in multiple matrices, change of amount add to wallet claim
    function matricesRegistration(address wallet, uint transferredAmount) private {
        console.log("C: _matricesRegistration start");
        console.log("transferredAmount:", transferredAmount);

        uint balance;
        uint level;
        uint registerPrice;

        // compose data for user registration
        if (AddressesGlobal[wallet].isValue) {
            balance = transferredAmount.add(AddressesGlobal[wallet].claims);
            level = AddressesGlobal[wallet].level.add(1);
            registerPrice = getLevelPrice(level);
        } else {
            balance = transferredAmount;
            level = 0;
            registerPrice = payUnit;
        }
        // already have register data: balance, level, registerPrice

        if (level <= 19) {
            // commented because of add funds to claims anyway
            require(balance >= registerPrice, "the cost of registration is more expensive than you transferred");

            // make loop for _register and decrement remains
            while (balance >= registerPrice) {
                require(level <= 19, "max level is 19");

                console.log("C: _matricesRegistration cycle begins with:");
                console.log("C: balance", balance);
                console.log("C: level", level);
                console.log("C: registerPrice", registerPrice);

                // _register in, decrease balance and increment level
                // local Core registration in UserGlobal and matrix registration

                if (AddressesGlobal[wallet].isValue) {
                    // todo: set claims, level
                    AddressesGlobal[wallet].level = level;
                    AddressesGlobal[wallet].claims = balance;
                } else {
                    // todo: replace zeroWallet to whose referral address
                    AddressesGlobal[wallet] = UserGlobal(balance, 0, 0, zeroWallet, true);
                }

                MatrixTemplate(Matrices[level]).register(wallet);

                emit UserRegistered(wallet, level);

                balance = balance.sub(registerPrice);
                registerPrice = registerPrice.mul(2);
                level = level.add(1);

                console.log("new balance", balance);
                console.log("new level", level);
                console.log("new registerPrice", registerPrice);
            }
        }

        console.log("C: _matricesRegistration end");
    }

    function getLevelPrice(uint level) internal view returns(uint) {
        console.log("_getLevelPrice() started");
        console.log("level:", level);

        uint registerPrice = payUnit;
        if (level > 0) {
            for (uint i = 0; i < level; i++) {
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
        console.log("C: _sendHalf() start");
        console.log("wallet", wallet);
        console.log("matrixIndex", matrixIndex);

        require(isMatrix(msg.sender), "access denied for C::_sendHalf()");

        if (matrixIndex >= 19) {
            console.log("matrixIndex >= 19 (_sendHalf)");
            return;
        }

        uint amount = getLevelPrice(matrixIndex).div(2);
        console.log("amount", amount);

//        payable(wallet).transfer(amount); // not recommended
        (bool sent,) = payable(wallet).call{value: amount}("");
        require(sent, "Failed to send Ether");

        // https://ethereum.stackexchange.com/questions/118165/how-much-gas-is-forwarded-by-caller-contract-when-calling-a-deployed-contracts

        console.log("C: _sendHalf end");
    }
}
