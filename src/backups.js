'use strict'

const request = require('request')

const URL = 'https://reyz3gresl.execute-api.us-west-2.amazonaws.com/development/email'

function sendEmail (emailAddress, wallet, cb) {
  if (!Buffer.isBuffer(wallet)) {
    return cb(Error('wallet must be a Buffer'))
  }
  wallet = wallet.toString('base64')
  request({
    method: 'POST',
    url: URL,
    json: { emailAddress, wallet }
  }, (err, res, data) => {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      let error = Error(String(data.error || data))
      error.code = res.statusCode
      return cb(error)
    }
    cb(null)
  })
}

module.exports = sendEmail
