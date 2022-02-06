// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract Matrix is ERC20 {
    address USDTAddress;
    address BoxAddress;
    address minter;

    IERC20 public USDTToken;
    IERC20 public MXToken;

    constructor(address _USDTAddress, address _BoxAddress) ERC20("Matrix", "XUSD") {
        USDTAddress = _USDTAddress;
        BoxAddress = _BoxAddress;
        MXToken = ERC20(address(this));
        USDTToken = ERC20(USDTAddress);
        minter = msg.sender;
    }

    function depositUSDT(uint _amount) payable public {
        USDTToken.transferFrom(msg.sender, BoxAddress, _amount);
        _mint(msg.sender, _amount);
    }
}
