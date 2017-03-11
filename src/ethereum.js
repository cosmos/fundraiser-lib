const leftPad = require('left-pad');
const xor = require('bitwise-xor');

var Web3 = require('web3');
var web3 = new Web3();

const { sha3 } = require('./hash.js')

function getAddress (pub) {
  return '0x' + sha3(pub).slice(-20).toString('hex')
}

//------------------------
// load the contract abi
// we only care about one function
var abi = [{
      "constant": false,
      "inputs": [
        {
          "name": "_donor",
          "type": "address"
        },
        {
          "name": "_returnAddress",
          "type": "address"
        },
        {
          "name": "checksum",
          "type": "bytes32"
        }
      ],
      "name": "donate",
      "outputs": [],
      "payable": true,
      "type": "function"
    }
]

let MyContract = web3.eth.contract(abi);
var contractInstance = MyContract.at('0x00');

function getTransactionData(cosmosAddr, ethAddr){
	// checksum is sha3(xor(cosmosAddr, ethAddr)
	paddedCosmos = leftPad(web3.toAscii(cosmosAddr),32, '\x00');
	paddedEth = leftPad(web3.toAscii(ethAddr),32, '\x00');
	xord = xor(new Buffer(paddedCosmos, 'ascii'), new Buffer(paddedEth, 'ascii'));
	checksum = web3.sha3(xord.toString('hex'), {encoding: 'hex'}); 

	return contractInstance.donate.getData(cosmosAddr, ethAddr, checksum);
}

module.exports = {
  getAddress,
  getTransactionData
}
