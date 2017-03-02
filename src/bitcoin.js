const bs58check = require('bs58check')
const request = require('request')
const { Transaction, script, address, networks } = require('bitcoinjs-lib')
const secp256k1 = require('secp256k1')
const { sha2, ripemd160 } = require('./hash.js')
const { byte, concat } = require('./util.js')

const COSMOS_OUTPUT_AMOUNT = 10000 // 10k satoshis
const EXODUS_ADDRESS = 'mvPBr7EqiAn41Hqs9Du8ovNFKveU1sdecX'
const FEE_RATE = 220 // satoshis per byte
const MINIMUM_AMOUNT = 1000000 // min satoshis to send to exodus
const ATOMS_PER_BTC = 2000

// exodus pubkey hash
const exodusPkh = bs58check.decode(EXODUS_ADDRESS).slice(1)

function getAddress (pub, testnet = false) {
  let network = testnet ? networks.testnet : networks.bitcoin
  let outputScript = script.pubKeyHashOutput(ripemd160(sha2(pub)))
  return address.fromOutputScript(outputScript, network)
}

function blockrRequest (method, url, { testnet }, cb) {
  let network = testnet ? 'tbtc' : 'btc'
  return request({
    method,
    url: `https://${network}.blockr.io/api/v1/${url}`,
    json: true
  }, (err, res, body) => {
    if (err) return cb(err)
    if (body.status !== 'success') {
      return cb(Error(body.message))
    }
    cb(null, body.data)
  })
}

function fetchUnspent (address, opts, cb) {
  blockrRequest('GET', `address/unspent/${address}?unconfirmed=1`, opts, cb)
}

function fetchTx (hash, opts, cb) {
  blockrRequest('GET', `tx/raw/${hash}`, opts, (err, res) => {
    if (err) return cb(err)
    cb(null, Transaction.fromHex(res.tx.hex))
  })
}

function waitForTx (address, opts, cb) {
  const done = (err, res) => {
    clearInterval(interval)
    cb(err, res)
  }
  const checkForUnspent = () => {
    fetchUnspent(address, opts, (err, res) => {
      if (err) return done(err)
      if (res.unspent.length === 0) return
      // TODO: handle multiple txs?
      fetchTx(res.unspent[0].tx, opts, (err, tx) => {
        if (err) return done(err)
        let info = getTxInfo(tx, address)
        done(null, info)
      })
    })
  }
  let interval = setInterval(checkForUnspent, 5000)
  checkForUnspent()
}

// check if an output has a P2PKH script and pays to the given address
function isSpendable (output, address) {
  let isPkh = script.classifyOutput(output.script) === 'pubkeyhash'
  let pkh = bs58check.decode(address).slice(1)
  let key = script.decompile(output.script)[2]
  let paysToAddress = key.equals(pkh)
  return isPkh && paysToAddress
}

// gets info about a transaction sent to an intermediate address
function getTxInfo (tx, address) {
  let amount = 0
  let outputs = tx.outs.filter((out) => isSpendable(out, address))
  for (let output of outputs) {
    output.index = tx.outs.indexOf(output)
    amount += output.value
  }
  return { tx, outputs, amount }
}

function pushTx (tx, opts, cb) {
  let txJson = JSON.stringify({ hex: tx.toHex() })
  blockrRequest('POST', `tx/push`, opts, cb).end(txJson)
}

function createFinalTx (wallet, intermediateTx) {
  let tx = new Transaction()

  // add inputs from intermediate tx
  let intermediateHash = intermediateTx.tx.getHash()
  for (let output of intermediateTx.outputs) {
    tx.addInput(intermediateHash, output.index)
  }

  // pay to exodus address, spendable by Cosmos developers
  let payToExodus = script.pubKeyHashOutput(exodusPkh)
  tx.addOutput(payToExodus, intermediateTx.amount - COSMOS_OUTPUT_AMOUNT)

  // OP_RETURN data output to specify user's Cosmos address
  let specifyCosmosAddress = script.nullDataOutput(Buffer(wallet.addresses.cosmos, 'hex'))
  tx.addOutput(specifyCosmosAddress, COSMOS_OUTPUT_AMOUNT)

  // deduct fee from exodus output
  let feeAmount = tx.byteLength() * FEE_RATE
  if (tx.outs[0].value < MINIMUM_AMOUNT) {
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
  for (let i = 0; i < tx.ins.length; i++) {
    let input = tx.ins[i]
    let prevOut = intermediateTx.tx.outs[input.index]
    let sigHashType = Transaction.SIGHASH_ALL
    let sigHash = tx.hashForSignature(i, prevOut.script, sigHashType)
    let signature = sign(privKey, sigHash)
    signature = concat(signature, byte(sigHashType)) // append sighash type byte
    input.script = script.pubKeyHashInput(signature, pubKey)
  }

  let paidAmount = intermediateTx.amount
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
  fetchUnspent,
  fetchTx,
  pushTx,
  waitForTx,
  createFinalTx,
  MINIMUM_AMOUNT,
  ATOMS_PER_BTC
}
