'use strict'

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
  byte,
  concat,
  xor
}
