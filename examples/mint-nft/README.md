# mint-nft

This example shows how to mint a simple NFT with Blockfrost SDK for Node.js and Cardano Serialization Lib.

Blockfrost SDK is used to retrieve UTxO for an address, protocol parameters, current slot number to compute TTL and finally to push a transaction to the blockchain. Minted NFT follows [CIP-25 v2](https://cips.cardano.org/cips/cip25/) metadata standard and the NFT's image is uploaded to IPFS and pinned upon successful mint.

Constructing the transaction itself is done with [Cardano Serialization Lib](https://github.com/Emurgo/cardano-serialization-lib).
You should definitely follow its documentation and examples for more information.

_This example is written in Typescript and it is intended to run on Node.js, not in a browser. Follow the instructions below to run it._

## Disclaimer

This example is intended for learning purposes, not for practical use.

**You should not run this code with your real seed using real coins. The funds are NOT safu. They will be lost.**

## How to use

_These instructions assume that you already have Node.js installed and you are already familiar with running hello world on Node.js._

Clone the main Blockfrost examples repository

```
git clone git@github.com:blockfrost/blockfrost-js-examples.git
```

Change directory to cloned repository `blockfrost-js-examples`

```
cd blockfrost-js-examples
```

Install dependencies

```
yarn
```

Now check the source code! You don't want to run something you know nothing about, right? RIGHT?

In [./src/index.ts](https://github.com/blockfrost/blockfrost-js-examples/blob/master/examples/mint-nft/src/index.ts) you will find few constants that you can play with. Changing `MNEMONIC` is highly recommended because your transaction will likely fail if multiple people are building their transactions using the same seed, thus UTxO.

```js
// BIP39 mnemonic (seed) from which we will generate address to retrieve UTxO from and private key used for signing the transaction
const MNEMONIC = 'maze riot drift silver field sadness shrimp affair whip embody odor damp';

// Recipient address (needs to be in Bech32)
// MINTED NFT WILL BE SENT TO THIS ADDRESS
// This is technically an airdrop if the address is not yours!
const OUTPUT_ADDRESS =
  'addr_test1qrzpr05qz7u7572hkyxl9gqrk90lgueftufaqk3glqswurq32vrcvj0rgef6s487ruu47me8uzp7cjvuuk2xsg4mtvsq50gf90';

// Path to the image for the asset which will be uploaded to IPFS, defaults to blockfrost logo in the repo
const IMAGE_PATH = './blockfrost.svg';
```

Set your Blockfrost api key to environment variable `BLOCKFROST_PROJECT_ID` and `BLOCKFROST_PROJECT_ID_IPFS` and run the script

```
yarn workspace @blockfrost/example-mint-nft start
```

It may happen that the default (or your own) seed doesn't hold enough funds on its first address derived with derivation path `m/1852'/1815'/0'/0/0` (common derivation path used by wallets). In that case the address will be displayed in the console. You can get some tADA from [Cardano testnet faucet](https://testnets.cardano.org/en/testnets/cardano/tools/faucet/).
