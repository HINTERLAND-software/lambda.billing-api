import { Locale } from 'src/translations';
import {
  ATTACH_TIMESHEET,
  BOOK,
  COMPANY,
  FLAGS,
  LANG,
  LIST_BY_DATES,
  MAIL,
  SKU,
} from './constants';

export type CompanyId = 'jr' | 'default';

const flags = [LIST_BY_DATES, ATTACH_TIMESHEET, MAIL, BOOK] as const;
export interface CustomerMeta {
  [SKU]: string;
  [LANG]?: Locale;
  [COMPANY]?: CompanyId;
  [FLAGS]?: typeof flags[number][];
}

export type CustomerDataMapping = Record<string, CustomerData>;

export interface CustomerData {
  product: Product;
  customer: Customer;
  meta: CustomerMeta;
}

export interface Company {
  id: string;
  name: string;
  website: string;
  email: string;
  logo: string;
}

export interface GlobalMeta {
  companies: Record<CompanyId, Company>;
}

export interface Customer {
  name: string;
  number: number;
  address: string;
  phone: string;
  email: string;
  countryCode: string;
  notes: string;
  paymentTermsId: number;
  customPaymentTermsDays?: number;
  id: string;
  createdDate: string;
  lastModifiedDate: string;
}
export interface Attachment {
  fileId: string;
}

export interface Product {
  name: string;
  description: string;
  unitId: number;
  netUnitSalesPrice: number;
  grossUnitSalesPrice: number;
  calculatedPrice: string;
  rate: number;
  sku: string;
  netUnitCostPrice: number;
  taxEnabled: boolean;
  attachments: Attachment[];
  id: string;
  createdDate: string;
  lastModifiedDate: string;
}

export interface Line {
  //Description for line
  //Optional, can be null
  description?: string;
  //Quantity
  //Required
  quantity: number;
  //Unit net price for item on line. NOTE: Either the unitNetPrice or unitGrossPrice
  //must be filled out
  //Optional, can be null
  //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
  unitNetPrice?: number;
  //Unit gross price for item on line. NOTE: Either the unitNetPrice or
  //unitGrossPrice must be filled out
  //Optional, can be null
  //Format: currency. Must be a number with a maximum of two decimals after the decimal point. Must be between -90071992547409.9 and 90071992547409.9
  unitGrossPrice?: number;
  //Id of units for line. Must be a valid unit id
  //Optional, can be null
  unitId?: number;
  //Line discount rate, %
  //Optional, can be null
  //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
  lineDiscountRate?: number;
  //Id of the product on line. Must be a valid product id
  //Optional, can be null
  productId?: string;
  //Name of product on line
  //Optional, can be null
  productName?: string;
  //This line uses taxes
  //Required
  taxEnabled: boolean;
  //Tax rate in percent
  //Required
  //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
  taxRate: number;
  //Is this a product or service. Required for intra EU sales and sales where the
  //seller is from the EU
  //Optional, can be null
  productOrService?: string;
}

