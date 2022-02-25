import rconfig from './SyscoinRelayI'
import { getProof } from 'bitcoin-proof'
import web3 from './web3'
import sjs from './syscoinjs'
import CONFIGURATION from './config'
import erc20Managerabi from '../SyscoinERC20Manager'
// txController.js
exports.sysToSysx = async function (amount) {
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: CONFIGURATION.SYSADDRESS, outputs: [{ value: new sjs.utils.BN(amount), address: CONFIGURATION.SYSADDRESS }] }]
  ])
  const result = await sjs.syscoinBurnToAssetAllocation(txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('sysToSysx syscoinBurnToAssetAllocation failed')
    return null
  }
  const psbt = await sjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
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
exports.sysxToSys = async function (amount) {
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // empty ethaddress means burning SYSX to SYS
  const assetOpts = { ethaddress: Buffer.from('') }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: CONFIGURATION.SYSADDRESS, outputs: [{ value: new sjs.utils.BN(amount), address: CONFIGURATION.SYSADDRESS }] }]
  ])
  const result = await sjs.assetAllocationBurn(assetOpts, txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('sysxToSys assetAllocationBurn failed')
    return null
  }
  const psbt = await sjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
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
exports.burnSYSXToNEVM = async function (amount) {
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const assetOpts = { ethaddress: Buffer.from(CONFIGURATION.NEVMADDRESS, 'hex') }
  const assetMap = new Map([
    [CONFIGURATION.SYSXAsset, { changeAddress: CONFIGURATION.SYSADDRESS, outputs: [{ value: new sjs.utils.BN(amount), address: CONFIGURATION.SYSADDRESS }] }]
  ])
  const result = await sjs.assetAllocationBurn(assetOpts, txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('burnSYSXToNEVM assetAllocationBurn failed')
    return null
  }
  const psbt = await sjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
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
exports.burnNEVMToSYSX = async function (amount) {
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
exports.getProofs = async function (txid) {
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
exports.mintNEVM = async function (txid) {
  const paramObj = await this.getProofs(txid)
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
  const nevmBlock = await web3.eth.getBlock('0x' + nevmblockhash)
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
exports.mintSYSX = async function (srctxid) {
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  // web3 URL + ID and nevm burn txid
  const assetOpts = {
    web3url: CONFIGURATION.Web3URL,
    ethtxid: srctxid
  }
  // will be auto filled based on ethtxid eth-proof
  const assetMap = null
  const result = await sjs.assetAllocationMint(assetOpts, txOpts, assetMap, CONFIGURATION.SYSADDRESS, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('mintSYSX assetAllocationMint failed')
    return null
  }
  const psbt = await sjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
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
exports.sendSys = async function (address, amount) {
  const feeRate = new sjs.utils.BN(10)
  const txOpts = { rbf: true }
  const outputsArr = [
    { address: address, value: new sjs.utils.BN(amount) }
  ]
  const result = await sjs.createTransaction(txOpts, CONFIGURATION.SYSADDRESS, outputsArr, feeRate, CONFIGURATION.SYSADDRESS)
  if (!result || !result.psbt) {
    console.log('sendSys createTransaction failed')
    return null
  }
  const psbt = await sjs.signAndSendWithWIF(result.psbt, CONFIGURATION.SYSKEY, result.assets)
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
exports.sendNEVM = async function (address, amount) {
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
exports.sysChainlocked = async function (srctxid) {
  const res = await this.getProofs(srctxid)
  if (!res || res.error || !res.chainlock) {
    console.log('sysChainlocked this.getProofs failed')
    return false
  }
  return true
}
// 1) fetch nevm tx
// 2) get block number - lookup utxo chain block number corrosponding
// 3) fetch utxo block via spvproof rpc
// 4) check chainlocked
// 5) check nevm blockhash matches
exports.NEVMChainlocked = async function (srctxid) {
  const srctx = await web3.eth.getTransaction(srctxid)
  if (!srctx) {
    console.log('NEVMChainlocked web3.eth.getTransaction failed')
    return false
  }
  const utxoChainHeight = (srctx.blockNumber + CONFIGURATION.NEVMBlockHeight) - 1
  const block = await sjs.utils.fetchBackendBlock(CONFIGURATION.BlockbookAPIURL, utxoChainHeight)
  if (!block || !block.txs || !block.length) {
    console.log('NEVMChainlocked fetchBackendBlock failed')
    return false
  }
  const coinbaseTxid = block.tx[0].txid
  const res = await this.getProofs(coinbaseTxid)
  if (!res || res.error || !res.chainlock) {
    console.log('NEVMChainlocked this.getProofs failed')
    return false
  }
  if (res.nevm_blockhash !== srctx.blockHash) {
    console.log('NEVMChainlocked blockhash mismatch')
    return false
  }
  return true
}
