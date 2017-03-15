var test = require('tape')
var cfr = require('../')

function fromHex (hex) {
  return Buffer(hex, 'hex')
}

function toHex (buf) {
  return buf.toString('hex')
}

test('generate wallet seed', function (t) {
  t.test('seed is 32-byte Buffer', function (t) {
    var seed = cfr.generateSeed()
    t.equal(seed.length, 32, 'correct length')
    t.ok(Buffer.isBuffer(seed), 'is Buffer')
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
        seed: '98fbdbf2bb0ce2365dfce8c2a17bee6ae80dc5547ce6ced4c3956df086e488c6',
        privateKeys: {
          cosmos: 'efe50934d37ac358b64c8820c54d3e272174cc5a49c7166e9d5e49e68af2555b',
          ethereum: '4acff6dc69e01998a83d988d9f7e6b20833568c9c99c019460e71df29a084b9f',
          bitcoin: '25add62cb3c603427fd974ef5918e24dc5afc89b6488b26c75683ee1fa29b33c'
        },
        publicKeys: {
          cosmos: '03c310ee809aeea3c9e0b104016b88df1eeff725e07e6cc9cd55516ae1b58964bf',
          ethereum: '04bfc5687ebc60f4bce5b03d9748062db3f45215ac995472c607a27c3740f7078073c3a5b52cce14e88540e9c361d7ace95cd96cfe9cbb11480b5086fb20ead978',
          bitcoin: '03f713e2a265185a2c03d03aea880dbadfc2764b92b0784b5333ac9f26f5886a6c'
        },
        addresses: {
          cosmos: '3563c96efad31f7f769cd552143c73ea79d9aeca',
          bitcoin: '18MrALeZbtwigqzaR3npjUAPGS825zHnL4',
          ethereum: '0x9a847dc1bf78bf395b34133bd2f7cc451e315e3a'
        }
      },
      {
        seed: 'e5018474823c421c26ae18b0c02c9ac3eff60e65a6f5e3a1b664966e22dd6c3f',
        privateKeys: {
          cosmos: 'b4df2d1839c8a065bbf2502698a05bd3e42bfe465717c580c7b77b0add00f43a',
          ethereum: '71c17e6046e7ae57583ed129154cc648ba2a5995ab38acdf2c44ae7ccca01ce8',
          bitcoin: '68af4858d6469b910290e2bf09ac14520b004c700af67f52c9bd7745920d0c03'
        },
        publicKeys: {
          cosmos: '024fc1aa6e08ef807c00fb15b607dc53860e6ad4b752ae97e17f22a9a3ddba34e8',
          ethereum: '0446b6336165d454f2acc0aa257d0546bb367aae513a6308915b135be162a1c7fa7f8ca19413578191728afc770af0aa0e0a8d5b740f457cf18e67f2c84a034721',
          bitcoin: '0295f7da26b2d44a9269bf0d84f12175736956552fa43f5084dc66f69fc12540b2'
        },
        addresses: {
          cosmos: '49382851b65a3f900d379c0de9b2600bb2ed71f1',
          bitcoin: '13341SMXVz8Y6v2uUuvH3UATMEmbShy1Qe',
          ethereum: '0x91593561c6b0bacb8a77902d873894d23b6a50bc'
        }
      },
      {
        seed: '0ca7b9cbbdd8fde87f53cde965f5cadd331d588537936e860894476289cf68d1',
        privateKeys: {
          cosmos: 'abbf5408a411996d180baf8e1c95db4de785aac5735888d099739d8ebdcd7436',
          ethereum: 'a9dad59c8d9023b39ba8e9a497133d7a9eaec9eacedb60034cbfe991b0a7a649',
          bitcoin: 'cf49d8b5bb07b405c4188ffda9df6f16dccbbdffa165765b2fadd0b8cf43f0be'
        },
        publicKeys: {
          cosmos: '024ceec63a4b0d19df11a29299722fe8a88dde4f63a549eb170605b8664f62ed0b',
          ethereum: '046f71e90137a48175b28ee81ff455f8e174dd9eaca2ea40a9114933a827d5f3ce06bed9a232fae6ff92a11854041de004c175b9e358cf8c54281d46148e89c568',
          bitcoin: '025b23e8e3e2d240c4171212fb033b131de6f3b86d2b96d5d57a6545e2862e3f97'
        },
        addresses: {
          cosmos: '47aad8102368194bf05eb3d773362fa5e3f1d51a',
          bitcoin: '1K8UADWUWYEbsvoESwKFc4Nhkwm5rhoHy6',
          ethereum: '0x0242e52bdf2190bea808d13dd55d45035555669e'
        }
      }
    ]

    for (var i = 0; i < seeds.length; i++) {
      var knownWallet = seeds[i]
      var seed = fromHex(knownWallet.seed)
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
      var badSeed = Buffer(28)
      cfr.deriveWallet(badSeed)
      t.fail('should have thrown')
    } catch (err) {
      t.ok(err, 'error was thrown')
      t.equal(err.message, 'Seed must be at least 32 bytes', 'correct error message')
    }
    t.end()
  })

  t.end()
})

