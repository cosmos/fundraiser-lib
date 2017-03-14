module.exports = Object.assign(
  {
    bitcoin: require('./lib/bitcoin.js'),
    sendEmail: require('./lib/backups.js')
  },
  require('./lib/wallet.js')
)
