'use strict'

const secp256k1 = require('secp256k1')
const Mnemonic = require('bitcore-mnemonic')
const Bitcoin = require('./bitcoin.js')
const Cosmos = require('./cosmos.js')
const Ethereum = require('./ethereum.js')

function generateMnemonic () {
  var code = new Mnemonic(Mnemonic.Words.ENGLISH)
  return code.toString()
}

function deriveWallet (mnemonic) {
  let privateKeys = derivePrivateKeys(mnemonic)
  let publicKeys = derivePublicKeys(privateKeys)
  let addresses = deriveAddresses(publicKeys)
  return { privateKeys, publicKeys, addresses }
}

function derivePrivateKeys (mnemonic) {
  // seed must be 12 or more space-separated words
  var words = mnemonic.trim().split(/\s+/g)
  if (words.length < 12) {
    throw Error('Seed must be at least 12 words')
  }

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

  // var code = new this.Mnemonic(this.Mnemonic.Words.ENGLISH);
  var code = new Mnemonic(mnemonic)
  var masterKey = code.toHDPrivateKey()

  var cosmosHD = masterKey.derive(hdPathAtom)
  var ethereumHD = masterKey.derive(hdPathETHIntermediate)
  var bitcoinHD = masterKey.derive(hdPathBTCIntermediate)

  // NOTE: if the private keys begin with a leading 0,
  // the lib only returns 31 bytes - so we explicitly ask for 32 bytes
  // otherwise we would be non-compliant.
  // https://github.com/bitpay/bitcore-lib/issues/47
  // Fix is not merged yet: https://github.com/bitpay/bitcore-lib/pull/97
  // XXX: there's also a 2^-127 chance the key is invalid:
  // https://github.com/bitpay/bitcore-lib/issues/93
  var cosmos = cosmosHD.privateKey.bn.toBuffer({size: 32})
  var ethereum = ethereumHD.privateKey.bn.toBuffer({size: 32})
  var bitcoin = bitcoinHD.privateKey.bn.toBuffer({size: 32})

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

// test
var list = []
var N = 1000
for (let i = 0; i < N; i++){
	var mnemonic = generateMnemonic()
	var w = deriveWallet(mnemonic)
	var obj = {
		mnemonic: mnemonic,
		seed: Mnemonic(mnemonic).toSeed().toString('hex'),
		priv: w.privateKeys.cosmos.toString('hex'),
		pub: w.publicKeys.cosmos.toString('hex'),
		addr: w.addresses.cosmos.toString('hex'),
	}
	list.push(obj)
}

console.log(JSON.stringify(list));

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