export interface DraftInvoiceRequest {
  //Draft invoice
  //The number of the invoice
  //Optional, can be null
  number?: string;
  //Date of invoice
  //Optional, can be null
  //Format: date. Must be a date in the format YYYY-MM-DD
  date?: string;
  //Date invoice is due for payment
  //Optional, can be null
  //Format: date. Must be a date in the format YYYY-MM-DD
  dueDate?: string;
  //Id of the customer for this invoice. Must be a valid customer id
  //Optional, can be null
  customerId?: string;
  //Customer email
  //Optional, can be null
  customerEmail?: string;
  //Notes for the invoice
  //Optional, can be null
  notes?: string;
  //Additional invoice notes
  //Optional, can be null
  additionalNotes?: string;
  //Id of actual payment terms for this invoice. Must be valid payment terms id.
  //Either paymentTermsId or customerId must be provided
  //Optional, can be null
  paymentTermsId?: number;
  //Days for custom payment terms, required for custom payment terms
  //Optional, can be null
  customPaymentTermsDays?: number;
  //Name of customer on invoice
  //Optional, can be null
  customerName?: string;
  //Customer number
  //Optional, can be null
  customerNumber?: number;
  //Full address of customer on invoice, excluding country
  //Optional, can be null
  customerAddress?: string;
  //Country code of customer on invoice. Must be valid country code
  //Optional, can be null
  customerCountry?: string;
  //VAT/Company number of customer on invoice, if an invoice has both this is the
  //Company number
  //Optional, can be null
  customerCiNumber?: string;
  //The VAT number of customer on invoice
  //Optional, can be null
  customerVatNumber?: string;
  //If set to gross, the price on lines will be displayed as the gross price on the
  //debitoor website, and in PDFs generated. The price saved in lines.unitNetPrice
  //should always be net
  //Optional, can be null
  priceDisplayType?: string;
  //Original invoice Id for creditNotes
  //Optional, can be null
  creditedInvoiceId?: string;
  //Invoiced quote id for invoices
  //Optional, can be null
  invoicedQuoteId?: string;
  //Invoiced delivery note id for invoices
  //Optional, can be null
  invoicedDeliveryNoteId?: string;
  //Array of lines on the document
  //Required
  lines: Line[];
  //Invoice discount rate, %
  //Optional, can be null
  //Format: rate. Must be a number with a maximum of two decimals after the decimal point. Must be between 0 and 100
  discountRate?: number;
  //Defines invoice currency. Will be set to the currency of your account if not
  //specified. If specified - currencyRate can be posted to calculate reports data.
  //Optional, can be null
  currency?: string;
  //Can be specified if custom foreign currency was passed, otherwise currency rate
  //for invoice date will be used, shows the relation CURRENCY/HOME_CURRENCY eg 1EUR
  //= 7.44DKK. Important: all the invoices are reported in home currencies only
  //using currencyRate for conversion.
  //Optional, can be null
  //Format: currency-rate. Must be a number with a maximum of six decimals after the decimal point. Must be between 0.000001 and 999999999
  currencyRate?: number;
  //Invoice text language
  //Optional, can be null
  languageCode?: string;
  //Enables online payments of specified provider on invoice preview.
  //Optional, can be null
  onlinePaymentProvider?: string;
  //Attachments
  //Optional, can be null
  attachments?: Attachment[];
  //Determines if VAT due immediately or once the seller receives the payment
  //Optional, can be null
  vatDueMode?: string;
  //The invoice id you have defined for the invoice.
  //Optional, can be null
  reference?: string;
  //Has the invoice been sent by email
  //Optional, can be null
  sent?: boolean;
  //Defines if invoice has been viewed on the portal or not
  //Optional, can be null
  viewed?: boolean;
  //Show invoice as paid on invoice portal to indicate an online payment happened.
  //Optional, can be null
  displayAsPaid?: boolean;
}

export interface LogoResponse {
  logoUrl: string;
}

