// balanceWIPController.js

// Import balance model
const BalanceWIP = require('./balanceWIPModel')
// Handle index actions
exports.index = function (req, res) {
  BalanceWIP.get(function (err, balanceEntry) {
    if (err) {
      res.json({
        status: 'error',
        message: err
      })
    }
    res.json({
      status: 'success',
      message: 'Balance WIP retrieved successfully',
      data: balanceEntry
    })
  })
}
exports.update = async function (balanceWIPEntry) {
  try {
    await new Promise((resolve, reject) => {
      balanceWIPEntry.save(function (err) {
        if (err) { reject(err) }
        resolve()
      })
    })
  } catch (error) {
    return false
  }
  return true
}
// Handle view wip info
exports.view = function (req, res) {
  BalanceWIP.find({ srctxid: req.params.srctxid }, function (err, wipEntry) {
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
exports.delete = async function (srctxid) {
  try {
    await new Promise((resolve, reject) => {
      BalanceWIP.remove({
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
