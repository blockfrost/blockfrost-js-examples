import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { Asset, AssetMetadata } from '../types';

export const composeMetadata = (
  policyId: string,
  assets: Asset[],
): CardanoWasm.TransactionMetadatum => {
  // https://cips.cardano.org/cips/cip25/

  const assetsUnderPolicy: {
    [name: string]: AssetMetadata;
  } = {};

  for (const asset of assets) {
    assetsUnderPolicy[`0x${Buffer.from(asset.name, 'utf-8').toString('hex')}`] = asset.metadata;
  }

  const obj = {
    [721]: {
      [`0x${policyId}`]: assetsUnderPolicy,
      version: '2.0',
    },
  };
  console.log(`Metadata for the assets: ${JSON.stringify(obj, undefined, 4)}`);

  try {
    const metadata = CardanoWasm.encode_json_str_to_metadatum(
      JSON.stringify(obj),
      CardanoWasm.MetadataJsonSchema.BasicConversions,
    );
    console.log('Metadata CBOR', Buffer.from(metadata.to_bytes()).toString('hex'));
    return metadata;
  } catch (err) {
    console.error(err);
    throw Error('Failed to encode metadata');
  }
};
