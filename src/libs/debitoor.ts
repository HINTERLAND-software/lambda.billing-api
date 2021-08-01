import FormData from 'form-data';
import nodeFetch from 'node-fetch';
import * as qs from 'querystring';
import { Locale } from 'src/translations';
import { ATTACH_TIMESHEET, LIST_BY_DATES } from './constants';
import { createCsv, csvToHtml, htmlToPdf } from './csv';
import {
  Attachment,
  BookedInvoiceResponse,
  Company,
  Customer,
  CustomerData,
  CustomerDataMapping,
  CustomerMeta,
  DraftInvoiceRequest,
  DraftInvoiceResponse,
  File,
  GlobalMeta,
  Line,
  LogoResponse,
  Product,
  Settings
} from './debitoor-types';
import { formatDateForInvoice, getRoundedHours, sortByDate } from './time';
import { ClientTimeEntries, EnrichedTimeEntry, TimeEntry } from './toggl-types';
import {
  Cache,
  Config,
  download,
  initFetch,
  Logger,
  translate,
  uniquify
} from './utils';

const BASE_URL = 'https://api.debitoor.com/api';
const CUSTOMERS_PATH = 'customers';
const PRODUCTS_PATH = 'products/v1';
const SETTINGS_PATH = 'settings/v3';
const DRAFT_INVOICES_PATH = 'sales/draftinvoices';

const authorization = `Bearer ${process.env.DEBITOOR_API_TOKEN}`;

const fetch = initFetch(authorization);

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

export const upsertCustomer = async (
  data: Partial<Customer>
): Promise<Customer> => {
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

export const createFile = async <T>(
  buffer: Buffer,
  filename: string
): Promise<T> => {
  const form = new FormData();

  const fileName = `ts_${filename.replace(/\./, '')}.pdf`;

  form.append('file', buffer, { filename: fileName });

  const url = `${BASE_URL}/files/v1?fileName=${encodeURIComponent(fileName)}`;
  const res = await nodeFetch(url, {
    method: 'POST',
    body: form,
    headers: {
      ...form.getHeaders(),
      Authorization: authorization,
    },
  });
  const json = await res.json();
  if (json['message']) return Promise.reject({ ...json, url });
  return json;
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
  body: {
    recipient: string;
    ccRecipient?: string;
    subject?: string;
    message?: string;
    copyMail?: boolean;
    countryCode?: 'DE' | 'GB';
  }
): Promise<BookedInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/${id}/booksend/v8`, {
    method: 'POST',
    body: JSON.stringify(body),
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

export const fetchAllCustomerData = async (
  customerTimeEntries: ClientTimeEntries[]
): Promise<CustomerDataMapping> =>
  customerTimeEntries.reduce(
    async (acc, { customer }) => ({
      ...(await acc),
      [customer.name]: await fetchCustomerData(customer.name),
    }),
    {} as Promise<CustomerDataMapping>
  );

const getDescriptionByProjects = (
  timeEntries: TimeEntry[] = [],
  locale: Locale
): string => {
  const reduced = timeEntries.reduce((acc, { description, stop }) => {
    return {
      ...acc,
      [description]: [...(acc[description] || []), stop].sort(sortByDate),
    };
  }, {} as { [description: string]: string[] });

  return Object.entries(reduced)
    .sort(([, [a]], [, [b]]) => sortByDate(a, b))
    .map(([description, dates]) => {
      const joinedDates = uniquify(
        dates.map((date) => formatDateForInvoice(date, locale))
      ).join(', ');
      return `  - ${description} (${joinedDates})`;
    })
    .join('\n');
};

const getDescriptionByDates = (
  timeEntries: EnrichedTimeEntry[] = [],
  locale: Locale
): string => {
  const projects = uniquify(timeEntries.map(({ project }) => project.name));
  return [
    translate(locale, projects.length > 1 ? 'PROJECTS' : 'PROJECT', {
      projects: projects.join(', '),
    }),
    '',
    ...uniquify(timeEntries.map(({ description }) => description))
      .sort()
      .map((d) => `     - ${d}`),
  ].join('\n');
};

const languageCodes = {
  de: 'de-DE',
  en: 'en-DE',
};

export const generateInvoiceTemplate = (
  customerData: CustomerData,
  customerTimeEntries: ClientTimeEntries,
  config: Config
): DraftInvoiceRequest => {
  const { product, customer, meta } = customerData;
  const { time } = config;

  const lines: Line[] = meta.flags?.includes(LIST_BY_DATES)
    ? customerTimeEntries.days.map(
        ({ start, timeEntries, totalSecondsSpent }) => ({
          productId: product.id,
          taxEnabled: product.taxEnabled,
          taxRate: product.rate,
          unitId: product.unitId,
          unitNetPrice: product.netUnitSalesPrice,
          quantity: getRoundedHours(totalSecondsSpent) || 0,
          productName: formatDateForInvoice(start, meta.lang),
          description: getDescriptionByDates(timeEntries, meta.lang),
        })
      )
    : customerTimeEntries.projects.map(
        ({ project, totalSecondsSpent, timeEntries }) => ({
          productId: product.id,
          taxEnabled: product.taxEnabled,
          taxRate: product.rate,
          unitId: product.unitId,
          unitNetPrice: product.netUnitSalesPrice,
          quantity: getRoundedHours(totalSecondsSpent) || 0,
          productName: project.name,
          description: getDescriptionByProjects(timeEntries, meta.lang),
        })
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
  customerTimeEntries: ClientTimeEntries;
  error?: Error;
};

export const createDraftInvoices = (
  customersTimeEntries: ClientTimeEntries[],
  config: Config,
  customerDataMapping: CustomerDataMapping,
  globalMeta: GlobalMeta
): Promise<CreateDraftInvoicesResponse[]> => {
  return Promise.all(
    customersTimeEntries.map(async (customerTimeEntries) => {
      try {
        const customerData =
          customerDataMapping[customerTimeEntries.customer.name];
        if (!customerData)
          throw new Error(
            `No customer found for ${customerTimeEntries.customer.name}`
          );

        const request = generateInvoiceTemplate(
          customerData,
          customerTimeEntries,
          config
        );

        if (customerData.meta?.flags?.includes(ATTACH_TIMESHEET)) {
          const csvs = createCsv(
            [customerTimeEntries],
            customerDataMapping,
            config,
            globalMeta
          );

          request.attachments = await Promise.all(
            csvs.map(({ csv, name }) => {
              const matches = name.match(/\b(\w)/g); // ['J','S','O','N']
              const fileName = [
                matches.join(''),
                formatDateForInvoice(
                  config.time.startOfMonthFormatted,
                  customerData.meta.lang
                ),
                formatDateForInvoice(
                  config.time.endOfMonthFormatted,
                  customerData.meta.lang
                ),
              ].join('_');
              return generateAttachment(csv, fileName);
            })
          );
        }

        const response = await createDraftInvoice(request);
        if (!response) {
          Logger.error(request);
          throw new Error('No response');
        }
        return {
          response,
          customerTimeEntries,
          customerData,
        };
      } catch (error) {
        Logger.warn(error);
        return {
          customerTimeEntries,
          error,
        };
      }
    })
  );
};

export const generateAttachment = async (
  csv: string,
  name: string
): Promise<Attachment> => {
  const html = csvToHtml(csv, name);
  const buffer = await htmlToPdf(html);
  const file: File = await createFile(buffer, name);
  return { fileId: file.id };
};
