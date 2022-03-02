
import sjs from 'syscoinjs-lib'
class CONFIGURATION {
  constructor () {
    this.Web3URL = 'https://rpc.tanenbaum.io'
    this.RelayContract = '0xD822557aC2F2b77A1988617308e4A29A89Cb95A6'
    this.ERC20Manager = '0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1'
    this.BlockbookAPIURL = 'https://sys-explorer.tk/'
    this.SYSXAsset = '123456'
    this.SysNetwork = sjs.utils.syscoinNetworks.testnet
    this.NEVMKEY = ''
    this.NEVMADDRESS = '0xb8CE9ab6943e0eCED004cDe8e3bBed6568B2Fa01'
    this.SYSKEY = ''
    this.SYSADDRESS = 'tsys1qzm867n0g62axr7zl46e65vh6uwtvt97r4mq764'
    this.NEVMBlockHeight = 840000
    this.MONGOOSEPORT = 27017
    this.PORT = 8080
    this.MEMOHEADER = Buffer.from([0xff, 0xee, 0xaa])
  }
}
export default new CONFIGURATION()