// GENERATED WITH https://jvilk.com/MakeTypes/
export interface Settings {
  customerSettings: CustomerSettings;
  supplierSettings: SupplierSettings;
  invoiceSettings: InvoiceSettings;
  quoteSettings: QuoteSettings;
  deliveryNoteSettings: DeliveryNoteSettings;
  companyProfile: CompanyProfile;
  reportsSettings: ReportsSettings;
  shoeboxEmailAlias: string;
  recurringSettings: RecurringSettings;
  templateSettings: TemplateSettings;
  exportSettings: ExportSettingsOrOrigin;
  creditNoteSettings: CreditNoteSettings;
  notifications?: null[] | null;
  marketingConsent: boolean;
  termsAndConditionsConsent: string;
  id: string;
  origin: ExportSettingsOrOrigin;
  accountEmail: string;
  vatReported?: string[] | null;
  accountSettings: AccountSettings;
  featuresQuota: FeaturesQuota;
  featuresCount: FeaturesCount;
  strictBookkeeping: boolean;
  documentRenderingOptimizationEnabled: boolean;
  createdDate: string;
  ccInfo: CcInfo;
  shoeboxEmailDomain: string;
}
export interface CustomerSettings {
  lastCustomerNumber: number;
}
export interface SupplierSettings {
  lastSupplierNumber: number;
}
export interface InvoiceSettings {
  lastInvoiceNumber: string;
  lastUsedPriceDisplayType: string;
  lastPaymentTermsId: number;
  lastInvoiceDate: string;
  lastInvoiceNumberFormat: string;
  defaultAdditionalNotes: string;
  defaultNotes: string;
  lastInvoiceLanguageCode: string;
}
export interface QuoteSettings {
  lastQuoteNumber: string;
  lastQuoteDate: string;
  lastQuoteNumberFormat: string;
  defaultAdditionalNotes: string;
}
export interface DeliveryNoteSettings {
  lastDeliveryNoteNumber: string;
}
export interface CompanyProfile {
  taxEnabled: boolean;
  cashAccounting: boolean;
  email: string;
  telephoneNumber: string;
  name: string;
  address: string;
  countryCode: string;
  responsibleName: string;
  districtCourt: string;
  webSite: string;
  companyType: string;
  responsiblePosition: string;
  industry: string;
  bankName: string;
  accountHolderName: string;
  swiftCode: string;
  ibanCode: string;
  vatNumber: string;
  businessType: string;
  euVatNumber: string;
  country: string;
  logoUrl: string;
}
export interface ReportsSettings {
  fromDate: string;
  toDate: string;
}
export interface RecurringSettings {
  deliveryType: string;
  frequency: string;
}
export interface TemplateSettings {
  current: string;
  templates: Templates;
}
export interface Templates {
  free: Free;
  standard: Standard;
  classic: Classic;
  standardLight: StandardLight;
  elegant: Elegant;
  fullHeader: FullHeaderOrBlocks;
  blocks: FullHeaderOrBlocks;
  bold: Bold;
}
export interface Free {
  global: Global;
  documents: Documents;
}
export interface Global {
  accentColor: string;
  accentContrastColor: string;
}
export interface Documents {
  invoice: InvoiceOrQuoteOrCreditNote;
  quote: InvoiceOrQuoteOrCreditNote;
  deliveryNote: DeliveryNote;
  creditNote: InvoiceOrQuoteOrCreditNote;
}
export interface InvoiceOrQuoteOrCreditNote {
  showTotal: boolean;
  showVAT: boolean;
}
export interface DeliveryNote {
  showAmounts: boolean;
  showVAT: boolean;
}
export interface Standard {
  global: Global1;
  documents: Documents;
}
export interface Global1 {
  accentColor: string;
  accentContrastColor: string;
  headerShowCustomerNumber: boolean;
  headerAlignment: string;
  headerShowReturnAddress: boolean;
  headerShowCompanyName: boolean;
  linesShowProductNumber: boolean;
  linesShowQuantity: boolean;
  linesShowUnit: boolean;
  linesShowPrice: boolean;
  linesShowPreview: boolean;
  hideFooter: boolean;
  showSignature: boolean;
  showAmounts: boolean;
  showTotal: boolean;
  showVAT: boolean;
  fontFamily: string;
}
export interface Classic {
  global: Global2;
  documents: Documents;
}
export interface Global2 {
  accentContrastColor: string;
  headerShowCustomerNumber: boolean;
  headerAlignment: string;
  headerShowReturnAddress: boolean;
  headerShowCompanyName: boolean;
  linesShowProductNumber: boolean;
  linesShowQuantity: boolean;
  linesShowUnit: boolean;
  linesShowPrice: boolean;
  linesShowPreview: boolean;
  hideFooter: boolean;
  showSignature: boolean;
  showAmounts: boolean;
  showTotal: boolean;
  showVAT: boolean;
  fontFamily: string;
  accentColor: string;
  borderColor: string;
}
export interface StandardLight {
  global: Global1;
  documents: Documents1;
}
export interface Documents1 {
  invoice: Invoice;
  quote: InvoiceOrQuoteOrCreditNote;
  deliveryNote: DeliveryNote;
  creditNote: InvoiceOrQuoteOrCreditNote;
}
export interface Invoice {
  showTotal: boolean;
  showVAT: boolean;
  showSignature: boolean;
}
export interface Elegant {
  global: Global3;
  documents: Documents;
}
export interface Global3 {
  accentContrastColor: string;
  headerShowCustomerNumber: boolean;
  headerAlignment: string;
  headerShowReturnAddress: boolean;
  headerShowCompanyName: boolean;
  linesShowProductNumber: boolean;
  linesShowQuantity: boolean;
  linesShowUnit: boolean;
  linesShowPrice: boolean;
  linesShowPreview: boolean;
  hideFooter: boolean;
  showSignature: boolean;
  showAmounts: boolean;
  showTotal: boolean;
  showVAT: boolean;
  fontFamily: string;
  compact: boolean;
  linesColor: string;
  headerShowLogo: boolean;
}
export interface FullHeaderOrBlocks {
  global: Global4;
  documents: Documents;
}
export interface Global4 {
  alternateColor: string;
  alternateContrastColor: string;
  accentColor: string;
  accentContrastColor: string;
  headerShowCustomerNumber: boolean;
  headerAlignment: string;
  headerShowReturnAddress: boolean;
  headerShowCompanyName: boolean;
  linesShowProductNumber: boolean;
  linesShowQuantity: boolean;
  linesShowUnit: boolean;
  linesShowPrice: boolean;
  linesShowPreview: boolean;
  hideFooter: boolean;
  showSignature: boolean;
  showAmounts: boolean;
  showTotal: boolean;
  showVAT: boolean;
  fontFamily: string;
}
export interface Bold {
  global: Global5;
  documents: Documents;
}
export interface Global5 {
  accentContrastColor: string;
  headerShowCustomerNumber: boolean;
  headerShowReturnAddress: boolean;
  linesShowProductNumber: boolean;
  linesShowQuantity: boolean;
  linesShowUnit: boolean;
  linesShowPrice: boolean;
  linesShowPreview: boolean;
  hideFooter: boolean;
  showSignature: boolean;
  showAmounts: boolean;
  showTotal: boolean;
  showVAT: boolean;
  fontFamily: string;
  linesColor: string;
  headerShowLogo: boolean;
  companyNameBorder: boolean;
  footerColor: string;
}
export interface ExportSettingsOrOrigin {}
export interface CreditNoteSettings {
  lastCreditNoteNumberFormat: string;
  lastCreditNoteNumber: string;
  lastCreditNoteDate: string;
}
export interface AccountSettings {
  signedUpPlan: string;
  plan: string;
  accountState: string;
  signupDate: string;
  frequency: string;
  planStartDate: string;
  externalPlan: string;
  planPrice: number;
  planCurrency: string;
  paymentGiven: string;
  nextBillingDate: string;
}
export interface FeaturesQuota {
  matchBankTransactions: number;
  convertQuotesToInvoices: number;
  deliveryNoteFinalized: number;
  reports: number;
  exportDatev: number;
  exportEconomic: number;
  customLayout: number;
  multiUser: number;
  balanceSheetReport: number;
  plReport: number;
  vatReport: number;
  documents: number;
  quotes: number;
  income: number;
  editAndDeleteActions: number;
}
export interface FeaturesCount {
  newResetDate: string;
  documents: number;
  quotes: number;
  convertQuotesToInvoices: number;
  matchBankTransactions: number;
}
export interface CcInfo {
  provider: string;
  debitoorBilling: DebitoorBilling;
  type: string;
  cardNumber: string;
  cardType: string;
  expiryDate: string;
  billingInfo: BillingInfo;
}
export interface DebitoorBilling {
  subscriptionId: string;
  customerId: string;
}
export interface BillingInfo {
  vatId: string;
  email: string;
  country: string;
  company: string;
  addressLine1: string;
  zip: string;
  city: string;
}

