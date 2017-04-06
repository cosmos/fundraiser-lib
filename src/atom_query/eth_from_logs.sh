curl --data '{"method":"eth_newFilter","params":[{"fromBlock":"0x3520f2","toBlock":"0x354032","address":"0xcf965cfe7c30323e9c9e41d4e398e2167506f764","topics":["0x14432f6e1dc0e8c1f4c0d81c69cecc80c0bea817a74482492b0211392478ab9b"]}],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST localhost:8545 




curl --data '{"method":"eth_getFilterLogs","params":["0x1"],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST localhost:8545 > eth.tx



