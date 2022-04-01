import { documentToPlainTextString } from '@contentful/rich-text-plain-text-renderer';
import FormData from 'form-data';
import nodeFetch from 'node-fetch';
import * as qs from 'querystring';
import { ATTACH_TIMESHEET, BILL_PER_PROJECT } from './constants';
import { ContentfulCompany, fetchCustomers, fetchProducts } from './contentful';
import { createCsv, csvToHtml, htmlToPdf } from './csv';
import {
  Attachment,
  BookedInvoiceResponse,
  Customer,
  DraftInvoiceRequest,
  DraftInvoiceResponse,
  File,
  Line,
  LogoResponse,
  Product,
  Settings
} from './debitoor-types';
import { formatDateForInvoice, getRoundedHours } from './time';
import {
  ClientTimeEntries,
  EnrichedTimeEntry,
  ProjectTimeEntries
} from './toggl-types';
import { CustomerData, Locale } from './types';
import {
  Config,
  download,
  initFetch,
  initTranslate,
  Logger,
  uniquify
} from './utils';

const BASE_URL = 'https://api.debitoor.com/api';
const CUSTOMERS_PATH = 'customers/v2';
const PRODUCTS_PATH = 'products/v1';
const SETTINGS_PATH = 'settings/v3';
const DRAFT_INVOICES_PATH = 'sales/draftinvoices';

const authorization = `Bearer ${process.env.DEBITOOR_API_TOKEN}`;

const fetch = initFetch(authorization);

