const cli = require('cli')
const fs = require("fs");
const solc = require('solc')

var Web3 = require('../../node_modeuls/web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let source = fs.readFileSync('contracts/Fundraiser.sol', 'utf8');
let compiledContract = solc.compile(source, 1);
let abi = compiledContract.contracts[':Fundraiser'].interface;
let bytecode = compiledContract.contracts[':Fundraiser'].bytecode;
let gasEstimate = web3.eth.estimateGas({data: bytecode});
let MyContract = web3.eth.contract(JSON.parse(abi));

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

console.log("GAS:", gasEstimate*10);

var deployData = MyContract.new.getData(admin, treasury, beginBlock, endBlock, {data:bytecode});
console.log("DEPLOY CODE:");
console.log("--------");
console.log(deployData);
console.log("--------");
