// balanceController.js
import web3 from './web3'
import sjs from './syscoinjs'
import CONFIGURATION from './config'
// Import balance model
const Balance = require('./balanceModel')
// Handle index actions
exports.index = function (req, res) {
  Balance.get(function (err, balanceEntry) {
    if (err) {
      res.json({
        status: 'error',
        message: err
      })
    }
    res.json({
      status: 'success',
      message: 'Balance retrieved successfully',
      data: balanceEntry
    })
  })
}
exports.update = async function (balanceEntry) {
  try {
    await new Promise((resolve, reject) => {
      balanceEntry.save(function (err) {
        if (err) { reject(err) }
        resolve()
      })
    })
  } catch (error) {
    console.log('BalanceController update failed: ' + error.message)
    return false
  }
  return true
}
exports.FetchAndUpdateBalances = async function () {
  const sysAccount = await sjs.utils.fetchBackendAccount(CONFIGURATION.BlockbookAPIURL, CONFIGURATION.SYSADDRESS, '?details=basic')
  const balanceEntry = new Balance()
  balanceEntry.sysbalance = web3.utils.BN(sysAccount.balance).mul(web3.utils.BN(Math.pow(10, 10))).toString()
  balanceEntry.nevmbalance = await web3.eth.getBalance(CONFIGURATION.NEVMADDRESS)
  // cover for 1 SYS gas
  balanceEntry.sysbalance = web3.utils.BN(balanceEntry.sysbalance).sub(CONFIGURATION.COINNEVM)
  balanceEntry.nevmbalance = web3.utils.BN(balanceEntry.nevmbalance).sub(CONFIGURATION.COINNEVM)
  const zeroBN = web3.utils.BN(0)
  if (balanceEntry.sysbalance.lt(zeroBN)) {
    balanceEntry.sysbalance = zeroBN
  }
  if (balanceEntry.nevmbalance.lt(zeroBN)) {
    balanceEntry.nevmbalance = zeroBN
  }
  balanceEntry.sysbalance = balanceEntry.sysbalance.toString()
  balanceEntry.nevmbalance = balanceEntry.nevmbalance.toString()
  console.log('FetchAndUpdateBalances sysbalance: ' + balanceEntry.sysbalance + ' nevmbalance: ' + balanceEntry.nevmbalance)
  const updateRes = await this.update(balanceEntry)
  if (!updateRes) {
    console.log('update failed')
    return null
  }
  return balanceEntry
}
