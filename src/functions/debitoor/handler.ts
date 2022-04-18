import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';
import { BOOK, LABEL_BILLED, MAIL } from '@libs/constants';
import { fetchCompanies } from '@libs/contentful';
import {
  bookDraftInvoice,
  bookSendDraftInvoice,
  changeCompany,
  createDraftInvoices,
  CreateDraftInvoicesResponse,
} from '@libs/debitoor';
import { middyfy } from '@libs/lambda';
import {
  bulkAddBilledTag,
  enrichTimeEntries,
  fetchTimeEntriesBetween,
  filterClientTimeEntriesByCustomer,
  filterTimeEntriesByLabel,
  sanitizeTimeEntries,
} from '@libs/toggl';
import { clearCaches, getConfig, initTranslate, Logger } from '@libs/utils';
import 'source-map-support/register';
import schema from '../schema';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const config = getConfig(event.body, (event as any).usePreviousMonth);
    const {
      dryRun,
      setBilled,
      labelWhitelist,
      labelBlacklist,
      customerWhitelist,
      customerBlacklist,
      time,
    } = config;

    const timeEntries = await fetchTimeEntriesBetween(
      time.fromAsISO,
      time.toAsISO
    );

    const billableTimeEntries = filterTimeEntriesByLabel(
      timeEntries,
      labelWhitelist,
      [...(labelBlacklist || []), LABEL_BILLED]
    );
    const sanitizedTimeEntries = sanitizeTimeEntries(billableTimeEntries);

    let customerTimeEntries = await enrichTimeEntries(sanitizedTimeEntries);
    customerTimeEntries = filterClientTimeEntriesByCustomer(
      customerTimeEntries,
      customerWhitelist,
      customerBlacklist
    );

    let draftInvoices: CreateDraftInvoicesResponse[] = [];
    const booked = [];
    let erroneous = [];
    if (!dryRun) {
      draftInvoices = await createDraftInvoices(customerTimeEntries, config);

      erroneous = draftInvoices.filter(({ error }) => !!error);
      draftInvoices = draftInvoices.filter(({ error }) => !error);

      const bookableDraftInvoices = draftInvoices.filter(({ customerData }) =>
        customerData?.customer.contentful.flags?.includes(BOOK)
      );

      const batched = bookableDraftInvoices.reduce((acc, draftInvoice) => {
        const companyId =
          draftInvoice.customerData.project.contentful.company.fields
            .abbreviation;
        return {
          ...acc,
          [companyId]: [...(acc[companyId] || []), draftInvoice],
        };
      }, {} as Record<string, CreateDraftInvoicesResponse[]>);

      for (const batch of Object.values(batched)) {
        for (const { response, customerData } of batch) {
          const company = customerData.project.contentful.company.fields;
          const customer = customerData.customer.contentful;
          const translate = await initTranslate(customer.language);
          const changeRes = await changeCompany(company);
          try {
            const replacements = {
              'customer name': customerData.customer.contentful.name,
              'company name': company.name,
              'user name': changeRes.companyProfile.responsibleName,
            };
            const bookRes = await (customer.flags?.includes(MAIL)
              ? bookSendDraftInvoice(response.id, {
                  copyMail: !customer.emails?.[0],
                  recipient:
                    customer.emails?.[0] || changeRes.companyProfile.email,
                  ccRecipient: customer.emailCCs?.[0],
                  countryCode: customer.countryCode || 'DE',
                  subject: translate('INVOICE_SUBJECT', replacements),
                  message: translate('INVOICE_MESSAGE', {
                    ...replacements,
                    'total amount': response.totalGrossAmount,
                    currency: response.currency,
                  }),
                })
              : bookDraftInvoice(response.id));
            booked.push(bookRes);
            Logger.log(`Invoice "${bookRes.number}" booked`);
          } catch (error) {
            erroneous = [...erroneous, { response, error }];
          }
        }
      }

      if (setBilled) {
        await bulkAddBilledTag(sanitizedTimeEntries);
      }
    }

    delete config.time;

    return httpResponse(
      200,
      `Created billing task with ${customerTimeEntries.length} subtask(s)`,
      {
        config,
        debitoor: draftInvoices,
        customerTimeEntries: dryRun ? customerTimeEntries : null,
        booked,
        erroneous,
      }
    );
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    const companies = await fetchCompanies();
    const defaultCompany = companies.find(({ fields }) => fields.isDefault);
    const res = await changeCompany(defaultCompany.fields);
    Logger.log(`Company switched back to default (${res.companyProfile.name})`);
    clearCaches();
  }
};

export const main = middyfy(handler);
