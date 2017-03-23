'use strict'

const request = require('request')

function blockcypherRequest (method, path, qs, cb) {
  request({
    method,
    url: `https://api.blockcypher.com/${path}`,
    qs,
    json: true
  }, (err, res, body) => {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(Error(res.statusCode))
    }
    cb(null, body)
  })
}

module.exports = blockcypherRequest
