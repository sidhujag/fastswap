import Web3 from 'web3'
import CONFIGURATION from './config'
const Provider = require('@truffle/hdwallet-provider')
const provider = new Provider(CONFIGURATION.NEVMKEY, CONFIGURATION.Web3URL)
export default new Web3(provider)
