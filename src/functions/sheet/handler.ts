import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent
} from '@libs/apiGateway';
import { createCsv } from '@libs/csv';
import { middyfy } from '@libs/lambda';
import {
  bulkAddBilledTag,
  enrichWithTimeEntriesByDay,
  fetchTimeEntriesBetween,
  filterTimeEntries,
  groupByClients,
  sanitizeTimeEntries
} from '@libs/toggl';
import { clearCaches, getConfig, Logger } from '@libs/utils';
import 'source-map-support/register';
import schema from '../schema';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const { time, ...config } = getConfig(
      event.body,
      (event as any).usePreviousMonth
    );
    const {
      setBilled,
      dryRun,
      labelWhitelist,
      labelBlacklist,
      customerWhitelist,
      customerBlacklist,
    } = config;

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = filterTimeEntries(
      timeEntries,
      labelWhitelist,
      labelBlacklist
    );
    const sanitizedTimeEntries = sanitizeTimeEntries(billableTimeEntries);

    let clients = await groupByClients(
      sanitizedTimeEntries,
      customerWhitelist,
      customerBlacklist
    );
    clients = enrichWithTimeEntriesByDay(clients);

    const csv = createCsv(clients);
    if (setBilled) {
      await bulkAddBilledTag(sanitizedTimeEntries);
    }

    return httpResponse(
      200,
      `Created sheet(s) for ${clients.length} client(s)`,
      {
        config,
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
