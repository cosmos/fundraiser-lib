var randomBytes = require('crypto').pseudoRandomBytes
var test = require('tape')
var bitcoin = require('../').bitcoin

function fromHex (hex) {
  return Buffer(hex, 'hex')
}

test('getAddress', function (t) {
  t.test('get address of known pubkeys', function (t) {
    var data = [
      {
        pubkey: fromHex('02c0622eac6badd13ffd4d84494139bde620370f4b78526948f7c3da89b8834621'),
        address: '1JpX8erMs5YmSPNNNz2pAeWNZoUWNPTtis'
      },
      {
        pubkey: fromHex('0262d09eca74b1be0edcad59fca59b0b5be46e201a54e704dfcfa1ac593e02a991'),
        address: '1KgSJpx3N1gzwoA1WLd3yi4XWCnLTqzL8j'
      },
      {
        pubkey: fromHex('033ceef6825bd921dfab66f096bd645d5b9abcc56fc9553e2ceff721b0e0a16313'),
        address: '1H3v2zqnbTHTmSybsm477g4Xr5Pb6tWoPP'
      }
    ]
    for (var i = 0; i < data.length; i++) {
      var address = bitcoin.getAddress(data[i].pubkey)
      t.equal(address, data[i].address, 'got correct address from pubkey')
    }
    t.end()
  })

  t.end()
})

test('fetchUtxos', function (t) {
  t.test('fetch utxos for unused address', function (t) {
    var fakePubkey = randomBytes(33)
    var address = bitcoin.getAddress(fakePubkey)
    bitcoin.fetchUtxos(address, function (err, res) {
      t.pass('callback called')
      t.error(err, 'no error')
      t.equal(res.amount, 0, 'amount is 0')
      t.equal(res.utxos.length, 0, 'no utxos')
      t.end()
    })
  })

  t.test('INSIGHT fetch utxos for known address', function (t) {
    var address = '16SGqiEVT1Jpc9UdkJBnhir1LDVxZoah8M'
    bitcoin.insightFetchUtxos(address, function (err, res) {
      t.pass('callback called')
      t.error(err, 'no error')
      // t.ok(res.amount >= 2000, 'correct amount')
      t.ok(res.utxos.length >= 2, 'correct utxo count')
      var lastUtxo = res.utxos[0]
      t.equal(
        lastUtxo.txid,
        'da8407d00b41e22445b77316f6e70e086887a97264c1bd93702fec6edf99b3e5',
        'correct utxo txid value')
      t.equal(
        lastUtxo.vout, 1,
        'correct utxo vout value')
      t.equal(
        lastUtxo.scriptPubKey,
        '76a9143ba0401a23d10bf40368b567c47fe03c49e9567388ac',
        'correct utxo script value')
      t.equal(
        lastUtxo.amount, 1000,
        'correct utxo value')
      t.end()
    })
  })

  t.test('BCI fetch utxos for known address', function (t) {
    var address = '16SGqiEVT1Jpc9UdkJBnhir1LDVxZoah8M'
    bitcoin.bciFetchUtxos(address, function (err, res) {
      t.pass('callback called')
      t.error(err, 'no error')
      t.ok(res.amount >= 2000, 'correct amount')
      t.ok(res.utxos.length >= 2, 'correct utxo count')
      var lastUtxo = res.utxos[res.utxos.length - 1]
      t.equal(
        lastUtxo.tx_hash,
        'e5b399df6eec2f7093bdc16472a98768080ee7f61673b74524e2410bd00784da',
        'correct utxo tx_hash value')
      t.equal(
        lastUtxo.tx_hash_big_endian,
        'da8407d00b41e22445b77316f6e70e086887a97264c1bd93702fec6edf99b3e5',
        'correct utxo tx_hash_big_endian value')
      t.equal(
        lastUtxo.tx_index, 229649052,
        'correct utxo tx_index value')
      t.equal(
        lastUtxo.tx_output_n, 1,
        'correct utxo tx_output_n value')
      t.equal(
        lastUtxo.script,
        '76a9143ba0401a23d10bf40368b567c47fe03c49e9567388ac',
        'correct utxo script value')
      t.equal(
        lastUtxo.value, 1000,
        'correct utxo value')
      t.equal(
        lastUtxo.value_hex, '03e8',
        'correct utxo value_hex value')
      t.end()
    })
  })

  t.end()
})

