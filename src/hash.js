'use strict'

const createHash = require('create-hash')

var Web3 = require('web3');
var web3 = new Web3();

function sha3 (data) {
  return web3.sha3(data);
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
