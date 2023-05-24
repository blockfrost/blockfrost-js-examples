import { Responses } from '@blockfrost/blockfrost-js';

export type UTXO = Responses['address_utxo_content'];

export interface AssetAmount {
  unit: string;
  quantity: string;
}

export interface AssetMetadata {
  name: string;
  image: string | string[];
  mediaType?: string;
  description?: string | string[];
  [k: string]: any;
}

export interface Asset {
  name: string;
  quantity: string;
  metadata: AssetMetadata;
}
