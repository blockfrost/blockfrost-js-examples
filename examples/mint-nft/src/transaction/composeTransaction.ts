import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { Asset, UTXO } from '../types';
import { composeMetadata } from './composeMetadata';
import { bigNumFromStr, getAssetAmount, sortUtxos } from '../utils/misc';
import { Responses } from '@blockfrost/blockfrost-js';

export const composeTransaction = (
  pubKeyHash: CardanoWasm.Ed25519KeyHash,
  address: string,
  outputAddress: string,
  utxos: UTXO,
  assets: Asset[],
  params: {
    protocolParams: Responses['epoch_param_content'];
    currentSlot: number;
  },
): {
  txHash: string;
  txBody: CardanoWasm.TransactionBody;
  txMetadata: CardanoWasm.AuxiliaryData;
  finalScript: CardanoWasm.NativeScript;
} => {
  if (!utxos || utxos.length === 0) {
    throw Error('No UTXOs available for the address.');
  }

  const txBuilder = CardanoWasm.TransactionBuilder.new(
    CardanoWasm.TransactionBuilderConfigBuilder.new()
      .fee_algo(
        CardanoWasm.LinearFee.new(
          bigNumFromStr(params.protocolParams.min_fee_a.toString()),
          bigNumFromStr(params.protocolParams.min_fee_b.toString()),
        ),
      )
      .pool_deposit(bigNumFromStr(params.protocolParams.pool_deposit))
      .key_deposit(bigNumFromStr(params.protocolParams.key_deposit))
      // coins_per_utxo_size is already introduced in current Cardano fork
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .coins_per_utxo_byte(bigNumFromStr(params.protocolParams.coins_per_utxo_size!))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .max_value_size(parseInt(params.protocolParams.max_val_size!))
      .max_tx_size(params.protocolParams.max_tx_size)
      .build(),
  );

  const outputAddr = CardanoWasm.Address.from_bech32(outputAddress);
  const changeAddr = CardanoWasm.Address.from_bech32(address);

  const ttl = params.currentSlot + 1800; // +30 mins from currentSlot
  txBuilder.set_ttl(ttl);

  const nativeScripts = CardanoWasm.NativeScripts.new();
  const script = CardanoWasm.ScriptPubkey.new(pubKeyHash);
  const nativeScript = CardanoWasm.NativeScript.new_script_pubkey(script);
  const appScript = CardanoWasm.ScriptPubkey.new(pubKeyHash);
  const appNativeScript = CardanoWasm.NativeScript.new_script_pubkey(appScript);
  const lockScript = CardanoWasm.NativeScript.new_timelock_expiry(
    CardanoWasm.TimelockExpiry.new(ttl),
  );
  nativeScripts.add(nativeScript);
  nativeScripts.add(appNativeScript);
  nativeScripts.add(lockScript);

  const finalScript = CardanoWasm.NativeScript.new_script_all(
    CardanoWasm.ScriptAll.new(nativeScripts),
  );

  const policyId = Buffer.from(finalScript.hash().to_bytes()).toString('hex');

  // Set metadata
  const metadatum = composeMetadata(policyId, assets);
  const txMetadata = CardanoWasm.AuxiliaryData.from_bytes(metadatum.to_bytes());
  txBuilder.set_auxiliary_data(txMetadata);

  console.log(
    `Minting asset ${assets
      .map(a => Buffer.from(a.name, 'utf8'))
      .join(', ')} with policyId ${policyId}`,
  );

  for (const asset of assets) {
    txBuilder.add_mint_asset(
      finalScript,
      CardanoWasm.AssetName.new(Buffer.from(asset.name, 'utf8')),
      CardanoWasm.Int.new(bigNumFromStr(asset.quantity)),
    );
  }

  // Create multiasset object from minted assets and add them to an output
  const multiasset = txBuilder.get_mint()?.as_positive_multiasset();
  if (!multiasset) {
    throw Error('Cannot get multiasset');
  }

  const outputValue = CardanoWasm.Value.new_from_assets(multiasset);

  // Figure out min ada value for the output
  let output = CardanoWasm.TransactionOutput.new(outputAddr, outputValue);
  const minAdaForOutput = CardanoWasm.min_ada_for_output(
    output,
    CardanoWasm.DataCost.new_coins_per_byte(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      CardanoWasm.BigNum.from_str(params.protocolParams.coins_per_utxo_size!),
    ),
  );

  outputValue.set_coin(minAdaForOutput);
  // Replace the output now with the correct min ada value we've calculated above
  output = CardanoWasm.TransactionOutput.new(outputAddr, outputValue);
  txBuilder.add_output(output);

  // Add UTXOs as tx inputs
  const lovelaceUtxos = utxos.filter(u => !u.amount.find(a => a.unit !== 'lovelace'));
  const sortedUtxos = sortUtxos(lovelaceUtxos);
  const cUtxo = CardanoWasm.TransactionUnspentOutputs.new();
  for (const utxo of sortedUtxos) {
    const amount = getAssetAmount(utxo);
    if (!amount) continue;

    const input = CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
      utxo.output_index,
    );
    const inputValue = CardanoWasm.Value.new(bigNumFromStr(amount));
    const singleUtxo = CardanoWasm.TransactionUnspentOutput.new(
      input,
      CardanoWasm.TransactionOutput.new(changeAddr, inputValue),
    );
    cUtxo.add(singleUtxo);
  }

  // Coin selection and change output
  txBuilder.add_inputs_from(cUtxo, CardanoWasm.CoinSelectionStrategyCIP2.LargestFirstMultiAsset);
  txBuilder.add_change_if_needed(changeAddr);

  // Build transaction
  const txBody = txBuilder.build();
  const txHash = Buffer.from(CardanoWasm.hash_transaction(txBody).to_bytes()).toString('hex');

  return {
    txHash,
    txBody,
    txMetadata,
    finalScript,
  };
};
