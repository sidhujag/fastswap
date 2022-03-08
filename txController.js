import rconfig from './SyscoinRelayI.js'
import { getProof } from 'bitcoin-proof'
import web3 from './web3.js'
import sjs from 'syscoinjs-lib'
import CONFIGURATION from './config.js'
import erc20Managerabi from './SyscoinERC20Manager.js'
import Balance from './balanceModel.js'
const COINNEVM = web3.utils.toBN(web3.utils.toWei('1'))
class TxController {
  constructor () {
    this.init()
  }
  async init() {
    // 'null' for no password encryption for local storage
    const HDSigner = new sjs.utils.HDSigner(CONFIGURATION.SYSSEED, null, CONFIGURATION.SysNetwork === sjs.utils.syscoinNetworks.testnet)
    this.syscoinjs = new sjs.SyscoinJSLib(HDSigner, CONFIGURATION.BlockbookAPIURL, CONFIGURATION.SysNetwork)
    CONFIGURATION.NEVMADDRESS = await web3.eth.getAccounts()
    CONFIGURATION.NEVMADDRESS = CONFIGURATION.NEVMADDRESS[0]
    CONFIGURATION.SYSADDRESS = await this.syscoinjs.Signer.getNewReceivingAddress()
    console.log("CONFIGURATION.NEVMADDRESS " + CONFIGURATION.NEVMADDRESS)
    console.log("CONFIGURATION.SYSADDRESS " + CONFIGURATION.SYSADDRESS)
  }
}
// txController.js
TxController.prototype.sysToSysx = async function (amount) {
  const burnAmount = web3.utils.toBN(amount).div(web3.utils.toBN(Math.pow(10, 10))).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // null to let HDSigner find a new address for you
  const changeAddress = null
  const recvAddress = await this.syscoinjs.Signer.getNewReceivingAddress()
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: changeAddress, outputs: [{ value: new sjs.utils.BN(burnAmount), address: recvAddress }] }]
  ])
  let tx
  try {
    const psbt = await this.syscoinjs.syscoinBurnToAssetAllocation(txOpts, assetMap, changeAddress, feeRate)
    if (!psbt) {
      console.log('sysToSysx syscoinBurnToAssetAllocation failed')
      return null
    }
    tx = psbt.extractTransaction()
    if (!tx) {
      console.log('sysToSysx extractTransaction failed')
      return null
    }
  } catch (e) {
    console.log('could not create sysToSysx: ' + e.message)
    return null
  }
  return tx.getId()
}
TxController.prototype.sysxToSys = async function (amount) {
  const burnAmount = web3.utils.toBN(amount).div(web3.utils.toBN(Math.pow(10, 10))).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // null to let HDSigner find a new address for you
  const changeAddress = null
  const recvAddress = await this.syscoinjs.Signer.getNewReceivingAddress()
  // empty ethaddress means burning SYSX to SYS
  const assetOpts = { ethaddress: Buffer.from('') }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: changeAddress, outputs: [{ value: new sjs.utils.BN(burnAmount), address: recvAddress }] }]
  ])
  let tx
  try {
    const psbt = await this.syscoinjs.assetAllocationBurn(assetOpts, txOpts, assetMap, changeAddress, feeRate)
    if (!psbt) {
      console.log('sysxToSys assetAllocationBurn failed')
      return null
    }
    tx = psbt.extractTransaction()
    if (!tx) {
      console.log('sysxToSys extractTransaction failed')
      return null
    }
  } catch (e) {
    console.log('could not create sysxToSys: ' + e.message)
    return null
  }
  return tx.getId()
}
TxController.prototype.burnSYSXToNEVM = async function (amount) {
  const burnAmount = web3.utils.toBN(amount).div(web3.utils.toBN(Math.pow(10, 10))).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // null to let HDSigner find a new address for you
  const changeAddress = null
  const recvAddress = await this.syscoinjs.Signer.getNewReceivingAddress()
  const ethAddress = CONFIGURATION.NEVMADDRESS.replace(/^0x/, '')
  const assetOpts = { ethaddress: Buffer.from(ethAddress, 'hex') }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: changeAddress, outputs: [{ value: new sjs.utils.BN(burnAmount), address: recvAddress }] }]
  ])
  let tx
  try {
    const psbt = await this.syscoinjs.assetAllocationBurn(assetOpts, txOpts, assetMap, changeAddress, feeRate)
    if (!psbt) {
      console.log('burnSYSXToNEVM assetAllocationBurn failed')
      return null
    }
    tx = psbt.extractTransaction()
    if (!tx) {
      console.log('burnSYSXToNEVM extractTransaction failed')
      return null
    }
  } catch (e) {
    console.log('could not create burnSYSXToNEVM: ' + e.message)
    return null
  }
  return tx.getId()
}
TxController.prototype.burnNEVMToSYSX = async function (amount) {
  const recvAddress = await this.syscoinjs.Signer.getNewReceivingAddress()
  const SyscoinERC20Manager = new web3.eth.Contract(erc20Managerabi, CONFIGURATION.ERC20Manager)
  if (!SyscoinERC20Manager || !SyscoinERC20Manager.methods || !SyscoinERC20Manager.methods.freezeBurnERC20) {
    return null
  }
  let hash
  try {
    hash = await new Promise((resolve, reject) => {
      SyscoinERC20Manager.methods.freezeBurnERC20(amount, CONFIGURATION.SYSXAsset, recvAddress).send({ from: CONFIGURATION.NEVMADDRESS, gas: 400000, value: amount })
        .once('transactionHash', (hash) => {
          resolve(hash)
        })
        .on('error', (err) => {
          reject(err)
        })
    })
  } catch (error) {
    console.log('burnNEVMToSYSX freezeBurnERC20 failed:' + error.message)
    return null
  }
  return hash
}
TxController.prototype.getProofs = async function (txid) {
  const ret = {}
  try {
    let results = await sjs.utils.fetchBackendSPVProof(CONFIGURATION.BlockbookAPIURL, txid)
    if (results.error) {
      ret.error = results.error
    } else if (results) {
      if (results.result.length === 0) {
        ret.error = 'Failed to retrieve SPV Proof'
      } else {
        results = JSON.parse(results.result)
        if (!results.transaction) {
          ret.error = 'Failed to retrieve SPV Proof'
        } else {
          ret.txbytes = results.transaction
          ret.syscoinblockheader = results.header
          ret.txsiblings = results.siblings
          ret.txindex = results.index
          ret.nevm_blockhash = results.nevm_blockhash
          ret.chainlock = results.chainlock
        }
      }
    }
  } catch (e) {
    ret.error = (e && e.message) ? e.message : 'Unknown error!'
    console.log('getProofs failed:' + ret.error)
  }
  return ret
}
TxController.prototype.mintNEVM = async function (txid, obj) {
  const paramObj = await obj.getProofs(txid)
  if (paramObj.error) {
    return null
  }
  const SyscoinRelay = new web3.eth.Contract(rconfig.data, rconfig.contract)
  if (!SyscoinRelay || !SyscoinRelay.methods || !SyscoinRelay.methods.relayTx) {
    console.log('mintNEVM web3.eth.Contract failed')
    return null
  }
  const txsiblings = paramObj.txsiblings
  const txindex = paramObj.txindex
  const syscoinblockheader = paramObj.syscoinblockheader
  const nevmblockhash = paramObj.nevm_blockhash
  if (!txsiblings) {
    console.log('mintNEVM txsiblings failed')
    return null
  }
  const _txBytes = '0x' + paramObj.txbytes
  const _txSiblings = []
  for (let i = 0; i < txsiblings.length; i++) {
    const _txSibling = '0x' + txsiblings[i]
    _txSiblings.push(_txSibling)
  }
  const merkleProof = getProof(txsiblings, txindex)
  for (let i = 0; i < merkleProof.sibling.length; i++) {
    merkleProof.sibling[i] = '0x' + merkleProof.sibling[i]
  }
  let nevmBlock
  try {
    nevmBlock = await web3.eth.getBlock('0x' + nevmblockhash)
  } catch (e) {
    console.log('mintNEVM web3.eth.getBlock: ' + e.message)
    return null
  }
  if (!nevmBlock) {
    console.log('mintNEVM web3.eth.getBlock failed')
    return null
  }
  const _syscoinBlockHeader = '0x' + syscoinblockheader
  let hash
  try {
    hash = await new Promise((resolve, reject) => {
      SyscoinRelay.methods.relayTx(nevmBlock.number, _txBytes, txindex, merkleProof.sibling, _syscoinBlockHeader).send({ from: CONFIGURATION.NEVMADDRESS, gas: 400000 })
        .once('transactionHash', (hash) => {
          resolve(hash)
        })
        .on('error', (err) => {
          reject(err)
        })
    })
  } catch (error) {
    console.log('mintNEVM relayTx failed:' + error.message)
    return null
  }
  return hash
}
TxController.prototype.mintSYSX = async function (srctxid) {
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // null to let HDSigner find a new address for you
  const changeAddress = null
  // web3 URL + ID and nevm burn txid
  const assetOpts = {
    web3url: CONFIGURATION.Web3URL,
    ethtxid: srctxid
  }
  let tx
  // will be auto filled based on ethtxid eth-proof
  try {
    const assetMap = null
    const psbt = await this.syscoinjs.assetAllocationMint(assetOpts, txOpts, assetMap, changeAddress, feeRate)
    if (!psbt) {
      console.log('mintSYSX assetAllocationMint failed')
      return null
    }
    tx = psbt.extractTransaction()
    if (!tx) {
      console.log('mintSYSX extractTransaction failed')
      return null
    }
  } catch (e) {
    console.log('could not create mintSYSX: ' + e.message)
    return null
  }
  return tx.getId()
}
TxController.prototype.sendSys = async function (address, amount) {
  const burnAmount = web3.utils.toBN(amount).div(web3.utils.toBN(Math.pow(10, 10))).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const changeAddress = null
  const outputsArr = [
    { address: address, value: new sjs.utils.BN(burnAmount) }
  ]
  let tx
  try {
    const psbt = await this.syscoinjs.createTransaction(txOpts, changeAddress, outputsArr, feeRate)
    if (!psbt) {
      console.log('sendSys createTransaction failed')
      return null
    }
    tx = psbt.extractTransaction()
    if (!tx) {
      console.log('sendSys extractTransaction failed')
      return null
    }
  } catch (e) {
    console.log('could not create sendSys: ' + e.message)
    return null
  }
  return tx.getId()
}
TxController.prototype.sendNEVM = async function (address, amount) {
  let hash
  try {
    hash = await new Promise((resolve, reject) => {
      web3.eth.sendTransaction({
        from: CONFIGURATION.NEVMADDRESS,
        to: address,
        value: amount
      }).once('transactionHash', (hash) => {
        resolve(hash)
      })
        .on('error', (err) => {
          reject(err)
        })
    })
  } catch (error) {
    console.log('sendNEVM web3.eth.sendTransaction failed:' + error.message)
    return null
  }
  return hash
}
TxController.prototype.sysChainlocked = async function (srctxid, obj) {
  const res = await obj.getProofs(srctxid)
  if (!res || res.error || !res.chainlock) {
    return false
  }
  return true
}
// 1) fetch nevm tx
// 2) get block number - lookup utxo chain block number corrosponding
// 3) fetch utxo block via spvproof rpc
// 4) check chainlocked
// 5) check nevm blockhash matches
TxController.prototype.NEVMChainlocked = async function (srctxid, obj) {
  let srctx
  try {
    srctx = await web3.eth.getTransaction(srctxid)
  } catch (e) {
    console.log('NEVMChainlocked web3.eth.getTransaction: ' + e.message)
    return false
  }
  if (!srctx) {
    console.log('NEVMChainlocked web3.eth.getTransaction failed')
    return false
  }
  const utxoChainHeight = (srctx.blockNumber + CONFIGURATION.NEVMBlockHeight) - 1
  const block = await sjs.utils.fetchBackendBlock(CONFIGURATION.BlockbookAPIURL, utxoChainHeight)
  if (!block || !block.txs || !block.txs.length) {
    console.log('NEVMChainlocked fetchBackendBlock failed')
    return false
  }
  const coinbaseTxid = block.txs[0].txid
  const res = await obj.getProofs(coinbaseTxid)
  if (!res || res.error || !res.chainlock) {
    return false
  }
  const nevmBlockhash = '0x' + res.nevm_blockhash
  if (nevmBlockhash !== srctx.blockHash) {
    console.log('NEVMChainlocked blockhash mismatch')
    return false
  }
  return true
}
TxController.prototype.FetchAndUpdateBalances = async function (obj) {
  const sysAccount = await sjs.utils.fetchBackendAccount(CONFIGURATION.BlockbookAPIURL, this.syscoinjs.Signer.getAccountXpub(), '?details=basic', true)
  const balanceEntry = new Balance()
  balanceEntry.sysbalance = web3.utils.toBN(sysAccount.balance).mul(web3.utils.toBN(Math.pow(10, 10))).toString()
  try {
    balanceEntry.nevmbalance = await web3.eth.getBalance(CONFIGURATION.NEVMADDRESS)
  } catch (e) {
    console.log('FetchAndUpdateBalances getbalance: ' + e.message)
    return null
  }
  // cover for 1 SYS gas
  if (web3.utils.toBN(balanceEntry.sysbalance).gt(COINNEVM)) {
    balanceEntry.sysbalance = web3.utils.toBN(balanceEntry.sysbalance).sub(COINNEVM)
  }
  if (web3.utils.toBN(balanceEntry.nevmbalance).gt(COINNEVM)) {
    balanceEntry.nevmbalance = web3.utils.toBN(balanceEntry.nevmbalance).sub(COINNEVM)
  }
  balanceEntry.sysbalance = balanceEntry.sysbalance.toString()
  balanceEntry.nevmbalance = balanceEntry.nevmbalance.toString()
  console.log('FetchAndUpdateBalances sysbalance: ' + balanceEntry.sysbalance + ' nevmbalance: ' + balanceEntry.nevmbalance)
  const updateRes = await obj.save(balanceEntry)
  if (!updateRes) {
    console.log('update failed')
    return null
  }
  return balanceEntry
}
export default new TxController()
