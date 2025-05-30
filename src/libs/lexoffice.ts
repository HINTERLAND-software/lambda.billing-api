import { documentToPlainTextString } from '@contentful/rich-text-plain-text-renderer';
import FormData from 'form-data';
import nodeFetch from 'node-fetch';
import { BILL_PER_PROJECT, BOOK } from './constants';
import { fetchCustomers } from './contentful';
import { TypeCustomer } from './contentful-types';
import { csvToHtml, htmlToPdf } from './csv';
import { Contact, ErrorResponse, Invoice, LineItem } from './lexoffice-types';
import { formatDateForInvoice, getRoundedHours } from './time';
import {
  ClientTimeEntries,
  EnrichedTimeEntry,
  ProjectTimeEntries,
} from './toggl-types';
import { Config, initFetch, initTranslate, Logger, uniquify } from './utils';

const BASE_URL = 'https://api.lexware.io';
const CONTACTS_PATH = 'v1/contacts';
const VOUCHERS_PATH = 'v1/vouchers';
const INVOICES_PATH = 'v1/invoices';

const authorization = `Bearer ${process.env.LEXOFFICE_API_TOKEN}`;

const fetch = initFetch(authorization);

export async function updateCustomers() {
  const customers = await fetchCustomers();
  for (const customer of customers) {
    await upsertCustomer(customer);
  }
}

export async function fetchExistingCustomer(customer: TypeCustomer) {
  const results = await fetch<{ content: Contact[] }>(
    `${BASE_URL}/${CONTACTS_PATH}?name=${encodeURIComponent(
      htmlEntities(customer.fields.name)
    )}`
  );
  return results.content?.[0];
}

