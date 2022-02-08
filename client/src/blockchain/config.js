import abi from '/artifacts/contracts/Matrix.sol/Matrix.json'

// chainId must be in hexadecimal numbers, 0x38 - bsc main net; 0x61 - bsc test net
// const chainId = '0x38' // main
const chainId = '0x61' // dev
// const rpcUrl = 'https://bsc-dataseed.binance.org/' // main
const rpcUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/' // dev

export default {
  contractAddress: '0x77d6367fdc5bd41690A44f84b043549Cd298E2FC', // dev
  abi,
  chainId,
  rpcUrl,
}
