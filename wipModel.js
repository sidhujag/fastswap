// wipModel.js
const mongoose = require('mongoose')
// Setup schema
const wipSchema = mongoose.Schema({
  srctxid: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  dsttxid: {
    type: String,
    // must be unique, unless it isn't defined
    index: { unique: true, sparse: true }
  },
  amount: {
    type: String,
    required: true
  },
  dstaddress: {
    type: String,
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
// Export WIP model
const WIP = module.exports = mongoose.model('wip', wipSchema)
module.exports.get = function (callback, limit) {
  WIP.find(callback).limit(limit)
}