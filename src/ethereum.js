const leftPad = require('left-pad')
const request = require('request')
const xor = require('bitwise-xor')

var Web3 = require('web3')
var web3 = new Web3()

const { sha3 } = require('./hash.js')

const FUNDRAISER_CONTRACT = '0xABb1fE24C9B384f8BC8e778e165D50539589BCe6'
const GAS_LIMIT = 150000
const ATOMS_PER_ETH = 2000

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
      type: 'bytes32'
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

// TODO: make sure the addresses aren't empty
function getTransactionData (cosmosAddr, ethAddr) {
  // checksum is sha3(xor(cosmosAddr, ethAddr)
  var paddedCosmos = leftPad(web3.toAscii(cosmosAddr), 32, '\x00')
  var paddedEth = leftPad(web3.toAscii(ethAddr), 32, '\x00')
  var xord = xor(
    Buffer(paddedCosmos, 'ascii'),
    Buffer(paddedEth, 'ascii')
  )
  var checksum = web3.sha3(xord.toString('hex'), {encoding: 'hex'})

  return contractInstance.donate.getData(cosmosAddr, ethAddr, checksum)
}

function esiRequest (url, qs, cb) {
  return request({
    url: `https://api.etherscan.io/${url}`,
    qs,
    json: true
  }, (err, res, body) => {
    if (err || res.statusCode !== 200 || body.result === 0) {
      return cb(err || Error(res.statusCode), body)
    }
    cb(null, body)
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
  let txData1 = web3.sha3('totalAtom()').slice(0, 10)
  let txData2 = web3.sha3('totalEther()').slice(0, 10)
  let divisor = 1e18

  let ethCall = 'api?module=proxy&action=eth_call'
  esiRequest(ethCall, {
    to: address,
    data: txData1,
    tag: 'latest'
  }, (err, res1) => {
    if (err) return cb(err)
    let atoms = parseInt(res1.result, 16) / divisor
    esiRequest(ethCall, {
      to: address,
      data: txData2,
      tag: 'latest'
    }, (err, res2) => {
      if (err) return cb(err)
      let ether = parseInt(res2.result, 16) / divisor
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
  fetchAtomRate,
  fetchTotals,
  fetchTxs,
  ATOMS_PER_ETH
}
