module.exports = Object.assign(
  {
    bitcoin: require('./src/bitcoin.js'),
    Client: require('./src/backups.js')
  },
  require('./src/wallet.js')
)
