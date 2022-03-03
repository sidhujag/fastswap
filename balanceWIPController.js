// balanceWIPController.js

// Import balance model
import BalanceWIP from './balanceWIPModel.js'
class BalanceWIPController {
}
// Handle index actions
BalanceWIPController.prototype.index = async function (req, res) {
  try {
    const balanceEntry = await BalanceWIP.find({}).limit(100).exec()
    res.json({
      status: 'success',
      message: 'Balance WIP retrieved successfully',
      data: balanceEntry
    })
  } catch (e) {
    res.json({
      status: 'error',
      message: e
    })
  }
}
BalanceWIPController.prototype.update = async function (balanceWIPEntry) {
  try {
    const balance = await balanceWIPEntry.save()
    if (balanceWIPEntry !== balance) {
      console.log('BalanceWIPController not saved')
      return false
    }
  } catch (error) {
    console.log('BalanceWIPController update failed: ' + error.message)
    return false
  }
  return true
}
BalanceWIPController.prototype.save = async function (balanceWIPEntry) {
  let balanceEntry
  try {
    balanceEntry = await BalanceWIP.findOne({ srctxid: balanceWIPEntry.srctxid }).exec()
  } catch (e) {
    console.log('balanceEntry not found: ' + e.message)
    return false
  }
  if (balanceEntry) {
    balanceEntry.srctxid = balanceWIPEntry.srctxid
    balanceEntry.inttxid = balanceWIPEntry.inttxid
    balanceEntry.dsttxid = balanceWIPEntry.dsttxid
    balanceEntry.amount = balanceWIPEntry.amount
    balanceEntry.type = balanceWIPEntry.type
    balanceEntry.status = balanceWIPEntry.status
    return await this.update(balanceEntry)
  } else {
    return await this.update(balanceWIPEntry)
  }
}
// Handle view wip info
BalanceWIPController.prototype.view = function (req, res) {
  BalanceWIP.findOne({ srctxid: req.params.srctxid }, function (err, wipEntry) {
    if (err) {
      res.send(err)
    } else {
      res.json({
        status: 'success',
        data: wipEntry
      })
    }
  })
}
BalanceWIPController.prototype.delete = async function (srctxid) {
  let balanceEntry
  try {
    balanceEntry = await BalanceWIP.findOne({ srctxid: srctxid }).exec()
  } catch (e) {
    console.log('balanceEntry not found: ' + e.message)
    return false
  }
  // if doesn't exist don't try to delete it
  if (!balanceEntry) {
    return true
  }
  try {
    await new Promise((resolve, reject) => {
      BalanceWIP.deleteOne({
        srctxid: srctxid
      }, function (err) {
        if (err) { reject(err) }
        resolve()
      })
    })
  } catch (error) {
    console.log('BalanceWIPController delete failed: ' + error.message)
    return false
  }
  return true
}
export default new BalanceWIPController()
