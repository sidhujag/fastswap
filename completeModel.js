// completeModel.js
import mongoose from 'mongoose'
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
  amount: {
    type: String,
    required: true
  },
  failed_count: {
    type: Number,
    required: true
  },
  dstaddress: {
    type: String,
    required: true
  },
  create_date: {
    type: Date,
    default: Date.now
  }
})
// Export Complete model
const Complete = mongoose.model('complete', completeSchema)

export default Complete
