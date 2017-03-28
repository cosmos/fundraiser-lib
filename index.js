module.exports = Object.assign(
  {
    bitcoin: require('./lib/bitcoin.js'),
    ethereum: require('./lib/ethereum.js')
  },
  require('./lib/wallet.js')
)
