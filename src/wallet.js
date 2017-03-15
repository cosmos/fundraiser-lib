'use strict'

const randomBytes = require('randombytes')
const {
  createCipheriv,
  createDecipheriv
} = require('browserify-cipher')
const secp256k1 = require('secp256k1')
const scrypt = require('scrypt-async')
const struct = require('varstruct')
const Bitcoin = require('./bitcoin.js')
const Ethereum = require('./ethereum.js')
const { sha3, ripemd160 } = require('./hash.js')
const { concat, byte } = require('./util.js')

const Wallet = struct([
  { name: 'encryptedSeed', type: struct.VarBuffer(struct.Byte) },
  { name: 'salt', type: struct.VarBuffer(struct.Byte) },
  { name: 'iv', type: struct.VarBuffer(struct.Byte) },
  { name: 'authTag', type: struct.VarBuffer(struct.Byte) }
])

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

function deriveEncryptionKey (password, salt, cb) {
  scrypt(password, salt, { N: 32768, r: 10 }, (key) => {
    cb(Buffer(key))
  })
}

function encryptSeed (seed, password, cb) {
  let salt = randomBytes(32)
  deriveEncryptionKey(password, salt, (key) => {
    let iv = randomBytes(16)
    let cipher = createCipheriv('aes-256-gcm', key, iv)
    let encryptedSeed = concat(
      cipher.update(seed),
      cipher.final()
    )
    let authTag = cipher.getAuthTag()
    cb(null, { encryptedSeed, salt, iv, authTag })
  })
}

function decryptSeed ({ encryptedSeed, salt, iv, authTag }, password, cb) {
  deriveEncryptionKey(password, salt, (key) => {
    let decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    try {
      let seed = concat(
        decipher.update(encryptedSeed),
        decipher.final()
      )
      cb(null, seed)
    } catch (err) {
      cb(err)
    }
  })
}

function encodeWallet (wallet) {
  return Wallet.encode(wallet)
}

function decodeWallet (bytes) {
  return Wallet.decode(bytes)
}

module.exports = {
  generateSeed,
  deriveWallet,
  encryptSeed,
  decryptSeed,
  encodeWallet,
  decodeWallet
}
