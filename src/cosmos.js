const { sha2, ripemd160 } = require('./hash.js')

// Same as a bitcoin address
function getAddress (pub) {
  return ripemd160(sha2(pub)).toString('hex')
}

module.exports = {
  getAddress
}
