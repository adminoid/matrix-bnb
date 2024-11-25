// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./MatrixTemplate.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract Core {
    using SafeMath for uint256;

    // settings
    uint public constant payUnit = 0.01 * (10 ** 18); // first number is bnb amount
    uint public constant maxLevel = 19; // 0..19 (total 20)
    uint public lastUpdated; // timestamp
    uint private locked = 1; // reentrancy prevention

    // array of matrices (addresses)
    address[20] private Matrices;

    address private immutable zeroWallet;

    struct UserGlobal {
        uint claims;
        uint gifts;
        uint level; // max/last registered matrix level, 0..19
        address whose; // whose referral is user
        bool isValue;
    }

    mapping(address => UserGlobal) private AddressesGlobal;

    // total users value property, increment in all places where new element adds
    uint public AddressesGlobalTotal = 0;

    modifier noReentrancy() {
        require(locked == 1, "No reentrancy");
        locked = 2;
        _;
        locked = 1;
    }

    // for count all referrals of the user
    event WhoseRegistered(address indexed user, address indexed whose, uint change);
    // for count earn money due referrals (claims)
    event ReferralEarn(address indexed user, uint newValue, address indexed whose);
    // for check the user has gifts
    event GiftAppear(address indexed user, uint indexed matrixIndex, uint amount);
    // for logging gift spending
    event GiftSpent(address indexed owner, address indexed spender, uint amount);
    // for logging claim gaining (claims except referrals)
    event ClaimsAppear(address indexed owner, uint indexed levelPrice, uint newValue);
    // for logging claim spending
    event ClaimsSpent(address indexed owner, uint indexed value, uint indexed newLevel);
    // for logging transfers from below two wallets
    event BelowTwoAppear(address indexed receiver, uint amount, uint indexed matrixIndex);
    // for each withdrawing from claim balance
    event ClaimsWithdraw(address indexed owner, uint amount);
    // for transfers all bnb to contract address
    event DirectTransfer(address indexed sender, uint amount);

    constructor(address[5] memory _fiveFounders) payable {
        zeroWallet = _fiveFounders[0];
        // register in Core _fiveFounders
        for (uint i = 0; i < 5; i++) {
            address prevFounder;
            if (i == 0) {
                prevFounder = _fiveFounders[0];
            } else {
                prevFounder = _fiveFounders[i - 1];
            }
            AddressesGlobal[_fiveFounders[i]] = UserGlobal(0, 0, maxLevel, prevFounder, true);
            // add total users value property, increment in all places where new element adds
            AddressesGlobalTotal = i;
        }
        // initialize 20 matrices
        for (uint i = 0; i <= maxLevel; i++) {
            MatrixTemplate matrixInstance = new MatrixTemplate(i, address(this), _fiveFounders);
            Matrices[i] = address(matrixInstance);
        }
        lastUpdated = block.timestamp;
    }

    // proxy for registering wallet by simple payment to contract address
    receive() external payable noReentrancy {
        emit DirectTransfer(msg.sender, msg.value);
        console.log("msg.sender, msg.value");
        console.log(msg.sender, msg.value);
        matricesRegistration(msg.sender, msg.value);
    }

    // stub to hide unrecognized-selector messages
    fallback() external payable {}

    /*
        methods below is important interactions includes base logic
    */

    // withdrawing claims from balance in BNB
    function withdrawClaim(uint _amount) external {
        if (AddressesGlobal[msg.sender].claims > _amount) {
            AddressesGlobal[msg.sender].claims = AddressesGlobal[msg.sender].claims.sub(_amount);
            (bool sent,) = payable(msg.sender).call{value: _amount}("");
            require(sent, "Sending err 1");
            emit ClaimsWithdraw(msg.sender, _amount);
        } else {
            uint value = AddressesGlobal[msg.sender].claims;
            AddressesGlobal[msg.sender].claims = 0;
            (bool sent,) = payable(msg.sender).call{value: value}("");
            require(sent, "Sending err 2");
            emit ClaimsWithdraw(msg.sender, value);
        }
    }

    // register referral of _whose
    function register(address _whose) external payable noReentrancy {
        // check user is not registered
        require(!AddressesGlobal[msg.sender].isValue, "user already registered");

        // add checking for whose user existed
        require(AddressesGlobal[_whose].isValue, "whose user is not registered");

        // add check for _whose exist, if not - set up default
        address whoseAddr;
        if (AddressesGlobal[_whose].isValue) {
            whoseAddr = _whose;
        } else {
            // get zeroWallet user
            whoseAddr = zeroWallet;
        }
        uint change = 0;
        if (AddressesGlobal[whoseAddr].gifts < payUnit) {
            // if payment less than register price (payUnit)
            require(msg.value >= payUnit, "not enough funds");
            // there registration is paid
            if (msg.value > payUnit) {
                change = msg.value.sub(payUnit);
            }
        } else {
            // updating gifts value
            AddressesGlobal[whoseAddr].gifts = AddressesGlobal[whoseAddr].gifts.sub(payUnit);
            // there registration is free, sending payment back
            change = msg.value;
            emit GiftSpent(whoseAddr, msg.sender, payUnit);
        }
        // run register logic
        AddressesGlobal[msg.sender] = UserGlobal(0, 0, 0, whoseAddr, true);
        AddressesGlobalTotal = AddressesGlobalTotal.add(1);
        MatrixTemplate(payable(Matrices[0])).register(msg.sender);

        // row, here set whose for user
        if (change > 0) {
            if (change >= payUnit) {
                matricesRegistration(msg.sender, change);
            } else {
                // transfer with change for full price
                (bool sent,) = payable(msg.sender).call{value: change}("");
                require(sent, "Sending err 3");
            }
        }

        emit WhoseRegistered(msg.sender, whoseAddr, change);
    }

    // check for enough to _register in multiple matrices, change of amount add to wallet claim
    function matricesRegistration(address _wallet, uint _transferredAmount) private {
        uint balance;
        uint level;
        uint registerPrice;

//        console.log("here8284_00");
//        console.log(_wallet);
//        console.log(_transferredAmount);

        if (address(0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097) == _wallet) {
            console.log("here8284_11_0");
            console.log(_wallet);
            console.log(_transferredAmount);
            console.log("AddressesGlobal[_wallet].isValue", AddressesGlobal[_wallet].isValue);
        }

        uint currentClaims;
        // compose data for user registration
        if (AddressesGlobal[_wallet].isValue) {
            // get claims if not zero, it will be spend
            currentClaims = AddressesGlobal[_wallet].claims;

            console.log("currentClaims", currentClaims);
            console.log("_transferredAmount", _transferredAmount);

            if (currentClaims > 0) {
                balance = _transferredAmount.add(currentClaims);
            } else {
                balance = _transferredAmount;
            }

            console.log("balance", balance);

            level = AddressesGlobal[_wallet].level.add(1);

            console.log("_wallet", _wallet);
            console.log("AddressesGlobal[_wallet].level", AddressesGlobal[_wallet].level);
            console.log("level", level); // todo need to be 1 but 2
            console.log("maxLevel", maxLevel);

            if (level <= maxLevel) {
                registerPrice = getLevelPrice(level);
            } else {
                // this is a thin place, because registerPrice generally don't need in this case
                registerPrice = 0;
            }

            console.log("registerPrice", registerPrice);

        } else {
            balance = _transferredAmount;
            level = 0;
            registerPrice = payUnit;
        }
        // already have register data: balance, level, registerPrice
        if (level <= maxLevel) {
            // make loop for _register and decrement remains
            while (balance >= registerPrice) {

                console.log("while");
                console.log("_wallet", _wallet);
                console.log("AddressesGlobal[_wallet].isValue121", AddressesGlobal[_wallet].isValue);

                // register in, decrease balance and increment level
                // local Core registration in UserGlobal and matrix registration
                if (AddressesGlobal[_wallet].isValue) {
                    // set claims, level
                    AddressesGlobal[_wallet].level = level;

                    console.log("level", level);
                    console.log("currentClaims", currentClaims);
                    console.log("balance", balance); // todo what is it?
                    // there is a new claims value
                    if (currentClaims > 0 && balance <= currentClaims) {
                        // there is a claims value
                        uint diff = currentClaims.sub(balance);
                        emit ClaimsSpent(
                            _wallet,
                            diff,
                            level
                        );
                    }
                    currentClaims = balance;
                    AddressesGlobal[_wallet].claims = balance;
                } else {
                    // put zeroWallet to whose referral address
                    AddressesGlobal[_wallet] = UserGlobal(balance, 0, 0, zeroWallet, true);
                    AddressesGlobalTotal = AddressesGlobalTotal.add(1);
                }

                console.log("MatrixTemplate.register(payable)");
                console.log("_wallet___", _wallet);

                MatrixTemplate(payable(Matrices[level])).register(_wallet);
                if (balance > 0) {
                    balance = balance.sub(registerPrice);
                    registerPrice = registerPrice.mul(2);
                    level = level.add(1);
                }
            }
        }
        // there is final claims value
        AddressesGlobal[_wallet].claims = balance;
    }

    /*
        methods below called only internal for some information
    */

    // service method for getting MatrixTemplate contract address of specific level
    function getLevelContract(uint _level) // level is 0..19
    external view returns(address){
        require(_level <= maxLevel, "_level exceeds maximum (0)");
        return Matrices[_level];
    }

    // getting price for registration in specific level
    function getLevelPrice(uint _level)
    private pure returns(uint) {
        // protect from big _level value
        require(_level <= maxLevel, "_level exceeds maximum (1)");
        uint registerPrice = payUnit;
        if (_level > 0) {
            for (uint i = 0; i < _level; i++) {
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

    function getBalance()
    external view returns (uint){
        return address(this).balance;
    }

    function getUserFromCore(address _userAddress)
    public view returns (UserGlobal memory user) {
        user = AddressesGlobal[_userAddress];
    }

    function getWalletByIndexFromMatrix(uint level, uint index)
    public view returns (address userAddress) {
        userAddress = MatrixTemplate(payable(Matrices[level])).getUserAddressByIndex(index);
    }

    function getUserFromMatrix(uint _matrixIdx, address _userWallet)
    external view returns (MatrixTemplate.User memory user, uint total) {
        (user, total) = MatrixTemplate(payable(Matrices[_matrixIdx])).getUser(_userWallet);
    }

    // getting user by matrix id and user number in matrix
    function getCoreUserByMatrixPosition(uint _matrixIndex, uint _userIndex)
    external view returns (address userAddress, UserGlobal memory user)
    {
        // first user _userIndex is 0
        userAddress = MatrixTemplate(payable(Matrices[_matrixIndex])).getUserAddressByIndex(_userIndex);
        user = AddressesGlobal[userAddress];
    }

    /*
        methods below are only called by MatrixTemplate contract
    */

    // field: 0 - gifts, 1 - claims, 2 - whose
    function updateUser(
        address _userAddress,
        uint _matrixIndex,
        uint _field
    ) external {
        require(isMatrix(msg.sender), "access denied 1");

        console.log("updateUser");
        console.log("_userAddress", _userAddress);
        console.log("_matrixIndex", _matrixIndex);
        console.log("_field", _field);

        // _matrixIndex == 2
        uint levelPayUnit = getLevelPrice(_matrixIndex);

        console.log("there!!!11");
        console.log("levelPayUnit", levelPayUnit);

        uint newValue = 0;
        // calculate newValue
        if (_field == 0) { // gifts
            AddressesGlobal[_userAddress].gifts = AddressesGlobal[_userAddress].gifts.add(levelPayUnit);
            // here updates gifts field of parent ancestors
            emit GiftAppear(_userAddress, _matrixIndex, levelPayUnit);
        }
        else if (_field == 1) { // claims
            newValue = AddressesGlobal[_userAddress].claims.add(levelPayUnit);
            AddressesGlobal[_userAddress].claims = newValue;
            emit ClaimsAppear(_userAddress, levelPayUnit, newValue);
        }
        else if (_field == 2) { // update whose claims
            address whose = AddressesGlobal[_userAddress].whose;
            newValue = AddressesGlobal[whose].claims.add(levelPayUnit);
            // here updates balance of whose by referral descendant
            AddressesGlobal[whose].claims = newValue;

            console.log("update whose claims");
            console.log("_userAddress", _userAddress);
            console.log("newValue", newValue);
            console.log("whose", whose);

            emit ReferralEarn(_userAddress, newValue, whose);

            // TODO: Run whose going level up if enough balance
            matricesRegistration(whose, 0);
            // todo core user is not updated, meanwhile user sit in m3
        }
        uint needValue = levelPayUnit.mul(2);

        console.log("before matricesRegistration LAST");
        console.log("_userAddress", _userAddress);
        console.log("newValue", newValue);
        console.log("needValue", needValue);

        if (newValue >= needValue && _userAddress != zeroWallet && _matrixIndex < maxLevel) {
            matricesRegistration(_userAddress, 0);
        }
    }

    function sendHalf(address _wallet, uint _matrixIndex) external {
        require(isMatrix(msg.sender), "access denied 2");
        if (_matrixIndex >= maxLevel) {
            return;
        }
        uint amount = getLevelPrice(_matrixIndex).div(2);
        bool sent = payable(_wallet).send(amount);
        require(sent, "Sending err 4");
        emit BelowTwoAppear(
            _wallet,
            amount,
            _matrixIndex
        );
    }

    function getTotalFromMatrix(uint _matrixIdx)
    external view returns (uint total) {
        total = MatrixTemplate(payable(Matrices[_matrixIdx])).IndicesTotal();
    }

    /*
        methods below are only for id0 calls (main manager)
    */

    // withdraw 10% of the bank for once in a year
    function getTenPercentOnceYear() external {
        require(msg.sender == zeroWallet, "access denied 3");
        uint balance = address(this).balance;
        require(balance > 0, "balance is empty");
        uint daysDiff = (block.timestamp.sub(lastUpdated)).div(60).div(60).div(24); // days
        require(daysDiff >= 365, "year not passed");
        uint tenPart = balance.div(10);
        (bool sent,) = payable(msg.sender).call{value: tenPart}("");
        require(sent, "Sending err 5");
        lastUpdated = block.timestamp;
    }
}
