import { Cache, Config, download, initFetch, Logger, translate } from './utils';
import * as qs from 'querystring';
import {
  CustomerMeta,
  Line,
  Customer,
  Product,
  DraftInvoiceRequest,
  DraftInvoiceResponse,
  Settings,
  GlobalMeta,
  Company,
  LogoResponse,
  CustomerData,
  BookedInvoiceResponse,
} from './debitoor-types';
import { GroupedTimeEntries, TimeEntry } from './toggl-types';
import { getRoundedHours, formatDateForInvoice, sortByDate } from './time';
import { LIST_BY_DATES } from './constants';
import { Locale } from 'src/translations';
import FormData from 'form-data';

const BASE_URL = 'https://api.debitoor.com/api';
const CUSTOMERS_PATH = 'customers';
const PRODUCTS_PATH = 'products/v1';
const SETTINGS_PATH = 'settings/v3';
const DRAFT_INVOICES_PATH = 'sales/draftinvoices';

const fetch = initFetch(`Bearer ${process.env.DEBITOOR_API_TOKEN}`);

const customerCache = new Cache<Customer[]>('debitoor.customers', null);
const productCache = new Cache<{ [key: string]: Product }>(
  'debitoor.products',
  {}
);

export const fetchDraftInvoiceAsHtml = async (draftInvoiceId: string) => {
  return fetch(
    `${BASE_URL}/sales/draftinvoices/${draftInvoiceId}/html/v1`,
    undefined,
    false
  );
};

export const fetchCustomers = async (): Promise<Customer[]> => {
  const customers =
    customerCache.get() || (await fetch(`${BASE_URL}/${CUSTOMERS_PATH}/v2`));
  customerCache.set(customers);
  return customers;
};

export const upsertCustomer = async (data: Customer): Promise<Customer> => {
  const customers = await fetchCustomers();
  const customer = customers.find(({ name }) => name === data.name);
  if (customer?.id) {
    return fetch(`${BASE_URL}/${CUSTOMERS_PATH}/${customer.id}/v2`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  return fetch(`${BASE_URL}/${CUSTOMERS_PATH}/${customer.id}/v2`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
  body: DraftInvoiceRequest
): Promise<DraftInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/v7`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const updateDraftInvoice = async (
  id: string,
  body: object
): Promise<DraftInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/${id}/v8`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const fetchDraftInvoice = async (
  id: string
): Promise<DraftInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/${id}/v8`);
};

export const bookDraftInvoice = async (
  id: string
): Promise<BookedInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/${id}/book/v8`, {
    method: 'POST',
  });
};

export const bookSendDraftInvoice = async (
  id: string,
  recipient: string
): Promise<BookedInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/${id}/booksend/v8`, {
    method: 'POST',
    body: JSON.stringify({
      recipient,
    }),
  });
};

export const changeCompany = async (
  company: Company
): Promise<Settings & LogoResponse> => {
  const logoRes = await changeCompanyLogo(company.logo, `${company.id}.png`);
  const settingsRes = await changeCompanyDetails(
    company.name,
    company.website,
    company.email,
    logoRes.logoUrl
  );
  return { ...logoRes, ...settingsRes };
};

export const changeCompanyLogo = async (
  logoUrl: string,
  fileName: string = 'logo.png'
): Promise<LogoResponse> => {
  const logo = await download(logoUrl);
  const form = new FormData();
  form.append('file', logo);

  return fetch(
    `https://app.debitoor.com/api/v1.0/logo?ocr=true&fileName=${fileName}`,
    {
      method: 'POST',
      headers: form.getHeaders(),
      body: form,
    }
  );
};

