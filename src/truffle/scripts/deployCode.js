const cli = require('cli')
const fs = require("fs");
const solc = require('solc')

var Web3 = require('web3');
var web3 = new Web3();

let source = fs.readFileSync('../contracts/Fundraiser.sol', 'utf8');
let compiledContract = solc.compile(source, 1);
let abi = compiledContract.contracts[':Fundraiser'].interface;
let bytecode = compiledContract.contracts[':Fundraiser'].bytecode;
let MyContract = web3.eth.contract(JSON.parse(abi));

// Fundraiser takes some arguments to assign control and begin/end blocks
cli.parse({
    admin: [ 'a', 'Admin address', 'string', "" ],          
    treasury: [ 't', 'Treasury address', 'string', ""],                 
    begin: [ 'b', 'Begin block', 'int', 0],                 
    end: [ 'e', 'End block', 'int', 0],                 
});


var admin = cli.options.admin;
var treasury = cli.options.treasury;
var beginBlock = cli.options.begin;
var endBlock = cli.options.end;

// output the gas and tx data to deploy the contract
var deployData = MyContract.new.getData(admin, treasury, beginBlock, endBlock, {data:bytecode});
txObject = {
	gas: 600000,
	data: "0x"+deployData 
}
console.log(JSON.stringify(txObject));

