module.exports = Object.assign(
  {
    bitcoin: require('./lib/bitcoin.js'),
    ethereum: require('./lib/ethereum.js'),
    sendEmail: require('./lib/backups.js')
  },
  require('./lib/wallet.js')
)
