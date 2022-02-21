// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
//import "hardhat/console.sol";
//import "@openzeppelin/contracts/access/Ownable.sol";

//contract Matrix is ERC20, Ownable {
contract Matrix is ERC20 {
    using SafeMath for uint256;

    address USDTAddress;
    address BUSDAddress;

    IERC20 public USDTToken;
    IERC20 public BUSDToken;

    struct Deposit{
        uint256 USDT;
        uint256 BUSD;
    }

    mapping (address => Deposit) Deposits;

    event Deposited(address sender, uint256 amount, string currency);
    event Withdrawn(address sender, uint256 amount, string currency);

    constructor(address _USDTAddress, address _BUSDAddress) ERC20("Matrix", "XUSD") {
        USDTAddress = _USDTAddress;
        BUSDAddress = _BUSDAddress;
        USDTToken = ERC20(USDTAddress);
        BUSDToken = ERC20(BUSDAddress);
    }

    function depositUSDT(uint256 _amount) payable public {
        USDTToken.transferFrom(msg.sender, address(this), _amount);
        Deposits[msg.sender].USDT = Deposits[msg.sender].USDT.add(_amount);
        _mint(msg.sender, _amount);
        emit Deposited(msg.sender, _amount, "USDT");
    }

    function withdrawUSDT(uint256 _amount) payable public {
        require(Deposits[msg.sender].USDT >= _amount, "USDT deposited less than you want to withdraw");
        USDTToken.approve(address(this), _amount);
        USDTToken.transferFrom(address(this), msg.sender, _amount);
        Deposits[msg.sender].USDT = Deposits[msg.sender].USDT.sub(_amount);
        _burn(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, "USDT");
    }

    function getUSDTDeposit() view public returns(uint256) {
        return Deposits[msg.sender].USDT;
    }

    function depositBUSD(uint256 _amount) payable public {
        BUSDToken.transferFrom(msg.sender, address(this), _amount);
        Deposits[msg.sender].BUSD = Deposits[msg.sender].BUSD.add(_amount);
        _mint(msg.sender, _amount);
        emit Deposited(msg.sender, _amount, "BUSD");
    }

    function withdrawBUSD(uint _amount) payable public {
        require(Deposits[msg.sender].BUSD >= _amount, "BUSD deposited less than you want to withdraw");
        BUSDToken.approve(address(this), _amount);
        BUSDToken.transferFrom(address(this), msg.sender, _amount);
        Deposits[msg.sender].BUSD = Deposits[msg.sender].BUSD.sub(_amount);
        _burn(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, "BUSD");
    }

    function getBUSDDeposit() view public returns(uint256) {
        return Deposits[msg.sender].BUSD;
    }
}
