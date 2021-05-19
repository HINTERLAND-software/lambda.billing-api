import 'source-map-support/register';

import { Logger, clearCaches, getConfig } from '@libs/utils';
import {
  bulkAddBilledTag,
  groupByClients,
  fetchTimeEntriesBetween,
  filterTimeEntries,
  sanitizeTimeEntries,
} from '@libs/toggl';
import { createDraftInvoices } from '@libs/debitoor';
import { middyfy } from '@libs/lambda';

import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';

import schema from '../schema';
import { DraftInvoiceResponse } from '@libs/debitoor-types';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const config = getConfig(event.body);
    const { dryRun, label, clientWhitelist, time } = config;

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = filterTimeEntries(timeEntries, label);
    const sanitizedTimeEntries = sanitizeTimeEntries(billableTimeEntries);

    const clients = await groupByClients(sanitizedTimeEntries, clientWhitelist);

    let debitoor: DraftInvoiceResponse[] = null;
    if (!dryRun) {
      debitoor = await createDraftInvoices(clients, config);
      await bulkAddBilledTag(sanitizedTimeEntries);
    }

    delete config.time;

    return httpResponse(
      200,
      `Created billing task with ${clients.length} subtask(s)`,
      {
        config,
        debitoor,
        clients: dryRun ? clients : null,
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