export interface DraftInvoiceResponse {
  recurringId: string;
  number: string;
  sortNumber: string;
  type: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerEmail: string;
  notes: string;
  additionalNotes: string;
  paymentTermsId: number;
  customPaymentTermsDays: number;
  customerName: string;
  customerNumber: number;
  customerAddress: string;
  customerCountry: string;
  customerCountryName: string;
  customerCiNumber: string;
  customerVatNumber: string;
  priceDisplayType: string;
  links?: LinksEntity[] | null;
  creditedInvoiceId: string;
  invoicedQuoteId: string;
  invoicedDeliveryNoteId: string;
  lines?: LinesEntity[] | null;
  discountRate: number;
  totalNetAmountBeforeDiscount: number;
  totalNetLineDiscountAmount: number;
  totalNetDiscountAmount: number;
  totalNetAmount: number;
  totalTaxAmount: number;
  taxGroups?: TaxGroupsEntity[] | null;
  incomeTaxDeductionGroups?: IncomeTaxDeductionGroupsEntity[] | null;
  totalGrossAmount: number;
  currency: string;
  currencyRate: number;
  baseCurrency: string;
  baseCurrencyTotalNetAmount: number;
  baseCurrencyTotalTaxAmount: number;
  baseCurrencyTotalGrossAmount: number;
  languageCode: string;
  onlinePaymentProvider: string;
  attachments?: AttachmentsEntity[] | null;
  status: string;
  vatDueMode: string;
  treatAsIntraEU: boolean;
  id: string;
  reference: string;
  booked: boolean;
  sent: boolean;
  sendDetails?: SendDetailsEntity[] | null;
  history: History;
  viewed: boolean;
  displayAsPaid: boolean;
  createdDate: string;
  lastModifiedDate: string;
  deletedDate: string;
}
export interface LinksEntity {
  linkId: string;
  type: string;
  date: string;
  createdDate: string;
}
export interface LinesEntity {
  description: string;
  quantity: number;
  unitNetPrice: number;
  unitGrossPrice: number;
  unitId: number;
  unitName: string;
  lineDiscountRate: number;
  productId: string;
  productSku: string;
  productName: string;
  taxEnabled: boolean;
  taxRate: number;
  productOrService: string;
  netAmountBeforeDiscount: number;
  grossAmountBeforeDiscount: number;
  netAmount: number;
  grossAmount: number;
  taxAmount: number;
  baseCurrencyUnitNetPrice: number;
  baseCurrencyUnitGrossPrice: number;
  baseCurrencyNetAmount: number;
  baseCurrencyGrossAmount: number;
  baseCurrencyTaxAmount: number;
  netAmountWithoutPensionFund: number;
}
export interface TaxGroupsEntity {
  name: string;
  taxRate: number;
  netAmount: number;
  taxAmount: number;
  rounding: number;
  baseCurrencyNetAmount: number;
  baseCurrencyTaxAmount: number;
}
export interface IncomeTaxDeductionGroupsEntity {
  name: string;
  taxRate: number;
  netAmount: number;
  taxAmount: number;
  baseCurrencyNetAmount: number;
  baseCurrencyTaxAmount: number;
}
export interface AttachmentsEntity {
  file: File;
  fileId: string;
}
export interface File {
  id: string;
  url: string;
  fileName: string;
  lastModified: string;
  type: string;
  sizeBytes: number;
  thumbnailsUrl: string;
}
export interface SendDetailsEntity {
  id: string;
  time: string;
  to: string;
  viewed?: string[] | null;
}
export interface History {
  booked: string;
}

