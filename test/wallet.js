var test = require('tape')
var cfr = require('../')

function toHex (buf) {
  return buf.toString('hex')
}

test('generate wallet seed', function (t) {
  t.test('seed is 32-byte Buffer', function (t) {
    var seed = cfr.generateSeed()
    var words = seed.trim().split(/\s+/g)
    t.equal(words.length, 12, 'correct length')
    // t.ok(Buffer.isBuffer(seed), 'is Buffer')
    t.end()
  })

  t.test('seeds are all different', function (t) {
    var seeds = Array(50).fill()
      .map(cfr.generateSeed)
      .map(toHex)
      .sort()
    for (var i = 0; i < seeds.length - 1; i++) {
      t.notEqual(seeds[i], seeds[i + 1], 'seeds are different')
    }
    t.end()
  })

  t.test('Math.random is never called', function (t) {
    var random = Math.random
    Math.random = function () { t.fail('Math.random() got called') }
    cfr.generateSeed()
    Math.random = random
    t.end()
  })

  t.end()
})

test('derive wallet keys/addresses', function (t) {
  t.test('derive from known seeds', function (t) {
    var seeds = [
      {
        seed: 'broccoli usual lecture drum arena myself neither mushroom rich matrix off leisure',
        privateKeys: {
          cosmos: 'ea537da87a3b8a7d69356b6b6aceae0b863e895d47fb08d2a695d5e33baabad0',
          bitcoin: 'a238e766271cd7982aaf3988d4504aa86d5ae23723206fbe84f1ddf981a504bc',
          ethereum: '160b5da715ced8a3820e9e4c42872e63a11cd330602df80c58b853805fad09c4'
        },
        publicKeys: {
          cosmos: '5030cb768796c67a8b6a926ed2c86440f8aac4282c29b2bd24658e8b30b4066093f68425e04b493a4e7aa12d261bc05ea2dde1dc04e0af52d1ded5e7710bd07e',
          bitcoin: '02b1fdef0a0fe6cbd277496f71efdf1efb71f3e856d5374ea46a97f38114351bcb',
          ethereum: '16d470ea8cecb08eea734eff2cd3a967d81f23fbcedad3a225c32da8a170e00c39ba45ee34f2b74b4a58c0d57446722a0db2616f53ade257c684ceb8876a3cad'
        },
        addresses: {
          cosmos: '9cf614014f8a9ce9203630bedc75ceaf7f849479',
          bitcoin: '1N9gzHNaTEKM829qyA9eDSQTyhofBikZKR',
          ethereum: '0x7e634728306b6b8468d068d7b851369071f0418c'
        }
      },
      {
        seed: 'high pink deposit require setup sheriff reopen sword hamster diary camp magnet',
        privateKeys: {
          cosmos: '39ca19bd92adb669a93ff1676005640b3439127f888f53f7219cc3973c0841a3',
          bitcoin: '9f6c550e839cd7a144e255902ff0e61fc00e41f9eeaa686429a79cce2c9f0642',
          ethereum: 'ba1f7c5a1aac06e3827d114ae8ef6ca798209bb334bbdbb068600d5d944d0462'
        },
        publicKeys: {
          cosmos: '551401aa0154ba47e3dbd43bff8038428a47d2a7f68db4812bdba835f4de5afdc79469718d7224a222b03c16e51fc738dd909f5331529631de4683ac8f2aa769',
          bitcoin: '02fd43bb2860c2f1637040597f7e30d148580e0631869a3a4d1a090590810437d4',
          ethereum: 'cb07959204aca7a9ebb4ea555c6fd943f4a37e0db07c7c87b5ec35e6af43baf7682181b3742a6fefb5e5466b8a7bbbf23d77418626049d63cb4dbe8e34fbc0f0'
        },
        addresses: {
          cosmos: 'ec72d26f1d4e9ff9c4db1b58fb120995014380a0',
          bitcoin: '1C29TqsfgiBmNT2PS1KYbCTmEAdzK4RqCd',
          ethereum: '0x19d82af97222197d6a330ddfa418505ddf0245f0'
        }
      },
      {
        seed: 'meat earth crazy equal mouse follow size prosper undo struggle wild salute',
        privateKeys: {
          cosmos: 'fe9afdab8b965c2ec81063d798e7f9e1978595bc41b26dc6c18b97a3fc410c60',
          bitcoin: '20fb97b4d234eded57fe16444d390e7b176af9cb76f6140aa071925042629118',
          ethereum: '08debae75d93f30f5e0c6b8f776ca13b32521f2144a8da8fe2527e288b2f612a'
        },
        publicKeys: {
          cosmos: '9b0f9a4b08ff033ce732a829cc93d9ef42bf1e95541c3a211ed004939ccf5be2a09d65974089b6e01d7345d1af35d6ca486c856dcdde27b3e77ddbdf25bf4ab4',
          bitcoin: '03b0fcfb1261658e5e62a8e2e1e25bc5930ec54f032e06df52778ed53977723848',
          ethereum: '129d3fb438649c09329cbe3784488d45524e8444bd148a8ea30fb9ba3d5d87d0a12adf332031332ae993c6387e7cd55fcd1b9c4816dc259378e2815a39f9163c'
        },
        addresses: {
          cosmos: '8de101d82487df25daacf63826763dee81b2d3bb',
          bitcoin: '12AbwWMpWENCyw3ZRNxpVzQkYLujXjwaJv',
          ethereum: '0x10362d809a0e0364921e988fac49d97ed7e99d5b'
        }
      }
    ]

    for (var i = 0; i < seeds.length; i++) {
      var knownWallet = seeds[i]
      var seed = knownWallet.seed
      var wallet = cfr.deriveWallet(seed)
      for (var network in knownWallet.privateKeys) {
        t.equal(
          toHex(wallet.privateKeys[network]),
          knownWallet.privateKeys[network],
          'correct private key for ' + network)
        t.equal(
          toHex(wallet.publicKeys[network]),
          knownWallet.publicKeys[network],
          'correct public key for ' + network)
        t.equal(
          wallet.addresses[network],
          knownWallet.addresses[network],
          'correct address for ' + network)
      }
    }
    t.end()
  })

  t.test('derive with short seed', function (t) {
    try {
      var badSeed = 'meat earth crazy equal mouse follow'
      cfr.deriveWallet(badSeed)
      t.fail('should have thrown')
    } catch (err) {
      t.ok(err, 'error was thrown')
      t.equal(err.message, 'Seed must be at least 12 words', 'correct error message')
    }
    t.end()
  })

  t.end()
})
