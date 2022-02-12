// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

// todo: add Events for deposit and withdrawing
// todo: add required or
// todo: ? fix amount for deposit and withdraw
// todo: add mapping for saving user payments in BUSD/USDT

contract Matrix is ERC20, Ownable {
    address USDTAddress;
    address BUSDAddress;

    IERC20 public USDTToken;
    IERC20 public BUSDToken;

    struct Deposit{
        uint256 USDT;
        uint256 BUSD;
    }

    mapping (address => Deposit) Deposits;

    constructor(address _USDTAddress, address _BUSDAddress) ERC20("Matrix", "XUSD") {
        USDTAddress = _USDTAddress;
        BUSDAddress = _BUSDAddress;
        USDTToken = ERC20(USDTAddress);
        BUSDToken = ERC20(BUSDAddress);
    }

    function depositUSDT(uint _amount) payable public {
        USDTToken.transferFrom(msg.sender, address(this), _amount);
        Deposits[msg.sender].USDT += _amount;
        _mint(msg.sender, _amount);
    }

    function withdrawUSDT(uint _amount) payable public {
        USDTToken.approve(address(this), _amount);
        USDTToken.transferFrom(address(this), msg.sender, _amount);
        Deposits[msg.sender].USDT -= _amount;
        _burn(msg.sender, _amount);
    }

    function getUSDTDeposit() view public returns(uint256) {
        return Deposits[msg.sender].USDT;
    }

    function depositBUSD(uint _amount) payable public {
        BUSDToken.transferFrom(msg.sender, address(this), _amount);
        Deposits[msg.sender].BUSD += _amount;
        _mint(msg.sender, _amount);
    }

    function withdrawBUSD(uint _amount) payable public {
        BUSDToken.approve(address(this), _amount);
        BUSDToken.transferFrom(address(this), msg.sender, _amount);
        Deposits[msg.sender].BUSD -= _amount;
        _burn(msg.sender, _amount);
    }

    function getBUSDDeposit() view public returns(uint256) {
        return Deposits[_msgSender()].BUSD;
    }
}
