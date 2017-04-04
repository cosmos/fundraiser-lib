'use strict'

const request = require('request')
const { BASE_URL } = require('./util.js')
const { fetchIsActive } = require('./ethereum.js')

const STATUS_URL = `${BASE_URL}/status.json`

module.exports = function (cb) {
  fetchIsActive("", (err, res) => {
    if (err) return cb(err)
    if (res){
      cb(null, { fundraiserEnded: false })
    } else {
      cb(null, { fundraiserEnded: true })
    }
  })
}
