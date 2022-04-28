// completeController.js
// Import complete model
import Complete from './completeModel.js'
class CompleteController {
}
// Handle create wip actions
CompleteController.prototype.new = async function (obj) {
  let completeEntry
  try {
    completeEntry = await Complete.findOne({ $or: [{ srctxid: obj.srctxid }, { dsttxid: obj.srctxid }] }).exec()
  } catch (e) {
    console.log('completeEntry not found: ' + e.message)
    return false
  }
  // if exist don't try to add it
  if (completeEntry) {
    return true
  }
  const complete = new Complete()
  complete.srctxid = obj.srctxid
  complete.type = obj.type
  complete.dsttxid = obj.dsttxid
  complete.amount = obj.amount
  complete.dstaddress = obj.dstaddress
  complete.failed_count = obj.failed_count
  try {
    const completeObj = await complete.save()
    if (!completeObj) {
      console.log('CompleteController not saved')
      return false
    }
  } catch (error) {
    console.log('CompleteController new failed: ' + error.message)
    return false
  }
  return true
}
export default new CompleteController()
