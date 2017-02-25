'use strict'

function byte (n) {
  return Buffer([ n ])
}

function concat (...buffers) {
  return Buffer.concat(buffers)
}

module.exports = {
  byte,
  concat
}
