// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MatrixTemplate.sol";

contract Core {
    using SafeMath for uint256;

    // settings
    uint public payUnit = 0.01 * (10 ** 18); // first number is bnb amount
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

    event UserRegistered(address, uint);
    event UserUpdated(address, uint8, uint);

    constructor(address[] memory sixFounders) payable {
        zeroWallet = sixFounders[0];
        // initialize 20 matrices
        for (uint i = 0; i <= maxLevel; i++) {
            MatrixTemplate matrixInstance = new MatrixTemplate(i, address(this), sixFounders);
            Matrices[i] = address(matrixInstance);
            // todo: _register another five wallets
        }
        AddressesGlobal[msg.sender] = UserGlobal(0, 0, maxLevel, zeroWallet, true);
    }

    // todo: make protection "only owner" later
    function withdrawClaim(uint amount) public {
        if (AddressesGlobal[msg.sender].claims > amount) {
            AddressesGlobal[msg.sender].claims = AddressesGlobal[msg.sender].claims.sub(amount);
            payable(msg.sender).transfer(amount);
        } else {
            uint value = AddressesGlobal[msg.sender].claims;
            AddressesGlobal[msg.sender].claims = 0;
            payable(msg.sender).transfer(value);
        }
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
        require(isMatrix(msg.sender), "access denied 01");

        uint amount = getLevelPrice(matrixIndex);

        // calculate newValue
        if (field == 0) { // gifts
            AddressesGlobal[userAddress].gifts = AddressesGlobal[userAddress].gifts.add(amount);
        }
        else if (field == 1) { // claims
            AddressesGlobal[userAddress].claims = AddressesGlobal[userAddress].claims.add(amount);
        }
        else if (field == 2) { // update whose claims
            AddressesGlobal[AddressesGlobal[userAddress].whose].claims.add(getLevelPrice(matrixIndex));
        }

        uint needValue = amount.mul(2);
        if (amount >= needValue && userAddress != zeroWallet && matrixIndex < 19) {
            matricesRegistration(userAddress, 0);
        }
        emit UserUpdated(userAddress, field, needValue);
    }

    receive() external payable {
        matricesRegistration(msg.sender, msg.value);
    }

    function register(address whose) external payable {
        // check user is not registered
        require(!AddressesGlobal[msg.sender].isValue, "user already registered");

        uint change = 0;
        if (AddressesGlobal[whose].gifts < payUnit) {
            // if payment less than register price (payUnit)
            require(msg.value < payUnit.add(1), "you paid less than the cost of registration");

            // there registration is paid
            if (msg.value > payUnit) {
                change = msg.value.sub(payUnit);
            }
        } else {
            // updating gifts value
            AddressesGlobal[whose].gifts = AddressesGlobal[whose].gifts.sub(payUnit);
            // there registration is free, sending payment back
            change = msg.value;
        }

        // run register logic
        AddressesGlobal[msg.sender] = UserGlobal(0, 0, 0, whose, true);
        MatrixTemplate(Matrices[0]).register(msg.sender);

        if (change > 0) {
            // transfer with change for full price
            payable(msg.sender).transfer(change);
        }
    }

    // check for enough to _register in multiple matrices, change of amount add to wallet claim
    function matricesRegistration(address wallet, uint transferredAmount) private {
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
            // make loop for _register and decrement remains
            while (balance >= registerPrice) {
                if (level > 19) {
                    break;
                }

                // register in, decrease balance and increment level
                // local Core registration in UserGlobal and matrix registration

                if (AddressesGlobal[wallet].isValue) {
                    // set claims, level
                    AddressesGlobal[wallet].level = level;
                    AddressesGlobal[wallet].claims = balance;
                } else {
                    // put zeroWallet to whose referral address
                    AddressesGlobal[wallet] = UserGlobal(balance, 0, 0, zeroWallet, true);
                }

                MatrixTemplate(Matrices[level]).register(wallet);
                emit UserRegistered(wallet, level);

                if (balance > 0) {
                    balance = balance.sub(registerPrice);
                    registerPrice = registerPrice.mul(2);
                    level = level.add(1);
                }
            }
        }

    }

    function getLevelPrice(uint level) internal view returns(uint) {
        uint registerPrice = payUnit;
        if (level > 0) {
            for (uint i = 0; i < level; i++) {
                registerPrice = registerPrice.mul(2);
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
        require(isMatrix(msg.sender), "access denied for C::_sendHalf()");

        if (matrixIndex >= 19) {
            return;
        }

        uint amount = getLevelPrice(matrixIndex).div(2);

        (bool sent,) = payable(wallet).call{value: amount}("");
        require(sent, "Failed to send BNB");
    }
}
