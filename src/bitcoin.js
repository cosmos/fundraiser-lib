const bs58check = require('bs58check')
const request = require('request')
const { sha2, ripemd160 } = require('./hash.js')
const { concat, byte } = require('./util.js')

function getAddress (pub, testnet = false) {
  let prefix = testnet ? 0x6f : 0x00
  let hash = ripemd160(sha2(pub))
  let payload = concat(byte(prefix), hash)
  return bs58check.encode(payload)
}

function blockrRequest (url, { testnet }, cb) {
  let network = testnet ? 'tbtc' : 'btc'
  request({
    url: `https://${network}.blockr.io/api/v1/${url}`,
    json: true
  }, (err, res, body) => {
    if (err) return cb(err)
    if (body.status !== 'success') {
      return cb(Error(body.message))
    }
    cb(null, body.data)
  })
}

function fetchTransactions (address, opts, cb) {
  blockrRequest(`address/txs/${address}`, opts, cb)
}

module.exports = {
  getAddress,
  fetchTransactions
}
