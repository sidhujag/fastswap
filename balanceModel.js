// balanceModel.js
import mongoose from 'mongoose'
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
const Balance = mongoose.model('balance', balanceSchema)
export default Balance
