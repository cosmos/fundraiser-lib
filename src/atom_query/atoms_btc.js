const { insightRequest, EXODUS_ADDRESS, ATOMS_PER_BTC } = require('../bitcoin.js')
const async = require('async')


const MIN_BLOCK = 460654
const MAX_BLOCK = 460660


function atomAllocationsBTC(atomInfo, cb) {
  insightRequest('GET', `addr/${EXODUS_ADDRESS}`, null, (err, res) => {
    if (err) return cb(err)


    let txs = res.transactions
    async.map(txs, fetchBtcTx, function (err, res) {
      console.log(JSON.stringify(res))
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
      txid: txID,
      type: 'btc',
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


let atoms = {}
atomAllocationsBTC(atoms, (err, res) => {
  console.log(res)
})
