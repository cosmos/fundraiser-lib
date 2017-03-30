'use strict'

const request = require('request')

const STATUS_URL = 'http://192.241.203.245:8080/status.json'

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
