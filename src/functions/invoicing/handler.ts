import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';
import { LABEL_BILLED } from '@libs/constants';
import { middyfy } from '@libs/lambda';
import { createInvoices, isErrorResponse } from '@libs/lexoffice';
import {
  bulkAddBilledTag,
  enrichTimeEntries,
  fetchTimeEntriesBetween,
  filterClientTimeEntriesByCustomer,
  filterTimeEntriesByLabel,
  sanitizeTimeEntries,
} from '@libs/toggl';
import { clearCaches, getConfig, Logger } from '@libs/utils';
import 'source-map-support/register';
import { ErrorResponse, Invoice } from '../../libs/lexoffice-types';
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

    let invoices: Invoice[] = [];
    let erroneous: ErrorResponse[] = [];
    if (!dryRun) {
      const results = await createInvoices(customerTimeEntries, config);

      erroneous = (results.filter(
        isErrorResponse
      ) as unknown) as ErrorResponse[];
      invoices = (results.filter(
        (draftInvoice) => !isErrorResponse(draftInvoice)
      ) as unknown) as Invoice[];

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
        invoices: invoices,
        customerTimeEntries: dryRun ? customerTimeEntries : null,
        erroneous,
      }
    );
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    clearCaches();
  }
};

export const main = middyfy(handler);
