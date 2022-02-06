// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract Matrix is ERC20 {
    address USDTAddress;
    address BUSDAddress;
    address BoxAddress;

    IERC20 public USDTToken;
    IERC20 public BUSDToken;
    IERC20 public MXToken;

    constructor(address _BoxAddress, address _USDTAddress, address _BUSDAddress) ERC20("Matrix", "XUSD") {
        BoxAddress = _BoxAddress;
        USDTAddress = _USDTAddress;
        BUSDAddress = _BUSDAddress;
        MXToken = ERC20(address(this));
        USDTToken = ERC20(USDTAddress);
        BUSDToken = ERC20(BUSDAddress);
    }

    function depositUSDT(uint _amount) payable public {
        USDTToken.transferFrom(msg.sender, BoxAddress, _amount);
        _mint(msg.sender, _amount);
    }

    function depositBUSD(uint _amount) payable public {
        BUSDToken.transferFrom(msg.sender, BoxAddress, _amount);
        _mint(msg.sender, _amount);
    }
}
