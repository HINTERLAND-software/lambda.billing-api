import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';
import { createCsv } from '@libs/csv';
import { middyfy } from '@libs/lambda';
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
import schema from '../schema';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const fullConfig = getConfig(event.body, (event as any).usePreviousMonth);
    const { time, ...config } = fullConfig;
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

    const billableTimeEntries = filterTimeEntriesByLabel(
      timeEntries,
      labelWhitelist,
      labelBlacklist
    );
    const sanitizedTimeEntries = sanitizeTimeEntries(billableTimeEntries);

    let customerTimeEntries = await enrichTimeEntries(sanitizedTimeEntries);
    customerTimeEntries = filterClientTimeEntriesByCustomer(
      customerTimeEntries,
      customerWhitelist,
      customerBlacklist
    );

    const csvs = await createCsv(customerTimeEntries, fullConfig);
    if (setBilled) {
      await bulkAddBilledTag(sanitizedTimeEntries);
    }

    return httpResponse(
      200,
      `Created sheet(s) for ${customerTimeEntries.length} customer(s)`,
      {
        config,
        csv: csvs,
        customerTimeEntries: dryRun ? customerTimeEntries : null,
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
