import CONFIGURATION from './config.js'
import sjs from 'syscoinjs-lib'
export default new sjs.SyscoinJSLib(null, CONFIGURATION.BlockbookAPIURL, CONFIGURATION.SysNetwork)
