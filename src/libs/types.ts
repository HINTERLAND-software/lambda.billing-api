import {
  TypeCustomerFields,
  TypeProductFields,
  TypeProjectFields,
} from './contentful-types';
import { Contact as LexofficeContact } from './lexoffice-types';
import {
  Customer as TogglCustomer,
  Project as TogglProject,
} from './toggl-types';

export type Locale = 'de' | 'en';

export interface EnrichedCustomer {
  toggl: TogglCustomer;
  contentful: TypeCustomerFields;
  lexoffice: LexofficeContact;
}

export interface EnrichedProduct {
  contentful: TypeProductFields;
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
