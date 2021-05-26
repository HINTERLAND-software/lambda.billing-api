import 'source-map-support/register';

import { Logger, clearCaches, getConfig } from '@libs/utils';
import {
  bulkAddBilledTag,
  groupByClients,
  fetchTimeEntriesBetween,
  filterTimeEntries,
  sanitizeTimeEntries,
} from '@libs/toggl';
import {
  bookDraftInvoice,
  bookSendDraftInvoice,
  changeCompany,
  createDraftInvoices,
  CreateDraftInvoicesResponse,
  fetchGlobalMeta,
} from '@libs/debitoor';
import { middyfy } from '@libs/lambda';
import { BOOK, MAIL } from '@libs/constants';

import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';

import schema from '../schema';
import { CompanyId } from '@libs/debitoor-types';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  const globalMeta = await fetchGlobalMeta();

  try {
    const config = getConfig(event.body);
    const { dryRun, setBilled, labels, customerWhitelist, time } = config;

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = filterTimeEntries(timeEntries, labels);
    const sanitizedTimeEntries = sanitizeTimeEntries(billableTimeEntries);

    const clients = await groupByClients(
      sanitizedTimeEntries,
      customerWhitelist
    );

    let draftInvoices: CreateDraftInvoicesResponse[] = [];
    const booked = [];
    const erroneous = [];
    if (!dryRun) {
      draftInvoices = await createDraftInvoices(clients, config);

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
        const company =
          globalMeta.companies[companyId] || globalMeta.companies.default;
        const changeRes = await changeCompany(company);

        for (let x = 0; x < batch.length; x++) {
          const { response, customerData } = batch[x];
          try {
            const bookRes = await (customerData.meta.flags?.includes(MAIL)
              ? bookSendDraftInvoice(
                  response.id,
                  changeRes.companyProfile.email
                )
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
      `Created billing task with ${clients.length} subtask(s)`,
      {
        config,
        debitoor: draftInvoices,
        clients: dryRun ? clients : null,
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
