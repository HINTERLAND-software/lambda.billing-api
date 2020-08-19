import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import 'source-map-support/register';
import { httpResponse, Logger, getEnvironment } from './lib/utils';
import { Payload, Task, Grouped } from './types';
import { Time } from './lib/time';
import {
  fetchBoard,
  fetchTasksUntil,
  addBilledLabel,
  generateBillingTemplate,
  addBillingTask,
} from './lib/kanbanflow';
import { LABEL_BILLABLE, LABEL_BILLED, LABEL_CX_PREFIX } from './constants';
import {
  clearCache,
  fetchCustomerData,
  generateInvoiceTemplate,
  createDraftInvoice,
} from './lib/debitoor';

export const billingData: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { range = {}, dryRun = getEnvironment() !== 'production' }: Payload =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const time = new Time(range.month, range.year);

    const groupedByCustomers: Grouped = await aggregateTasks(time);

    const grouped = Object.entries(groupedByCustomers);

    let createdDraftInvoices = null;
    let createdBillingTask = null;
    if (!dryRun) {
      createdDraftInvoices = await Promise.all(
        grouped.map(async ([cx, { tasks = [] }]) => {
          try {
            const data = await fetchCustomerData(cx);
            const request = generateInvoiceTemplate(data, time, tasks);
            const response = await createDraftInvoice(request);
            await Promise.all(
              tasks.map(async ({ _id }) => addBilledLabel(_id))
            );
            return {
              customer: cx,
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
              customer: cx,
              ...error,
            };
          }
        })
      );

      const template = generateBillingTemplate(grouped, time);
      const { taskId } = await addBillingTask({
        ...template,
        dueTimestamp: time.dueTimestamp,
      });
      createdBillingTask = `https://kanbanflow.com/t/${taskId}`;
    }

    clearCache();
    return httpResponse(
      200,
      `Created billing task with ${grouped.length} subtask${
        grouped.length === 1 ? 's' : ''
      }`,
      {
        config: {
          dryRun,
          range: {
            from: time.startOfMonthFormatted,
            to: time.endOfMonthFormatted,
          },
        },
        customers: groupedByCustomers,
        createdBillingTask,
        createdDraftInvoices,
      }
    );
  } catch (error) {
    clearCache();
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  }
};

async function aggregateTasks(time: Time): Promise<Grouped> {
  const { swimlanes } = await fetchBoard();

  const results = await Promise.all(
    swimlanes.map(({ uniqueId }) =>
      fetchTasksUntil(uniqueId, time.endOfMonthFormatted)
    )
  );

  const tasks = results.reduce(
    (acc, [{ tasks }]) => [...acc, ...tasks],
    [] as Task[]
  );

  const billableTasks = tasks.filter(({ labels = [], groupingDate }) => {
    const notBilled = !labels.some(({ name }) => name === LABEL_BILLED);
    if (!notBilled) return false;
    const billable = labels.some(({ name }) => name === LABEL_BILLABLE);
    if (!billable) return false;
    const inRange = time.isBetweenStartAndEndOfMonth(groupingDate);
    return notBilled && billable && inRange;
  });

  return billableTasks.reduce(
    async (acc, { totalSecondsSpent, _id, labels, ...rest }) => {
      const customerName = (
        labels.find(({ name }) => name.startsWith(LABEL_CX_PREFIX))?.name ||
        'N/A'
      ).replace(LABEL_CX_PREFIX, '');

      const previous = (await acc)[customerName];
      return {
        ...(await acc),
        [customerName]: {
          ...(previous || {}),
          customerName,
          totalSecondsSpent:
            (previous?.totalSecondsSpent || 0) + totalSecondsSpent,
          tasks: [
            ...(previous?.tasks || []),
            {
              totalSecondsSpent,
              _id,
              labels,
              ...rest,
            },
          ],
        },
      };
    },
    {} as Promise<Grouped>
  );
}
