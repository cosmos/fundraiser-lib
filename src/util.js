'use strict'

var BASE_URL

if (process.env.COSMOS_BASE_URL) {
  BASE_URL = process.env.COSMOS_BASE_URL
} else if (process.browser) {
  BASE_URL = window.location.origin
} else {
  BASE_URL = 'https://cosmos.interblock.io'
}

function byte (n) {
  return Buffer([ n ])
}

function concat (...buffers) {
  return Buffer.concat(buffers)
}

module.exports = {
  BASE_URL,
  byte,
  concat
}
