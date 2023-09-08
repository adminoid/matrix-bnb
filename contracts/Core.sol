// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MatrixTemplate.sol";

contract Core {
    using SafeMath for uint256;

    // settings
    uint public constant payUnit = 0.01 * (10 ** 18); // first number is bnb amount
    uint public constant maxLevel = 19; // 0..19 (total 20)
    uint public lastUpdated; // timestamp
    uint private locked = 1; // reentrancy prevention

    // array of matrices (addresses)
    address[20] private Matrices; // todo - can be turn to mapping(index => address)

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

    // todo: consider rewrite as function to minimize bytecode
    modifier noReentrancy() {
        require(locked == 1, "No reentrancy");
        locked = 2;
        _;
        locked = 1;
    }

    // for count all referrals for the user
    event WhoseRegistered(address indexed user, address indexed whose, uint change);

    // for count earn money due referrals
    event ReferralEarn(address indexed whose, uint amount);

    // for check the user has gifts
    event GiftAppear(address indexed user, uint amount);

    // for logging gift spending
    event GiftSpent(address indexed giftOwner, address indexed giftSpender);

    // todo -- maybe remove this event?
//    event UserRegistered(address indexed, uint indexed);
    // todo -- maybe remove this event?
//    event UserUpdated(address indexed, uint indexed, uint indexed);

    // todo: date spent calculations
    // https://ethereum.stackexchange.com/questions/37026/how-to-calculate-with-time-and-dates
    // https://ethereum.stackexchange.com/questions/35793/how-do-you-best-calculate-whole-years-gone-by-in-solidity
    // https://ethereum.stackexchange.com/questions/132708/how-to-get-current-year-from-timestamp-solidity
    constructor(address[6] memory _sixFounders) payable {
        zeroWallet = _sixFounders[0];
        // register in Core _sixFounders
        for (uint i = 0; i < 6; i++) {
            address prevFounder;
            if (i <= 0) {
                prevFounder = _sixFounders[0];
            } else {
                prevFounder = _sixFounders[i - 1];
            }
            AddressesGlobal[_sixFounders[i]] = UserGlobal(0, 0, maxLevel, prevFounder, true);
            // todo: add total users value property, increment in all places where new element adds
            AddressesGlobalTotal = AddressesGlobalTotal.add(1);
        }
        // initialize 20 matrices
        for (uint i = 0; i <= maxLevel; i++) {
            MatrixTemplate matrixInstance = new MatrixTemplate(i, address(this), _sixFounders);
            Matrices[i] = address(matrixInstance);
        }
        lastUpdated = block.timestamp;
    }

    // proxy for registering wallet by simple payment to contract address
    receive() external payable noReentrancy {
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
        } else {
            uint value = AddressesGlobal[msg.sender].claims;
            AddressesGlobal[msg.sender].claims = 0;
            (bool sent,) = payable(msg.sender).call{value: value}("");
            require(sent, "Sending err 2");
        }
    }

    // register referral of _whose
    function register(address _whose) external payable noReentrancy {
        // check user is not registered
        require(!AddressesGlobal[msg.sender].isValue, "user already registered");
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
            emit GiftSpent(_whose, msg.sender);
        }
        // run register logic
        AddressesGlobal[msg.sender] = UserGlobal(0, 0, 0, whoseAddr, true);
        MatrixTemplate(payable(Matrices[0])).register(msg.sender);
        // row, here set whose for user
        if (change > 0) {
            // transfer with change for full price
            (bool sent,) = payable(msg.sender).call{value: change}("");
            require(sent, "Sending err 3");
        }
        emit WhoseRegistered(msg.sender, whoseAddr, change);
    }

    // check for enough to _register in multiple matrices, change of amount add to wallet claim
    function matricesRegistration(address _wallet, uint _transferredAmount) private {
        uint balance;
        uint level;
        uint registerPrice;

        // compose data for user registration
        if (AddressesGlobal[_wallet].isValue) {
            balance = _transferredAmount.add(AddressesGlobal[_wallet].claims);
            level = AddressesGlobal[_wallet].level.add(1);
            registerPrice = getLevelPrice(level);
        } else {
            balance = _transferredAmount;
            level = 0;
            registerPrice = payUnit;
        }
        // already have register data: balance, level, registerPrice
        if (level <= 19) {
            // todo: consider that it while loop can be refactored with caching vars
            // make loop for _register and decrement remains
            while (balance >= registerPrice) {
                // register in, decrease balance and increment level
                // local Core registration in UserGlobal and matrix registration
                if (AddressesGlobal[_wallet].isValue) {
                    // set claims, level
                    AddressesGlobal[_wallet].level = level;
                    AddressesGlobal[_wallet].claims = balance;
                } else {
                    // put zeroWallet to whose referral address
                    AddressesGlobal[_wallet] = UserGlobal(balance, 0, 0, zeroWallet, true);
                    AddressesGlobalTotal = AddressesGlobalTotal.add(1);
                }
                MatrixTemplate(payable(Matrices[level])).register(_wallet);
//                emit UserRegistered(_wallet, level);
                if (balance > 0) {
                    balance = balance.sub(registerPrice);
                    registerPrice = registerPrice.mul(2);
                    level = level.add(1);
                }
            }
            AddressesGlobal[_wallet].claims = balance;
        }
    }

    /*
        methods below called only internal for some information
    */

    // service method for getting MatrixTemplate contract address of specific level
    function getLevelContract(uint _level)
    external view returns(address){
        require(_level <= maxLevel, "_level exceeds maximum");
        return Matrices[_level];
    }

    // getting price for registration in specific level
    function getLevelPrice(uint _level)
    private pure returns(uint) {
        // todo: protect from big _level value
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

        uint levelPayUnit = getLevelPrice(_matrixIndex);
        uint newValue = 0;
        // calculate newValue
        if (_field == 0) { // gifts
            AddressesGlobal[_userAddress].gifts = AddressesGlobal[_userAddress].gifts.add(levelPayUnit);
            // todo -- here updates gifts field of parent ancestors
            emit GiftAppear(_userAddress, levelPayUnit);
        }
        else if (_field == 1) { // claims
            newValue = AddressesGlobal[_userAddress].claims.add(levelPayUnit);
            AddressesGlobal[_userAddress].claims = newValue;
        }
        else if (_field == 2) { // update whose claims
            address whose = AddressesGlobal[_userAddress].whose;
            newValue = AddressesGlobal[whose].claims.add(levelPayUnit);
            // here updates balance of whose by referral descendant
            AddressesGlobal[whose].claims = newValue;
            emit ReferralEarn(whose, newValue);
        }
        uint needValue = levelPayUnit.mul(2);
        if (newValue >= needValue && _userAddress != zeroWallet && _matrixIndex < 19) {
            matricesRegistration(_userAddress, 0);
        }
//        emit UserUpdated(_userAddress, _field, needValue);
    }

    function sendHalf(address _wallet, uint _matrixIndex) external {
        require(isMatrix(msg.sender), "access denied 2");
        if (_matrixIndex >= 19) {
            return;
        }
        uint amount = getLevelPrice(_matrixIndex).div(2);

        // TODO: replace call to transfer, because of _wallet shouldn't pay for transaction
//        (bool sent,) = payable(_wallet).call{value: amount}(""); // not payable _wallet arg
//        (bool sent,) = _wallet.call{value: amount}(""); // payable
//        require(sent, "Sending err 4");
//        _wallet.transfer(amount);

        bool sent = payable(_wallet).send(amount);
        require(sent, "Sending err 4");
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
