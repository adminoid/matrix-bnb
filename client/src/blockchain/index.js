import Web3 from 'web3'
import ethConf from './config'

const BlockChain = class {

  eth
  acc
  w3
  contract
  hash
  error

  throwError(msg) {
    if (typeof msg === 'string' && msg.indexOf("\n") !== -1) {
      let lines = msg.split('\n')
      lines.splice(0, 1)
      msg = JSON.parse(lines.join('\n')).message
    }
    this.error = {
      id: Symbol('error'),
      msg,
    }
    throw new Error(msg)
  }

  checkMetamask() {
    if (window.hasOwnProperty('ethereum')
      && window.ethereum !== undefined) {
      if (!this.eth) this.eth = window.ethereum
      if (!this.w3) this.w3 = new Web3(this.eth)
      return true
    } else {
      this.throwError('Установите metamask!')
    }
  }

  async setBSCNetwork() {
    try {
      // check if the chain to connect to is installed
      await this.eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethConf.chainId }],
      });
    } catch (e) {
      // This error code indicates that the chain has not been added to MetaMask
      // if it is not, then install it into the user MetaMask
      if (e.code === 4902) {
        try {
          await this.eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: ethConf.chainId,
                rpcUrl: ethConf.rpcUrl,
              },
            ],
          })
        } catch (e) {
          this.throwError(e.message)
        }
      }
      this.throwError(e.message)
    }
  }

  async getWallet() {
    let accounts
    try {
      accounts = await this.eth.request({ method: 'eth_requestAccounts' }, e => {
        if (e) this.throwError(e.message)
      })
      this.acc = accounts[0]
      return this.acc
    } catch (e) {
      this.throwError(e.message)
    }
  }

  async checkContract() {
    if (!this.contract) {
      try {
        this.checkMetamask()
        await this.setBSCNetwork()
        await this.getWallet()
        this.contract = new this.w3.eth.Contract(ethConf.abi, ethConf.contractAddress)
      } catch (e) {
        this.throwError(e.message)
      }
    }
  }
}

export default BlockChain
