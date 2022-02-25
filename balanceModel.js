// balanceModel.js
const mongoose = require('mongoose')
// Setup schema
const balanceSchema = mongoose.Schema({
  sysbalance: {
    type: String,
    required: true
  },
  nevmbalance: {
    type: String,
    required: true
  }
})
// Export Balance model
const Balance = module.exports = mongoose.model('balance', balanceSchema)
module.exports.get = function (callback, limit) {
  Balance.find(callback).limit(limit)
}
