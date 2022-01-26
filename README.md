# Matrix project

Project for Binance Smart Chain

using:
- npm
- hardhat
- openzeppelin-solidity

# BSC Testnet (bsc_testnet) values

- BUSD contract address: [0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee](https://testnet.bscscan.com/token/0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee)
- USDT contract address: [0x337610d27c682e347c9cd60bd4b3b107c9d34ddd](https://testnet.bscscan.com/token/0x337610d27c682e347c9cd60bd4b3b107c9d34ddd)
  
Getting testnet tokens: <https://testnet.binance.org/faucet-smart>  

# hardhat stuff
run localhost:  
`npx hardhat node`  

run tests:  
`npx hardhat test`  

deploy (to testnet):  
`npx hardhat run --network testnet scripts/deploy.js`  
