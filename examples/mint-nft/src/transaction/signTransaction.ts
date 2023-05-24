import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

export const signTransaction = (
  txBody: CardanoWasm.TransactionBody,
  signKey: CardanoWasm.PrivateKey,
  txMetadata: CardanoWasm.AuxiliaryData,
  nativeScript: CardanoWasm.NativeScript,
): CardanoWasm.Transaction => {
  const txHash = CardanoWasm.hash_transaction(txBody);

  const witnesses = CardanoWasm.TransactionWitnessSet.new();
  const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  vkeyWitnesses.add(CardanoWasm.make_vkey_witness(txHash, signKey));

  const scripts = CardanoWasm.NativeScripts.new();
  scripts.add(nativeScript);

  witnesses.set_vkeys(vkeyWitnesses);
  witnesses.set_native_scripts(scripts);

  const transaction = CardanoWasm.Transaction.new(txBody, witnesses, txMetadata);

  return transaction;
};
