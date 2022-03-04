// balanceController.js
// Import balance model
import Balance from './balanceModel.js'
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
BalanceController.prototype.save = async function (balanceEntryIn) {
  let balanceEntry
  try {
    balanceEntry = await Balance.findOne({ srctxid: balanceEntryIn.srctxid }).exec()
  } catch (e) {
    console.log('balanceEntry not found: ' + e.message)
    return false
  }
  if (balanceEntry) {
    balanceEntry.sysbalance = balanceEntryIn.sysbalance
    balanceEntry.nevmbalance = balanceEntryIn.nevmbalance
    return await this.update(balanceEntry)
  } else {
    return await this.update(balanceEntryIn)
  }
}

export default new BalanceController()
