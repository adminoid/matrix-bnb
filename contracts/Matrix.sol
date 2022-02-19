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
        uint256 amount = _amount.mul(ether);
        USDTToken.transferFrom(msg.sender, address(this), amount);
        Deposits[msg.sender].USDT = Deposits[msg.sender].USDT.add(amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount, "USDT");
    }

    function withdrawUSDT(uint256 _amount) payable public {
        uint256 amount = _amount.mul(ether);
        require(Deposits[msg.sender].USDT >= amount, "deposited less than you want withdraw USDT");
        USDTToken.approve(address(this), amount);
        USDTToken.transferFrom(address(this), msg.sender, amount);
        Deposits[msg.sender].USDT = Deposits[msg.sender].USDT.sub(amount);
        _burn(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, "USDT");
    }

    function getUSDTDeposit() view public returns(uint256) {
        return Deposits[msg.sender].USDT.div(ether);
    }

    function depositBUSD(uint256 _amount) payable public {
        uint256 amount = _amount.mul(ether);
        BUSDToken.transferFrom(msg.sender, address(this), amount);
        Deposits[msg.sender].BUSD = Deposits[msg.sender].BUSD.add(amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount, "BUSD");
    }

    function withdrawBUSD(uint _amount) payable public {
        uint256 amount = _amount.mul(ether);
        require(Deposits[msg.sender].BUSD >= amount, "deposited less than you want withdraw BUSD");
        BUSDToken.approve(address(this), amount);
        BUSDToken.transferFrom(address(this), msg.sender, amount);
        Deposits[msg.sender].BUSD = Deposits[msg.sender].BUSD.sub(amount);
        _burn(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, "BUSD");
    }

    function getBUSDDeposit() view public returns(uint256) {
        return Deposits[msg.sender].BUSD.div(ether);
    }
}
