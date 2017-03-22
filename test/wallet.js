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

      { seed: 'barrel original fuel morning among eternal filter ball stove pluck matrix mechanic',
        privateKeys:
        { cosmos: 'bfcb217c058d8bbafd5e186eae936106ca3e943889b0b4a093ae13822fd3170c',
          bitcoin: 'e77c3de76965ad89997451de97b95bb65ede23a6bf185a55d80363d92ee37c3d',
          ethereum: '7fc4d8a8146dea344ba04c593517d3f377fa6cded36cd55aee0a0bb968e651bc' },
        publicKeys:
        { cosmos: '02c44af294758a8404fda5107ae43b7ef21b2118174d22e2fad903f2e716d3d148',
          bitcoin: '0338e8415fb5753747af754024cc7c71902eb5346f09691af3bca2381c1844284c',
          ethereum: 'db419050683648df460b29fc8290b7b623d353af7e3b67e35feec12ccb0aeb8ae7a396af03bd79156a4a57a1c6269bba77818d73ba0e49aaca1e2c45b3f971b2' },
        addresses:
        { cosmos: 'be7434e29d0dcb806309c6d515c1042bb3de76c3',
          bitcoin: '146qwoCJBh5DWxHXVs7z29fhvzoyfPmsrM',
          ethereum: '0x3bf1ae4923e042bedc85fa16f2fbac8725a59efa' } },

      { seed: 'drill direct lady member also flash cause leave fault route enroll mention',
        privateKeys:
        { cosmos: '1ea54a90375cceea7a7cb653e1bf1822bc951d9ad32c526e6e11d87451230c7f',
          bitcoin: '87611eebc634ae056a346d4d005fc58d2c18d5575a93988fe4862a50a32222d3',
          ethereum: '3b5752c35f34c1cbe6d0863b8d318c011a699d8b65ec592eceedbe07bebcfcd4' },
        publicKeys:
        { cosmos: '02468d2b7aeeb2574d8e2ebdbed55475713ce875b0e70a1eb89c294013df3b400f',
          bitcoin: '021ca3f748d7768cb35c07d332a5ec07a6c6ec90f0bbc34e4ba72fac1093554c71',
          ethereum: '699aa4c4855483dea3e7d9fc09e9609f8bdffd292aa06a26d4ae9c57c6a1d991c055459ea87aa6c68fcddee86095b639f46f0a7fd0f36817b7b472d07dd5890f' },
        addresses:
        { cosmos: 'e412a91ab5a0daa203336a5acdaac78971351b71',
          bitcoin: '14u4chMHUK8rnaHoH25JpSYcyjLYZCnfh4',
          ethereum: '0x5506a84991e75aacb84fc6a18da2d47554a7944c' } },

      { seed: 'faint person illness welcome clump oil acoustic cycle common dash also essay',
        privateKeys:
        { cosmos: 'f90019f199a8aca8662192ab417420e5f30843c9e0ffcd03d535dd25d2c06fa0',
          bitcoin: '71cdb6490c83f85dfd64dc0f97471b1f3ddaa9b5ed7cab844d5aa1e7122cbc6d',
          ethereum: '8320bcdd421b2e0ecd17b1b1771cdd07a1c7160a3add7f70697a36342ad6157e' },
        publicKeys:
        { cosmos: '03b98c37504d1aed954c9feb038fa7f86a02ca7b2edbc1a1d2230ab62fac9700e9',
          bitcoin: '03dd79679acec40c0b77e9e71490a0c5e8d03df9f7295e423bb95bcf26afb39629',
          ethereum: 'b189b08b36a0909ce42f6758b504c130e427704dcd039d1f33a74d86872dbf9947314603c8707f4210d05a8949566e037f8b2a6b3dc4eacb300bb364ae99423d' },
        addresses:
        { cosmos: '6947641b402ca8fad54b38249f227710b1da9591',
          bitcoin: '15YYtvg7XP8Tbn6SeYVbZkz6wqyEFBKkCj',
          ethereum: '0x0837b1b4d82a319261405aff850965ed15d57d70' } }

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
