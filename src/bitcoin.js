const bs58check = require('bs58check')
const { Transaction, script, address } = require('bitcoinjs-lib')
const request = require('request')
const secp256k1 = require('secp256k1')
const { sha2, ripemd160 } = require('./hash.js')
const { byte, concat } = require('./util.js')

const DEV = process.env.NODE_ENV === 'development'
const EXODUS_ADDRESS = '1EaV33reN8XWWUfs5jkbGMD399vie5KQc4'
const FEE_RATE = 220 // satoshis per byte
const MINIMUM_AMOUNT = DEV ? 60000 : 1000000 // min satoshis to send to exodus
const ATOMS_PER_BTC = 2000
const MINIMUM_OUTPUT = 1000

// exodus pubkey hash
// TODO: exodus should be P2Sh
// TODO: address prefix byte sanity check
const exodusPkh = bs58check.decode(EXODUS_ADDRESS).slice(1)

function getAddress (pub) {
  let pubkeyHash = ripemd160(sha2(pub))
  let outputScript = script.pubKeyHashOutput(pubkeyHash)
  return address.fromOutputScript(outputScript)
}

function bciRequest (method, url, data, cb) {
  return request({
    method,
    url: `https://blockchain.info/${url}`,
    qs: { cors: true },
    form: data
  }, (err, res, body) => {
    if (err || res.statusCode !== 200) {
      return cb(err || Error(res.statusCode), body)
    }
    try {
      body = JSON.parse(body)
    } catch (err) {}
    cb(null, body)
  })
}

// fetch all utxos for this address
function fetchUtxos (address, cb) {
  bciRequest('GET', `unspent?active=${address}`, null, (err, res) => {
    // when there are no outputs for this address,
    // blockchain API gives error 500 with this message:
    if (err && res === 'No free outputs to spend') {
      return cb(null, { utxos: [], amount: 0 })
    }
    if (err) return cb(err)
    let amount = 0
    for (let utxo of res.unspent_outputs) {
      amount += utxo.value
    }
    cb(null, { utxos: res.unspent_outputs, amount })
  })
}

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
}

function pushTx (tx, cb) {
  bciRequest('POST', 'pushtx', { tx: tx.toHex() }, cb)
}

function createFinalTx (wallet, inputs) {
  if (inputs.amount < MINIMUM_AMOUNT) {
    throw Error(`Intermediate tx is smaller than minimum.
      minimum=${MINIMUM_AMOUNT}
      actual=${inputs.amount}`)
  }

  let tx = new Transaction()

  // add inputs from intermediate tx
  for (let output of inputs.utxos) {
    let txid = Buffer(output.tx_hash, 'hex')
    tx.addInput(txid, output.tx_output_n)
  }

  // pay to exodus address, spendable by Cosmos developers
  // TODO: exodus should be P2SH
  let payToExodus = script.pubKeyHashOutput(exodusPkh)
  tx.addOutput(payToExodus, inputs.amount)

  // output to specify user's Cosmos address
  let cosmosAddress = Buffer(wallet.addresses.cosmos, 'hex')
  let specifyCosmosAddress = script.pubKeyHashOutput(cosmosAddress)
  tx.addOutput(specifyCosmosAddress, MINIMUM_OUTPUT)

  // deduct fee from exodus output
  let feeAmount = tx.byteLength() * FEE_RATE
  if (tx.outs[0].value < MINIMUM_OUTPUT) {
    throw Error(`Not enough coins given to pay fee.
      tx length=${tx.byteLength()}
      fee rate=${FEE_RATE} satoshi/byte
      fee amount=${feeAmount} satoshis
      output amount=${tx.outs[0].value} satoshis`)
  }
  tx.outs[0].value -= feeAmount

  // sign inputs
  let privKey = wallet.privateKeys.bitcoin
  let pubKey = wallet.publicKeys.bitcoin
  let sigHashType = Transaction.SIGHASH_ALL
  for (let i = 0; i < tx.ins.length; i++) {
    let input = tx.ins[i] // tx input
    let prevOut = inputs.utxos[i] // utxo associated w/ this input
    let scriptPubKey = Buffer(prevOut.script, 'hex') // utxo's script
    let sigHash = tx.hashForSignature(i, scriptPubKey, sigHashType)
    let signature = sign(privKey, sigHash)
    signature = concat(signature, byte(sigHashType)) // append sighash type byte
    input.script = script.pubKeyHashInput(signature, pubKey)
  }

  let paidAmount = inputs.amount
  let atomAmount = (tx.outs[0].value * ATOMS_PER_BTC) / 1e8
  return { tx, paidAmount, feeAmount, atomAmount }
}

function sign (privKey, sigHash) {
  let { signature } = secp256k1.sign(sigHash, privKey)
  signature = secp256k1.signatureNormalize(signature) // enforce low-S
  return secp256k1.signatureExport(signature) // convert to DER encoding
}

module.exports = {
  getAddress,
  fetchUtxos,
  pushTx,
  waitForPayment,
  createFinalTx,
  MINIMUM_AMOUNT,
  ATOMS_PER_BTC
}
