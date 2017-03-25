const bs58check = require('bs58check')
const { Transaction, script, address } = require('bitcoinjs-lib')
const request = require('request')
const secp256k1 = require('secp256k1')
const { sha2, ripemd160 } = require('./hash.js')
const { byte, concat } = require('./util.js')

const DEV = process.env.NODE_ENV === 'development'
const EXODUS_ADDRESS = '1EaV33reN8XWWUfs5jkbGMD399vie5KQc4'
const MINIMUM_AMOUNT = DEV ? 60000 : 1000000 // min satoshis to send to exodus
const ATOMS_PER_BTC = 2000
const MINIMUM_OUTPUT = 1000

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

// -----------------------------
// blockcypher requests

function bcRequest (method, url, data, cb) {
  return request({
    method,
    url: `https://api.blockcypher.com/v1/btc/main/${url}`,
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

// fetch all utxos for this address
function fetchUtxos (address, cb) {
  let url = `addrs/${address}?unspentOnly=true&includeScript=true`
  bcRequest('GET', url, null, (err, res) => {
    if (err) return cb(err)
    let amount = 0
    let txrefs = []
    if (res.txrefs) {
      for (let utxo of res.txrefs) {
        amount += utxo.value
        txrefs = txrefs.concat(utxo)
      }
    }
    if (res.unconfirmed_txrefs) {
      for (let utxo of res.unconfirmed_txrefs) {
        amount += utxo.value
        txrefs = txrefs.concat(utxo)
      }
    }
    cb(null, { utxos: txrefs, amount })
  })
}

/*
fetchUtxos('1FVKwUhENRdEPFFU7Jm6shBtGfdKUt6Yfu', (err, res) => {
console.log(res)
})
fetchUtxos('1EaV33reN8XWWUfs5jkbGMD399vie5KQc4', (err, res) => {
console.log(res)
})
*/

function waitForPayment (address, cb) {
  const done = (err, res) => {
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
  bcRequest('POST', 'txs/push', { tx: txHex }, cb)
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

  // OP_RETURN data output to specify user's Cosmos address
  // this output has a value of 0. we set the address
  // when we sign the transaction
  let cosmosAddressScript = script.nullDataOutput(Buffer(20).fill(0))
  tx.addOutput(cosmosAddressScript, 0)

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

function fetchFundraiserStats (cb) {
  let url = `addrs/${EXODUS_ADDRESS}`
  bcRequest('GET', url, null, (err, res) => {
    if (err) return cb(err)
    let recentTxs = res.txrefs
      .filter((tx) => tx.tx_input_n < 0) // only show received txs
      .map((tx) => ({
        hash: tx.tx_hash,
        donated: tx.value,
        claimed: tx.value * ATOMS_PER_BTC / 1e8,
        time: tx.confirmed
      }))
    cb(null, {
      amountDonated: res.total_received,
      amountClaimed: res.total_received * ATOMS_PER_BTC / 1e8,
      txCount: res.n_tx,
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
  getAddress160,
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
