// timerController.js
// Handle index actions
import web3 from './web3.js'
import wipController from './wipController.js'
import WIP from './wipModel.js'
import completeController from './completeController.js'
import balanceController from './balanceController.js'
import balanceWIPController from './balanceWIPController.js'
import BalanceWIP from './balanceWIPModel.js'
import txController from './txController.js'
import Balance from './balanceModel.js'
class TimerController {
}
// run every 10 seconds
let counter = 0
TimerController.prototype.loop = async function (obj) {
  counter++
  if ((counter % 6) === 0) {
    counter = 0
    await obj.balanceAdjust()
    await obj.balanceWIPStatus()
  } else {
    await obj.status()
  }
  setTimeout(obj.loop, 10000, obj)
}
function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
TimerController.prototype.status = async function () {
  const wipEntry = await WIP.find({}).exec()
  if (wipEntry && wipEntry.length) {
    let updateBalance = false
    for (const wipObj of wipEntry) {
      // initial state, if utxo send to nevm sys, if nevm send to utxo sys
      if (wipObj.status === 1) {
        // check for confirmation/chainlock
        if (wipObj.type === 'nevm') {
          // send SYS to user on utxo chain
          wipObj.dsttxid = await txController.sendSys(wipObj.dstaddress, wipObj.amount)
          if (!wipObj.dsttxid) {
            console.log('status == 1 sendSys failed')
            wipEntry.failed_count++
            const updateRes = await wipController.update(wipObj)
            if (!updateRes) {
              console.log('status == 1 wipController could not be updated')
              continue
            }
            continue
          }
          wipObj.status = 2
        } else if (wipObj.type === 'utxo') {
          // send SYS to user on nevm chain
          wipObj.dsttxid = await txController.sendNEVM(wipObj.dstaddress, wipObj.amount)
          if (!wipObj.dsttxid) {
            console.log('status == 1 sendNEVM failed')
            wipEntry.failed_count++
            const updateRes = await wipController.update(wipObj)
            if (!updateRes) {
              console.log('status == 1 wipController could not be updated')
              continue
            }
            continue
          }
          wipObj.status = 2
        }
        const updateRes = await wipController.update(wipObj)
        if (!updateRes) {
          console.log('status == 1 wipController could not be updated')
          continue
        }
        updateBalance = true
      } else if (wipObj.status === 2) {
        if (wipObj.type === 'nevm') {
          const lockedRes = await txController.sysChainlocked(wipObj.dsttxid, txController)
          if (!lockedRes) {
            console.log('status == 2 sys not chainlocked')
            continue
          }
        } else if (wipObj.type === 'utxo') {
          const lockedRes = await txController.NEVMChainlocked(wipObj.dsttxid, txController)
          if (!lockedRes) {
            console.log('status == 2 nevm not chainlocked')
            continue
          }
        }
        const newRes = await completeController.new(wipObj)
        if (!newRes) {
          console.log('status == 2 completeController could not add wipEntry')
          continue
        }
        const deleteRes = await wipController.delete(wipObj.srctxid)
        if (!deleteRes) {
          console.log('status == 2 wipController could not delete wipEntry')
          continue
        }
        updateBalance = true
      }
      await sleep(5000)
    }
    if (updateBalance) {
      await txController.FetchAndUpdateBalances(balanceController)
    }
  }
}
TimerController.prototype.balanceWIPStatus = async function () {
  console.log('balanceWIPStatus loop')
  const wipEntry = await BalanceWIP.find({}).exec()
  if (wipEntry && wipEntry.length) {
    let updateBalance = false
    for (const wipObj of wipEntry) {
      // initial state, if utxo send to sysx, if nevm send to sys
      if (wipObj.status === 1) {
        if (wipObj.type === 'nevm') {
          const lockedRes = await txController.NEVMChainlocked(wipObj.srctxid, txController)
          if (!lockedRes) {
            console.log('status == 1 NEVMChainlocked failed')
            continue
          }
          // mint SYSX on utxo chain
          wipObj.inttxid = await txController.mintSYSX(wipObj.srctxid)
          if (!wipObj.inttxid) {
            console.log('status == 1 mintSYSX failed')
            continue
          }
          wipObj.status = 2
        } else if (wipObj.type === 'utxo') {
          const lockedRes = await txController.sysChainlocked(wipObj.srctxid, txController)
          if (!lockedRes) {
            console.log('status == 1 sysChainlocked failed')
            continue
          }
          // send SYSX to nevm chain
          wipObj.inttxid = await txController.burnSYSXToNEVM(wipObj.amount)
          if (!wipObj.inttxid) {
            console.log('status == 1 burnSYSXToNEVM failed')
            continue
          }
          wipObj.status = 2
        } else {
          console.log('status == 1 invalid type')
          continue
        }
        const updateRes = await balanceWIPController.update(wipObj)
        if (!updateRes) {
          console.log('status == 1 balanceWIPController.update failed')
          continue
        }
        updateBalance = true
      } else if (wipObj.status === 2) {
        wipObj.status = 3
        if (wipObj.type === 'nevm') {
          const lockedRes = await txController.sysChainlocked(wipObj.inttxid, txController)
          if (!lockedRes) {
            console.log('status == 2 sysChainlocked.update failed')
            continue
          }
          // burn SYSX to SYS
          wipObj.dsttxid = await txController.sysxToSys(wipObj.amount)
          if (!wipObj.dsttxid) {
            console.log('status == 2 sysxToSys failed')
            continue
          }
        } else if (wipObj.type === 'utxo') {
          const lockedRes = await txController.sysChainlocked(wipObj.inttxid, txController)
          if (!lockedRes) {
            console.log('status == 2 sysChainlocked.update failed')
            continue
          }
          // mint NEVM SYS
          wipObj.dsttxid = await txController.mintNEVM(wipObj.inttxid, txController)
          if (!wipObj.dsttxid) {
            console.log('status == 2 mintNEVM failed')
            continue
          }
        } else {
          console.log('status == 2 invalid type')
          continue
        }
        const updateRes = await balanceWIPController.update(wipObj)
        if (!updateRes) {
          console.log('status == 2 balanceWIPController.update failed')
          continue
        }
      } else if (wipObj.status === 3) {
        // check for confirmations
        if (wipObj.type === 'nevm') {
          const lockedRes = await txController.sysChainlocked(wipObj.dsttxid, txController)
          if (!lockedRes) {
            console.log('status == 3 sysChainlocked failed')
            continue
          }
        } else if (wipObj.type === 'utxo') {
          const lockedRes = await txController.NEVMChainlocked(wipObj.dsttxid, txController)
          if (!lockedRes) {
            console.log('status == 3 NEVMChainlocked failed')
            continue
          }
        } else {
          console.log('status == 3 invalid type')
          continue
        }

        const deleteRes = await balanceWIPController.delete(wipObj.srctxid)
        if (!deleteRes) {
          console.log('status == 3 balanceWIPController.delete failed')
          continue
        }
        updateBalance = true
      }
    }
    if (updateBalance) {
      await txController.FetchAndUpdateBalances(balanceController)
    }
  }
}
// Handle create wip actions
TimerController.prototype.balanceAdjust = async function () {
  console.log('balanceAdjust loop')
  // check if balanceWIP is in progress if so skip for now...
  const count = await BalanceWIP.estimatedDocumentCount({})
  if (count > 0) {
    return
  }
  let balanceEntry
  try {
    balanceEntry = await Balance.findOne({}).exec()
  } catch (e) {
    console.log('balanceEntry not found')
    return
  }
  if (!balanceEntry) {
    await txController.FetchAndUpdateBalances(balanceController)
    console.log('balanceEntry empty')
    return
  }
  const bnSYS = web3.utils.toBN(balanceEntry.sysbalance)
  const bnNEVM = web3.utils.toBN(balanceEntry.nevmbalance)
  // when one side is ~33% more than the other then adjust
  const sum = bnSYS.add(bnNEVM)
  const half = sum.div(web3.utils.toBN(2))
  const target = sum.div(web3.utils.toBN(3))
  if (bnSYS.gt(bnNEVM) && bnSYS.sub(bnNEVM).gt(target)) {
    const bnBurnAmount = bnSYS.sub(half).toString()
    console.log('try sysToSysx bnBurnAmount ' + bnBurnAmount.toString())
    // go from SYS -> SYSX -> NEVM
    const balanceWIP = new BalanceWIP()
    balanceWIP.failed_count = 0
    balanceWIP.srctxid = await txController.sysToSysx(bnBurnAmount.toString())
    if (balanceWIP.srctxid) {
      balanceWIP.status = 1
      balanceWIP.type = 'utxo'
      balanceWIP.amount = bnBurnAmount.toString()
      console.log('balanceWIPController.update sysToSysx: ' + balanceWIP.amount)
      await balanceWIPController.save(balanceWIP)
    } else {
      console.log('sysToSysx failed')
    }
  } else if (bnNEVM.gt(bnSYS) && bnNEVM.sub(bnSYS).gt(target)) {
    const bnBurnAmount = bnNEVM.sub(half).toString()
    console.log('try burnNEVMToSYSX bnBurnAmount ' + bnBurnAmount.toString())
    // go from NEVM -> SYSX -> SYS
    const balanceWIP = new BalanceWIP()
    balanceWIP.failed_count = 0
    balanceWIP.srctxid = await txController.burnNEVMToSYSX(bnBurnAmount.toString())
    if (balanceWIP.srctxid) {
      balanceWIP.status = 1
      balanceWIP.type = 'nevm'
      balanceWIP.amount = bnBurnAmount.toString()
      console.log('balanceWIPController.update burnNEVMToSYSX: ' + balanceWIP.amount)
      await balanceWIPController.save(balanceWIP)
    } else {
      console.log('burnNEVMToSYSX failed')
    }
  }
}
export default new TimerController()
