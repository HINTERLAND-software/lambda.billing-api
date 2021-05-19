import { Cache, Config, initFetch, translate } from './utils';
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
import { getRoundedHours, formatDateForInvoice, sortByDate } from './time';
import { CX, SKU, LANG, LABEL_CX_PREFIX, LIST_BY_DATES } from './constants';
import { Locale } from 'src/translations';

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
  const response = {
    [CX]: null,
    [SKU]: null,
    [LANG]: null,
    [LIST_BY_DATES]: null,
  };
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
  if (!product) {
    throw new Error(`Product "${meta.sku}" not found`);
  }
  return { product, customer, meta };
};

const getRowsByEntry = (
  timeEntries: TimeEntry[] = [],
  locale: Locale
): string[] => {
  const reduced = timeEntries.reduce((acc, { description, stop }) => {
    return {
      ...acc,
      [description]: [...(acc[description] || []), stop].sort(sortByDate),
    };
  }, {} as { [description: string]: string[] });

  return Object.entries(reduced)
    .sort(([, [a]], [, [b]]) => sortByDate(a, b))
    .map(([description, dates]) => {
      const joinedDates = [
        ...new Set(dates.map((date) => formatDateForInvoice(date, locale))),
      ].join(', ');
      return `  - ${description} (${joinedDates})`;
    });
};

const getRowsByDate = (
  timeEntries: TimeEntry[] = [],
  locale: Locale
): string[] => {
  const reduced = timeEntries.reduce((acc, { stop, description }) => {
    const date = formatDateForInvoice(stop, locale);
    return {
      ...acc,
      [date]: [...(acc[date] || []), description].sort(),
    };
  }, {} as { [date: string]: string[] });

  return Object.entries(reduced)
    .sort(([a], [b]) => sortByDate(a, b))
    .map(([date, descriptions]) => {
      const joinedDescriptions = [...new Set(descriptions.sort())]
        .map((d) => `     - ${d}`)
        .join('\n');
      return `  ${date}\n${joinedDescriptions}`;
    });
};

const languageCodes = {
  de: 'de-DE',
  en: 'en-DE',
};

export const generateInvoiceTemplate = (
  {
    product,
    customer,
    meta,
  }: {
    product: Product;
    customer: Customer;
    meta: CustomerMeta;
  },
  projects: GroupedTimeEntries['projects'],
  config: Config
): DraftInvoiceRequest => {
  const { time } = config;
  const lines: Line[] = projects.map(
    ({ project, totalSecondsSpent, timeEntries }) => {
      return {
        productId: product.id,
        taxEnabled: product.taxEnabled,
        taxRate: product.rate,
        unitId: product.unitId,
        unitNetPrice: product.netUnitSalesPrice,
        productName: project.name,
        quantity: getRoundedHours(totalSecondsSpent) || 0,
        description: meta.listbydates
          ? getRowsByDate(timeEntries, meta.lang).join('\n\n')
          : getRowsByEntry(timeEntries, meta.lang).join('\n'),
      };
    }
  );

  const notes = translate(meta.lang, 'PERFORMANCE_PERIOD', {
    from: formatDateForInvoice(time.startOfMonthFormatted, meta.lang),
    to: formatDateForInvoice(time.endOfMonthFormatted, meta.lang),
  });
  const additionalNotes = translate(meta.lang, 'ADDITIONAL_NOTES', {
    netUnitSalesPrice: product.netUnitSalesPrice,
  });

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
    languageCode: languageCodes[meta.lang] || languageCodes.de,
    lines,
  };
};

export const createDraftInvoices = (
  grouped: GroupedTimeEntries[],
  config: Config
): Promise<Array<DraftInvoiceResponse>> => {
  return Promise.all(
    grouped.map(async (groupedTimeEntries) => {
      try {
        const data = await fetchCustomerData(groupedTimeEntries.client.name);
        const request = generateInvoiceTemplate(
          data,
          groupedTimeEntries.projects,
          config
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