test('wallet encryption/decryption succeeds', function (t) {
  t.test('encrypt -> decrypt', function (t) {
    var seed = cfr.generateSeed()
    var password = 'hunter2'
    var start = Date.now()
    cfr.encryptSeed(seed, password, function (err, encrypted) {
      t.error(err)
      var elapsed = Date.now() - start
      t.ok(elapsed > 100, 'key derivation/encryption took longer than 100ms')
      start = Date.now()
      cfr.decryptSeed(encrypted, password, function (err, decrypted) {
        t.error(err)
        elapsed = Date.now() - start
        t.ok(elapsed > 100, 'key derivation/decryption took longer than 100ms')
        t.equal(
          decrypted.toString('hex'),
          seed.toString('hex'),
          'decryption returned correct seed')
        t.equal()
        t.end()
      })
    })
  })

  function encryptThenTweak (property) {
    t.test('decrypt fails when using tweaked ' + property, function (t) {
      var seed = cfr.generateSeed()
      var password = 'password123'
      cfr.encryptSeed(seed, password, function (err, encrypted) {
        t.error(err)
        encrypted[property][0] ^= 1
        cfr.decryptSeed(encrypted, password, function (err, decrypted) {
          t.ok(err, 'got error')
          t.end()
        })
      })
    })
  }
  encryptThenTweak('encryptedSeed')
  encryptThenTweak('salt')
  encryptThenTweak('iv')
  encryptThenTweak('authTag')

  t.test('decrypt known encrypted seeds', function (t) {
    var seeds = [
      {
        seed: 'ffc7ef2df187f2fca668ca76d1ab2802b6cfd8f027dfadc9b92a0ce2a17535f1',
        encrypted: {
          encryptedSeed: fromHex('0dea87c31c124a14d038e8267aa9532f3d6cfa477941e7d4ba8468466ab11460'),
          salt: fromHex('8460a604d16866d0a6640fe6813f9a161661a5e2052101c35635c94f5d696ab7'),
          iv: fromHex('cec3f184fb423f97ba455c78'),
          authTag: fromHex('c75e24fd46e4ca0c78e4667d64aff501')
        }
      },
      {
        seed: '89c0b6d86ddd5d7d1baa48a813015ec8771a8a8e87bfeb691f703b533dc68493',
        encrypted: {
          encryptedSeed: fromHex('a056ef37f535ac1dbc5bafa5560f46b6abd19c2dc1ef6da4f65b6ab40236ba5e'),
          salt: fromHex('870be68721e1c91ca1e5f202fbd918d1a6d191a2279196a704c92fdd9b794229'),
          iv: fromHex('adcc4c9e3c2567250f3e0075'),
          authTag: fromHex('9dc5e3fdca5964dc42c304cdd1e5f5f6')
        }
      },
      {
        seed: 'b3fbf802cc529c21dc85cdbd587c4b2f6b23b5737b8d4297558cbe222a895fac',
        encrypted: {
          encryptedSeed: fromHex('d30c7b6cb1eb4053247515f90371e3a032971cb8fdcc13283af4a165eea9c39c'),
          salt: fromHex('290c68d4ad0fbe84967024e0058e3379f378d0f1b87601c4832fb458771dba49'),
          iv: fromHex('7a6572f9f70f29e59e0f3ecc'),
          authTag: fromHex('05c3aec72fe3bd0c04aca796c728ddf7')
        }
      }
    ]
    t.plan(seeds.length * 2)
    for (var i = 0; i < seeds.length; i++) {
      cfr.decryptSeed(seeds[i].encrypted, 'password', function (err, decrypted) {
        t.error(err)
        t.equal(
          decrypted.toString('hex'),
          seeds[i].seed,
          'decrypted to correct value')
      })
    }
  })

  t.end()
})

test('wallet encode/decode', function (t) {
  t.test('encode -> decode', function (t) {
    t.plan(7)
    var seed = cfr.generateSeed()
    cfr.encryptSeed(seed, 'password', function (err, encrypted) {
      t.error(err)
      var encoded = cfr.encodeWallet(encrypted)
      t.ok(Buffer.isBuffer(encoded), 'returned bytes are Buffer')
      t.equal(encoded.length, 96, 'encoded to correct length')
      var decoded = cfr.decodeWallet(encoded)
      t.equal(
        toHex(decoded.encryptedSeed),
        toHex(encrypted.encryptedSeed),
        'correct decoded encryptedSeed')
      t.equal(
        toHex(decoded.salt),
        toHex(encrypted.salt),
        'correct decoded salt')
      t.equal(
        toHex(decoded.iv),
        toHex(encrypted.iv),
        'correct decoded iv')
      t.equal(
        toHex(decoded.authTag),
        toHex(encrypted.authTag),
        'correct decoded authTag')
    })
  })

  t.end()
})
