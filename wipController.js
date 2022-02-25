// wipController.js
import web3 from './web3'
import sjs from './syscoinjs'
import CONFIGURATION from './config'
const bitcoin = require('bitcoinjs-lib')
// Import wip model
const WIP = require('./wipModel')
// Import complete model
const Complete = require('./completeModel')
const balanceController = require('./balanceController')
const COINNEVM = web3.utils.toWei('1')
const COINSYS = web3.utils.BN('100000000')
// Handle index actions
exports.index = function (req, res) {
  WIP.get(function (err, wipEntry) {
    if (err) {
      res.json({
        status: 'error',
        message: err
      })
    }
    res.json({
      status: 'success',
      data: wipEntry
    })
  })
}
// Handle create wip actions
exports.new = async function (req, res) {
  const wip = new WIP()
  wip.srctxid = req.body.txid ? req.body.txid : wip.srctxid
  if (!req.body.type) {
    res.json({
      status: 'error',
      data: "Type not defined as 'utxo' or 'nevm'"
    })
    return
  }
  let balanceEntry
  try {
    balanceEntry = await new Promise((resolve, reject) => {
      balanceController.index(function (err, balanceEntry) {
        if (err) {
          reject(err)
        } else {
          resolve(balanceEntry)
        }
      })
    })
  } catch (error) {
    return
  }

  /* Tx must send coins to specific address and nowhere else.. basic transfer enforced.
        - ensure srctxid doesn't exist in WIP or Complete DB
        - must be basic transfer sys or nevm transfer.
        - destination should be server address defined depending on type
        - Amount is found in tx, dstaddress found in call data or opreturn must be valid of opposite type
        - amount must be less than max amount based on type and more than min amount(config)
        Accept sys or nevm sys */
  try {
    await new Promise((resolve, reject) => {
      WIP.find({ $or: [{ srctxid: wip.srctxid }, { dsttxid: wip.srctxid }] }, async function (err, wipEntry) {
        if (!err) {
          res.json({
            status: 'error',
            data: 'Already exists'
          })
          reject(err)
        } else {
          Complete.find({ $or: [{ srctxid: wip.srctxid }, { dsttxid: wip.srctxid }] }, async function (err, completeEntry) {
            if (!err) {
              res.json({
                status: 'error',
                data: 'Already complete'
              })
              reject(new Error('Already complete'))
            } else {
              let amount = '0'
              // if nevm then destination is utxo
              if (req.body.type === 'nevm') {
                const srctx = await web3.eth.getTransaction(wip.srctxid)
                if (!srctx || !srctx.input) {
                  res.json({
                    status: 'error',
                    data: 'Invalid NEVM transaction'
                  })
                  reject(err)
                }
                try {
                  bitcoin.address.toOutputScript(srctx.input)
                } catch (e) {
                  res.json({
                    status: 'error',
                    data: 'Invalid SYS recipient'
                  })
                  reject(err) // ' has no matching Script'
                }
                if (srctx.to !== CONFIGURATION.NEVMADDRESS) {
                  res.json({
                    status: 'error',
                    data: 'NEVM payment not found'
                  })
                  reject(err)
                }
                if (web3.utils.BN(amount).lt(COINNEVM)) {
                  res.json({
                    status: 'error',
                    data: 'Less than minimum accepted value'
                  })
                  reject(err)
                }
                if (web3.utils.BN(amount).gt(web3.utils.BN(balanceEntry.sysbalance))) {
                  res.json({
                    status: 'error',
                    data: 'Insufficient SYS balance'
                  })
                  reject(err)
                }
                // if utxo then destination is nevm
              } else if (req.body.type === 'utxo') {
                const srctx = await sjs.utils.fetchBackendRawTx(CONFIGURATION.BlockbookAPIURL, wip.srctxid)
                if (!srctx || !srctx.memo) {
                  res.json({
                    status: 'error',
                    data: 'Invalid Syscoin transaction'
                  })
                  reject(err)
                }
                wip.dstaddress = Buffer.from(srctx.memo, 'base64').toString('ascii')
                if (!web3.utils.isAddress(wip.dstaddress)) {
                  res.json({
                    status: 'error',
                    data: 'Invalid NEVM recipient'
                  })
                  reject(err)
                }
                let foundPayment = false
                for (const vout of srctx.vout) {
                  for (const address of vout.addressses) {
                    if (address === CONFIGURATION.SYSADDRESS) {
                      foundPayment = true
                      amount = vout.value
                      break
                    }
                  }
                }
                if (!foundPayment) {
                  res.json({
                    status: 'error',
                    data: 'Syscoin payment not found'
                  })
                  reject(err)
                }
                if (web3.utils.BN(amount).lt(COINSYS)) {
                  res.json({
                    status: 'error',
                    data: 'Less than minimum accepted value'
                  })
                  reject(err)
                }
                if (web3.utils.BN(amount).mul(web3.utils.BN((Math.pow(10, 10)))).gt(web3.utils.BN(balanceEntry.nevmbalance))) {
                  res.json({
                    status: 'error',
                    data: 'Insufficient NEVM balance'
                  })
                  reject(err)
                }
              }
              wip.status = 1
              wip.type = req.body.type
              wip.amount = amount
              // save the contact and check for errors
              wip.save(function (err) {
                // Check for validation error
                if (err) { res.json(err) } else {
                  res.json({
                    status: 'success',
                    data: wip
                  })
                  resolve()
                }
              })
            }
          })
        }
      })
    })
  } catch (error) {
  }
}
// Handle view wip info
exports.view = function (req, res) {
  WIP.find({ $or: [{ srctxid: req.params.txid }, { dsttxid: req.params.txid }] }, function (err, wipEntry) {
    if (err) {
      Complete.find({ $or: [{ srctxid: req.params.txid }, { dsttxid: req.params.txid }] }, function (err, completeEntry) {
        if (err) {
          res.send(err)
        } else {
          res.json({
            status: 'success',
            data: completeEntry
          })
        }
      })
    } else {
      res.json({
        status: 'success',
        data: wipEntry
      })
    }
  })
}
exports.update = async function (wipEntry) {
  try {
    await new Promise((resolve, reject) => {
      wipEntry.save(function (err) {
        if (err) { reject(err) }
        resolve()
      })
    })
  } catch (error) {
    return false
  }
  return true
}
// Handle delete wip
exports.delete = async function (srctxid) {
  try {
    await new Promise((resolve, reject) => {
      WIP.remove({
        srctxid: srctxid
      }, function (err) {
        if (err) { reject(err) }
        resolve()
      })
    })
  } catch (error) {
    return false
  }
  return true
}