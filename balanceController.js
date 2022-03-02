// balanceController.js
import web3 from './web3.js'
import sjs from 'syscoinjs-lib'
import CONFIGURATION from './config.js'
// Import balance model
import Balance from './balanceModel.js'
const COINNEVM = web3.utils.toBN(web3.utils.toWei('1'))
class BalanceController {
}
// Handle index actions
BalanceController.prototype.index = function (req, res) {
  Balance.findOne(function (err, balanceEntry) {
    if (err) {
      res.json({
        status: 'error',
        message: err
      })
    } else {
      res.json({
        status: 'success',
        message: 'Balance retrieved successfully',
        data: balanceEntry
      })
    }
  })
}
BalanceController.prototype.update = async function (balanceEntry) {
  try {
    const balance = await balanceEntry.save()
    if (balance !== balanceEntry) {
      console.log('BalanceController not saved')
      return false
    }
  } catch (error) {
    console.log('BalanceController update failed: ' + error.message)
    return false
  }
  return true
}
BalanceController.prototype.FetchAndUpdateBalances = async function (obj) {
  const sysAccount = await sjs.utils.fetchBackendAccount(CONFIGURATION.BlockbookAPIURL, CONFIGURATION.SYSADDRESS, '?details=basic')
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
  const updateRes = await obj.update(balanceEntry)
  if (!updateRes) {
    console.log('update failed')
    return null
  }
  return balanceEntry
}

export default new BalanceController()
