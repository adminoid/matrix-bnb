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
            emit WhoseRegistered(_fiveFounders[i], prevFounder, 0);
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

        console.log("");
        console.log("<receive()>", msg.sender, msg.value);
        console.log("");

        matricesRegistration(msg.sender, msg.value, UserGlobal(0, 0, 0, address(0), false), false);
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

        console.log("<Core.register() 1.0>");
        MatrixTemplate(payable(Matrices[0])).register(msg.sender, UserGlobal(0, 0, 0, address(0), false));

        // row, here set whose for user
        if (change > 0) {
            if (change >= payUnit) {

                console.log("");
                console.log("<Core.register() 1.1>", msg.sender, change, payUnit);
                console.log("==|before matricesRegistration 1");
                console.log("");

                matricesRegistration(msg.sender, change, UserGlobal(0, 0, 0, address(0), false), false);
            } else {
                // transfer with change for full price
                (bool sent,) = payable(msg.sender).call{value: change}("");
                require(sent, "Sending err 3");
            }
        }

        emit WhoseRegistered(msg.sender, whoseAddr, change);
    }

    // check for enough to _register in multiple matrices, change of amount add to wallet claim
    function matricesRegistration(address _wallet, uint _transferredAmount, UserGlobal memory tmpUser, bool isWhose) private {
        uint registerPrice = 0;
        uint balance = 0;
        uint nexLevel = 0;
        uint8 levelOverflow = 0;

        console.log("");
        console.log("<Core.matricesRegistration() 1.0 before all>");
        console.log("");

        console.log("tmpUser.claims", tmpUser.claims);
        console.log("tmpUser.gifts", tmpUser.gifts);
        console.log("tmpUser.level", tmpUser.level);
        console.log("tmpUser.whose", tmpUser.whose);
        console.log("tmpUser.isValue", tmpUser.isValue);

        if (tmpUser.isValue) {
            AddressesGlobal[_wallet] = tmpUser;
        }

        console.log("~_transferredAmount first before", _transferredAmount);
        console.log("~CLAIMS first before", AddressesGlobal[_wallet].claims);
        console.log("_wallet", _wallet);
        console.log("~LEVEL first before", AddressesGlobal[_wallet].level);

        // set initial registerPrice, balance and level
        if (_transferredAmount > 0) {
            balance = _transferredAmount;
        }

        if (AddressesGlobal[_wallet].isValue) {
            if (AddressesGlobal[_wallet].claims > 0) {
                balance = balance.add(AddressesGlobal[_wallet].claims);
            }
            if (AddressesGlobal[_wallet].level < maxLevel) {
                nexLevel = AddressesGlobal[_wallet].level.add(1);
                registerPrice = getLevelPrice(nexLevel);
            } else {
                levelOverflow = 1;
            }
        } else {
            registerPrice = payUnit;
            balance = balance.add(_transferredAmount);
        }

        console.log("");
        console.log("<Core.matricesRegistration() 1.1 after initial values>");
        console.log("");

        console.log("~~balance first before", balance);
        console.log("~~registerPrice first before", registerPrice);
        console.log("~~nexLevel after prepare", nexLevel);
        console.log("~~levelOverflow first before", levelOverflow);

        // already have register data: balance, nexLevel, registerPrice
        if (levelOverflow == 0 && balance > 0) {
            // make loop for _register and decrement remains
            while (balance >= registerPrice) {
                // register in, decrease balance and increment nexLevel
                // local Core registration in UserGlobal and matrix registration
                if (AddressesGlobal[_wallet].isValue) {
                    // set claims, level
                    AddressesGlobal[_wallet].level = nexLevel;

                    console.log("");
                    console.log("<Core.matricesRegistration() 1.2 if-while-if is-value>");
                    console.log("");

                    console.log("-------000_ClaimsSpent");
                    console.log("--_wallet", _wallet);
                    console.log("--balance", balance);
                    console.log("--registerPrice", registerPrice);
                    console.log("--nexLevel", nexLevel);

                    // it is the event for claims spending to next level counting
                    emit ClaimsSpent(
                        _wallet,
                        registerPrice,
                        nexLevel
                    );

                } else {
                    // put zeroWallet to whose referral address
                    AddressesGlobal[_wallet] = UserGlobal(balance, 0, 0, zeroWallet, true);
                    AddressesGlobalTotal = AddressesGlobalTotal.add(1);
                    emit WhoseRegistered(_wallet, zeroWallet, balance);
                }

                balance = balance.sub(registerPrice);

                // todo -- not saved there, can be used intermediate variable
                AddressesGlobal[_wallet].claims = balance;

                console.log("");
                console.log("<Core.matricesRegistration() 1.3 while after if>");
                console.log("");

                console.log("_wallet", _wallet);
                console.log("New claims !! AddressesGlobal[_wallet].claims", AddressesGlobal[_wallet].claims);
                console.log("balance", balance);
                console.log("New claims !! AddressesGlobal[_wallet].gifts", AddressesGlobal[_wallet].gifts);
                console.log("New claims !! AddressesGlobal[_wallet].level", AddressesGlobal[_wallet].level);
                console.log("New claims !! AddressesGlobal[_wallet].whose", AddressesGlobal[_wallet].whose);

                UserGlobal memory tmpUserBackup = UserGlobal(0, 0, 0, address(0), false);
                if (isWhose) {
                    tmpUserBackup = AddressesGlobal[_wallet];
                }

                MatrixTemplate(payable(Matrices[nexLevel])).register(_wallet, tmpUserBackup);

                console.log("");
                console.log("<Core.matricesRegistration() 1.3> after mt.register()");
                console.log("");

                console.log("2New2 claims !! AddressesGlobal[_wallet].claims", AddressesGlobal[_wallet].claims);
                console.log("2_wallet", _wallet);
                console.log("2balance", balance);
                console.log("2New2 claims !! AddressesGlobal[_wallet].gifts", AddressesGlobal[_wallet].gifts);
                console.log("2New2 claims !! AddressesGlobal[_wallet].level", AddressesGlobal[_wallet].level);
                console.log("2New2 claims !! AddressesGlobal[_wallet].whose", AddressesGlobal[_wallet].whose);

                registerPrice = registerPrice.mul(2);
                nexLevel = nexLevel.add(1);

                console.log("..registerPrice after", registerPrice);
                console.log("..nexLevel after", nexLevel);
            }
            console.log("______________________ after while ______________________");
            console.log("");
        }
        console.log("______________________ after if up while ______________________");
        console.log("");
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
        uint _field,
        UserGlobal calldata tmpUser
    ) external {
        require(isMatrix(msg.sender), "access denied 1");

        uint levelPayUnit = getLevelPrice(_matrixIndex);
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
            emit ReferralEarn(_userAddress, newValue, whose);

            console.log("");
            console.log("<Core.updateUser() 1.0 whose>");
            console.log("");

            console.log("==|before matricesRegistration 2 ------->");
            console.log(whose);
            console.log(AddressesGlobal[whose].claims);

            // run whose going level up if enough balance
            matricesRegistration(whose, 0, tmpUser, true);
        }

        // TODO: what is it???
        uint needValue = levelPayUnit.mul(2);
        if (newValue >= needValue && _userAddress != zeroWallet && _matrixIndex < maxLevel) {

            console.log("");
            console.log("<Core.updateUser() 1.1 _userAddress>");
            console.log("");

            console.log("==|before matricesRegistration 3");

            matricesRegistration(_userAddress, 0, tmpUser, false);
        }
    }

    function sendHalf(address _wallet, uint _matrixIndex) external {
        require(isMatrix(msg.sender), "access denied 2");
        if (_matrixIndex >= maxLevel) {
            return;
        }
        uint amount = getLevelPrice(_matrixIndex).div(2);

        console.log("");
        console.log("<Core.sendHalf() 1.0>");
        console.log("");

        console.log("_wallet", _wallet);
        console.log("amount", amount);
        console.log("_matrixIndex", _matrixIndex);
        console.log("_-_-_-_-_-_-_-_-_-_-_-_-_-_-");

        bool sent = payable(_wallet).send(amount);

        console.log("sent: ", sent);

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
