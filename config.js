import web3 from './web3'
class CONFIGURATION {
  constructor () {
    this.Web3URL = 'https://rpc.tanenbaum.io'
    this.RelayContract = "0xD822557aC2F2b77A1988617308e4A29A89Cb95A6";
    this.ERC20Manager = "0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1";
    this.BlockbookAPIURL = 'https://sys-explorer.tk/'
    this.SYSXAsset = '123456'
    this.NEVMKEY = ''
    this.SYSKEY = ''
    this.NEVMADDRESS = ''
    this.SYSADDRESS = ''
    this.NEVMBlockHeight = 840000
    this.COINNEVM = web3.utils.toWei('1')
    this.COINSYS = web3.utils.BN('100000000')
  }
}
export default new CONFIGURATION()
