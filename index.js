module.exports = Object.assign(
  {
    bitcoin: require('./lib/bitcoin.js'),
    ethereum: require('./lib/ethereum.js'),
    fetchStatus: require('./lib/status.js')
  },
  require('./lib/wallet.js')
)
