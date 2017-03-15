var randomBytes = require('crypto').pseudoRandomBytes
var test = require('tape')
var cfr = require('../')
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

  t.test('fetch utxos for known address', function (t) {
    var address = '16SGqiEVT1Jpc9UdkJBnhir1LDVxZoah8M'
    bitcoin.fetchUtxos(address, function (err, res) {
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
  t.test('push invalid tx', function (t) {
    var tx = {
      toHex: function () {
        return Buffer(200).fill(0).toString('hex')
      }
    }
    bitcoin.pushTx(tx, function (err, res) {
      t.ok(err, 'got error')
      t.equal(err.message, '500', 'correct error message')
      t.equal(res, 'Not accepting transaction version 0\n', 'correct res')
      t.end()
    })
  })

  t.end()
})

test('createFinalTx', function (t) {
  t.test('create final tx with insufficient inputs', function (t) {
    try {
      bitcoin.createFinalTx(null, { amount: 123 })
      t.fail('should have thrown')
    } catch (err) {
      t.ok(err, 'error thrown')
      t.equal(err.message, 'Intermediate tx is smaller than minimum.\n      minimum=1000000\n      actual=123', 'correct error message')
    }
    t.end()
  })

  t.test('create final tx with insufficient inputs for fee', function (t) {
    var seed = cfr.generateSeed()
    var wallet = cfr.deriveWallet(seed)
    // we use a ton of inputs to make the fee very high
    var utxos = Array(1000).fill({
      tx_hash: randomBytes(32).toString('hex'),
      script: randomBytes(32).toString('hex'),
      tx_output_n: 0
    })
    try {
      bitcoin.createFinalTx(wallet, {
        utxos: utxos,
        amount: 1000000
      })
      t.fail('should have thrown')
    } catch (err) {
      t.ok(err, 'error thrown')
      t.equal(err.message, 'Not enough coins given to pay fee.\n      tx length=41080\n      fee rate=220 satoshi/byte\n      fee amount=9037600 satoshis\n      output amount=1000000 satoshis', 'correct error message')
    }
    t.end()
  })

  t.test('create final tx', function (t) {
    var seed = cfr.generateSeed()
    var wallet = cfr.deriveWallet(seed)
    // we use a ton of inputs to make the fee very high
    var utxos = [{
      tx_hash: randomBytes(32).toString('hex'),
      script: randomBytes(32).toString('hex'),
      tx_output_n: 0
    }]
    var tx = bitcoin.createFinalTx(wallet, {
      utxos: utxos,
      amount: 1000000
    })
    t.ok(tx, 'created tx')
    t.ok(tx.tx, 'has tx property')
    t.equal(tx.paidAmount, 1000000, 'correct paidAmount')
    t.equal(tx.feeAmount, 26180, 'correct feeAmount')
    t.equal(tx.atomAmount, 19.4764, 'correct atomAmount')
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
