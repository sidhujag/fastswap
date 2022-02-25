// completeModel.js
const mongoose = require('mongoose')
// Setup schema
const completeSchema = mongoose.Schema({
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
    required: true,
    unique: true
  },
  create_date: {
    type: Date,
    default: Date.now
  }
})
// Export Complete model
const Complete = module.exports = mongoose.model('complete', completeSchema)
module.exports.get = function (callback, limit) {
  Complete.find(callback).limit(limit)
}
