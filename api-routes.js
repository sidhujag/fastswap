// api-routes.js
// Initialize express router
import express from 'express'

import wipController from './wipController.js'
import balanceController from './balanceController.js'
import balanceWIPController from './balanceWIPController.js'
// Set default API response
const router = express.Router()
router.get('/', function (req, res) {
  res.json({
    status: 'API Its Working',
    message: 'Welcome to FastSwap crafted with love!'
  })
})
// Contact routes
router.route('/fastswap')
  .get(wipController.index)

router.route('/fastswap/:txid')
  .get(wipController.view)
  .post(wipController.new)

router.route('/balances')
  .get(balanceController.index)

router.route('/balancewip')
  .get(balanceWIPController.index)

router.route('/balancewip/:srctxid')
  .get(balanceWIPController.view)

router.route('/settings')
  .get(wipController.settings)

// Export API routes
export default router
