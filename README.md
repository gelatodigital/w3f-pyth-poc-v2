
# Gelato Web3 functions <<-->> Pyth PoC

## Summary

Smart Oracle that using Pyth Network and Gelato Web3 functions to:
- Push on-chain a price every hour
- If since the last push, the price change is greater or equal to 2% in both directions, a new price will be pushed

## Demo
- Mumbai:
  - Smart Contract: [https://mumbai.polygonscan.com/address/0x4c1b1ae4b671d7a778dcddcdc62a14940ec438ba](https://mumbai.polygonscan.com/address/0x4c1b1ae4b671d7a778dcddcdc62a14940ec438ba)
  - Web3 Function: [https://beta.app.gelato.network/task/0x98a2402baabf9bd94d27a804a68ca2ac61a907b518a5c3168d9c94f808bcfb2d?chainId=80001](https://beta.app.gelato.network/task/0x98a2402baabf9bd94d27a804a68ca2ac61a907b518a5c3168d9c94f808bcfb2d?chainId=80001)

## Deploy your smart contract and web3 function
```
yarn run deploy 
```

## How to run

1. Install project dependencies:
```
yarn install
```

2. Create a `.env` file with your private config:
```
cp .env.example .env
```
You will need to input your `PROVIDER_URL`, your RPC.


3. Test the  web3 function
```
npx w3f test src/web3-functions/pyth-price-change/index.ts --logs
```

4. Deploy the web3 function on IPFS
```
npx w3f deploy src/web3-functions/pyth-price-change/index.ts
```

5. Create the task following the link provided when deploying the web3 to IPFS in our case:
```
https://beta.app.gelato.network/new-task?cid=QmUJyKVCCGSPPdZpjsifDXs8mxMpYwVLTG7eh3uBe45hEH
```