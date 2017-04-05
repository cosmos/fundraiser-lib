'use strict'

const { fetchIsActive } = require('./ethereum.js')

module.exports = function (cb) {
  fetchIsActive('', (err, res) => {
    if (err) return cb(err)
    if (res) {
      cb(null, { fundraiserEnded: false })
    } else {
      cb(null, { fundraiserEnded: true })
    }
  })
}
