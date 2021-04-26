import { Cache, initFetch } from './utils';
import * as qs from 'querystring';
import {
  CustomerMeta,
  Line,
  Customer,
  Product,
  DraftInvoiceRequest,
  DraftInvoiceResponse,
} from './debitoor-types';
import { GroupedTimeEntries, TimeEntry } from './toggl-types';
import { Time, getRoundedHours, formatDateForInvoice } from './time';
import { CX, SKU, LABEL_CX_PREFIX } from './constants';

const BASE_URL = 'https://api.debitoor.com/api';
const CUSTOMERS_PATH = 'customers/v2';
const PRODUCTS_PATH = 'products/v1';
const DRAFT_INVOICES_PATH = 'sales/draftinvoices/v7';

const fetch = initFetch(`Bearer ${process.env.DEBITOOR_API_TOKEN}`);

const customerCache = new Cache<Customer[]>('debitoor.customers', null);
const productCache = new Cache<{ [key: string]: Product }>(
  'debitoor.products',
  {}
);

export const fetchCustomers = async (): Promise<Customer[]> => {
  const customers =
    customerCache.get() || (await fetch(`${BASE_URL}/${CUSTOMERS_PATH}`));
  customerCache.set(customers);
  return customers;
};

export const fetchProductBySku = async (sku: string): Promise<Product> => {
  const cachedProduct = productCache.get()?.[sku];
  if (cachedProduct) return cachedProduct;

  const querystring = qs.stringify({ sku });
  const result = await fetch(`${BASE_URL}/${PRODUCTS_PATH}?${querystring}`);
  const product = result?.[0];
  productCache.assign({ [sku]: product });
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
  customerName: string
): { customer: Customer; meta: CustomerMeta } => {
  return customers.reduce(
    (acc, customer) => {
      const meta = getCustomerMeta(customer.notes);
      if (
        !acc.customer &&
        !acc.meta &&
        customerName.replace(LABEL_CX_PREFIX, '') === meta.cx
      ) {
        return { customer, meta };
      }
      return acc;
    },
    { customer: null, meta: null }
  );
};

export const fetchCustomerData = async (
  customerName: string
): Promise<{
  product: Product;
  customer: Customer;
  meta: CustomerMeta;
}> => {
  const customers = await fetchCustomers();
  const { customer, meta } = getCustomer(customers, customerName);
  if (!customer || !meta) {
    throw new Error(`Customer "${customerName}" not found`);
  }
  const product = await fetchProductBySku(meta.sku);
  return { product, customer, meta };
};

const sanitizeTimeEntries = (timeEntries: TimeEntry[] = []) => {
  const filteredAndMapped = timeEntries.map(
    ({ description, stop }) =>
      `  - ${description} (${formatDateForInvoice(stop)})`
  );
  return filteredAndMapped.join('\n');
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
  projects: GroupedTimeEntries['projects']
): DraftInvoiceRequest => {
  const lines: Line[] = projects.map(
    ({ project, totalSecondsSpent, timeEntries }) => {
      return {
        productId: product.id,
        taxEnabled: product.taxEnabled,
        taxRate: product.rate,
        unitNetPrice: product.netUnitSalesPrice,
        productName: project.name,
        quantity: getRoundedHours(totalSecondsSpent) || 0,
        description: sanitizeTimeEntries(timeEntries),
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

export const createDraftInvoices = (
  grouped: GroupedTimeEntries[],
  time: Time
): Promise<Array<DraftInvoiceResponse>> => {
  return Promise.all(
    grouped.map(async (groupedTimeEntries) => {
      try {
        const data = await fetchCustomerData(groupedTimeEntries.client.name);
        const request = generateInvoiceTemplate(
          data,
          time,
          groupedTimeEntries.projects
        );
        const response = await createDraftInvoice(request);
        return {
          groupedTimeEntries,
          data,
          id: response.id,
          number: response.number,
          date: response.date,
          dueDate: response.dueDate,
          totalNetAmount: response.totalNetAmount,
          totalTaxAmount: response.totalTaxAmount,
          totalGrossAmount: response.totalGrossAmount,
        };
      } catch (error) {
        return {
          groupedTimeEntries,
          ...error,
        };
      }
    })
  );
};
