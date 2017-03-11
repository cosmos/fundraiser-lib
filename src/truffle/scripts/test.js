const fs = require("fs");
const solc = require('solc')
const leftPad = require('left-pad');
const xor = require('bitwise-xor');

var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let source = fs.readFileSync('Fundraiser.sol', 'utf8');
let compiledContract = solc.compile(source, 1);
let abi = compiledContract.contracts[':Fundraiser'].interface;
let bytecode = compiledContract.contracts[':Fundraiser'].bytecode;
let gasEstimate = web3.eth.estimateGas({data: bytecode});
let MyContract = web3.eth.contract(JSON.parse(abi));

console.log("ABI", abi)
console.log("CONTRACT", MyContract);

var accounts = web3.eth.accounts;
var admin = accounts[0];
var treasury = accounts[1];
console.log("ACCOUNTS", accounts)

var blockNum = web3.eth.blockNumber;
var periodBlocks = 4;
var beginBlockIn = 0;
var beginBlock = blockNum + beginBlockIn;
var endBlock = beginBlock + periodBlocks;


console.log("--------");
var deployData = MyContract.new.getData(admin, treasury, beginBlock, endBlock, {data:bytecode});
console.log("DEPLOY CODE:");
console.log(deployData);
console.log("--------");

var acc1 = accounts[2];
var acc2 = accounts[3];
// checksum is sha3(xor(cosmosAddr, returnEthAddr)
paddedAcc1 = leftPad(web3.toAscii(acc1),32, '\x00');
paddedAcc2 = leftPad(web3.toAscii(acc2),32, '\x00');
xord = xor(new Buffer(paddedAcc1, 'ascii'), new Buffer(paddedAcc2, 'ascii'));
checksum = web3.sha3(xord.toString('hex'), {encoding: 'hex'}); 
console.log("ADDRS", acc1, acc2, checksum)

var donationValue = 200000000000000000;


web3.eth.sendTransaction({from:admin, gas:gasEstimate*10, data:deployData}, function(err, txHash){
	console.log("txhash", txHash);
	var r = web3.eth.getTransactionReceipt(txHash);
	console.log("receipt", r);
	var contractInstance = MyContract.at(r.contractAddress);
	console.log("address", contractInstance.address);
	console.log("--------");
	console.log("contract", contractInstance)
	console.log("--------");
	var txData = contractInstance.donate.getData(acc1, acc2, checksum);
	console.log("txdata", txData);
	web3.eth.sendTransaction({from:accounts[4], to: contractInstance.address, gas:gasEstimate*10, data:txData, value:donationValue})
	//contractInstance.donate(acc1,acc2,checksum,{gas:gasEstimate*10,value:donationValue, from:accounts[4]});
	console.log(contractInstance.record.call(acc1));
});


/*
var myContractReturned = MyContract.new(admin, treasury, beginBlock, endBlock, {
   from:admin,
   data:bytecode,
   gas:gasEstimate*10}, function(err, myContract){
    if(!err) {
       // NOTE: The callback will fire twice!
       // Once the contract has the transactionHash property set and once its deployed on an address.

       // e.g. check tx hash on the first call (transaction send)
       if(!myContract.address) {
           console.log(myContract.transactionHash) // The hash of the transaction, which deploys the contract

       // check address on the second call (contract deployed)
       } else {
           console.log("ADDRESS", myContract.address) // the contract address
    	   console.log("admin", myContract.admin.call());
       }

       // Note that the returned "myContractReturned" === "myContract",
       // so the returned "myContractReturned" object will also get the address set.
    }

  });
*/


