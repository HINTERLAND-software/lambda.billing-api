import { initFetch } from './utils';
import qs from 'querystring';
import {
  Line,
  Customer,
  Product,
  CustomerMeta,
  DraftInvoiceRequest,
  Task,
  SubTask,
  DraftInvoiceResponse,
} from '../types';
import { Time, getRoundedHours, formatDateForInvoice } from './time';
import { CX, SKU, LABEL_CX_PREFIX } from '../constants';

const BASE_URL = 'https://api.debitoor.com/api';
const CUSTOMERS_PATH = 'customers/v2';
const PRODUCTS_PATH = 'products/v1';
const DRAFT_INVOICES_PATH = 'sales/draftinvoices/v7';

const fetch = initFetch(`Bearer ${process.env.DEBITOOR_API_TOKEN}`);

let cache: { customers?: Customer[]; products: { [key: string]: Product } };
export const clearCache = (): void => {
  cache = {
    customers: null,
    products: {},
  };
};
clearCache();

export const fetchCustomers = async (): Promise<Customer[]> => {
  const customers = await fetch(`${BASE_URL}/${CUSTOMERS_PATH}`);
  cache.customers = customers;
  return customers;
};

export const fetchProductBySku = async (sku: string): Promise<Product> => {
  const querystring = qs.stringify({ sku });
  const result = await fetch(`${BASE_URL}/${PRODUCTS_PATH}?${querystring}`);
  const product = result?.[0];
  cache.products[sku] = product;
  return product;
};

export const createDraftInvoice = async (
  body: object
): Promise<DraftInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const getCustomerMeta = (notes: string = ''): CustomerMeta => {
  const response = { [CX]: null, [SKU]: null };
  if (!notes) return response;
  const data = notes.match(/{{(.*)}}/)?.[1] || '';
  return data.split(';').reduce((acc, set) => {
    const [key, value] = set.trim().split(':');
    return { ...acc, [key.toLowerCase()]: value };
  }, response);
};

export const getCustomer = (
  customers: Customer[],
  cx: string
): { customer: Customer; meta: CustomerMeta } => {
  return customers.reduce(
    (acc, customer) => {
      const meta = getCustomerMeta(customer.notes);
      if (
        !acc.customer &&
        !acc.meta &&
        cx.replace(LABEL_CX_PREFIX, '') === meta.cx
      ) {
        return { customer, meta };
      }
      return acc;
    },
    { customer: null, meta: null }
  );
};

export const fetchCustomerData = async (
  cx: string
): Promise<{
  product: Product;
  customer: Customer;
  meta: CustomerMeta;
}> => {
  const customers = await fetchCustomers();
  const { customer, meta } = getCustomer(customers, cx);
  if (!customer || !meta) {
    throw new Error(`Customer "${cx}" not found`);
  }
  const product = await fetchProductBySku(meta.sku);
  return { product, customer, meta };
};

const sanitizeSubTasks = (subTasks: SubTask[] = []) => {
  const filteredAndMapped = subTasks.map(({ name }) => name);
  if (filteredAndMapped.length <= 0) return '';
  return `  - ${filteredAndMapped.join('\n  - ')}`;
};

export const generateInvoiceTemplate = (
  {
    product,
    customer,
  }: {
    product: Product;
    customer: Customer;
    meta: CustomerMeta;
  },
  time: Time,
  tasks: Task[] = []
): DraftInvoiceRequest => {
  const lines: Line[] = tasks.map(
    ({ name, subTasks, totalSecondsSpent, groupingDate }) => {
      const description = `Leistungserbringung ${formatDateForInvoice(
        groupingDate
      )}\n${sanitizeSubTasks(subTasks)}`;
      return {
        productId: product.id,
        taxEnabled: product.taxEnabled,
        taxRate: product.rate,
        unitNetPrice: product.netUnitSalesPrice,
        productName: name,
        quantity: getRoundedHours(totalSecondsSpent) || 0,
        description,
      };
    }
  );
  const notes = `Leistungszeitraum ${formatDateForInvoice(
    time.startOfMonthFormatted
  )} - ${formatDateForInvoice(time.endOfMonthFormatted)}`;
  const additionalNotes = `Zusätzlich anfallende Arbeiten werden zu einem Stundensatz von ${product.netUnitSalesPrice}€ (Netto) verrechnet.`;
  return {
    customerName: customer.name,
    customerAddress: customer.address,
    customerCountry: customer.countryCode,
    customerEmail: customer.email,
    customerId: customer.id,
    customerNumber: customer.number,
    paymentTermsId: customer.paymentTermsId,
    notes,
    additionalNotes,
    lines,
  };
};
