'use strict'

const bs58check = require('bs58check')
const { Transaction, script, address } = require('bitcoinjs-lib')
const request = require('request')
const secp256k1 = require('secp256k1')
const { sha2, ripemd160 } = require('./hash.js')
const { BASE_URL, byte, concat } = require('./util.js')

const DEV = process.env.NODE_ENV === 'development'
const EXODUS_ADDRESS = '35ty8iaSbWsj4YVkoHzs9pZMze6dapeoZ8'
const MINIMUM_AMOUNT = DEV ? 60000 : 1000000 // min satoshis to send to exodus
const ATOMS_PER_BTC = 11635
const INSIGHT_URL = `${BASE_URL}/insight-api`

// returns buffer
function getAddress160 (pub) {
  if (pub == null || pub.length !== 33) {
    throw Error('Invalid public key')
  }
  return ripemd160(sha2(pub))
}

// returns b58 string
function getAddress (pub) {
  let pubkeyHash = getAddress160(pub)

  let payload = concat(byte(0x00), pubkeyHash)
  return bs58check.encode(payload)
}

// -------------------
// insight-api/bitcore self-hosted

function insightRequest (method, url, data, cb) {
  return request({
    method,
    url: `${INSIGHT_URL}/${url}`,
    qs: { cors: true },
    form: data
  }, (err, res, body) => {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(Error(body || res.statusCode), body)
    }
    try {
      body = JSON.parse(body)
    } catch (err) {}
    cb(null, body)
  })
}

function insightFetchUtxos (address, cb) {
  let url = `addr/${address}/utxo`
  insightRequest('GET', url, null, (err, res) => {
    // when there are no outputs for this address,
    // blockchain API gives error 500 with this message:
    if (err && res === 'No free outputs to spend') {
      return cb(null, { utxos: [], amount: 0 })
    }
    if (err) return cb(err)
    let amount = 0
    for (let utxo of res) {
      utxo.amount = parseInt(utxo.amount * Math.pow(10, 8))
      amount += utxo.amount
    }
    cb(null, { utxos: res, amount })
  })
}

function insightWaitForPayment (address, cb) {
  let cbCalled = false
  const done = (err, res) => {
    if (cbCalled) return
    cbCalled = true
    clearInterval(interval)
    cb(err, res)
  }
  const checkForUnspent = () => {
    insightFetchUtxos(address, (err, res) => {
      if (err) return done(err)
      if (res.amount < MINIMUM_AMOUNT) return
      done(null, res)
    })
  }
  // poll once every 6 seconds
  let interval = setInterval(checkForUnspent, 6000)
  checkForUnspent()
  return interval
}

function insightPushTx (txHex, cb) {
  insightRequest('POST', 'tx/send', { rawtx: txHex }, cb)
}

// ------------------------
// network requests

function pushTx (txHex, cb) {
  insightPushTx(txHex, cb)
}

function fetchUtxos (address, cb) {
  insightFetchUtxos(address, cb)
}

function waitForPayment (address, cb) {
  return insightWaitForPayment(address, cb)
}

// ---------------------
// tx funcs

