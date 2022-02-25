// api-routes.js
// Initialize express router
const router = require('express').Router()
// Set default API response
router.get('/', function (req, res) {
  res.json({
    status: 'API Its Working',
    message: 'Welcome to FastSwap crafted with love!'
  })
})

const wipController = require('./wipController')
const balanceController = require('./balanceController')
const balanceWIPController = require('./balanceWIPController')
// Contact routes
router.route('/fastswap')
  .get(wipController.index)

router.route('/fastswap/:txid')
  .get(wipController.view)
  .post(wipController.new)

router.route('/fastswap/balances')
  .get(balanceController.index)

router.route('/fastswap/balancewip')
  .get(balanceWIPController.index)

router.route('/fastswap/balancewip/:srctxid')
  .get(balanceWIPController.view)

// Export API routes
module.exports = router
