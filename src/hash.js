'use strict'

const createHash = require('create-hash')
const createKeccakHash = require('keccak')

function sha3 (data) {
  return createKeccakHash('keccak256').update(data).digest()
}

function sha2 (data) {
  return createHash('sha256').update(data).digest()
}

function ripemd160 (data) {
  return createHash('ripemd160').update(data).digest()
}

module.exports = {
  sha3,
  sha2,
  ripemd160
}