function createFinalTx (inputs, feeRate) {
  let inputAmount = 0
  for (let input of inputs) inputAmount += input.amount

  if (inputAmount < MINIMUM_AMOUNT) {
    throw Error(`Intermediate tx is smaller than minimum.
      minimum=${MINIMUM_AMOUNT}
      actual=${inputAmount}`)
  }
  if (!feeRate || feeRate < 0) {
    throw Error(`Must specify a transaction fee rate`)
  }

  let tx = new Transaction()

  // add inputs from intermediate tx
  for (let output of inputs) {
    let txhashhex = output.txid.match(/.{2}/g).reverse().join('') // Reverse the hex string
    let txid = Buffer(txhashhex, 'hex')
    tx.addInput(txid, output.vout)
  }

  // pay to exodus address, spendable by Cosmos developers
  let payToExodus = address.toOutputScript(EXODUS_ADDRESS)
  tx.addOutput(payToExodus, inputAmount)

  // OP_RETURN data output to specify user's Cosmos address
  // this output has a value of 0. we set the address
  // when we sign the transaction
  let cosmosAddressScript = script.nullDataOutput(Buffer(20).fill(0))
  tx.addOutput(cosmosAddressScript, 0)

  // deduct fee from exodus output
  let txLength = tx.byteLength() + tx.ins.length * 107 // account for input scripts
  let feeAmount = txLength * feeRate
  if (tx.outs[0].value - feeAmount < 0) {
    throw Error(`Not enough coins given to pay fee.
      tx length=${txLength}
      fee rate=${feeRate} satoshi/byte
      fee amount=${feeAmount} satoshis
      output amount=${tx.outs[0].value} satoshis`)
  }
  tx.outs[0].value -= feeAmount

  let paidAmount = inputAmount
  let atomAmount = (tx.outs[0].value * ATOMS_PER_BTC) / 1e8
  return { tx, paidAmount, feeAmount, atomAmount }
}

function signFinalTx (wallet, tx) {
  tx = tx.clone()
  let privKey = wallet.privateKeys.bitcoin
  let pubKey = wallet.publicKeys.bitcoin

  // set output script to specify user's Cosmos address
  let cosmosAddress = Buffer(wallet.addresses.cosmos.slice(2), 'hex')
  let cosmosAddressScript = script.nullDataOutput(cosmosAddress)
  tx.outs[1].script = cosmosAddressScript

  // all utxos we spend from should have used this script
  let pubKeyHash = ripemd160(sha2(pubKey))
  let scriptPubKey = script.pubKeyHashOutput(pubKeyHash)

  // sign inputs
  let sigHashType = Transaction.SIGHASH_ALL
  for (let i = 0; i < tx.ins.length; i++) {
    let input = tx.ins[i] // tx input
    let sigHash = tx.hashForSignature(i, scriptPubKey, sigHashType)
    let signature = sign(privKey, sigHash)
    signature = concat(signature, byte(sigHashType)) // append sighash type byte
    input.script = script.pubKeyHashInput(signature, pubKey)
  }

  return tx
}

function sign (privKey, sigHash) {
  let { signature } = secp256k1.sign(sigHash, privKey)
  signature = secp256k1.signatureNormalize(signature) // enforce low-S
  return secp256k1.signatureExport(signature) // convert to DER encoding
}

function fetchFeeRate (cb) {
  insightRequest('GET', 'utils/estimateFee', null, (err, res) => {
    if (err) {
      // By default, pay 400
      return cb(null, 400)
    }
    let satoshiPerKb = res['2'] * 1e8
    let satoshiPerByte = Math.ceil(satoshiPerKb / 1000)
    // Pay double the fee.
    let feeRate = satoshiPerByte * 2
    if (feeRate < 300) {
      return cb(null, 300)
    }
    if (feeRate > 1000) {
      return cb(null, 1000)
    }
    cb(null, feeRate)
  })
}

function fetchFundraiserStats (cb) {
  insightRequest('GET', `addr/${EXODUS_ADDRESS}/totalReceived`, null, (err, amountDonated) => {
    if (err) return cb(err)
    insightRequest('GET', `addr/${EXODUS_ADDRESS}`, null, (err, res) => {
      if (err) return cb(err)
      cb(null, {
        amountDonated: amountDonated / 1e8,
        amountClaimed: amountDonated * ATOMS_PER_BTC / 1e8,
        txCount: res.txApperances
      })
    })
  })
}

module.exports = {
  getAddress160,
  getAddress,
  insightRequest,
  fetchUtxos,
  pushTx,
  waitForPayment,
  createFinalTx,
  signFinalTx,
  fetchFeeRate,
  fetchFundraiserStats,
  MINIMUM_AMOUNT,
  EXODUS_ADDRESS,
  ATOMS_PER_BTC
}
