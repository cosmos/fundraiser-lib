'use strict'

const secp256k1 = require('secp256k1')
const Bitcoin = require('./bitcoin.js')
const Cosmos = require('./cosmos.js')
const Ethereum = require('./ethereum.js')
const bip39 = require('bip39')
const { HDNode } = require('bitcoinjs-lib')

function generateMnemonic () {
  return bip39.generateMnemonic()
}

function deriveWallet (mnemonic) {
  let privateKeys = derivePrivateKeys(mnemonic)
  let publicKeys = derivePublicKeys(privateKeys)
  let addresses = deriveAddresses(publicKeys)
  return { privateKeys, publicKeys, addresses }
}

function deriveMasterKey (mnemonic) {
  // seed must be 12 or more space-separated words
  var words = mnemonic.trim().split(/\s+/g)
  if (words.length < 12) {
    throw Error('Mnemonic must be at least 12 words')
  }

  var seed = bip39.mnemonicToSeed(mnemonic)
  var masterKey = HDNode.fromSeedBuffer(seed)
  return masterKey
}

function derivePrivateKeys (mnemonic) {
  var masterKey = deriveMasterKey(mnemonic)

  // bip32 derived wallet: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
  // single quote == hardened derivation
  // derivation path: m/purpose/cointype/account/...
  // purpose: the BIP which sets the spec: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
  //  see motivation: https://github.com/bitcoin/bips/blob/master/bip-0043.mediawiki
  // cointype: not clear where source of truth is but
  //   btc = 0
  //   eth = 60
  //   dfn = 223
  //   atom = 118 (?) // TODO
  var hdPathAtom = "m/44'/118'/0'/0/0" // key controlling ATOM allocation
  var hdPathETHIntermediate = "m/44'/60'/0'/0/0" // ETH key for emergency return address
  var hdPathBTCIntermediate = "m/44'/0'/0'/0/0" // BTC key forwarding donation for hdPathAtom key

  var cosmosHD = masterKey.derivePath(hdPathAtom)
  var ethereumHD = masterKey.derivePath(hdPathETHIntermediate)
  var bitcoinHD = masterKey.derivePath(hdPathBTCIntermediate)

  // NOTE: we want to make sure private keys are always 32 bytes
  // else we may have trouble. See the bitcore fiasco for more:
  // https://github.com/bitpay/bitcore-lib/issues/47
  // https://github.com/bitpay/bitcore-lib/pull/97
  var cosmos = padPrivKey(cosmosHD.keyPair.d.toBuffer())
  var bitcoin = padPrivKey(bitcoinHD.keyPair.d.toBuffer())
  var ethereum = padPrivKey(ethereumHD.keyPair.d.toBuffer())

  return { cosmos, bitcoin, ethereum }
}

function derivePublicKeys (priv) {
  // bitcoin and cosmos use compressed pubkey of 33 bytes.
  // ethereum uses uncompressed 64-byte pubkey without the openssl prefix (0x04).
  let bitcoin = secp256k1.publicKeyCreate(priv.bitcoin, true)
  let cosmos = secp256k1.publicKeyCreate(priv.cosmos, true)
  let ethereum = secp256k1.publicKeyCreate(priv.ethereum, false).slice(-64)
  return { cosmos, bitcoin, ethereum }
}

// cosmos and eth are 0x hex, bitcoin is base58check
function deriveAddresses (pub) {
  let cosmos = Cosmos.getAddress(pub.cosmos)
  let bitcoin = Bitcoin.getAddress(pub.bitcoin)
  let ethereum = Ethereum.getAddress(pub.ethereum)
  return { cosmos, bitcoin, ethereum }
}

module.exports = {
  generateMnemonic,
  deriveWallet
}

/*
// test
var list = []
var N = 200
for (let i = 0; i < N; i++){
  var mnemonic = generateMnemonic()
  var w = deriveWallet(mnemonic)
  var obj = {
    mnemonic: mnemonic,
    master: padPrivKey(deriveMasterKey(mnemonic).keyPair.d.toBuffer()).toString('hex'),
    seed: bip39.mnemonicToSeed(mnemonic).toString('hex'),
    priv: w.privateKeys.cosmos.toString('hex'),
    pub: w.publicKeys.cosmos.toString('hex'),
    addr: w.addresses.cosmos.toString('hex'),
  }
  list.push(obj)
}

console.log(JSON.stringify(list));
*/

/*
var seed = generateSeed()
var w = deriveWallet(seed)
var obj = {
  seed: seed,
  privateKeys: {
    cosmos: w.privateKeys.cosmos.toString('hex'),
    bitcoin: w.privateKeys.bitcoin.toString('hex'),
    ethereum: w.privateKeys.ethereum.toString('hex')
  },
  publicKeys: {
    cosmos: w.publicKeys.cosmos.toString('hex'),
    bitcoin: w.publicKeys.bitcoin.toString('hex'),
    ethereum: w.publicKeys.ethereum.toString('hex')
  },
  addresses: {
    cosmos: w.addresses.cosmos,
    bitcoin: w.addresses.bitcoin,
    ethereum: w.addresses.ethereum
  }
}
console.log(obj)
*/

function padPrivKey (privB) {
  var privHex = privB.toString('hex')
  return Buffer(('0000000000000000' + privHex).slice(-64), 'hex')
}
