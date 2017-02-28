'use strict'

const randomBytes = require('randombytes')
const {
  createCipheriv,
  createDecipheriv
} = require('browserify-cipher')
const secp256k1 = require('secp256k1')
const pbkdf2 = require('pbkdf2').pbkdf2Sync
const Bitcoin = require('./bitcoin.js')
const Ethereum = require('./ethereum.js')
const { sha3, ripemd160 } = require('./hash.js')
const { concat, byte } = require('./util.js')

function generateSeed () {
  return randomBytes(32)
}

function deriveWallet (seed, testnet = false) {
  let privateKeys = derivePrivateKeys(seed)
  let publicKeys = derivePublicKeys(privateKeys)
  let addresses = deriveAddresses(publicKeys, testnet)
  return { privateKeys, publicKeys, addresses }
}

function derivePrivateKeys (seed) {
  if (seed.length < 32) {
    throw Error('Seed must be at least 32 bytes')
  }
  let cosmos = sha3(concat(seed, byte(0)))
  let bitcoin = sha3(concat(seed, byte(1)))
  let ethereum = sha3(concat(seed, byte(2)))
  return { cosmos, bitcoin, ethereum }
}

function derivePublicKeys (priv) {
  let cosmos = secp256k1.publicKeyCreate(priv.cosmos)
  let bitcoin = secp256k1.publicKeyCreate(priv.bitcoin)
  let ethereum = secp256k1.publicKeyCreate(priv.ethereum, false)
  return { cosmos, bitcoin, ethereum }
}

function getCosmosAddress (pub) {
  return ripemd160(pub).toString('hex')
}

function deriveAddresses (pub, testnet = false) {
  let cosmos = getCosmosAddress(pub.cosmos)
  let bitcoin = Bitcoin.getAddress(pub.bitcoin, testnet)
  let ethereum = Ethereum.getAddress(pub.ethereum)
  return { cosmos, bitcoin, ethereum }
}

function deriveEncryptionKey (password, salt) {
  return pbkdf2(password, salt, 10000, 32, 'sha512')
}

function encryptSeed (seed, password) {
  let salt = randomBytes(32)
  let key = deriveEncryptionKey(password, salt)
  let iv = randomBytes(16)
  let cipher = createCipheriv('aes-256-cbc', key, iv)
  let encryptedSeed = concat(
    cipher.update(seed),
    cipher.final()
  )
  return { encryptedSeed, salt, iv }
}

function decryptSeed ({ encryptedSeed, salt, iv }, password) {
  let key = deriveEncryptionKey(password, salt)
  let decipher = createDecipheriv('aes-256-cbc', key, iv)
  return concat(
    decipher.update(encryptedSeed),
    decipher.final()
  )
}

module.exports = {
  generateSeed,
  deriveWallet,
  encryptSeed,
  decryptSeed
}
