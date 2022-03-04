// wipController.js
import web3 from './web3.js'
import sjs from 'syscoinjs-lib'
import CONFIGURATION from './config.js'
// Import wip model
import WIP from './wipModel.js'
// Import complete model
import Complete from './completeModel.js'
import Balance from './balanceModel.js'
const COINSYS = web3.utils.toBN('100000000')
const COINNEVM = web3.utils.toBN(web3.utils.toWei('1'))
class WIPController {
}
// Handle index actions
WIPController.prototype.index = async function (req, res) {
  try {
    const wipEntry = await WIP.find({}).limit(100).exec()
    res.json({
      status: 'success',
      data: wipEntry
    })
    return
  } catch (e) {
    res.json({
      status: 'error',
      message: e
    })
  }
}
// Handle create wip actions
WIPController.prototype.new = async function (req, res) {
  const wip = new WIP()
  if (!req.body.txid) {
    res.json({
      status: 'error',
      data: 'txid not defined'
    })
    return
  }
  wip.srctxid = req.body.txid
  let balanceEntry
  let amountBN
  try {
    balanceEntry = await Balance.findOne({}).exec()
  } catch (e) {
    res.json({
      status: 'error',
      data: e.message
    })
    return
  }
  if (!balanceEntry) {
    res.json({
      status: 'error',
      data: 'No balance found in treasury'
    })
    return
  }
  /* Tx must send coins to specific address and nowhere else.. basic transfer enforced.
        - ensure srctxid doesn't exist in WIP or Complete DB
        - must be basic transfer sys or nevm transfer.
        - destination should be server address defined depending on type
        - Amount is found in tx, dstaddress found in call data or opreturn must be valid of opposite type
        - amount must be less than max amount based on type and more than min amount(config)
        Accept sys or nevm sys */

  let result
  try {
    result = await WIP.findOne({ $or: [{ srctxid: wip.srctxid }, { dsttxid: wip.srctxid }] }).exec()
  } catch (e) {
    res.json({
      status: 'error',
      data: e.message
    })
    return
  }
  if (result) {
    res.json({
      status: 'success',
      data: result
    })
    return
  }

  try {
    result = await Complete.findOne({ $or: [{ srctxid: wip.srctxid }, { dsttxid: wip.srctxid }] }).exec()
  } catch (e) {
    res.json({
      status: 'error',
      data: e.message
    })
    return
  }

  if (result) {
    res.json({
      status: 'success',
      data: result
    })
    return
  }
  let amount = '0'
  let srctx
  try {
    srctx = await web3.eth.getTransaction(wip.srctxid)
  } catch (e) {
    srctx = null
  }
  if (srctx) {
    wip.type = 'nevm'
  }
  if (!srctx) {
    try {
      srctx = await sjs.utils.fetchBackendRawTx(CONFIGURATION.BlockbookAPIURL, wip.srctxid)
    } catch (e) {
      res.json({
        status: 'error',
        data: e.message
      })
      return
    }
    if (!srctx) {
      res.json({
        status: 'error',
        data: 'Invalid Syscoin transaction'
      })
      return
    }
    wip.type = 'utxo'
  }
  // if nevm then destination is utxo
  if (wip.type === 'nevm') {
    if (!srctx.input) {
      res.json({
        status: 'error',
        data: 'No destination address defined in transaction input data'
      })
      return
    }
    wip.dstaddress = web3.utils.hexToAscii(srctx.input)
    try {
      sjs.utils.bitcoinjs.address.toOutputScript(wip.dstaddress, CONFIGURATION.SysNetwork)
    } catch (e) {
      res.json({
        status: 'error',
        data: 'Invalid SYS recipient'
      })
      return
    }
    if (srctx.to !== CONFIGURATION.NEVMADDRESS) {
      res.json({
        status: 'error',
        data: 'NEVM payment not found'
      })
      return
    }
    if (srctx.from === CONFIGURATION.NEVMADDRESS) {
      res.json({
        status: 'error',
        data: 'NEVM from address cannot be from fast swap service'
      })
      return
    }
    amountBN = web3.utils.toBN(srctx.value)
    if (amountBN.lt(COINNEVM)) {
      res.json({
        status: 'error',
        data: 'Less than minimum accepted value'
      })
      return
    }
    if (amountBN.gt(web3.utils.toBN(balanceEntry.sysbalance))) {
      res.json({
        status: 'error',
        data: 'Insufficient SYS balance'
      })
      return
    }
    // if utxo then destination is nevm
  } else if (wip.type === 'utxo') {
    if (!srctx.hex) {
      res.json({
        status: 'error',
        data: 'Could not decode transaction from hex'
      })
      return
    }
    const tx = sjs.utils.bitcoinjs.Transaction.fromHex(srctx.hex)
    if (!tx) {
      res.json({
        status: 'error',
        data: 'Could not parse transaction from hex'
      })
      return
    }
    const memo = sjs.utils.getMemoFromOpReturn(tx.outs, CONFIGURATION.MEMOHEADER)
    if (!memo) {
      res.json({
        status: 'error',
        data: 'No destination address defined in transaction OPRETURN data'
      })
      return
    }
    wip.dstaddress = memo
    if (!web3.utils.isAddress(wip.dstaddress)) {
      res.json({
        status: 'error',
        data: 'Invalid NEVM recipient'
      })
      return
    }
    let foundPayment = false
    for (const vout of srctx.vout) {
      if (vout && vout.addresses) {
        for (const address of vout.addresses) {
          if (address === CONFIGURATION.SYSADDRESS) {
            foundPayment = true
            amount = vout.value
            break
          }
        }
      } else {
        res.json({
          status: 'error',
          data: 'Syscoin output addresses not found'
        })
        return
      }
    }
    for (const vin of srctx.vin) {
      if (vin && vin.addresses) {
        for (const address of vin.addresses) {
          if (address === CONFIGURATION.SYSADDRESS) {
            res.json({
              status: 'error',
              data: 'Syscoin input cannot come from fast swap service address'
            })
            return
          }
        }
      } else {
        res.json({
          status: 'error',
          data: 'Syscoin input addresses not found'
        })
        return
      }
    }
    if (!foundPayment) {
      res.json({
        status: 'error',
        data: 'Syscoin payment not found'
      })
      return
    }
    amountBN = web3.utils.toBN(amount)
    if (amountBN.lt(COINSYS)) {
      res.json({
        status: 'error',
        data: 'Less than minimum accepted value'
      })
      return
    }
    const amountMultiplierBN = web3.utils.toBN(Math.pow(10, 10))
    const nevmBalanceBN = web3.utils.toBN(balanceEntry.nevmbalance)
    amountBN = amountBN.mul(amountMultiplierBN)
    if (amountBN.gt(nevmBalanceBN)) {
      res.json({
        status: 'error',
        data: 'Insufficient NEVM balance'
      })
      return
    }
  }
  wip.status = 1
  wip.amount = amountBN.toString()
  // save the contact and check for errors
  try {
    result = await wip.save()
  } catch (e) {
    res.json({
      status: 'error',
      data: e.message
    })
    return
  }
  // Check for validation error
  if (result !== wip) {
    res.json({
      status: 'error',
      data: 'Could not save WIP'
    })
  } else {
    res.json({
      status: 'success',
      data: wip
    })
  }
}
// Handle view wip info
WIPController.prototype.view = async function (req, res) {
  try {
    const wipEntry = await WIP.findOne({ $or: [{ srctxid: req.params.txid }, { dsttxid: req.params.txid }] }).exec()
    if (wipEntry) {
      res.json({
        status: 'success',
        data: wipEntry
      })
      return
    }
  } catch (e) {
    res.json({
      status: 'error',
      data: e.message
    })
    return
  }
  try {
    const completeEntry = await Complete.findOne({ $or: [{ srctxid: req.params.txid }, { dsttxid: req.params.txid }] }).exec()
    if (completeEntry) {
      res.json({
        status: 'success',
        data: completeEntry
      })
      return
    }
  } catch (e) {
    res.json({
      status: 'error',
      data: e.message
    })
  }
}
WIPController.prototype.update = async function (wipEntry) {
  try {
    const wipObj = await wipEntry.save()
    if (wipObj !== wipEntry) {
      console.log('WIPController not saved')
      return false
    }
  } catch (error) {
    console.log('WIPController update failed: ' + error.message)
    return false
  }
  return true
}
WIPController.prototype.save = async function (wipEntryIn) {
  let wipEntry
  try {
    wipEntry = await WIP.findOne({ srctxid: wipEntryIn.srctxid }).exec()
  } catch (e) {
    console.log('wipEntry not found: ' + e.message)
    return false
  }
  if (wipEntry) {
    wipEntry.srctxid = wipEntryIn.srctxid
    wipEntry.type = wipEntryIn.type
    wipEntry.dsttxid = wipEntryIn.dsttxid
    wipEntry.amount = wipEntryIn.amount
    wipEntry.dstaddress = wipEntryIn.dstaddress
    wipEntry.status = wipEntryIn.status
    return await this.update(wipEntry)
  } else {
    return await this.update(wipEntryIn)
  }
}
// Handle delete wip
WIPController.prototype.delete = async function (srctxid) {
  let wipEntry
  try {
    wipEntry = await WIP.findOne({ srctxid: srctxid }).exec()
  } catch (e) {
    console.log('wipEntry not found: ' + e.message)
    return false
  }
  // if doesn't exist don't try to delete it
  if (!wipEntry) {
    return true
  }
  try {
    await new Promise((resolve, reject) => {
      WIP.deleteOne({
        srctxid: srctxid
      }, function (err) {
        if (err) { reject(err) }
        resolve()
      })
    })
  } catch (error) {
    console.log('WIPController delete failed: ' + error.message)
    return false
  }
  return true
}
WIPController.prototype.settings = async function (req, res) {
  const dataObj = {}
  dataObj.MEMO = CONFIGURATION.MEMOHEADER
  dataObj.SYSADDRESS = CONFIGURATION.SYSADDRESS
  dataObj.NEVMADDRESS = CONFIGURATION.NEVMADDRESS
  res.json({
    status: 'success',
    data: dataObj
  })
}
export default new WIPController()
