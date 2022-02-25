import CONFIGURATION from './config'
const sjs = require('syscoinjs-lib')
export default new sjs.SyscoinJSLib(null, CONFIGURATION.BlockbookAPIURL)
