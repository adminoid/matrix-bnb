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

    constructor(address[6] memory sixFounders) payable {
        zeroWallet = sixFounders[0];
        // register in Core sixFounders
        for (uint i = 0; i < 6; i++) {
            address prevFounder;
            if (i <= 0) {
                prevFounder = sixFounders[0];
            } else {
                prevFounder = sixFounders[i - 1];
            }
            AddressesGlobal[sixFounders[i]] = UserGlobal(0, 0, maxLevel, prevFounder, true);
        }
        // initialize 20 matrices
        for (uint i = 0; i <= maxLevel; i++) {
            MatrixTemplate matrixInstance = new MatrixTemplate(i, address(this), sixFounders);
            Matrices[i] = address(matrixInstance);
        }
    }

    // proxy for registering wallet by simple payment to contract address
    receive() external payable {
        matricesRegistration(msg.sender, msg.value);
    }

    // stub to hide unrecognized-selector messages
    fallback() external payable {}

    /*
        methods below is important interactions includes base logic
    */

    // withdrawing claims from balance in BNB
    function withdrawClaim(uint amount) external {
        if (AddressesGlobal[msg.sender].claims > amount) {
            AddressesGlobal[msg.sender].claims = AddressesGlobal[msg.sender].claims.sub(amount);
            (bool sent,) = payable(msg.sender).call{value: amount}("");
            require(sent, "Failed to send BNB 1");
        } else {
            uint value = AddressesGlobal[msg.sender].claims;
            AddressesGlobal[msg.sender].claims = 0;
            (bool sent,) = payable(msg.sender).call{value: value}("");
            require(sent, "Failed to send BNB 2");
        }
    }

    // register referral of whose
    function register(address whose) external payable {
        // check user is not registered
        require(!AddressesGlobal[msg.sender].isValue, "user already registered");

        // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
        // 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc

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
            (bool sent,) = payable(msg.sender).call{value: change}("");
            require(sent, "Failed to send BNB 3");
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

    /*
        methods below called only internal for some information
    */

    // service method for getting MatrixTemplate contract address of specific level
    function getLevelContract(uint level) external view returns(address) {
        return Matrices[level];
    }

    // getting price for registration in specific level
    function getLevelPrice(uint level) private view returns(uint) {
        uint registerPrice = payUnit;
        if (level > 0) {
            for (uint i = 0; i < level; i++) {
                registerPrice = registerPrice.mul(2);
            }
        }
        return registerPrice;
    }

    // check address is matrix or not
    function isMatrix(address _mt) private view returns(bool) {
        for (uint i = 0; i < Matrices.length; i++) {
            if (Matrices[i] == _mt) {
                return true;
            }
        }
        return false;
    }

    /*
        methods below are only called by external for getting some information
    */

    function getUserFromCore(address userAddress) external view
    returns (UserGlobal memory user) {
        user = AddressesGlobal[userAddress];
    }

    function getUserFromMatrix(uint matrixIdx, address userWallet) external view
    returns (MatrixTemplate.User memory user) {
        user = MatrixTemplate(Matrices[matrixIdx]).getUser(userWallet);
    }

    /*
        methods below are only called by MatrixTemplate contract
    */

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

    function sendHalf(address wallet, uint matrixIndex) external {
        require(isMatrix(msg.sender), "access denied for C::_sendHalf()");
        if (matrixIndex >= 19) {
            return;
        }

        uint amount = getLevelPrice(matrixIndex).div(2);

        (bool sent,) = payable(wallet).call{value: amount}("");
        require(sent, "Failed to send BNB 4");
    }
}
