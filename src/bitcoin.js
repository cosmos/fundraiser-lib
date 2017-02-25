const bs58check = require('bs58check')
const { sha2, ripemd160 } = require('./hash.js')
const { concat, byte } = require('./util.js')

function getAddress (pub, testnet = false) {
  let prefix = testnet ? 0x6f : 0x00
  let hash = ripemd160(sha2(pub))
  let payload = concat(byte(prefix), hash)
  return bs58check.encode(payload)
}

module.exports = {
  getAddress
}
