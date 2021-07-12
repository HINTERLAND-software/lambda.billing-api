import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent
} from '@libs/apiGateway';
import { BOOK, LABEL_BILLED, MAIL } from '@libs/constants';
import {
  bookDraftInvoice,
  bookSendDraftInvoice,
  changeCompany,
  createDraftInvoices,
  CreateDraftInvoicesResponse,
  fetchAllCustomerData,
  fetchGlobalMeta
} from '@libs/debitoor';
import { Company, CompanyId, CustomerDataMapping } from '@libs/debitoor-types';
import { middyfy } from '@libs/lambda';
import {
  bulkAddBilledTag,
  enrichTimeEntries,
  fetchTimeEntriesBetween,
  filterClientTimeEntriesByCustomer,
  filterTimeEntriesByLabel,
  sanitizeTimeEntries
} from '@libs/toggl';
import { clearCaches, getConfig, Logger, translate } from '@libs/utils';
import 'source-map-support/register';
import schema from '../schema';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  const globalMeta = await fetchGlobalMeta();

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
      time.startOfMonthISO,
      time.endOfMonthISO
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
    const erroneous = [];
    let customerData: CustomerDataMapping;
    if (!dryRun) {
      customerData = await fetchAllCustomerData(customerTimeEntries);

      draftInvoices = await createDraftInvoices(
        customerTimeEntries,
        config,
        customerData,
        globalMeta
      );

      const bookableDraftInvoices = draftInvoices.filter(({ customerData }) =>
        customerData.meta.flags?.includes(BOOK)
      );

      const batched = bookableDraftInvoices.reduce((acc, draftInvoice) => {
        const companyId = draftInvoice.customerData.meta.company || 'default';
        return {
          ...acc,
          [companyId]: [...(acc[companyId] || []), draftInvoice],
        };
      }, {} as Record<CompanyId, CreateDraftInvoicesResponse[]>);

      const batches = Object.entries(batched);
      for (let i = 0; i < batches.length; i++) {
        const [companyId, batch] = batches[i];
        const company: Company =
          globalMeta.companies[companyId] || globalMeta.companies.default;
        const changeRes = await changeCompany(company);

        for (let x = 0; x < batch.length; x++) {
          const {
            response,
            customerData: { customer, meta },
          } = batch[x];
          try {
            const replacements = {
              'customer name': customer.name,
              'company name': company.name,
              'user name': changeRes.companyProfile.responsibleName,
            };
            const bookRes = await (meta.flags?.includes(MAIL)
              ? bookSendDraftInvoice(response.id, {
                  copyMail: !customer.email,
                  recipient: customer.email || changeRes.companyProfile.email,
                  countryCode: meta.lang === 'de' ? 'DE' : 'GB',
                  subject: translate(
                    meta.lang,
                    'INVOICE_SUBJECT',
                    replacements
                  ),
                  message: translate(meta.lang, 'INVOICE_MESSAGE', {
                    ...replacements,
                    'total amount': response.totalGrossAmount,
                    currency: response.currency,
                  }),
                })
              : bookDraftInvoice(response.id));
            booked.push(bookRes);
            Logger.log(`Invoice "${bookRes.number}" booked`);
          } catch (error) {
            erroneous.push({ response, error });
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
        customerData,
        customerTimeEntries: dryRun ? customerTimeEntries : null,
        booked,
        erroneous,
      }
    );
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    const res = await changeCompany(globalMeta.companies.default);
    Logger.log(`Company switched back to default (${res.companyProfile.name})`);
    clearCaches();
  }
};

export const main = middyfy(handler);