export const changeCompanyDetails = async (
  name: string,
  website: string,
  email: string,
  logoUrl: string
): Promise<Settings> => {
  const settings: Settings = await fetch(`${BASE_URL}/${SETTINGS_PATH}`);

  settings.companyProfile.name = name;
  settings.companyProfile.webSite = website;
  settings.companyProfile.email = email;
  settings.companyProfile.logoUrl = logoUrl;

  settings.ccInfo.billingInfo.company = name;

  delete settings.vatReported;

  return fetch(`${BASE_URL}/${SETTINGS_PATH}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

const parseNotes = <T>(notes: string = ''): T => {
  const data = notes.match(/\[\[(.*)\]\]/)?.[1] || '{}';
  return JSON.parse(data);
};
export const getCustomerMeta = (notes: string = ''): CustomerMeta => {
  if (!notes) return { sku: '~' };
  return parseNotes(notes);
};

export const fetchGlobalMeta = async (): Promise<GlobalMeta> => {
  const customers = await fetchCustomers();
  const meta = customers.find(({ name }) => name === 'z_META');
  if (!meta) throw new Error('Customer META not found');
  return parseNotes(meta.notes);
};

export const getCustomer = (
  customers: Customer[],
  customerNameOrId: string
): { customer: Customer; meta: CustomerMeta } => {
  return customers.reduce(
    (acc, customer) => {
      const meta = getCustomerMeta(customer.notes);
      if (
        !acc.customer &&
        !acc.meta &&
        (customerNameOrId === customer.id || customerNameOrId === customer.name)
      ) {
        return { customer, meta };
      }
      return acc;
    },
    { customer: null, meta: null }
  );
};

export const fetchCustomerData = async (
  customerNameOrId: string
): Promise<CustomerData> => {
  const customers = await fetchCustomers();
  const { customer, meta } = getCustomer(customers, customerNameOrId);
  if (!customer || !meta) {
    throw new Error(`Customer "${customerNameOrId}" not found`);
  }
  const product = await fetchProductBySku(meta.sku);
  if (!product) {
    throw new Error(`Product "${meta.sku}" not found`);
  }
  return { product, customer, meta };
};

const getDescriptionRowsByEntry = (
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
  { meta, product }: CustomerData,
  projects: GroupedTimeEntries['projects'] = []
): Line[] => {
  return projects.reduce((acc, { timeEntries, project }) => {
    const reducedTimeEntries = timeEntries.reduce((accEntries, entry) => {
      const { stop } = entry;
      const date = formatDateForInvoice(stop, meta.lang);
      return {
        ...accEntries,
        [date]: [...(accEntries[date] || []), entry].sort(),
      };
    }, {} as { [date: string]: TimeEntry[] });

    const lines: Line[] = Object.entries(reducedTimeEntries)
      .sort(([a], [b]) => sortByDate(a, b))
      .map(([date, descriptions]) => {
        const totalDuration = descriptions.reduce(
          (acc, { duration }) => acc + duration,
          0
        );
        const roundedHours = getRoundedHours(totalDuration);
        const joinedDescriptions = [
          ...new Set(descriptions.map(({ description }) => description).sort()),
        ]
          .map((d) => `     - ${d}`)
          .join('\n');

        return {
          productId: product.id,
          taxEnabled: product.taxEnabled,
          taxRate: product.rate,
          unitId: product.unitId,
          unitNetPrice: product.netUnitSalesPrice,
          productName: `${project.name} | ${date}`,
          quantity: roundedHours || 0,
          description: joinedDescriptions,
        };
      });
    return [...acc, ...lines];
  }, []);
};

const languageCodes = {
  de: 'de-DE',
  en: 'en-DE',
};

export const generateInvoiceTemplate = (
  customerData: CustomerData,
  projects: GroupedTimeEntries['projects'],
  config: Config
): DraftInvoiceRequest => {
  const { product, customer, meta } = customerData;
  const { time } = config;

  const lines: Line[] = meta.flags?.includes(LIST_BY_DATES)
    ? getRowsByDate(customerData, projects)
    : projects.map(({ project, totalSecondsSpent, timeEntries }) => {
        return {
          productId: product.id,
          taxEnabled: product.taxEnabled,
          taxRate: product.rate,
          unitId: product.unitId,
          unitNetPrice: product.netUnitSalesPrice,
          productName: project.name,
          quantity: getRoundedHours(totalSecondsSpent) || 0,
          description: getDescriptionRowsByEntry(timeEntries, meta.lang).join(
            '\n'
          ),
        };
      });

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
    customPaymentTermsDays: customer.customPaymentTermsDays,
    notes,
    additionalNotes,
    languageCode: languageCodes[meta.lang] || languageCodes.de,
    lines,
  };
};

export type CreateDraftInvoicesResponse = {
  response?: DraftInvoiceResponse;
  customerData?: CustomerData;
  groupedTimeEntries: GroupedTimeEntries;
  error?: Error;
};

export const createDraftInvoices = (
  grouped: GroupedTimeEntries[],
  config: Config
): Promise<CreateDraftInvoicesResponse[]> => {
  return Promise.all(
    grouped.map(async (groupedTimeEntries) => {
      try {
        const customerData = await fetchCustomerData(
          groupedTimeEntries.client.name
        );
        const request = generateInvoiceTemplate(
          customerData,
          groupedTimeEntries.projects,
          config
        );
        const response = await createDraftInvoice(request);
        return {
          response,
          groupedTimeEntries,
          customerData,
        };
      } catch (error) {
        Logger.warn(error);
        return {
          groupedTimeEntries,
          error,
        };
      }
    })
  );
};
