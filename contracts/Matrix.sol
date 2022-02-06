// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Matrix is ERC20 {

    using SafeMath for uint256;
    address USDTAddress;
    address BUSDAddress;
    address BoxAddress;
    address CostsAddress;

    struct Deposits {
        address participant;
        uint usdt;
        uint busd;
    }

    constructor(
        address _USDTAddress,
        address _BUSDAddress,
        address _costsAddress
    ) ERC20("Matrix", "MAT") {
        USDTAddress = _USDTAddress;
        BUSDAddress = _BUSDAddress;
        BoxAddress = msg.sender;
        CostsAddress = _costsAddress;
    }

    function depositUSDT(uint _tokenAmount) public payable {
        ERC20 USDTToken = ERC20(USDTAddress);
        uint half = _tokenAmount.div(2);
        USDTToken.transferFrom(msg.sender, BoxAddress, half);
        USDTToken.transferFrom(msg.sender, CostsAddress, half);
        _mint(msg.sender, _tokenAmount);
    }

    function depositBUSD(uint _tokenAmount) public payable {
        ERC20 BUSDToken = ERC20(BUSDAddress);
        uint half = _tokenAmount.div(2);
        BUSDToken.transferFrom(msg.sender, BoxAddress, half);
        BUSDToken.transferFrom(msg.sender, CostsAddress, half);
        _mint(msg.sender, _tokenAmount);
    }

    function withdrawUSDT(uint _tokenAmount) public payable {
        ERC20 USDTToken = ERC20(USDTAddress);
        uint half = _tokenAmount.div(2);
        USDTToken.transferFrom(BoxAddress, msg.sender, half);
        USDTToken.transferFrom(CostsAddress, msg.sender, half);
        _burn(msg.sender, _tokenAmount);
    }

    function withdrawBUSD(uint _tokenAmount) public payable {
        ERC20 BUSDToken = ERC20(BUSDAddress);
        uint half = _tokenAmount.div(2);
        BUSDToken.transferFrom(BoxAddress, msg.sender, half);
        BUSDToken.transferFrom(CostsAddress, msg.sender, half);
        _burn(msg.sender, _tokenAmount);
    }

}
