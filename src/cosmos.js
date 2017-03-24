const Bitcoin = require('./bitcoin.js')

// Same as a bitcoin address
function getAddress (pub) {
  let pubkeyHash = Bitcoin.getAddress160(pub)
  return pubkeyHash.toString('hex')
}

module.exports = {
  getAddress
}
