import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { AssetAmount, UTXO } from '../types';

export const bigNumFromStr = (num: string): CardanoWasm.BigNum => CardanoWasm.BigNum.from_str(num);

export const sortUtxos = (utxos: UTXO): UTXO => {
  return utxos.sort((a, b) => {
    const amountA = CardanoWasm.BigNum.from_str(
      a.amount.find(a => a.unit === 'lovelace')?.quantity ?? '0',
    );
    const amountB = CardanoWasm.BigNum.from_str(
      b.amount.find(a => a.unit === 'lovelace')?.quantity ?? '0',
    );
    return amountA.compare(amountB);
  });
};

export const getAssetAmount = (obj: Pick<UTXO[number], 'amount'>, asset = 'lovelace'): string =>
  obj.amount.find(a => a.unit === asset)?.quantity ?? '0';

export const multiAssetToArray = (
  multiAsset: CardanoWasm.MultiAsset | undefined,
): AssetAmount[] => {
  if (!multiAsset) return [];
  const assetsArray: AssetAmount[] = [];
  const policyHashes = multiAsset.keys();

  for (let i = 0; i < policyHashes.len(); i++) {
    const policyId = policyHashes.get(i);
    const assetsInPolicy = multiAsset.get(policyId);
    if (!assetsInPolicy) continue;

    const assetNames = assetsInPolicy.keys();
    for (let j = 0; j < assetNames.len(); j++) {
      const assetName = assetNames.get(j);
      const amount = assetsInPolicy.get(assetName);
      if (!amount) continue;

      const policyIdHex = Buffer.from(policyId.to_bytes()).toString('hex');
      const assetNameHex = Buffer.from(assetName.name()).toString('hex');

      assetsArray.push({
        quantity: amount.to_str(),
        unit: `${policyIdHex}${assetNameHex}`,
      });
    }
  }
  return assetsArray;
};

export const prettyPrintOutputs = (txBody: CardanoWasm.TransactionBody) => {
  for (let i = 0; i < txBody.outputs().len(); i++) {
    const output = txBody.outputs().get(i);
    const outputAddress = output.address().to_bech32();
    const amount = output.amount().coin().to_str();
    const multiasset = output.amount().multiasset();
    console.log(
      `Output #${i} to ${outputAddress} with ${amount} ADA, assets: ${JSON.stringify(
        multiAssetToArray(multiasset),
        undefined,
        4,
      )}`,
    );
  }
};
