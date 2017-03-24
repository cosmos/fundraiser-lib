const bs58check = require('bs58check')
const { Transaction, script, address } = require('bitcoinjs-lib')
const request = require('request')
const secp256k1 = require('secp256k1')
const { sha2, ripemd160 } = require('./hash.js')
const { byte, concat } = require('./util.js')
const bcyRequest = require('./blockcypher.js')

const DEV = process.env.NODE_ENV === 'development'
const EXODUS_ADDRESS = '1EaV33reN8XWWUfs5jkbGMD399vie5KQc4'
const MINIMUM_AMOUNT = DEV ? 60000 : 1000000 // min satoshis to send to exodus
const ATOMS_PER_BTC = 2000
const MINIMUM_OUTPUT = 1000

function getAddress (pub) {
  if (pub == null || pub.length !== 33) {
    throw Error('Invalid public key')
  }
  let pubkeyHash = ripemd160(sha2(pub))
  let payload = concat(byte(0x00), pubkeyHash)
  return bs58check.encode(payload)
}

function bciRequest (method, url, data, cb) {
  return request({
    method,
    url: `https://blockchain.info/${url}`,
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

// fetch all utxos for this address, using the Blockcypher API
function fetchUtxosBcy (address, cb) {
  bcyRequest('GET', `v1/btc/main/addrs/${address}`, { unspentOnly: true }, (err, res) => {
    if (err) return cb(err)
    let txrefs = res.txrefs || []
    let unconfirmedTxrefs = res.unconfirmed_txrefs || []
    let utxos = txrefs.concat(unconfirmedTxrefs)
    cb(null, utxos)
  })
}

// fetch all utxos for this address, using the Blockchain.info API
function fetchUtxosBci (address, cb) {
  bciRequest('GET', `unspent?active=${address}`, null, (err, res) => {
    // when there are no outputs for this address,
    // blockchain API gives error 500 with this message:
    if (err && res === 'No free outputs to spend') {
      return cb(null, [])
    }
    if (err) return cb(err)
    cb(null, res.unspent_outputs)
  })
}

function fetchUtxos (address, cb) {
  function done (utxos) {
    // sum the value of the utxos
    let amount = 0
    for (let utxo of utxos) amount += utxo.value
    cb(null, { utxos, amount })
  }

  fetchUtxosBcy(address, (err, res) => {
    if (err) {
      // if blockcypher fails, try blockchain.info
      fetchUtxosBci(address, (err, res) => {
        if (err) return cb(err)
        done(res)
      })
      return
    }
    done(res)
  })
}

function waitForPayment (address, cb) {
  let cbCalled = false
  const done = (err, res) => {
    if (cbCalled) return
    cbCalled = true
    clearInterval(interval)
    cb(err, res)
  }
  const checkForUnspent = () => {
    fetchUtxos(address, (err, res) => {
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

function pushTx (txHex, cb) {
  bciRequest('POST', 'pushtx', { tx: txHex }, cb)
}

function createFinalTx (inputs, feeRate) {
  let inputAmount = 0
  for (let input of inputs) inputAmount += input.value

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
    let txid = Buffer(output.tx_hash, 'hex')
    tx.addInput(txid, output.tx_output_n)
  }

  // pay to exodus address, spendable by Cosmos developers
  let payToExodus = address.toOutputScript(EXODUS_ADDRESS)
  tx.addOutput(payToExodus, inputAmount - MINIMUM_OUTPUT)

  // output to specify the Cosmos address. we set the address
  // when we sign the transaction
  let cosmosAddressScript = script.pubKeyHashOutput(Buffer(20).fill(0))
  tx.addOutput(cosmosAddressScript, MINIMUM_OUTPUT)

  // deduct fee from exodus output
  let txLength = tx.byteLength() + tx.ins.length * 107 // account for input scripts
  let feeAmount = txLength * feeRate
  if (tx.outs[0].value - feeAmount < MINIMUM_OUTPUT) {
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
  let cosmosAddress = Buffer(wallet.addresses.cosmos, 'hex')
  let cosmosAddressScript = script.pubKeyHashOutput(cosmosAddress)
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

function fetchFundraiserStats (cb) {
  bciRequest('GET', `multiaddr?active=${EXODUS_ADDRESS}`, null, (err, res) => {
    if (err) return cb(err)
    let recentTxs = res.txs
      .filter((tx) => tx.result > 0) // only show received txs
      .map((tx) => ({
        hash: tx.hash,
        donated: tx.result,
        claimed: tx.result * ATOMS_PER_BTC / 1e8,
        time: tx.time
      }))
    cb(null, {
      amountDonated: res.addresses[0].total_received,
      amountClaimed: res.addresses[0].total_received * ATOMS_PER_BTC / 1e8,
      txCount: res.addresses[0].n_tx,
      recentTxs
    })
  })
}

function fetchFeeRate (cb) {
  request({
    url: 'https://bitcoinfees.21.co/api/v1/fees/recommended',
    json: true
  }, (err, res, body) => {
    if (err || res.statusCode !== 200) {
      return cb(err || Error(res.statusCode), body)
    }
    let feeRate = body.halfHourFee
    if (feeRate < 150 || feeRate > 1000) {
      return cb(Error('Fee rate out of range'))
    }
    cb(null, body.halfHourFee)
  })
}

module.exports = {
  getAddress,
  fetchUtxos,
  pushTx,
  waitForPayment,
  createFinalTx,
  signFinalTx,
  fetchFundraiserStats,
  fetchFeeRate,
  MINIMUM_AMOUNT,
  ATOMS_PER_BTC
}
