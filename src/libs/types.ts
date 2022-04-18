import {
  TypeCustomerFields,
  TypeProductFields,
  TypeProjectFields,
} from './contentful-types';
import {
  Customer as DebitoorCustomer,
  Product as DebitoorProduct,
} from './debitoor-types';
import {
  Customer as TogglCustomer,
  Project as TogglProject,
} from './toggl-types';

export type Locale = 'de' | 'en';

export interface EnrichedCustomer {
  toggl: TogglCustomer;
  contentful: TypeCustomerFields;
  debitoor: DebitoorCustomer;
}

export interface EnrichedProduct {
  contentful: TypeProductFields;
  debitoor: DebitoorProduct;
}

export interface EnrichedProject {
  toggl: TogglProject;
  contentful: TypeProjectFields;
  customer: EnrichedCustomer;
  product: EnrichedProduct;
}

export interface CustomerData {
  project: EnrichedProject;
  customer: EnrichedCustomer;
}
