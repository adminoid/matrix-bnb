const axios = require('axios')
const fs = require('fs')

// https://api-testnet.bscscan.com/api?module=contract&action=getabi&address=
// USDT 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
// BUSD 0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee

// const currency = 'usdt' // `usdt` or `busd`
const currency = 'busd' // `usdt` or `busd`
let address, fileName

if (currency === 'usdt') {
  address = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
  fileName = 'scripts/output/usdt.abi.json'
} else if (currency === 'busd') {
  address = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
  fileName = 'scripts/output/busd.abi.json'
} else {
  throw new Error('invalid currency')
}

axios.get(`https://api-testnet.bscscan.com/api?module=contract&action=getabi&address=${address}`)
  .then(function (response) {
    // console.log(JSON.stringify(response.data.result))
    fs.writeFile(fileName, JSON.stringify(response.data.result), 'utf8', console.log);
  })
  .catch(function (error) {
    console.log(error)
  })
