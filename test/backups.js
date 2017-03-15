var test = require('tape')
var cfr = require('../')

test('sendEmail with improper wallet type', function (t) {
  cfr.sendEmail('email@domain.com', 'not a Buffer', function (err) {
    t.ok(err, 'got error')
    t.equal(err.message, 'wallet must be a Buffer', 'correct error message')
    t.end()
  })
})

// TODO: uncomment when we are granted permission from AWS to send to unconfirmed email addresses
// var request = require('request')
// var sendEmail = require('../').sendEmail
// test('send email', function (t) {
//   var emailName = Math.random().toString(36).slice(2)
//   var emailAddress = emailName + '@mailinator.com'
//   var seed = cfr.generateSeed()
//
//   var tries = 0
//   function waitForEmail (cb) {
//     request({
//       url: 'https://www.mailinator.com/api/webinbox2?x=0&public_to=' + emailName,
//       json: true
//     }, function (err, res, data) {
//       if (err || res.statusCode !== 200) {
//         return cb(err || Error(res.statusCode))
//       }
//       if (data.public_msgs.length === 0) {
//         tries += 1
//         if (tries >= 5) return cb('did not receive email')
//         return setTimeout(waitForEmail.bind(null, cb), 2000)
//       }
//       cb(null, data.public_msgs[0])
//     })
//   }
//
//   cfr.encryptSeed(seed, 'password', function (err, encrypted) {
//     t.error(err, 'no error')
//     var wallet = cfr.encodeWallet(encrypted)
//     sendEmail(emailAddress, wallet, function (err) {
//       t.error(err, 'no error')
//       waitForEmail(function (err, email) {
//         t.pass('received email')
//         t.error(err, 'no error')
//         console.log(email)
//         t.end()
//       })
//     })
//   })
// })
