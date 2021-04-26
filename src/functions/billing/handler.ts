import 'source-map-support/register';

import { Logger, getEnvironment, clearCaches } from '@libs/utils';
import { Time } from '@libs/time';
import {
  bulkAddBilledTag,
  groupByClients,
  fetchTimeEntriesBetween,
  enrichWithTimeEntriesByDay,
} from '@libs/toggl';
import { LABEL_BILLABLE, LABEL_BILLED } from '@libs/constants';
import { createDraftInvoices } from '@libs/debitoor';
import { middyfy } from '@libs/lambda';

import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';

import schema from './schema';
import { DraftInvoiceResponse } from '@libs/debitoor-types';
import { createCsv } from '@libs/csv';

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const {
      range,
      dryRun = getEnvironment() !== 'production',
      label = LABEL_BILLABLE,
      type = 'debitoor',
    } = event.body || {};

    const time = new Time(range?.month, range?.year);

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = timeEntries.filter(
      ({ tags = '' }) => tags?.includes(label) && !tags?.includes(LABEL_BILLED)
    );

    let clients = await groupByClients(billableTimeEntries);

    let debitoor: DraftInvoiceResponse[] = null;
    let csv: any = null;
    switch (type) {
      case 'debitoor':
        if (!dryRun) {
          debitoor = await createDraftInvoices(clients, time);
        }
        break;
      case 'sheet':
        clients = enrichWithTimeEntriesByDay(clients);
        csv = createCsv(clients);
        break;
      default:
        throw new Error(`Type "${type}" not set up`);
    }

    if (!dryRun && billableTimeEntries.length) {
      await bulkAddBilledTag(billableTimeEntries);
    }

    return httpResponse(
      200,
      `Created billing task with ${clients.length} subtask${
        clients.length === 0 ? 's' : ''
      }`,
      {
        config: {
          dryRun,
          range: {
            from: time.startOfMonthFormatted,
            to: time.endOfMonthFormatted,
          },
        },
        csv: createCsv(clients),
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
