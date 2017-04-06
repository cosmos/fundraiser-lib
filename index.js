module.exports = Object.assign(
  {
    bitcoin: require('./lib/bitcoin.js'),
    ethereum: require('./lib/ethereum.js'),
    fetchStatus: require('./lib/status.js'),
    allocation: require('./lib/allocation.js')
  },
  require('./lib/wallet.js')
)
