import { BlockFrostAPI, BlockFrostIPFS, BlockfrostServerError } from '@blockfrost/blockfrost-js';
import { composeTransaction } from './transaction/composeTransaction';
import { signTransaction } from './transaction/signTransaction';
import { deriveAddressPrvKey, mnemonicToPrivateKey } from './utils/key';
import { prettyPrintOutputs } from './utils/misc';
import { UTXO } from './types';

// Seed where the minting will happen
const MNEMONIC = 'maze riot drift silver field sadness shrimp affair whip embody odor damp'; // bip39 mnemonic

// Address to sent the minted asset to
const OUTPUT_ADDRESS =
  'addr_test1qr3uhus8q7pat5a2h99t4ws4upt9excr5ce5k4fp7lv6qfcjvuw9j2fcs3xpgqxkt5f5zd0rtd8jnnw8n2s5qjswzyfqmyqptf';

// Minted assets
const ASSET = [
  {
    name: `HelloNFT`,
    quantity: '1', // set 1 to make the best NFT
    metadata: {
      description: 'The very best NFT!', // max 64 chars
    },
  },
];
// Path to the image for the asset which will be uploaded to IPFS
const IMAGE_PATH: string | null = '<PNG-FILEPATH>';

if (!process.env.BLOCKFROST_PROJECT_ID || !process.env.BLOCKFROST_PROJECT_ID_IPFS) {
  throw Error('Environment variable BLOCKFROST_PROJECT_ID or BLOCKFROST_PROJECT_ID_IPFS not set');
}

const blockfrostClient = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_PROJECT_ID,
});
const ipfsClient = new BlockFrostIPFS({
  projectId: process.env.BLOCKFROST_PROJECT_ID_IPFS,
});

const mintNFT = async () => {
  // Derive address (where you need to send ADA in order to have UTXO to actually min a NFT) and singing key
  const bip32PrvKey = mnemonicToPrivateKey(MNEMONIC);
  const { signKey, address } = deriveAddressPrvKey(
    bip32PrvKey,
    [0, 0, 0],
    blockfrostClient.options.network !== 'mainnet',
  );
  console.log(`Using address ${address}`);

  // Retrieve utxo for the address
  let utxo: UTXO = [];
  try {
    utxo = await blockfrostClient.addressesUtxosAll(address);
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
    console.log(`You should send ADA to ${address} in order to have enough funds to mint NFT`);
  }
  console.log('UTXO:');
  console.log(JSON.stringify(utxo, undefined, 4));

  // Get current blockchain slot
  const latestBlock = await blockfrostClient.blocksLatest();
  const currentSlot = latestBlock.slot ?? 0;

  // Upload image to IPFS
  const ipfsObject = await ipfsClient.add(IMAGE_PATH);
  const cid = ipfsObject.ipfs_hash;

  // returns hash of the image

  console.log(`Image uploaded to IPFS! Check it out https://ipfs.blockfrost.dev/ipfs/${cid}`);

  // Prepare transaction
  const { txBody, txMetadata, finalScript } = composeTransaction(
    signKey.to_public().hash(),
    address,
    OUTPUT_ADDRESS,
    utxo,
    currentSlot,
    ASSET.map(asset => ({
      name: asset.name,
      quantity: asset.quantity,
      metadata: {
        name: asset.name,
        image: `ipfs://${cid}`,
        mediaType: 'image/png',
        ...asset.metadata,
      },
    })),
  );

  console.log('OUTPUTS:');
  prettyPrintOutputs(txBody);

  // Sign transaction
  const transaction = signTransaction(txBody, signKey, txMetadata, finalScript);

  // Push transaction to network
  const txHash = await blockfrostClient.txSubmit(transaction.to_bytes());
  console.log(`Transaction successfully submitted: ${txHash}`);

  // pin the image to ipfs to prevent expiration
  await ipfsClient.pin(cid);

  // Retrieve transaction from Blockfrost Mempool
  const mempoolTx = await blockfrostClient.mempoolTx(txHash);
  console.log('Mempool Tx:');
  console.log(JSON.stringify(mempoolTx, undefined, 4));
};

mintNFT();
