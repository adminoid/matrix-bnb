const axios = require('axios');
const fs = require('fs')

// https://api-testnet.bscscan.com/api?module=contract&action=getabi&address=
// USDT 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
// BUSD 0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee

// const address = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
const address = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
// const fileName = 'scripts/output/busd.abi.json'
const fileName = 'scripts/output/usdt.abi.json'

axios.get(`https://api-testnet.bscscan.com/api?module=contract&action=getabi&address=${address}`)
  .then(function (response) {
    // console.log(JSON.stringify(response.data))
    fs.writeFile(fileName, JSON.stringify(response.data), 'utf8', console.log);
  })
  .catch(function (error) {
    console.log(error)
  })
