export interface Contact {
  id?: string;
  organizationId?: string;
  version: number;
  roles: Roles;
  company?: Company;
  person?: Person;
  addresses?: Addresses;
  xRechnung?: XRechnung;
  emailAddresses?: EmailAddresses;
  phoneNumbers?: PhoneNumbers;
  note?: string;
  archived?: boolean;
}

export interface Addresses {
  billing?: Address[];
  shipping?: Address[];
}

export interface Address {
  supplement?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
}

export interface Company {
  name: string;
  taxNumber?: string;
  vatRegistrationId?: string;
  allowTaxFreeInvoices?: boolean;
  contactPersons?: Person[];
}

export interface Person {
  salutation?: string;
  firstName?: string;
  lastName: string;
  primary?: boolean;
  emailAddress?: string;
  phoneNumber?: string;
}

export interface EmailAddresses {
  business?: string[];
  office?: string[];
  private?: string[];
  other?: string[];
}

export interface PhoneNumbers {
  business?: string[];
  office?: string[];
  mobile?: string[];
  private?: string[];
  fax?: string[];
  other?: string[];
}

export interface Roles {
  customer?: Customer;
  vendor?: Customer;
}

export interface Customer {
  number?: number;
}

export interface XRechnung {
  buyerReference?: string;
  vendorNumberAtCustomer?: string;
}

export interface Invoice {
  id?: string;
  organizationId?: string;
  createdDate?: string;
  updatedDate?: string;
  version?: number;
  language?: string;
  archived?: boolean;
  voucherStatus?: string;
  voucherNumber?: string;
  voucherDate: string;
  dueDate?: null;
  address: InvoiceAddress;
  xRechnung?: null;
  lineItems: LineItem[];
  totalPrice: TotalPrice;
  taxAmounts?: TaxAmount[];
  taxConditions: TaxConditions;
  paymentConditions?: PaymentConditions;
  shippingConditions: ShippingConditions;
  closingInvoice?: boolean;
  claimedGrossAmount?: null;
  downPaymentDeductions?: null;
  recurringTemplateId?: null;
  relatedVouchers?: any[];
  title?: string;
  introduction?: string;
  remark?: string;
  files?: Files;
}

export interface InvoiceAddress extends Address {
  contactId?: string;
  name?: string;
}

export interface Files {
  documentFileId?: string;
}

export interface LineItem {
  id?: null | string;
  type?: 'service' | 'custom' | 'product';
  name?: string;
  description?: null | string;
  quantity?: number;
  unitName?: string;
  unitPrice?: UnitPrice;
  discountPercentage?: number;
  lineItemAmount?: number;
}

export interface UnitPrice {
  currency?: string;
  netAmount?: number;
  grossAmount?: number;
  taxRatePercentage?: number;
}

export interface PaymentConditions {
  paymentTermLabel?: string;
  paymentTermLabelTemplate?: string;
  paymentTermDuration?: number;
  paymentDiscountConditions?: PaymentDiscountConditions;
}

export interface PaymentDiscountConditions {
  discountPercentage?: number;
  discountRange?: number;
}

export interface ShippingConditions {
  shippingDate?: string;
  shippingEndDate?: string;
  shippingType?: 'serviceperiod' | 'service' | 'delivery' | 'deliveryperiod';
}

export interface TaxAmount {
  taxRatePercentage?: number;
  taxAmount?: number;
  netAmount?: number;
}

export interface TaxConditions {
  taxType?:
    | 'gross'
    | 'net'
    | 'vatfree'
    | 'intraCommunitySupply'
    | 'constructionService13b'
    | 'externalService13b'
    | 'thirdPartyCountryService'
    | 'thirdPartyCountryDelivery';
  taxTypeNote?: null;
}

export interface TotalPrice {
  currency?: string;
  totalNetAmount?: number;
  totalGrossAmount?: number;
  totalTaxAmount?: number;
  totalDiscountAbsolute?: null;
  totalDiscountPercentage?: null;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  path: string;
  traceId: string;
  requestId: string;
  message: string;
}
