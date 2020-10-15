import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import 'source-map-support/register';
import { httpResponse, Logger, getEnvironment, clearCaches } from './lib/utils';
import { Payload } from './types';
import { Grouped, TimeEntry } from './types-toggl';
import { Time } from './lib/time';
import {
  bulkAddBilledTag,
  fetchClient,
  fetchProject,
  fetchTimeEntriesBetween,
} from './lib/toggl';
import { LABEL_BILLABLE, LABEL_BILLED } from './constants';
import {
  fetchCustomerData,
  generateInvoiceTemplate,
  createDraftInvoice,
} from './lib/debitoor';

export const billingData: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { range = {}, dryRun = getEnvironment() !== 'production' }: Payload =
      typeof event.body === 'string'
        ? JSON.parse(event.body)
        : event.body || {};

    const time = new Time(range.month, range.year);

    const timeEntries = await fetchTimeEntriesBetween(
      time.startOfMonthISO,
      time.endOfMonthISO
    );

    const billableTimeEntries = timeEntries.filter(
      ({ tags }) =>
        tags.includes(LABEL_BILLABLE) && !tags.includes(LABEL_BILLED)
    );

    const groupedByClients: Grouped = await billableTimeEntries.reduce(
      async (acc, { duration, id, pid, ...rest }) => {
        const project = await fetchProject(pid);
        const client = await fetchClient(project.cid);

        const previous = (await acc)[client.id];
        return {
          ...(await acc),
          [client.id]: {
            ...(previous || {}),
            client,
            timeEntriesGroupedByProject: {
              [pid]: {
                project,
                totalSecondsSpent:
                  (previous?.timeEntriesGroupedByProject?.[pid]
                    ?.totalSecondsSpent || 0) + duration,
                timeEntries: [
                  ...(previous?.timeEntriesGroupedByProject?.[pid]
                    ?.timeEntries || []),
                  { duration, id, ...rest } as TimeEntry,
                ],
              },
            },
          },
        };
      },
      {} as Promise<Grouped>
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
