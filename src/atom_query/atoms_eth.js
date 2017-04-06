var fs = require('fs');

let donationInfo = []

fs.readFile('./eth.tx', function (err, data) {
  if (err) throw err; 
  let events = JSON.parse(data.toString())
  events = events.result

  for (ev of events) {
    blockHeight = parseInt(ev.blockNumber, 16)
    address = ev.topics[1].slice(2+12*2)
    txid = ev.transactionHash,
    wei = parseInt(ev.data.slice(2+32*2, 2+32*2*2), 16)
    weiPerAtom = parseInt(ev.data.slice(2+32*2*2), 16)
    atoms = wei / weiPerAtom
    amount = wei / 1e18

    donationInfo.push({
      type: 'eth',
      txid,
      blockHeight,
      address,
      atoms,
      amount
    })
  }

  console.log(JSON.stringify(donationInfo))
});

