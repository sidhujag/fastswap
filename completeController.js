// completeController.js
// Import complete model
const Complete = require('./completeModel')
// Handle create wip actions
exports.new = async function (obj) {
  const complete = new Complete()
  complete.srctxid = obj.srctxid
  complete.type = obj.type
  complete.dsttxid = obj.dsttxid
  try {
    await new Promise((resolve, reject) => {
      // save the contact and check for errors
      complete.save(function (err) {
        // Check for validation error
        if (err) { reject(err) } else { resolve() }
      })
    })
  } catch (error) {
    console.log('CompleteController new failed: ' + error.message)
    return false
  }
  return true
}
