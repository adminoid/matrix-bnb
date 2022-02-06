// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract Question is ERC20 {
    address USDTAddress;
    address BoxAddress;
    address minter;

    IERC20 public USDTToken;
    IERC20 public MXToken;

    constructor(address _USDTAddress, address _BoxAddress) ERC20("Question", "QUE") {
        USDTAddress = _USDTAddress;

//        console.log(USDTAddress); // tokenUSDT.address
//        console.log(msg.sender); // unknown
//        console.log(_BoxAddress); // commonWallet.address

        BoxAddress = _BoxAddress; // equal to commonWallet.address
        MXToken = ERC20(address(this));

//        console.log(address(this)); // tokenMatrix.address


        USDTToken = ERC20(USDTAddress);
        minter = msg.sender;

//        _mint(BoxAddress, 1000000000000000000000);
    }

    function depositUSDT(uint _amount) payable public {

        console.log(msg.sender); // walletUser.address
        console.log(BoxAddress); // commonWallet.address
//        console.log(_amount); // ok

        USDTToken.transferFrom(msg.sender, BoxAddress, _amount);

//        console.log(USDTToken.allowance(msg.sender, BoxAddress));

//        USDTToken.transfer(msg.sender, _amount);

//        MXToken.approve(BoxAddress, _amount);
//        MXToken.transferFrom(BoxAddress, msg.sender, _amount);

//        USDTToken.approve(msg.sender, BoxAddress, _amount);
//        USDTToken.transferFrom(msg.sender, BoxAddress, _amount);

//        _mint(msg.sender, _amount);
    }
}
