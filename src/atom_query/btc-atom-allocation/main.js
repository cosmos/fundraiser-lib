'use strict'

const webcoin = require('webcoin')
const bitcoin = require('webcoin-bitcoin')
const memdb = require('memdb')
const base58 = require('bs58check')
const reverse = require('buffer-reverse')
const { toOutputScript } = require('bitcoinjs-lib').address

const EXODUS_ADDRESS = '35ty8iaSbWsj4YVkoHzs9pZMze6dapeoZ8'
const START_HEIGHT = 460654
const END_HEIGHT = 460661
const ATOMS_PER_BTC = 11635
const MINIMUM_AMOUNT = 1000000

const EXODUS_SCRIPT_HASH = base58.decode(EXODUS_ADDRESS).slice(1)
const EXODUS_OUTPUT_SCRIPT = toOutputScript(EXODUS_ADDRESS)

bitcoin.blockchain.checkpoints = [
  {
    height: 459648,
    header: {
      version: 536870914,
      prevHash: reverse(Buffer('00000000000000000122f47d580700a3a5b4b6cb46669a36e4fa974c720ab6cd', 'hex')),
      merkleRoot: reverse(Buffer('069140524a092ea531d50340997e8ca194e26e9b35538a8816f664e3e12df8f3', 'hex')),
      timestamp: 1490891948,
      bits: 402797402,
      nonce: 615821098
    }
  }
]

const allocation = {}
function onTx (tx) {
  if (tx.outs.length !== 2) return
  if (!tx.outs[0].script.equals(EXODUS_OUTPUT_SCRIPT)) return
  let satoshis = tx.outs[0].value.toNumber()
  if (satoshis < MINIMUM_AMOUNT) return
  let atoms = satoshis * ATOMS_PER_BTC / 1e8
  let address = tx.outs[1].script.slice(-20).toString('hex')
  allocation[address] = (allocation[address] || 0) + atoms
}

function done () {
  for (let address in allocation) {
    allocation[address] = Math.round(allocation[address] * 100) / 100
  }
  console.log(JSON.stringify(allocation, null, '  '))
  process.exit()
}

const node = webcoin(bitcoin, memdb())
const { filter, chain } = node
filter.add(EXODUS_SCRIPT_HASH)
chain.on('tip', (tip) => {
  if (tip.height !== END_HEIGHT) return
  chain.getBlockAtHeight(START_HEIGHT, (err, startBlock) => {
    if (err) throw err
    node.streamBlocks(startBlock.header.getHash(), (block) => {
      if (block.height < START_HEIGHT) return
      if (block.height > END_HEIGHT) return done()
      for (let tx of block.transactions) onTx(tx)
    })
  })
})
node.start()
