// This example is written in Typescript.
// In order to run it on Node.js your need to compile the code first.
// Follow instructions in README
import { BlockFrostAPI, BlockfrostServerError } from '@blockfrost/blockfrost-js';

import { composeTransaction } from './helpers/composeTransaction';
import { signTransaction } from './helpers/signTransaction';
import { deriveAddressPrvKey, mnemonicToPrivateKey } from './helpers/key';
import { UTXO } from './types';

// BIP39 mnemonic (seed) from which we will generate address to retrieve utxo from and private key used for signing the transaction
const MNEMONIC = 'maze riot drift silver field sadness shrimp affair whip embody odor damp';

// Recipient address (needs to be Bech32)
const OUTPUT_ADDRESS =
  'addr_test1qrzpr05qz7u7572hkyxl9gqrk90lgueftufaqk3glqswurq32vrcvj0rgef6s487ruu47me8uzp7cjvuuk2xsg4mtvsq50gf90';

// Amount sent to the recipient
const OUTPUT_AMOUNT = '1000000'; // 1 000 000 lovelaces = 1 ADA

if (!process.env.BLOCKFROST_PROJECT_ID) {
  throw Error('Set env variable BLOCKFROST_PROJECT_ID');
}

const client = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_PROJECT_ID,
});

const run = async () => {
  // Derive an address (this is the address where you need to send ADA in order to have UTXO to actually make the transaction)
  const bip32PrvKey = mnemonicToPrivateKey(MNEMONIC);
  const testnetPreview = true;
  const { signKey, address } = deriveAddressPrvKey(bip32PrvKey, testnetPreview);
  console.log(`Using address ${address}`);

  // Retrieve protocol parameters
  const protocolParams = await client.epochsLatestParameters();

  // Retrieve utxo for the address
  let utxo: UTXO = [];
  try {
    utxo = await client.addressesUtxosAll(address);
  } catch (error) {
    if (error instanceof BlockfrostServerError && error.status_code === 404) {
      // Address derived from the seed was not used yet
      // In this case Blockfrost API will return 404
      utxo = [];
    } else {
      throw error;
    }
  }

  if (utxo.length === 0) {
    console.log();
    console.log(`You should send ADA to ${address} to have enough funds to sent a transaction`);
    console.log();
  }

  console.log(`UTXO on ${address}:`);
  console.log(JSON.stringify(utxo, undefined, 4));

  // Get current blockchain slot from latest block
  const latestBlock = await client.blocksLatest();
  const currentSlot = latestBlock.slot;
  if (!currentSlot) {
    throw Error('Failed to fetch slot number');
  }

  // Prepare transaction
  const { txBody } = composeTransaction(address, OUTPUT_ADDRESS, OUTPUT_AMOUNT, utxo, {
    protocolParams,
    currentSlot,
  });

  // Sign transaction
  const transaction = signTransaction(txBody, signKey);

  // Push transaction to network
  try {
    // txSubmit endpoint returns transaction hash on successful submit
    const txHash = await client.txSubmit(transaction.to_bytes());

    // Before the tx is included in a block it is a waiting room known as mempool
    // Retrieve transaction from Blockfrost Mempool
    const mempoolTx = await client.mempoolTx(txHash);
    console.log('Mempool Tx:');
    console.log(JSON.stringify(mempoolTx, undefined, 4));

    console.log(`Transaction successfully submitted: ${txHash}\n`);
  } catch (error) {
    // submit could fail if the transactions is rejected by cardano node
    if (error instanceof BlockfrostServerError && error.status_code === 400) {
      console.log(`Transaction rejected`);
      // Reason for the rejection is in error.message
      console.log(error.message);
    } else {
      // rethrow other errors
      throw error;
    }
  }
};

run();
