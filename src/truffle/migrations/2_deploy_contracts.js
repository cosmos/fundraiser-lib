var Web3 = require('../../../node_modules/web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));


var Fundraiser = artifacts.require("./Fundraiser.sol");

var blockNum = web3.eth.blockNumber;

var periodBlocks = 4
var beginBlockIn = 4

var atomRate = 5;

var beginBlock = blockNum + beginBlockIn;
var endBlock = beginBlock + periodBlocks
var accounts = web3.eth.accounts;
var admin = accounts[0];
var treasury = accounts[1];
console.log("ACCOUNTS", accounts)

module.exports = function(deployer) {
  console.log("Height before deployment", blockNum);
  deployer.deploy(Fundraiser, admin, treasury, beginBlock, endBlock, atomRate);
};
