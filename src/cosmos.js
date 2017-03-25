'use strict'

const Bitcoin = require('./bitcoin.js')

// Same as a bitcoin address
// Returns 0x prefixed hex address
function getAddress (pub) {
  let pubkeyHash = Bitcoin.getAddress160(pub)
  return '0x' + pubkeyHash.toString('hex')
}

module.exports = {
  getAddress
}
