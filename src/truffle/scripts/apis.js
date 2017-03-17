const cli = require('cli')
const eth = require('../../ethereum.js')

cli.parse({
    addr: [ 'a', 'Contract address', 'string', "" ],          
});

var addr = cli.options.addr;

eth.fetchAtomRate(addr, function(err, r){
	if (err){
	  console.log("ERR", err);
	} else {
	  console.log("ATOM RATE:", r);
	}
})

eth.fetchTotals(addr, function(err, r){
	if (err){
	  console.log("ERR", err);
	} else {
	  console.log("Totals:", r);
	}
})

eth.fetchTxs(addr, function(err, r){
	if (err){
	  console.log("ERR", err);
	} else {
	  console.log("Txs:", r);
	}
})
