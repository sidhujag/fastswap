import rconfig from './SyscoinRelayI.js'
import { getProof } from 'bitcoin-proof'
import web3 from './web3.js'
import syscoinjs from './syscoinjs.js'
import sjs from 'syscoinjs-lib'
import CONFIGURATION from './config.js'
import erc20Managerabi from './SyscoinERC20Manager.js'
function TxController () {
}
// txController.js
TxController.prototype.isString = function (s) {
  return (typeof s === 'string' || s instanceof String)
}
TxController.prototype.toBaseUnit = function (value, decimals, BN) {
  if (!this.isString(value)) {
    console.error('Pass strings to prevent floating point precision issues.')
    return
  }
  const ten = new BN(10)
  const base = ten.pow(new BN(decimals))

  // Is it negative?
  const negative = (value.substring(0, 1) === '-')
  if (negative) {
    value = value.substring(1)
  }

  if (value === '.') {
    console.error(
    `Invalid value ${value} cannot be converted to` +
    ` base unit with ${decimals} decimals.`)
    return
  }

  // Split it into a whole and fractional part
  const comps = value.split('.')
  if (comps.length > 2) { console.error('Too many decimal points'); return }

  let whole = comps[0]; let fraction = comps[1]

  if (!whole) { whole = '0' }
  if (!fraction) { fraction = '0' }
  if (fraction.length > decimals) {
    console.error('Too many decimal places')
    return
  }

  while (fraction.length < decimals) {
    fraction += '0'
  }

  whole = new BN(whole)
  fraction = new BN(fraction)
  let wei = (whole.mul(base)).add(fraction)

  if (negative) {
    wei = wei.neg()
  }

  return new BN(wei.toString(10), 10)
}
TxController.prototype.sysToSysx = async function (amount) {
  const burnAmount = this.toBaseUnit(web3.utils.fromWei(amount, 'ether'), 8, web3.utils.BN).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: CONFIGURATION.SYSADDRESS, outputs: [{ value: new sjs.utils.BN(burnAmount), address: CONFIGURATION.SYSADDRESS }] }]
  ])
  const result = await syscoinjs.syscoinBurnToAssetAllocation(txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('sysToSysx syscoinBurnToAssetAllocation failed')
    return null
  }
  const psbt = await syscoinjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
  if (!psbt) {
    console.log('sysToSysx signAndSendWithWIF failed')
    return null
  }
  const tx = psbt.extractTransaction()
  if (!tx) {
    console.log('sysToSysx extractTransaction failed')
    return null
  }
  return tx.getId()
}
TxController.prototype.sysxToSys = async function (amount) {
  const burnAmount = this.toBaseUnit(web3.utils.fromWei(amount, 'ether'), 8, web3.utils.BN).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // empty ethaddress means burning SYSX to SYS
  const assetOpts = { ethaddress: Buffer.from('') }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: CONFIGURATION.SYSADDRESS, outputs: [{ value: new sjs.utils.BN(burnAmount), address: CONFIGURATION.SYSADDRESS }] }]
  ])
  const result = await syscoinjs.assetAllocationBurn(assetOpts, txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('sysxToSys assetAllocationBurn failed')
    return null
  }
  const psbt = await syscoinjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
  if (!psbt) {
    console.log('sysxToSys signAndSendWithWIF failed')
    return null
  }
  const tx = psbt.extractTransaction()
  if (!tx) {
    console.log('sysxToSys extractTransaction failed')
    return null
  }
  return tx.getId()
}
TxController.prototype.burnSYSXToNEVM = async function (amount) {
  const burnAmount = this.toBaseUnit(web3.utils.fromWei(amount, 'ether'), 8, web3.utils.BN).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const assetOpts = { ethaddress: Buffer.from(CONFIGURATION.NEVMADDRESS, 'hex') }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: CONFIGURATION.SYSADDRESS, outputs: [{ value: new sjs.utils.BN(burnAmount), address: CONFIGURATION.SYSADDRESS }] }]
  ])
  const result = await syscoinjs.assetAllocationBurn(assetOpts, txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('burnSYSXToNEVM assetAllocationBurn failed')
    return null
  }
  const psbt = await syscoinjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
  if (!psbt) {
    console.log('burnSYSXToNEVM signAndSendWithWIF failed')
    return null
  }
  const tx = psbt.extractTransaction()
  if (!tx) {
    console.log('burnSYSXToNEVM extractTransaction failed')
    return null
  }
  return tx.getId()
}
TxController.prototype.burnNEVMToSYSX = async function (amount) {
  const SyscoinERC20Manager = new web3.eth.Contract(erc20Managerabi, CONFIGURATION.ERC20Manager)
  if (!SyscoinERC20Manager || !SyscoinERC20Manager.methods || !SyscoinERC20Manager.methods.freezeBurnERC20) {
    return null
  }
  let hash
  try {
    hash = await new Promise((resolve, reject) => {
      SyscoinERC20Manager.methods.freezeBurnERC20(amount, CONFIGURATION.SYSXAsset, CONFIGURATION.SYSADDRESS).send({ from: CONFIGURATION.NEVMADDRESS, gas: 400000, amount })
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
  // web3 URL + ID and nevm burn txid
  const assetOpts = {
    web3url: CONFIGURATION.Web3URL,
    ethtxid: srctxid
  }
  // will be auto filled based on ethtxid eth-proof
  const assetMap = null
  const result = await syscoinjs.assetAllocationMint(assetOpts, txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('mintSYSX assetAllocationMint failed')
    return null
  }
  const psbt = await syscoinjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
  if (!psbt) {
    console.log('mintSYSX signAndSendWithWIF failed')
    return null
  }
  const tx = psbt.extractTransaction()
  if (!tx) {
    console.log('mintSYSX extractTransaction failed')
    return null
  }
  return tx.getId()
}
TxController.prototype.sendSys = async function (address, amount) {
  const burnAmount = this.toBaseUnit(web3.utils.fromWei(amount, 'ether'), 8, web3.utils.BN).toString()
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const outputsArr = [
    { address: address, value: new sjs.utils.BN(burnAmount) }
  ]
  const result = await syscoinjs.createTransaction(txOpts, CONFIGURATION.SYSADDRESS, outputsArr, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('sendSys createTransaction failed')
    return null
  }
  const psbt = await syscoinjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
  if (!psbt) {
    console.log('sendSys signAndSendWithWIF failed')
    return null
  }
  const tx = psbt.extractTransaction()
  if (!tx) {
    console.log('sendSys extractTransaction failed')
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
    console.log('sysChainlocked obj.getProofs failed')
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
    console.log('NEVMChainlocked obj.getProofs failed')
    return false
  }
  const nevmBlockhash = '0x' + res.nevm_blockhash
  if (nevmBlockhash !== srctx.blockHash) {
    console.log('NEVMChainlocked blockhash mismatch')
    return false
  }
  return true
}
export default new TxController()
