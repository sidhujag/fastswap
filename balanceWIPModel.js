// balanceWIPModel.js
const mongoose = require('mongoose')
// Setup schema
const balanceWIPSchema = mongoose.Schema({
  srctxid: {
    type: String,
    required: true,
    unique: true
  },
  inttxid: String,
  dsttxid: String,
  amount: {
    type: String,
    required: true
  },
  type: {
    type: Number,
    required: true
  },
  status: {
    type: Number,
    required: true
  },
  create_date: {
    type: Date,
    default: Date.now
  }
})
// Export BalanceWIP model
const BalanceWIP = module.exports = mongoose.model('balancewip', balanceWIPSchema)
module.exports.get = function (callback, limit) {
  BalanceWIP.find(callback).limit(limit)
}
