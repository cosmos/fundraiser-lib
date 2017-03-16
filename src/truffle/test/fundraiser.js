const leftPad = require('left-pad');
const xor = require('bitwise-xor');


var Web3 = require('../../node_modules/web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

var Fundraiser = artifacts.require("./Fundraiser.sol");

periodBlocks = 4
beginBlockIn = 2
endBlockIn = beginBlockIn + periodBlocks

contract('Fundraiser', function(accounts) {
  admin = accounts[0];
  treasury = accounts[1];
  otherAccount = accounts[2];

  it("should set the admin, the treasury, and the block heights", function() {
    var meta;

    blockNum = web3.eth.blockNumber
    console.log("Height for test", blockNum);
    console.log("period begins at", blockNum+beginBlockIn);
    console.log("period ends at", blockNum+endBlockIn);

    return Fundraiser.deployed().then(function(instance) {
      meta = instance;
      return meta.admin.call();
    }).then(function(_admin) {
      assert.equal(_admin, admin, "admin was not set correctly");
      return meta.treasury.call();
    }).then(function(_treasury) {
      assert.equal(_treasury, treasury, "treasury was not set correctly");
      return meta.beginBlock.call();
    }).then(function(beginBlock) {
      assert.equal(beginBlock, blockNum+beginBlockIn, "beginBlock was not set correctly");
      return meta.endBlock.call();
    }).then(function(endBlock) {
      assert.equal(endBlock, blockNum+endBlockIn, "endBlock was not set correctly");
    });
  });
});

contract('Fundraiser', function(accounts) {
  admin = accounts[0];
  treasury = accounts[1];
  otherAccount = accounts[2];

  it("should only let the admin halt, and only during the period", function() {
    var meta;

    blockNum = web3.eth.blockNumber
    console.log("Height for test", blockNum);
    console.log("period begins at", blockNum+beginBlockIn);
    console.log("period ends at", blockNum+endBlockIn);

    return Fundraiser.deployed().then(function(instance) {
      meta = instance;

      console.log("blockNum", web3.eth.blockNumber);
      // try to halt before the period - should throw
      return meta.halt({from:admin}); 
    }).then(function(returnValue) {
      assert(false, "halt was supposed to throw for before period but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
        // call halt with non admin, should throw
        console.log("height", web3.eth.blockNumber, " calling halt() with non-admin");
        return meta.halt({from: otherAccount}); 
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(returnValue) {
      assert(false, "halt was supposed to throw for non-admin but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
        // call halt with admin, should halt
        console.log("height", web3.eth.blockNumber, " calling halt() with admin");
        return meta.halt({from: admin}); 
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(halted){
      console.log("height", web3.eth.blockNumber);
      console.log("calling isHalted");
      return meta.isHalted.call();
    }).catch(function(error){
      console.log("failed halt()", error);	    
      assert(false, "halt was not supposed to fail");
    }).then(function(ishalted) {
      assert.equal(ishalted, true, "isHalted was supposed to be set to true");

      // call unhalt with non admin, should throw
      console.log("height", web3.eth.blockNumber, " calling unhalt() with non-admin");
      return meta.unhalt({from: otherAccount}); 
    }).then(function(returnValue) {
      assert(false, "unhalt was supposed to throw for non-admin but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
        // call unhalt with admin, should unhalt
        console.log("height", web3.eth.blockNumber, " calling unhalt() with admin");
        return meta.unhalt({from: admin}); 
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(halted){
      console.log("height", web3.eth.blockNumber, "calling isHalted");
      return meta.isHalted.call();
    }).catch(function(error){
      console.log("failed unhalt()", error);	    
      assert(false, "unhalt was not supposed to fail");
    }).then(function(ishalted){
      console.log('ishalted', ishalted, 'height', web3.eth.blockNumber);
      assert.equal(ishalted, false, "isHalted was supposed to be set to false");

      // one more halt should fail now that period is up
      return meta.halt({from:admin}); 
    }).then(function(returnValue) {
      assert(false, "halt was supposed to throw now that period ended but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    });
  });
});

contract('Fundraiser', function(accounts) {
  admin = accounts[0];
  treasury = accounts[1];
  otherAccount = accounts[2];

  it("fallback function should throw before, during, and after period", function() {
    var meta;

    blockNum = web3.eth.blockNumber;
    console.log("-----");
    console.log("Height for test", blockNum);
    console.log("period begins at", blockNum+beginBlockIn);
    console.log("period ends at", blockNum+endBlockIn);

    return Fundraiser.deployed().then(function(instance) {
      meta = instance;

      // sendTransaction to the contract should fail
      console.log("height", web3.eth.blockNumber);
      console.log("address", meta.address);
      console.log("admin", admin);
      return web3.eth.sendTransaction({from:admin, to:meta.address});
    }).then(function(returnValue) {
      assert(false, "sendTransaction to the contract was supposed to throw before the period starts but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
	// bump a block so the period starts
	console.log("height", web3.eth.blockNumber, "bump")
        return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(r) {

      // sendTransaction to the contract should fail, even during period
      console.log("height", web3.eth.blockNumber);
      return web3.eth.sendTransaction({from:admin, to:meta.address});
    }).then(function(returnValue) {
      assert(false, "sendTransaction to the contract was supposed to throw during the period but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
	
        // bump a block
        return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(r){
      console.log('height', web3.eth.blockNumber);
      return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
    }).then(function(r){
      console.log('height', web3.eth.blockNumber);
      return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
    }).then(function(r){

      // now we're out of period. sendTransaction to the contract should still fail
      console.log("height", web3.eth.blockNumber);
      return web3.eth.sendTransaction({from:admin, to:meta.address});
    }).then(function(returnValue) {
      assert(false, "sendTransaction to the contract was supposed to throw after the period but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
	
	// done
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    });
  });
});

contract('Fundraiser', function(accounts) {
  admin = accounts[0];
  treasury = accounts[1];
  otherAccount = accounts[2];

  cosmosAddr = accounts[3];
  returnEthAddr = accounts[4];

  donationValue = 200000000000000000;

  // checksum is sha3(xor(cosmosAddr, returnEthAddr)
  paddedCosmos = leftPad(web3.toAscii(cosmosAddr),32, '\x00');
  paddedEth = leftPad(web3.toAscii(returnEthAddr),32, '\x00');
  xord = xor(new Buffer(paddedCosmos, 'ascii'), new Buffer(paddedEth, 'ascii'));
  checksum = web3.sha3(xord.toString('hex'), {encoding: 'hex'}); 
  console.log("ADDRS", cosmosAddr, returnEthAddr, checksum)

  it("should only accept donatins with the checksum", function() {
    var meta;

    blockNum = web3.eth.blockNumber;
    console.log("-----");
    console.log("Height for test", blockNum);
    console.log("period begins at", blockNum+beginBlockIn);
    console.log("period ends at", blockNum+endBlockIn);

    return Fundraiser.deployed().then(function(instance) {
      meta = instance;

      console.log("height", web3.eth.blockNumber);
      console.log("address", meta.address);
      console.log("admin", admin);

      // bump to start
      console.log("height", web3.eth.blockNumber, "bump")
      return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
    }).then(function(r) {

      // donate should fail for empty args
      console.log("height", web3.eth.blockNumber, "donate with empty args");
      return meta.donate(0x00, 0x00, 0x00, {value:donationValue, from:otherAccount});
    }).then(function(returnValue) {
      assert(false, "donate with empty args was supposed to throw but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
        // donate should fail for args with bad checksum
        console.log("height", web3.eth.blockNumber, "donate with bad checksum");
        return meta.donate(cosmosAddr, returnEthAddr, 0x00, {value:donationValue, from:otherAccount});
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(returnValue) {
      assert(false, "donate with bad checksum was supposed to throw but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
        // donate should pass with good checksum
        return meta.donate(cosmosAddr, returnEthAddr, checksum, {value: donationValue, from:otherAccount});
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(returnValue) {
        // donation went through! check everything is right
	return meta.total.call();
    }).catch(function(error) {
        assert(false, error.toString());
    }).then(function(returnValue) {
	assert(returnValue, donationValue, "total was not equal to donationValue");
	return meta.record.call(cosmosAddr);
    }).then(function(returnValue) {
	assert(returnValue, donationValue, "donationValue incorrect");
	return meta.returnAddresses.call(cosmosAddr);
    }).then(function(returnValue) {
	assert(returnValue, returnEthAddr, "returnEthAddr incorrect");

	// make another donation
        return meta.donate(cosmosAddr, returnEthAddr, checksum, {value: donationValue, from:otherAccount});
    }).then(function(returnValue) {
        // donation went through! check everything is right
	return meta.total.call();
    }).catch(function(error) {
        assert(false, error.toString());
    }).then(function(returnValue) {
	assert(returnValue, donationValue*2, "total was not equal to donationValue*2");
	return meta.record.call(cosmosAddr);
    }).then(function(returnValue) {
	assert(returnValue, donationValue*2, "donationValue incorrect");
	return meta.returnAddresses.call(cosmosAddr);
    }).then(function(returnValue) {
	assert(returnValue, returnEthAddr, "returnEthAddr incorrect");
	return web3.eth.getBalance(treasury);
    }).then(function(returnValue) {
	assert(returnValue, donationValue*2, "treasury balance incorrect");
	return web3.eth.getBalance(meta.address);
    }).then(function(returnValue) {
	assert(returnValue, 0, "contract balance incorrect");
    });
  });
});

// XXX: Run the kill tests last because they break the merkle tree (!)
contract('Fundraiser', function(accounts) {
  admin = accounts[0];
  treasury = accounts[1];
  otherAccount = accounts[2];

  it("should only let the admin kill, and only after the period", function() {
    var meta;

    blockNum = web3.eth.blockNumber;
    console.log("-----");
    console.log("Height for test", blockNum);
    console.log("period begins at", blockNum+beginBlockIn);
    console.log("period ends at", blockNum+endBlockIn);

    return Fundraiser.deployed().then(function(instance) {
      meta = instance;

      // try to kill before the period - should throw
      console.log("height", web3.eth.blockNumber, "kill before period");
      return meta.kill({from:admin}); 
    }).then(function(returnValue) {
      assert(false, "kill was supposed to throw before the period starts but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
	// bump a block so the period starts
	console.log("height", web3.eth.blockNumber, "bump")
        return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(r) {

      // call kill with admin during period, should throw
      console.log("height", web3.eth.blockNumber, " calling kill() with admin");
      return meta.kill({from: admin}); 
    }).then(function(returnValue) {
      assert(false, "kill was supposed to throw for admin during period but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
	
        // bump a block
        return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(r){
      console.log('height', web3.eth.blockNumber);
      return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
    }).then(function(r){
      console.log('height', web3.eth.blockNumber);
      return web3.eth.sendTransaction({from: accounts[0], to: accounts[1], data: "00"})
    }).then(function(r){

      // now we're out of period. non-admin should not be able to kill
      console.log('height', web3.eth.blockNumber);
      return meta.kill({from:otherAccount});
    }).then(function(returnValue) {
      assert(false, "kill was supposed to throw for non-admin after period but didn't.");
    }).catch(function(error) {
      if(error.toString().indexOf("invalid JUMP") != -1) {
	
        // now we're out of period. admin should be able to kill
	return meta.kill({from:admin});
      } else {
        // if the error is something else (e.g., the assert from previous promise), then we fail the test
        assert(false, error.toString());
      }
    }).then(function(killed){
      console.log('killed. height', web3.eth.blockNumber);
      // woo 
    }).catch(function(error){
      assert(false, "kill was supposed to work but threw");
    });
  });
});
