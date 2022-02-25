// timerController.js
// Handle index actions
import web3 from './web3'
let counter = 0
const wipController = require('./wipController')
const WIP = require('./wipModel')
const completeController = require('./completeController')
const balanceController = require('./balanceController')
const balanceWIPController = require('./balanceWIPController')
const BalanceWIP = require('./balanceWIPModel')
const txController = require('./txController')
// run every 10 seconds
exports.loop = async function (obj) {
  counter++
  if ((counter % 6) === 0) {
    counter = 0
    await this.balanceAdjust()
    await this.balanceWIPStatus()
  } else {
    await this.status()
  }
  setTimeout(obj.loop, 10000)
}
exports.status = async function () {
  WIP.get(async function (err, wipEntry) {
    if (!err && wipEntry && wipEntry.length) {
      let updateBalance = false
      for (const wipObj of wipEntry) {
        // initial state, if utxo send to nevm sys, if nevm send to utxo sys
        if (wipObj.status === 1) {
          wipObj.status = 2
          // check for confirmation/chainlock
          if (wipObj.type === 'nevm') {
            const lockedRes = await txController.NEVMChainlocked(wipObj.srctxid)
            if (!lockedRes) {
              return
            }
            // send SYS to user on utxo chain
            wipObj.dsttxid = await txController.sendSys(wipObj.dstaddress, wipObj.amount)
          } else if (wipObj.type === 'utxo') {
            const lockedRes = await txController.sysChainlocked(wipObj.srctxid)
            if (!lockedRes) {
              return
            }
            // send SYS to user on nevm chain
            wipObj.dsttxid = await txController.sendNEVM(wipObj.dstaddress, wipObj.amount)
          }
          const updateRes = await wipController.update(wipObj)
          if (!updateRes) {
            return
          }
          updateBalance = true
        } else if (wipObj.status === 2) {
          if (wipObj.type === 'nevm') {
            const lockedRes = await txController.sysChainlocked(wipObj.dsttxid)
            if (!lockedRes) {
              return
            }
          } else if (wipObj.type === 'utxo') {
            const lockedRes = await txController.NEVMChainlocked(wipObj.dsttxid)
            if (!lockedRes) {
              return
            }
          }
          const newRes = await completeController.new(wipEntry)
          if (!newRes) {
            return
          }
          const deleteRes = await wipController.delete(wipEntry.srctxid)
          if (!deleteRes) {
            return
          }
        }
      }
      if (updateBalance) {
        await balanceController.FetchAndUpdateBalances()
      }
    }
  }, 10)
}
exports.balanceWIPStatus = async function () {
  BalanceWIP.get(async function (err, wipEntry) {
    if (!err && wipEntry && wipEntry.length) {
      let updateBalance = false
      for (const wipObj of wipEntry) {
        // initial state, if utxo send to sysx, if nevm send to sys
        if (wipObj.status === 1) {
          wipObj.status = 2
          if (wipObj.type === 'nevm') {
            const lockedRes = await txController.NEVMChainlocked(wipObj.srctxid)
            if (!lockedRes) {
              return
            }
            // mint SYSX on utxo chain
            wipObj.inttxid = await txController.mintSYSX(wipObj.srctxid)
            if (wipObj.inttxid) {
              const updateRes = await balanceWIPController.update(wipObj)
              if (!updateRes) {
                return
              }
            }
          } else if (wipObj.type === 'utxo') {
            const lockedRes = await txController.sysChainlocked(wipObj.srctxid)
            if (!lockedRes) {
              return
            }
            // send SYSX to nevm chain
            wipObj.inttxid = await txController.burnSYSXToNEVM(wipObj.amount)
          }
          const updateRes = await balanceWIPController.update(wipObj)
          if (!updateRes) {
            return
          }
          updateBalance = true
        } else if (wipObj.status === 2) {
          wipObj.status = 3
          if (wipObj.type === 'nevm') {
            const lockedRes = await txController.sysChainlocked(wipObj.inttxid)
            if (!lockedRes) {
              return
            }
            // burn SYSX to SYS
            wipObj.dsttxid = await txController.sysxToSys(wipObj.amount)
            if (wipObj.dsttxid) {
              const updateRes = await balanceWIPController.update(wipObj)
              if (!updateRes) {
                return
              }
            }
          } else if (wipObj.type === 'utxo') {
            const lockedRes = await txController.sysChainlocked(wipObj.inttxid)
            if (!lockedRes) {
              return
            }
            // mint NEVM SYS
            wipObj.dsttxid = await txController.mintNEVM(wipObj.inttxid)
            if (wipObj.dsttxid) {
              const updateRes = await balanceWIPController.update(wipObj)
              if (!updateRes) {
                return
              }
            }
          }
        } else if (wipObj.status === 3) {
          // check for confirmations
          if (wipObj.type === 'nevm') {
            const lockedRes = await txController.sysChainlocked(wipObj.dsttxid)
            if (!lockedRes) {
              return
            }
          } else if (wipObj.type === 'utxo') {
            const lockedRes = await txController.NEVMChainlocked(wipObj.dsttxid)
            if (!lockedRes) {
              return
            }
          }
          const deleteRes = await balanceWIPController.delete(wipObj.srctxid)
          if (!deleteRes) {
            return
          }
          updateBalance = true
        }
      }
      if (updateBalance) {
        await balanceController.FetchAndUpdateBalances()
      }
    }
  }, 10)
}
// Handle create wip actions
exports.balanceAdjust = async function () {
  // check if balanceWIP is in progress if so skip for now...
  const count = await BalanceWIP.estimatedDocumentCount()
  if (count > 0) {
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
  const bnSYS = web3.utils.BN(balanceEntry.sysbalance)
  const bnNEVM = web3.utils.BN(balanceEntry.nevmbalance)
  const target = bnSYS.add(bnNEVM).div(web3.utils.BN(2))
  if (bnSYS.gt(target)) {
    const bnBurnAmount = web3.utils.fromWei(bnSYS.sub(target), 'ether')
    // go from SYS -> SYSX -> NEVM
    const balanceWIP = new BalanceWIP()
    balanceWIP.srctxid = await txController.sysToSysx(bnBurnAmount.toString())
    balanceWIP.status = 1
    balanceWIP.type = 'utxo'
    balanceWIP.amount = bnBurnAmount.toString()
    await balanceWIPController.update(balanceWIP)
  } else if (bnNEVM.gt(target)) {
    const bnBurnAmount = web3.utils.fromWei(bnNEVM.sub(target), 'ether')
    // go from NEVM -> SYSX -> SYS
    const balanceWIP = new BalanceWIP()
    balanceWIP.srctxid = await txController.burnNEVMToSYSX(bnBurnAmount.toString())
    balanceWIP.status = 1
    balanceWIP.type = 'nevm'
    balanceWIP.amount = bnBurnAmount.toString()
    await balanceWIPController.update(balanceWIP)
  }
}
