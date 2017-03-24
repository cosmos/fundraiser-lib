const leftPad = require('left-pad')
const request = require('request')
const xor = require('bitwise-xor')

var Web3 = require('web3')
var web3 = new Web3()

const { sha3 } = require('./hash.js')

const FUNDRAISER_CONTRACT = '0xABb1fE24C9B384f8BC8e778e165D50539589BCe6'
const GAS_LIMIT = 150000
const MIN_DONATION = 1

function getAddress (pub) {
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

function getTransaction (cosmosAddr, ethAddr) {
  return {
    to: FUNDRAISER_CONTRACT,
    gas: GAS_LIMIT,
    data: getTransactionData(cosmosAddr, ethAddr)
  }
}

function addressChecksum (cosmosAddr, ethAddr) {
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

// TODO: make sure the addresses aren't empty
function getTransactionData (cosmosAddr, ethAddr) {
  var checksum = addressChecksum(cosmosAddr, ethAddr)

  return contractInstance.donate.getData(cosmosAddr, ethAddr, checksum)
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
  let txData = web3.sha3('atomRate()').slice(0, 10) // '0xf5c96216'
  esiRequest('api?module=proxy&action=eth_call', {
    to: address,
    data: txData,
    tag: 'latest'
  }, (err, res) => {
    if (err) return cb(err)
    cb(null, parseInt(res.result, 16))
  })
}

// fetch the total raised and total atoms
function fetchTotals (address, cb) {
  let divisor = 1e18
  ethCall(address, 'totalAtom', (err, res) => {
    if (err) return cb(err)
    let atoms = parseInt(res, 16) / divisor
    ethCall(address, 'totalEther', (err, res) => {
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
