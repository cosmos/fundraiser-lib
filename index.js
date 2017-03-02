module.exports = Object.assign(
  {
    bitcoin: require('./lib/bitcoin.js'),
    Client: require('./lib/backups.js')
  },
  require('./lib/wallet.js')
)
