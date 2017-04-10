
const request = require('request')
const { BASE_URL } = require('./util.js')
const fundraiserAtoms = require('./atom_query/data/fundraiser_atoms.json')
const status = require('./atom_query/data/status.json')

function fetchSuggestedAtoms (addr, cb) {
  return request({
    method: 'GET',
    url: `${BASE_URL}/atoms/${addr}`,
    qs: { cors: true },
    json: true
  }, (err, res, body) => {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(Error(body || res.statusCode), body)
    }
    try {
      body = JSON.parse(body)
    } catch (err) {}
    console.log(body)
    cb(null, body.atom)
  })
}

module.exports = {
  fetchSuggestedAtoms,
  fundraiserAtoms,
  status
}