export const fetchDraftInvoiceAsHtml = async (draftInvoiceId: string) => {
  return fetch(
    `${BASE_URL}/sales/draftinvoices/${draftInvoiceId}/html/v1`,
    undefined,
    false
  );
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

export const fetchDebitoorProductBySku = async (
  sku: string
): Promise<Product> => {
  const querystring = qs.stringify({ sku });
  const result = await fetch(`${BASE_URL}/${PRODUCTS_PATH}?${querystring}`);
  const product = result?.[0];
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
    countryCode?: string;
  }
): Promise<BookedInvoiceResponse> => {
  return fetch(`${BASE_URL}/${DRAFT_INVOICES_PATH}/${id}/booksend/v8`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const changeCompany = async (
  company: ContentfulCompany
): Promise<Settings & LogoResponse> => {
  const logoRes = await changeCompanyLogo(
    company.logo.fields.file.url,
    `${company.abbreviation}.png`
  );
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

const getDescriptionByDates = async (
  timeEntries: EnrichedTimeEntry[] = [],
  locale: Locale,
  shouldBeBilledByProject: boolean
): Promise<string> => {
  const timeEntriesByProject = getTimeEntriesByProject(timeEntries);

  const translate = await initTranslate(locale);

  return Object.entries(timeEntriesByProject)
    .map(([project, timeEntries]) => {
      return [
        !shouldBeBilledByProject &&
          translate('PROJECT', {
            projects: project,
          }),
        !shouldBeBilledByProject && ' ',
        ...uniquify(timeEntries.map(({ description }) => description))
          .sort()
          .map((d) => `     - ${d}`),
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
};

const languageCodes = {
  de: 'de-DE',
  en: 'en-DE',
};

export const generateInvoiceTemplate = async (
  customerTimeEntries: ClientTimeEntries | ProjectTimeEntries,
  config: Config
): Promise<DraftInvoiceRequest> => {
  const { time } = config;
  const shouldBeBilledByProject = customerTimeEntries.customer.contentful.flags?.includes(
    BILL_PER_PROJECT
  );

  const lines: Line[] = await Promise.all(
    customerTimeEntries.days.map(
      async ({ start, timeEntries, totalSecondsSpent }) => ({
        productId: customerTimeEntries.project.product.debitoor.id,
        taxEnabled: customerTimeEntries.project.product.debitoor.taxEnabled,
        taxRate: customerTimeEntries.project.product.debitoor.rate,
        unitId: customerTimeEntries.project.product.debitoor.unitId,
        unitNetPrice:
          customerTimeEntries.project.product.debitoor.netUnitSalesPrice,
        quantity: getRoundedHours(totalSecondsSpent) || 0,
        productName: formatDateForInvoice(
          start,
          customerTimeEntries.customer.contentful.language
        ),
        description: await getDescriptionByDates(
          timeEntries,
          customerTimeEntries.customer.contentful.language,
          shouldBeBilledByProject
        ),
      })
    )
  );

  const translate = await initTranslate(
    customerTimeEntries.customer.contentful.language
  );

  const notes = [
    translate('PERFORMANCE_PERIOD', {
      from: formatDateForInvoice(
        time.startOfMonthFormatted,
        customerTimeEntries.customer.contentful.language
      ),
      to: formatDateForInvoice(
        time.endOfMonthFormatted,
        customerTimeEntries.customer.contentful.language
      ),
    }),
    shouldBeBilledByProject && ' ',
    shouldBeBilledByProject &&
      translate('PROJECT', {
        projects: (customerTimeEntries as ProjectTimeEntries).project.contentful
          .name,
      }),
  ]
    .filter(Boolean)
    .join('\n');
  const additionalNotes = translate('ADDITIONAL_NOTES', {
    netUnitSalesPrice:
      customerTimeEntries.project.product.debitoor.netUnitSalesPrice,
  });

  return {
    customerName: customerTimeEntries.customer.contentful.name,
    customerAddress: customerTimeEntries.customer.contentful.address,
    customerCountry: customerTimeEntries.customer.contentful.countryCode,
    customerEmail: customerTimeEntries.customer.contentful.emails?.[0],
    customerId: customerTimeEntries.customer.debitoor.id,
    customerNumber: customerTimeEntries.customer.debitoor.number,
    paymentTermsId: customerTimeEntries.customer.debitoor.paymentTermsId,
    customPaymentTermsDays:
      customerTimeEntries.customer.debitoor.customPaymentTermsDays,
    notes,
    additionalNotes,
    languageCode:
      languageCodes[customerTimeEntries.customer.contentful.language] ||
      languageCodes.de,
    lines,
  };
};

export type CreateDraftInvoicesResponse = {
  response?: DraftInvoiceResponse;
  customerData: CustomerData;
  customerTimeEntries: ClientTimeEntries | ProjectTimeEntries;
  error?: Error;
};

export const createDraftInvoices = async (
  customersTimeEntries: ClientTimeEntries[],
  config: Config
): Promise<CreateDraftInvoicesResponse[]> => {
  const batchedCustomersTimeEntries: (
    | ProjectTimeEntries
    | ClientTimeEntries
  )[] = customersTimeEntries.reduce((acc, customerTimeEntries) => {
    if (
      customerTimeEntries.customer.contentful.flags?.includes(BILL_PER_PROJECT)
    ) {
      return [...acc, ...customerTimeEntries.projects];
    }
    return [...acc, customerTimeEntries];
  }, []);

  const payload: CreateDraftInvoicesResponse[] = [];
  for (const customerTimeEntries of batchedCustomersTimeEntries) {
    try {
      const request = await generateInvoiceTemplate(
        customerTimeEntries,
        config
      );

      if (
        customerTimeEntries.customer.contentful.flags?.includes(
          ATTACH_TIMESHEET
        )
      ) {
        const csvs = await createCsv([customerTimeEntries], config);

        request.attachments = await Promise.all(
          csvs.map(({ csv, name }) => {
            const matches = name.match(/\b(\w)/g); // ['J','S','O','N']
            const fileName = [
              matches.join(''),
              formatDateForInvoice(
                config.time.startOfMonthFormatted,
                customerTimeEntries.customer.contentful.language
              ),
              formatDateForInvoice(
                config.time.endOfMonthFormatted,
                customerTimeEntries.customer.contentful.language
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
      payload.push({
        response,
        customerData: {
          customer: customerTimeEntries.customer,
          project: customerTimeEntries.project,
        },
        customerTimeEntries,
      });
    } catch (error) {
      Logger.warn(error);
      payload.push({
        customerTimeEntries,
        customerData: {
          customer: customerTimeEntries.customer,
          project: customerTimeEntries.project,
        },
        error,
      });
    }
  }
  return payload;
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

export const getTimeEntriesByProject = (
  timeEntries: EnrichedTimeEntry[]
): Record<string, EnrichedTimeEntry[]> => {
  return timeEntries.reduce(
    (acc2, timeEntry) => ({
      ...acc2,
      [timeEntry.project.contentful.name]: [
        ...(acc2[timeEntry.project.contentful.name] || []),
        timeEntry,
      ],
    }),
    {}
  );
};

interface ProductBody extends Partial<Product> {
  reference: string;
}

interface CustomerBody extends Partial<Customer> {
  reference: string;
}

export async function updateDebitoorProducts() {
  const products = await fetchProducts();

  for (const product of products) {
    await upsertDebitoorProduct({
      name: product.fields.name,
      reference: product.sys.id,
      description: product.fields.description,
      unitId: 1, // hours
      taxEnabled: !!product.fields.tax,
      rate: product.fields.tax,
      netUnitSalesPrice: product.fields.netPrice,
      sku: `${product.fields.skuPrefix}-${product.fields.skuSuffix}`,
    });
  }
}

export async function fetchDebitoorProductByReference(
  reference: string
): Promise<Product> {
  return await fetchExisting<Product>(
    `${BASE_URL}/${PRODUCTS_PATH}?${qs.stringify({ reference })}`,
    reference
  );
}

async function upsertDebitoorProduct(body: ProductBody) {
  const found = await fetchDebitoorProductByReference(body.reference);
  await fetch(`${BASE_URL}/products${found ? `/${found.id}/v1` : '/v1'}`, {
    method: found ? 'PATCH' : 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateDebitoorCustomers() {
  const customers = await fetchCustomers();

  const paymentTermIds = await fetch<{ days: number; id: number }[]>(
    `${BASE_URL}/sales/paymentterms/v1`
  );
  for (const customer of customers) {
    const paymentTerm = customer.fields.paymentTerm;
    const paymentTermsId = paymentTerm
      ? paymentTermIds?.find(({ days }) => days === paymentTerm)?.id || 5
      : undefined;  
    await upsertDebitoorCustomer({
      name: customer.fields.name,
      reference: customer.sys.id,
      address: [customer.fields.additionalName, customer.fields.address]
        .filter(Boolean)
        .join('\n'),
      ciNumber: customer.fields.taxId,
      email: customer.fields.emails?.[0],
      phone: customer.fields.phone,
      notes: [
        customer.fields.emailCCs?.join(', '),
        documentToPlainTextString(customer.fields.notes as any, '\n'),
      ]
        .filter(Boolean)
        .join('\n'),
      countryCode: customer.fields.countryCode || 'DE',
      customPaymentTermsDays: paymentTermsId === 5 ? paymentTerm : undefined,
      paymentTermsId,
    });
  }
}

export async function fetchDebitoorCustomerByReference(
  reference: string
): Promise<Customer> {
  return fetchExisting<Customer>(
    `${BASE_URL}/${CUSTOMERS_PATH}?${qs.stringify({ reference })}`,
    reference
  );
}

async function upsertDebitoorCustomer(body: CustomerBody) {
  const found = await fetchDebitoorCustomerByReference(body.reference);
  await fetch(`${BASE_URL}/customers${found ? `/${found.id}/v2` : '/v2'}`, {
    method: found ? 'PATCH' : 'POST',
    body: JSON.stringify(body),
  });
}

async function fetchExisting<T>(
  url: string,
  id: string
): Promise<undefined | T> {
  const fetched = await fetch(url);
  return Array.isArray(fetched)
    ? fetched?.find(({ reference }) => reference === id)
    : fetched;
}
