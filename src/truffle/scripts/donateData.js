const cli = require('cli')
const eth = require('../../ethereum.js')

cli.parse({
    cosmos: [ 'c', 'Cosmos address', 'string', "" ],          
    ether: [ 'e', 'Eth address for returns', 'string', ""],                 
});


var cosmosAddr = cli.options.cosmos;
var etherAddr = cli.options.ether;

console.log(eth.getTransactionData(cosmosAddr, etherAddr))
