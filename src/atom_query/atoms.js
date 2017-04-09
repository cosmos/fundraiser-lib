const { insightRequest, EXODUS_ADDRESS, ATOMS_PER_BTC } = require('../bitcoin.js')
const async = require('async')
const fs = require('fs');


const MIN_BLOCK = 460654
const MAX_BLOCK = 460660

// read btc data from insight node
function atomAllocationsBTC(cb) {
  insightRequest('GET', `addr/${EXODUS_ADDRESS}`, null, (err, res) => {
    if (err) return cb(err)

    let txs = res.transactions
    async.map(txs, fetchBtcTx, function (err, res) {
      cb(null, res)
    }); 
  })
}

function fetchBtcTx(txID, cb) {
  insightRequest('GET', `tx/${txID}`, null, (err, res) => {
    if (err) {
      console.log(err)
      return
    }

    let l = res.vout.length
    let opReturnOut = res.vout[1]
    let opReturnScript = opReturnOut.scriptPubKey.hex
    let address = res.vout[1].scriptPubKey.hex.slice(4) // shave off OP_RETURN (6a14)

    let donationInfo = {
      type: 'btc',
      txid: txID,
      blockHeight: res.blockheight,
      address: address,
      amount: res.vout[0].value * 1.0,
      atoms: res.vout[0].value * ATOMS_PER_BTC
    }

    if ( l != 2 || opReturnOut.value != 0 || opReturnScript.length != 44 || opReturnScript.slice(0, 4) != "6a14" ) {
      donationInfo.error = `Invalid tx structure` 
    } else if (res.blockheight < MIN_BLOCK) {
      donationInfo.error = `Block too early`
    } else if (res.blockheight > MAX_BLOCK) {
      donationInfo.error = `Block too late`
    }
    cb(null, donationInfo)
  })
}

let ethDonationInfo = []

// read eth data from event log data
fs.readFile('./data/eth-raw.json', function (err, data) {
  if (err) throw err; 
  let events = JSON.parse(data.toString())
  events = events.result

  for (ev of events) {
    blockHeight = parseInt(ev.blockNumber, 16)
    address = ev.topics[1].slice(2+12*2)
    txid = ev.transactionHash,
    wei = parseInt(ev.data.slice(2+32*2, 2+32*2*2), 16)
    weiPerAtom = parseInt(ev.data.slice(2+32*2*2), 16)
    atoms = parseInt(wei / weiPerAtom)
    amount = wei / 1e18

    ethDonationInfo.push({
      type: 'eth',
      txid,
      blockHeight,
      address,
      amount,
      atoms
    })
  }
  
  // read btc data
  atomAllocationsBTC((err, res) => {
    btcDonationInfo = res
    
    console.log(JSON.stringify(btcDonationInfo.concat(ethDonationInfo)))
  })
});




