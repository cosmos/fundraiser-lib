'use strict'

const request = require('request')
const old = require('old')

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
  logout (cb) { this.post('/logout', null, cb) }
  getUser (cb) { this.get('/user', cb) }
  getWallets (cb) { this.get('/wallets', cb) }
  getTransactions (cb) { this.get('/transactions', cb) }
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
}

module.exports = old(Client)
