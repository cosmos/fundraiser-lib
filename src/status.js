'use strict'

const request = require('request')
const { BASE_URL } = require('./util.js')

const STATUS_URL = `${BASE_URL}/status.json`

module.exports = function (cb) {
  request({
    url: STATUS_URL,
    json: true
  }, (err, res, body) => {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(Error(res.statusCode))
    }
    cb(null, body)
  })
}
