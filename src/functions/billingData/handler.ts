import 'source-map-support/register';

import { Logger, getEnvironment, clearCaches } from '@libs/utils';
import { Grouped, TimeEntry } from '@libs/toggl-types';
import { Time } from '@libs/time';
import {
  bulkAddBilledTag,
  fetchClient,
  fetchProject,
  fetchTimeEntriesBetween,
} from '@libs/toggl';
import { LABEL_BILLABLE, LABEL_BILLED } from '@libs/constants';
import {
  fetchCustomerData,
  generateInvoiceTemplate,
  createDraftInvoice,
} from '@libs/debitoor';
import { middyfy } from '@libs/lambda';

import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';

import schema from './schema';

const getGroupedByClients = async (
  billableTimeEntries: TimeEntry[]
): Promise<Grouped> => {
  const grouped: Grouped = {};
  for (let i = 0; i < billableTimeEntries.length; i++) {
    const { duration, id, pid, ...rest } = billableTimeEntries[i];
    const project = await fetchProject(pid);
    const client = await fetchClient(project.cid);

    const previous = grouped[client.id];

    grouped[client.id] = {
      ...(previous || {}),
      client,
      timeEntriesGroupedByProject: {
        [pid]: {
          project,
          totalSecondsSpent:
            (previous?.timeEntriesGroupedByProject?.[pid]?.totalSecondsSpent ||
              0) + duration,
          timeEntries: [
            ...(previous?.timeEntriesGroupedByProject?.[pid]?.timeEntries ||
              []),
            { duration, id, ...rest } as TimeEntry,
          ],
        },
      },
    };
  }
  return grouped;
};

const billingData: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const {
      range = {},
      dryRun = getEnvironment() !== 'production',
    } = event.body;

    const time = new Time(range.month, range.year);

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = timeEntries.filter(
      ({ tags = '' }) =>
        tags?.includes(LABEL_BILLABLE) && !tags?.includes(LABEL_BILLED)
    );

    const groupedByClients: Grouped = await getGroupedByClients(
      billableTimeEntries
    );

    const grouped = Object.values(groupedByClients);

    let createdDraftInvoices = null;
    if (!dryRun) {
      createdDraftInvoices = await Promise.all(
        grouped.map(async (groupedTimeEntries) => {
          try {
            const data = await fetchCustomerData(
              groupedTimeEntries.client.name
            );
            const request = generateInvoiceTemplate(
              data,
              time,
              groupedTimeEntries.timeEntriesGroupedByProject
            );
            const response = await createDraftInvoice(request);
            return {
              groupedTimeEntries,
              data,
              id: response.id,
              number: response.number,
              date: response.date,
              dueDate: response.dueDate,
              totalNetAmount: response.totalNetAmount,
              totalTaxAmount: response.totalTaxAmount,
              totalGrossAmount: response.totalGrossAmount,
            };
          } catch (error) {
            return {
              groupedTimeEntries,
              ...error,
            };
          }
        })
      );

      if (billableTimeEntries.length) {
        await bulkAddBilledTag(billableTimeEntries);
      }
    }

    return httpResponse(
      200,
      `Created billing task with ${grouped.length} subtask${
        grouped.length === 0 ? 's' : ''
      }`,
      {
        config: {
          dryRun,
          range: {
            from: time.startOfMonthFormatted,
            to: time.endOfMonthFormatted,
          },
        },
        clients: groupedByClients,
        createdDraftInvoices,
      }
    );
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    clearCaches();
  }
};

export const main = middyfy(billingData);
