# Test the Fundraiser.sol

Truffle is great for excercising the smart contract.

Install truffle and testrpc.

```
npm install -g truffle
npm install -g ethereumjs-testrpc
```

In one window, run `testrpc`. In another, run `truffle test`

# Deploy the contract

Run `node scripts/deployCode.js --admin <admin> --treasury <treasury> --begin <beginBlock> --end <endBlock>`
to get the gas and txdata to deploy the contract. Deployment can be done manually anywhere.

# Generate tx data for a donation

Run `node scripts/donateData.js --cosmos <cosmosAddress> --ether <etherAddress>` to get the transaction data
for a donation on behalf of `<cosmosAddress>`.

# Test the deployment data and the lib (without truffle)

We can't use truffle because we don't want to assume that much - just want data for raw txs.
Run `node scripts/test.js`. Make sure `testrpc` is running. (TODO: use mocha or something). 
