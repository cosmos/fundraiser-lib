const fs = require("fs");
const solc = require('solc')
const eth = require('../../ethereum.js')

// web3
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
var accounts = web3.eth.accounts;

// fundraiser params
var admin = accounts[0]
var treasury = accounts[1]
var beginBlock = 0
var endBlock = 10

// get bytecode and abi
let source = fs.readFileSync('../contracts/Fundraiser.sol', 'utf8');
let compiledContract = solc.compile(source, 1);
let abi = compiledContract.contracts[':Fundraiser'].interface;
let bytecode = compiledContract.contracts[':Fundraiser'].bytecode;
// let gasEstimate = web3.eth.estimateGas({data: bytecode});
let MyContract = web3.eth.contract(JSON.parse(abi));

// get deployData
var deployData = MyContract.new.getData(admin, treasury, beginBlock, endBlock, {data:bytecode});
txObject = {
	gas: 4696330,
	data: "0x"+deployData 
}
console.log(JSON.stringify(txObject));

// deploy the contract
txObject.from = accounts[4], // doesn't matter who deploys
web3.eth.sendTransaction(txObject, function(err, txHash){
	if (err) { console.log(err)};
	var r = web3.eth.getTransactionReceipt(txHash);
	var contractAddr = r.contractAddress;

	var acc1 = accounts[2]; // doesnt matter who we're donating for
	var acc2 = accounts[3];

	var txData = eth.getTransactionData(acc1, acc2);
	var donationValue = 200000000000000000;

	web3.eth.sendTransaction({from:accounts[4], to: contractAddr, gas:100000, data:txData, value:donationValue});

	// check
	// TODO: testing framework ...
	var contractInstance = MyContract.at(contractAddr);
	console.log(contractInstance.record.call(acc1));
});
