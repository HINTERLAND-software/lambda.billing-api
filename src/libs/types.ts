import {
  ContentfulCustomer,
  ContentfulProduct,
  ContentfulProject
} from './contentful';
import {
  Customer as DebitoorCustomer,
  Product as DebitoorProduct
} from './debitoor-types';
import {
  Customer as TogglCustomer,
  Project as TogglProject
} from './toggl-types';

export type Locale = 'de' | 'en';

export interface EnrichedCustomer {
  toggl: TogglCustomer;
  contentful: ContentfulCustomer;
  debitoor: DebitoorCustomer;
}

export interface EnrichedProduct {
  contentful: ContentfulProduct;
  debitoor: DebitoorProduct;
}

export interface EnrichedProject {
  toggl: TogglProject;
  contentful: ContentfulProject;
  customer: EnrichedCustomer;
  product: EnrichedProduct;
}

export interface CustomerData {
  project: EnrichedProject;
  customer: EnrichedCustomer;
}
