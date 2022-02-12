// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import "hardhat/console.sol";

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

    event Deposited(address sender, uint256 amount, string currency);
    event Withdrawn(address sender, uint256 amount, string currency);

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
        emit Deposited(msg.sender, _amount, "USDT");
    }

    function withdrawUSDT(uint _amount) payable public {
        require(Deposits[msg.sender].USDT >= _amount, "deposited less than you want withdraw USDT");
        USDTToken.approve(address(this), _amount);
        USDTToken.transferFrom(address(this), msg.sender, _amount);
        Deposits[msg.sender].USDT -= _amount;
        _burn(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, "USDT");
    }

    function getUSDTDeposit() view public returns(uint256) {
        return Deposits[msg.sender].USDT;
    }

    function depositBUSD(uint _amount) payable public {
        BUSDToken.transferFrom(msg.sender, address(this), _amount);
        Deposits[msg.sender].BUSD += _amount;
        _mint(msg.sender, _amount);
        emit Deposited(msg.sender, _amount, "BUSD");
    }

    function withdrawBUSD(uint _amount) payable public {
        require(Deposits[msg.sender].BUSD >= _amount, "deposited less than you want withdraw BUSD");
        BUSDToken.approve(address(this), _amount);
        BUSDToken.transferFrom(address(this), msg.sender, _amount);
        Deposits[msg.sender].BUSD -= _amount;
        _burn(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, "BUSD");
    }

    function getBUSDDeposit() view public returns(uint256) {
        return Deposits[_msgSender()].BUSD;
    }
}
