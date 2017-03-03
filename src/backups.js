'use strict'

const request = require('request')
const old = require('old')

function convertWallet (wallet) {
  return {
    encryptedSeed: Buffer(wallet.encryptedSeed, 'base64'),
    salt: Buffer(wallet.salt, 'base64'),
    iv: Buffer(wallet.iv, 'base64')
  }
}

function convertTransaction (tx) {
  return Object.assign(tx, {
    txid: Buffer(tx.txid, 'base64')
  })
}

// client for the fundraiser REST API, for backing up wallets
class Client {
  constructor (uri) {
    this.uri = uri
  }

  request (method, url, data, cb) {
    request({
      method,
      url: this.uri + url,
      json: data || true,
      jar: true, // keep cookies
      withCredentials: true
    }, (err, res, data) => {
      if (err) return cb(err)
      if (res.statusCode !== 200) {
        let error = Error(String(data.error || data))
        error.code = res.statusCode
        return cb(error)
      }
      cb(null, data)
    })
  }
  get (url, cb) { this.request('GET', url, null, cb) }
  post (url, data, cb) { this.request('POST', url, data, cb) }

  register (user, cb) { this.post('/register', user, cb) }
  login (user, cb) { this.post('/login', user, cb) }
  logout (cb) { this.post('/logout', {}, cb) }
  updateName (name, cb) { this.post('/name', { name }, cb) }
  updateEmail (email, cb) { this.post('/email', { email }, cb) }
  updatePassword (password, cb) { this.post('/password', { password }, cb) }
  getUser (cb) {
    this.get('/user', (err, user) => {
      if (err) return cb(err)
      user.transactions = user.transactions.map(convertTransaction)
      user.wallets = user.wallets.map(convertWallet)
      cb(null, user)
    })
  }
  getWallets (cb) {
    this.get('/wallets', (err, wallets) => {
      if (err) return cb(err)
      cb(null, wallets.map(convertWallet))
    })
  }
  getTransactions (cb) {
    this.get('/transactions', (err, transactions) => {
      if (err) return cb(err)
      cb(null, transactions.map(convertTransaction))
    })
  }
  backupWallet (wallet, cb) {
    wallet = {
      encryptedSeed: wallet.encryptedSeed.toString('base64'),
      salt: wallet.salt.toString('base64'),
      iv: wallet.iv.toString('base64')
    }
    this.post('/wallet', wallet, cb)
  }
  submitTx (tx, cb) {
    tx.txid = tx.txid.toString('base64')
    this.post('/transaction', tx, cb)
  }

  // for testnet transactions only, for other transactions use
  // blockchain.info pushtx
  pushTx (tx, cb) {
    if (process.env.NODE_ENV !== 'development') {
      throw Error('pushTx is only for testnet transactions')
    }
    this.post('/pushtx', { hex: tx.toHex() }, cb)
  }
}

module.exports = old(Client)
