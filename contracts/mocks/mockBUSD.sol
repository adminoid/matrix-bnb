// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock BUSD", "BUSD") {
        _mint(msg.sender, 5000000000 * 10 ** decimals());
    }
}