function htmlEntities(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getTimeEntriesByProject(
  timeEntries: EnrichedTimeEntry[]
): Record<string, EnrichedTimeEntry[]> {
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
}

function getDescriptionByDates(
  timeEntries: EnrichedTimeEntry[] = [],
  shouldBeBilledByProject: boolean,
  translate: (key: string, params?: Record<string, string>) => string
): string {
  const timeEntriesByProject = getTimeEntriesByProject(timeEntries);

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
          .map((d) => `  - ${d}`),
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

export async function generateInvoiceTemplate(
  customerTimeEntries: ClientTimeEntries | ProjectTimeEntries,
  config: Config
): Promise<Invoice> {
  const { time } = config;
  const shouldBeBilledByProject = customerTimeEntries.customer.contentful.flags?.includes(
    BILL_PER_PROJECT
  );

  const translate = await initTranslate(
    customerTimeEntries.customer.contentful.language
  );

  const lineItems: LineItem[] = customerTimeEntries.days.map(
    ({ start, timeEntries, totalSecondsSpent }) => {
      const unitPrice = {
        currency: 'EUR',
        netAmount:
          customerTimeEntries.project.contentful.product?.fields.netPrice,
        taxRatePercentage:
          customerTimeEntries.project.contentful.product?.fields.tax || 0,
      };
      return {
        type: 'custom',
        name: formatDateForInvoice(
          start,
          customerTimeEntries.customer.contentful.language
        ),
        unitName: translate(
          `UNIT_${
            customerTimeEntries.project.contentful.product?.fields.unit ||
            'hour'
          }`.toUpperCase()
        ),
        quantity: getRoundedHours(totalSecondsSpent) || 0,
        unitPrice,
        description: getDescriptionByDates(
          timeEntries,
          shouldBeBilledByProject,
          translate
        ),
      };
    }
  );

  const introduction = [
    shouldBeBilledByProject && ' ',
    shouldBeBilledByProject &&
      translate('PROJECT', {
        projects: (customerTimeEntries as ProjectTimeEntries).project.contentful
          .name,
      }),
  ]
    .filter(Boolean)
    .join('\n');

  const remark = translate('ADDITIONAL_NOTES', {
    netUnitSalesPrice: customerTimeEntries.project.product.contentful.netPrice,
  });

  const voucherDate = new Date().toISOString();
  return {
    voucherDate,
    address: {
      contactId: customerTimeEntries.customer.lexoffice.id,
    },
    lineItems,
    totalPrice: {
      currency: 'EUR',
    },
    taxConditions: {
      taxType: 'net',
    },
    paymentConditions: {
      paymentTermDuration: customerTimeEntries.customer.contentful.paymentTerm,
      paymentTermLabel: translate('PAYMENT_TERM', {
        paymentRange: customerTimeEntries.customer.contentful.paymentTerm,
      }),
    },
    shippingConditions: {
      shippingType: 'serviceperiod',
      shippingDate: time.fromAsISO,
      shippingEndDate: time.toAsISO,
    },
    language: customerTimeEntries.customer.contentful.language,
    title: translate('INVOICE_TITLE'),
    introduction: introduction,
    remark: remark,
  };
}

export async function createInvoices(
  customersTimeEntries: ClientTimeEntries[],
  config: Config
): Promise<(Invoice | ErrorResponse)[]> {
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

  const results: (Invoice | ErrorResponse)[] = [];
  for (const customerTimeEntries of batchedCustomersTimeEntries) {
    const request = await generateInvoiceTemplate(customerTimeEntries, config);

    // TODO reenable
    // if (
    //   customerTimeEntries.customer.contentful.flags?.includes(
    //     ATTACH_TIMESHEET
    //   )
    // ) {
    //   const csvs = await createCsv([customerTimeEntries], config);

    //   request.attachments = await Promise.all(
    //     csvs.map(({ csv, name }) => {
    //       const matches = name.match(/\b(\w)/g); // ['J','S','O','N']
    //       const fileName = [
    //         matches.join(''),
    //         formatDateForInvoice(
    //           config.time.fromDateFormatted,
    //           customerTimeEntries.customer.contentful.language
    //         ),
    //         formatDateForInvoice(
    //           config.time.toDateFormatted,
    //           customerTimeEntries.customer.contentful.language
    //         ),
    //       ].join('_');
    //       return generateAttachment(csv, fileName);
    //     })
    //   );
    // }

    const response = await createInvoice(
      request,
      customerTimeEntries.customer.contentful.flags?.includes(BOOK)
    );
    results.push(response);
    if (!response) {
      Logger.error(request);
      throw new Error('No response');
    }
  }
  return results;
}

export const createInvoice = async (
  body: Invoice,
  finalize?: boolean
): Promise<Invoice> => {
  return fetch(
    `${BASE_URL}/${INVOICES_PATH}${finalize ? '?finalize=true' : ''}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
};

export async function generateAttachment(
  csv: string,
  name: string,
  voucherId: string
): Promise<void> {
  const html = csvToHtml(csv, name);
  const buffer = await htmlToPdf(html);
  await attachFileToVoucher(buffer, name, voucherId);
}

async function attachFileToVoucher<T>(
  buffer: Buffer,
  filename: string,
  voucherId: string
): Promise<T> {
  const form = new FormData();

  const fileName = `ts_${filename.replace(/\./, '')}.pdf`;

  form.append('file', buffer, { filename: fileName });

  const url = `${BASE_URL}/${VOUCHERS_PATH}/${voucherId}`;
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
}

async function upsertCustomer(customer: TypeCustomer) {
  const found = await fetchExistingCustomer(customer);
  const address = getAddress();

  const contact: Contact = {
    version: found?.version ?? 0,
    roles: {
      customer: {},
    },
    company: {
      name: customer.fields.name,
      vatRegistrationId: customer.fields.taxId,
      allowTaxFreeInvoices: false,
    },
    addresses: address
      ? {
          billing: [address],
        }
      : undefined,
    emailAddresses: {
      business: customer.fields.emails?.slice(0, 1),
      other: customer.fields.emails?.slice(1),
    },
    phoneNumbers: {
      business: customer.fields.phone ? [customer.fields.phone] : [],
    },
    note: documentToPlainTextString(customer.fields.notes, '\n'),
  };

  await fetch(`${BASE_URL}/${CONTACTS_PATH}${found ? `/${found.id}` : ''}`, {
    method: found ? 'PUT' : 'POST',
    body: JSON.stringify(contact),
  });

  function getAddress() {
    const splitAddress = customer.fields.address?.split('\n');
    if (!splitAddress?.length) return;

    const hasAdditional = splitAddress.length > 3;
    const additional = hasAdditional ? splitAddress[0] : undefined;
    const streetAndNumber = hasAdditional ? splitAddress[1] : splitAddress[0];
    const postalCodeAndCity = hasAdditional ? splitAddress[2] : splitAddress[1];

    const [postalCode, city] = postalCodeAndCity.split(' ');

    const address = {
      supplement: additional,
      street: streetAndNumber,
      zip: postalCode,
      city,
      countryCode: customer.fields.countryCode || 'DE',
    };
    return address;
  }
}

export function isErrorResponse<T>(
  response: T | ErrorResponse
): response is ErrorResponse {
  return (response as ErrorResponse).error !== undefined;
}
