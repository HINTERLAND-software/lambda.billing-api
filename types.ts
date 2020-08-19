import { CX, SKU } from './constants';

export interface Customer {
  name: string;
  number: number;
  address: string;
  phone: string;
  email: string;
  countryCode: string;
  notes: string;
  paymentTermsId: number;
  id: string;
  createdDate: string;
  lastModifiedDate: string;
}

export interface CustomerMeta {
  [CX]?: string;
  [SKU]?: string;
}

export interface Attachment {
  fileId: string;
}

export interface Product {
  name: string;
  description: string;
  unitId: string;
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

export interface DraftInvoiceResponse extends DraftInvoiceRequest {
  id: string;
  totalNetAmount: number;
  totalTaxAmount: number;
  totalGrossAmount: number;
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

export interface Payload {
  range?: {
    month?: number;
    year?: number;
  };
  dryRun?: boolean;
}

export interface NameId {
  name: string;
  uniqueId: string;
}

export interface Color {
  name: string;
  value: string;
  description: string;
}

export interface Board {
  swimlanes: NameId[];
  columns: NameId[];
  name: string;
  colors: Color[];
}

export interface Date {
  status: string;
  dateType: string;
  dueTimestamp: string;
  dueTimestampLocal: string;
  targetColumnId: string;
}

export interface Number {
  value: number;
  prefix: string;
}

export interface SubTask {
  name: string;
  finished?: boolean;
  userId?: string;
  dueDateTimestamp?: string;
  dueDateTimestampLocal?: string;
}

export interface Label {
  name: string;
  pinned: boolean;
}

export interface Collaborator {
  userId: string;
}

export interface Task {
  _id: string;
  name: string;
  columnId: string;
  swimlaneId: string;
  position: number;
  description: string;
  color: string;
  number: Number;
  responsibleUserId: string;
  totalSecondsSpent: number;
  totalSecondsEstimate: string;
  pointsEstimate?: number;
  groupingDate: string;
  dates: Date[];
  subTasks: SubTask[];
  labels: Label[];
  collaborators: Collaborator[];
}

export interface Swimlane {
  swimlaneId: string;
  swimlaneName: string;
  columnId: string;
  columnName: string;
  tasksLimited: boolean;
  tasks: Task[];
}

export interface Grouped {
  [customerName: string]: GroupedTask;
}

export interface GroupedTask {
  customerName: string;
  totalSecondsSpent: number;
  tasks: Task[];
}
