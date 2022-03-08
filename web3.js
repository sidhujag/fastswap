import Web3 from 'web3'
import CONFIGURATION from './config.js'
import HDWalletProvider from '@truffle/hdwallet-provider'
const provider = new HDWalletProvider(CONFIGURATION.SYSSEED, CONFIGURATION.Web3URL)
export default new Web3(provider)
