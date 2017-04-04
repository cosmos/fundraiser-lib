'use strict'

var BASE_URL

if (process.env.COSMOS_BASE_URL) {
  BASE_URL = process.env.COSMOS_BASE_URL
} else if (process.browser) {
  BASE_URL = window.location.origin
} else {
  BASE_URL = 'https://fundraiser.cosmos.network' // 'cosmos.interblock.io'
}

function byte (n) {
  return Buffer([ n ])
}

function concat (...buffers) {
  return Buffer.concat(buffers)
}

function xor (a, b) {
  if (!Buffer.isBuffer(a)) a = Buffer(a)
  if (!Buffer.isBuffer(b)) b = Buffer(b)
  let res = []
  let length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    res.push(a[i] ^ b[i])
  }
  return Buffer(res)
}

module.exports = {
  BASE_URL,
  byte,
  concat,
  xor
}
