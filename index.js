module.exports = Object.assign(
  {
    bitcoin: require('./src/bitcoin.js')
  },
  require('./src/wallet.js')
)