test('waitForPayment', function (t) {
  // should call back immediately since there are already utxos on this address
  t.test('wait for payment on known address with sufficient coins', function (t) {
    bitcoin.waitForPayment('1EZBqbJSHFKSkVPNKzc5v26HA6nAHiTXq6', function (err, res) {
      t.pass('callback was called')
      t.error(err, 'no error')
      t.ok(res.utxos, 'got utxos')
      t.ok(res.utxos.length, 'utxos length > 0')
      t.ok(res.amount, 'amount > 0')
      t.end()
    })
  })

  // should not call back since there aren't yet enough coins
  t.test('wait for payment on known address with insufficient coins', function (t) {
    var interval = bitcoin.waitForPayment('16SGqiEVT1Jpc9UdkJBnhir1LDVxZoah8M', function () {
      t.fail('callback should not have been called')
      t.end()
    })
    setTimeout(function () {
      t.pass('did not get payment')
      t.end()
      clearInterval(interval)
    }, 3000)
  })

  t.end()
})

test('pushTx', function (t) {
  t.test('INSIGHT push invalid tx', function (t) {
    var tx = Buffer(200).fill(0).toString('hex')
    bitcoin.insightPushTx(tx, function (err) {
      t.ok(err, 'got error')
      t.equal(err.message, '16: bad-txns-vin-empty. Code:-26', 'correct error message')
      t.end()
    })
  })

  t.test('BCI push invalid tx', function (t) {
    var tx = Buffer(200).fill(0).toString('hex')
    bitcoin.bciPushTx(tx, function (err) {
      t.ok(err, 'got error')
      t.equal(err.message, 'Not accepting transaction version 0', 'correct error message')
      t.end()
    })
  })

  t.end()
})

test('createFinalTx', function (t) {
  t.test('create final tx with insufficient inputs for fee', function (t) {
    var utxos = [{
      tx_hash: randomBytes(32).toString('hex'),
      script: randomBytes(32).toString('hex'),
      tx_output_n: 0,
      value: 10000000
    }]
    try {
      // we use a very high fee rate
      bitcoin.createFinalTx(utxos, 10000000)
      t.fail('should have thrown')
    } catch (err) {
      t.ok(err, 'error thrown')
      t.equal(err.message, 'Not enough coins given to pay fee.\n      tx length=226\n      fee rate=10000000 satoshi/byte\n      fee amount=2260000000 satoshis\n      output amount=9999000 satoshis', 'correct error message')
    }
    t.end()
  })

  t.test('create final tx', function (t) {
    // we use a ton of inputs to make the fee very high
    var utxos = [{
      tx_hash: randomBytes(32).toString('hex'),
      script: randomBytes(32).toString('hex'),
      tx_output_n: 0,
      value: 1000000
    }]
    var tx = bitcoin.createFinalTx(utxos, 220)
    t.ok(tx, 'created tx')
    t.ok(tx.tx, 'has tx property')
    t.equal(tx.paidAmount, 1000000, 'correct paidAmount')
    t.equal(tx.feeAmount, 49720, 'correct feeAmount')
    t.equal(tx.atomAmount, 19.0056, 'correct atomAmount')
    t.end()
  })

  t.end()
})

test('fetchFundraiserStats', function (t) {
  bitcoin.fetchFundraiserStats(function (err, res) {
    t.error(err, 'no error')
    t.ok(res.amountDonated, 'has amountDonated')
    t.ok(res.txCount, 'has txCount')
    t.ok(res.recentTxs.length, 'has recentTxs')
    t.end()
  })
})
