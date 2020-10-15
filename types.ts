import { CX, SKU } from './constants';

export interface CustomerMeta {
  [CX]?: string;
  [SKU]?: string;
}

export interface Payload {
  range?: {
    month?: number;
    year?: number;
  };
  dryRun?: boolean;
}
