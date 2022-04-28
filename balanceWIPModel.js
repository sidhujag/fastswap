// balanceWIPModel.js
import mongoose from 'mongoose'
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
    type: String,
    required: true
  },
  failed_count: {
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
const BalanceWIP = mongoose.model('balancewip', balanceWIPSchema)
export default BalanceWIP
