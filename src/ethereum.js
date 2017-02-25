const { sha3 } = require('./hash.js')

function getAddress (pub) {
  return '0x' + sha3(pub).slice(-20).toString('hex')
}

module.exports = {
  getAddress
}
