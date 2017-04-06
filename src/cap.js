const request = require('request')
const { EXODUS_ADDRESS, insightRequest } = require('./bitcoin.js')
const { ethCall } = require('./ethereum.js')

function totalRaised(cb) {
  insightRequest('GET', `addr/${EXODUS_ADDRESS}`, null, (err, res) => {
    if (err) return cb(err)
    let btcBalance = res.balance
    ethCall('', 'totalWei', (err, res) => {
      if (err) return cb(err)
      let divisor = 1e18
      let etherBalance = parseInt(res, 16) / divisor
      fetchPrice('bitcoin', (err, res) => {
        if (err) cb(err)
        btcPrice = res
        fetchPrice('ethereum', (err, res) => {
          if (err) cb(err)
          ethPrice = res
          let total = ethPrice * etherBalance + btcPrice * btcBalance
          console.log('BTC', btcBalance, '@', btcPrice)
          console.log('ETH', etherBalance, '@', ethPrice)
          console.log('USD', total)
	})
      })
    })
  })  
}

function fetchPrice (coin, cb) {
  request({
    method:'GET',
    url: `https://api.coinmarketcap.com/v1/ticker/${coin}/`,
  }, (err, res, body) => {
    if (err) cb(err)
    if (res.statusCode !== 200) {
      cb(res.statusCode)
    }
    try {
      body = JSON.parse(body)
    } catch (err) { cb(err) }
    price = body[0].price_usd
    cb(null, price)
  })
}
    
    
totalRaised((err, res)=>{})
