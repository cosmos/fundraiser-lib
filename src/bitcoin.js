const bs58check = require('bs58check')
const { Transaction, script, address } = require('bitcoinjs-lib')
const bci = require('blockchain.info/blockexplorer')
bci.pushTx = require('blockchain.info/pushtx').pushtx
const secp256k1 = require('secp256k1')
const reverse = require('buffer-reverse')
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

// call a callback from a Promise
function cbify (promise, cb) {
  promise
    .then((res) => cb(null, res))
    .catch((err) => cb(err))
}

// fetch all utxos for this address
function fetchUtxos (address, cb) {
  cbify(bci.getAddress(address), (err, res) => {
    // results from bc.i are paginated and we are only
    // getting the first page, so we're assuming nobody is
    // going to send 50+ txs
    if (err) return cb(err)
    let utxos = []
    let amount = 0
    for (let tx of res.txs) {
      for (let output of tx.out) {
        if (output.spent) continue
        if (output.addr !== address) continue
        amount += output.value
        output.txid = tx.hash
        utxos.push(output)
      }
    }
    cb(null, { utxos, amount })
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
  cbify(bci.pushTx(tx.toHex()), cb)
}

function createFinalTx (wallet, inputs) {
  if (inputs.amount < MINIMUM_AMOUNT) {
    throw Error(`Intermediate tx is smaller than minimum.
      minimum=${MINIMUM_AMOUNT}
      actual=${inputs.amount}`)
  }

  let tx = new Transaction()

  // add inputs from intermediate tx
  let inputMap = {}
  for (let output of inputs.utxos) {
    let txid = reverse(Buffer(output.txid, 'hex'))
    tx.addInput(txid, output.n)
    inputMap[`${output.txid}:${output.n}`] = output
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
