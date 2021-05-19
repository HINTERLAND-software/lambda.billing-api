import 'source-map-support/register';

import { Logger, clearCaches, getConfig } from '@libs/utils';
import {
  bulkAddBilledTag,
  groupByClients,
  fetchTimeEntriesBetween,
  enrichWithTimeEntriesByDay,
  filterTimeEntries,
  sanitizeTimeEntries,
} from '@libs/toggl';
import { middyfy } from '@libs/lambda';

import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';

import schema from '../schema';
import { createCsv } from '@libs/csv';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const { time, ...config } = getConfig(event.body);
    const { dryRun, label, clientWhitelist } = config;

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = filterTimeEntries(timeEntries, label);
    const sanitizedTimeEntries = sanitizeTimeEntries(billableTimeEntries);

    let clients = await groupByClients(sanitizedTimeEntries, clientWhitelist);
    clients = enrichWithTimeEntriesByDay(clients);

    const csv = createCsv(clients);
    if (!dryRun) {
      await bulkAddBilledTag(sanitizedTimeEntries);
    }

    return httpResponse(
      200,
      `Created sheet(s) for ${clients.length} client(s)`,
      {
        config: {
          dryRun,
          range: {
            from: time.startOfMonthFormatted,
            to: time.endOfMonthFormatted,
          },
          label,
          clientWhitelist,
        },
        csv,
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