export interface BookedInvoiceResponse {
  id: string;
  reference: string;
  companyProfile: CompanyProfile;
  links?: LinksEntity[] | null;
  deletedByInvoiceId: string;
  number: string;
  sortNumber: string;
  type: string;
  notes: string;
  additionalNotes: string;
  date: string;
  dueDate: string;
  paymentTermsId: number;
  payments?: PaymentsEntity[] | null;
  customPaymentTermsDays: number;
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerNumber: number;
  customerAddress: string;
  customerCountry: string;
  customerCountryName: string;
  customerCiNumber: string;
  customerVatNumber: string;
  priceDisplayType: string;
  sent: boolean;
  sendDetails?: SendDetailsEntity[] | null;
  history: History;
  paid: boolean;
  viewed: boolean;
  archived: boolean;
  compensated: boolean;
  archivedDate: string;
  booked: boolean;
  deleted: boolean;
  status: string;
  creditedInvoiceId: string;
  invoicedQuoteId: string;
  invoicedDeliveryNoteId: string;
  lines?: LinesEntity[] | null;
  discountRate: number;
  totalNetAmountBeforeDiscount: number;
  totalNetLineDiscountAmount: number;
  totalNetDiscountAmount: number;
  totalNetAmount: number;
  totalTaxAmount: number;
  taxGroups?: TaxGroupsEntity[] | null;
  incomeTaxDeductionGroups?: IncomeTaxDeductionGroupsEntity[] | null;
  unpaidAmount: number;
  totalGrossAmount: number;
  languageCode: string;
  currency: string;
  currencyRate: number;
  baseCurrency: string;
  baseCurrencyTotalNetAmount: number;
  baseCurrencyTotalTaxAmount: number;
  baseCurrencyTotalGrossAmount: number;
  baseCurrencyUnpaidAmount: number;
  displayAsPaid: boolean;
  onlinePaymentProvider: string;
  paymentReceipts?: PaymentReceiptsEntityOrData[] | null;
  attachments?: AttachmentsEntity[] | null;
  recurringId: string;
  deleteReason: string;
  timeline?: TimelineEntity[] | null;
  vatDueMode: string;
  treatAsIntraEU: boolean;
  createdDate: string;
  lastModifiedDate: string;
  deletedDate: string;
}
export interface CompanyProfile {
  name: string;
  companyType: string;
  businessType: string;
  firstName: string;
  lastName: string;
  industry: string;
  address: string;
  detailedAddress: DetailedAddress;
  country: string;
  countryCode: string;
  email: string;
  telephoneNumber: string;
  webSite: string;
  companyNumber: string;
  taxEnabled: boolean;
  cashAccounting: boolean;
  euVatNumber: string;
  vatNumber: string;
  responsiblePosition: string;
  responsibleName: string;
  taxStatus: string;
  commercialRegister: string;
  districtCourt: string;
  bankName: string;
  bankNumber: string;
  bankAccount: string;
  bankAccount2: string;
  accountHolderName: string;
  bicCode: string;
  swiftCode: string;
  ibanCode: string;
  incomeTaxDeduction: number;
  applyDeduction: boolean;
  logoUrl: string;
  bankgirotNumber: string;
  plusgirotNumber: string;
  pensionFundType: string;
  pensionFundRate: number;
}
export interface DetailedAddress {
  street: string;
  street2: string;
  number: string;
  zipCode: string;
  city: string;
  province: string;
  provinceName: string;
  provinceId: number;
  parentProvince: string;
  parentProvinceName: string;
  parentProvinceId: number;
  country: string;
  countryCode: string;
  additionalInfo: string;
}
export interface LinksEntity {
  linkId: string;
  type: string;
  number: string;
  createdDate: string;
  date: string;
  amount: number;
  currency: string;
  unpaidAmountChange: number;
}
export interface PaymentsEntity {
  id: string;
  expenseId: string;
  invoiceId: string;
  creditNoteId: string;
  incomeId: string;
  paymentTransactionId: string;
  paymentAccountId: string;
  matchedPaymentAccountId: string;
  matchedPaymentTransactionId: string;
  integrationType: string;
  paymentType: string;
  createdDate: string;
  amount: number;
  invoiceNumber: string;
  creditNoteNumber: string;
  categoryIds?: string[] | null;
  paymentDate: string;
  text: string;
  currency: string;
  customerName: string;
  supplierName: string;
  description: string;
}
export interface SendDetailsEntity {
  id: string;
  time: string;
  to: string;
  viewed?: string[] | null;
}
export interface History {
  booked: string;
}
export interface LinesEntity {
  description: string;
  quantity: number;
  unitNetPrice: number;
  unitGrossPrice: number;
  unitId: number;
  unitName: string;
  lineDiscountRate: number;
  productId: string;
  productSku: string;
  productName: string;
  taxEnabled: boolean;
  taxRate: number;
  productOrService: string;
  netAmountBeforeDiscount: number;
  grossAmountBeforeDiscount: number;
  netAmount: number;
  grossAmount: number;
  taxAmount: number;
  baseCurrencyUnitNetPrice: number;
  baseCurrencyUnitGrossPrice: number;
  baseCurrencyNetAmount: number;
  baseCurrencyGrossAmount: number;
  baseCurrencyTaxAmount: number;
  netAmountWithoutPensionFund: number;
}
export interface TaxGroupsEntity {
  name: string;
  taxRate: number;
  netAmount: number;
  taxAmount: number;
  rounding: number;
  baseCurrencyNetAmount: number;
  baseCurrencyTaxAmount: number;
}
export interface IncomeTaxDeductionGroupsEntity {
  name: string;
  taxRate: number;
  netAmount: number;
  taxAmount: number;
  baseCurrencyNetAmount: number;
  baseCurrencyTaxAmount: number;
}
export interface PaymentReceiptsEntityOrData {}
export interface AttachmentsEntity {
  file: File;
  fileId: string;
}
export interface File {
  id: string;
  url: string;
  fileName: string;
  lastModified: string;
  type: string;
  sizeBytes: number;
  thumbnailsUrl: string;
}
export interface TimelineEntity {
  type: string;
  createdDate: string;
  date: string;
  data: PaymentReceiptsEntityOrData;
  owner: string;
  applicationId: string;
}
