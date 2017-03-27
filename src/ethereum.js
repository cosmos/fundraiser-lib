'use strict'

const leftPad = require('left-pad')
const request = require('request')
const xor = require('bitwise-xor')

var Web3 = require('web3')
var web3 = new Web3()

const { sha3 } = require('./hash.js')

const FUNDRAISER_CONTRACT = '0xa4028F2aec0ad18964e368338E5268FebB4F5423'
const GAS_LIMIT = 150000
const MIN_DONATION = 1

// returns 0x prefixed hex address
function getAddress (pub) {
  if (pub == null || pub.length !== 64) {
    throw Error('Invalid public key')
  }

  return '0x' + sha3(pub).slice(-20).toString('hex')
}

// ------------------------
// load the contract abi
// we only care about one function
var abi = [{
  constant: false,
  inputs: [
    {
      name: '_donor',
      type: 'address'
    },
    {
      name: '_returnAddress',
      type: 'address'
    },
    {
      name: 'checksum',
      type: 'bytes4'
    }
  ],
  name: 'donate',
  outputs: [],
  payable: true,
  type: 'function'
}]

let MyContract = web3.eth.contract(abi)
var contractInstance = MyContract.at('0x00')

// compute checksum for the transaction
function addressChecksum (cosmosAddr, ethAddr) {
  let addrlen = 20 * 2 + 2 // 0x prefixed hex
  if (cosmosAddr == null || cosmosAddr.length !== addrlen) {
    throw Error('Invalid cosmosAddr ' + cosmosAddr)
  }
  if (ethAddr == null || ethAddr.length !== addrlen) {
    throw Error('Invalid ethAddr ' + ethAddr)
  }

  // checksum is first 4 bytes of sha3(xor(cosmosAddr, ethAddr)
  var paddedCosmos = leftPad(web3.toAscii(cosmosAddr), 32, '\x00')
  var paddedEth = leftPad(web3.toAscii(ethAddr), 32, '\x00')
  var xord = xor(
    Buffer(paddedCosmos, 'ascii'),
    Buffer(paddedEth, 'ascii')
  )
  var checksum32 = web3.sha3(xord.toString('hex'), {encoding: 'hex'})
  var checksum4 = checksum32.slice(0, 10) // 0x and 4 bytes
  return checksum4
}

// data to send in transaction to fundraiser contract
function getTransactionData (cosmosAddr, ethAddr) {
  var checksum = addressChecksum(cosmosAddr, ethAddr)

  // Cut the right-padded zeros from the transaction data
  // Length: One 0x, 4 byte method id, 32 bytes for each address, 4 byte checksum, times 2 for hex encoded
  let dataLength = (1 + 4 + 32 + 32 + 4) * 2
  return contractInstance.donate.getData(cosmosAddr, ethAddr, checksum).slice(0, dataLength)
}

function getTransaction (cosmosAddr, ethAddr) {
  return {
    to: FUNDRAISER_CONTRACT,
    gas: GAS_LIMIT,
    data: getTransactionData(cosmosAddr, ethAddr)
  }
}

function esiRequest (url, qs, cb) {
  return request({
    url: `https://api.etherscan.io/${url}`,
    qs,
    json: true
  }, (err, res, body) => {
    if (err || res.statusCode !== 200 || body.error) {
      return cb(err || body.error || Error(res.statusCode), body)
    }
    cb(null, body)
  })
}

function ethCall (address, method, cb) {
  let data = web3.sha3(`${method}()`).slice(0, 10)
  esiRequest('api?module=proxy&action=eth_call', {
    to: address,
    data,
    tag: 'latest'
  }, (err, res) => {
    if (err) return cb(err)
    cb(null, res.result)
  })
}

// fetch the current atomRate
function fetchAtomRate (address, cb) {
  ethCall(address, 'weiPerAtom', (err, res) => {
    if (err) return cb(err)
    cb(null, parseInt(res, 16))
  })
}

// fetch the total raised and total atoms
function fetchTotals (address, cb) {
  let divisor = 1e18
  ethCall(address, 'totalAtom', (err, res) => {
    if (err) return cb(err)
    let atoms = parseInt(res, 16) / divisor
    ethCall(address, 'totalWei', (err, res) => {
      if (err) return cb(err)
      let ether = parseInt(res, 16) / divisor
      cb(null, { ether, atoms })
    })
  })
}

// TODO: limit so it doesn't fetch all txs
function fetchTxs (address, cb) {
  esiRequest('api?module=account&action=txlist', {
    address,
    startblock: 0,
    endblock: 99999999,
    sort: 'desc'
  }, (err, res) => {
    if (err) return cb(err)
    cb(null, res.result)
  })
}

module.exports = {
  getAddress,
  getTransaction,
  getTransactionData,
  addressChecksum,
  fetchAtomRate,
  fetchTotals,
  fetchTxs,
  FUNDRAISER_CONTRACT,
  MIN_DONATION
}
