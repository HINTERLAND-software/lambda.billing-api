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
import { LABEL_BILLABLE, LABEL_BILLED, LABEL_PREFIX } from './constants';

export const billingData: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const {
      newTask,
      range = {},
      dryRun = getEnvironment() !== 'production',
    }: Payload =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const time = new Time(range.month, range.year);

    const groupedByCustomers: Grouped = await aggregateTasks(time);

    const grouped = Object.entries(groupedByCustomers);

    if (!dryRun) {
      await Promise.all(
        grouped.map(async ([_, { tasks = [] }]) =>
          Promise.all(tasks.map(async ({ _id }) => addBilledLabel(_id)))
        )
      );

      const template = generateBillingTemplate(grouped, time);
      await addBillingTask({
        ...template,
        ...newTask,
        dueTimestamp: time.dueTimestamp,
      });
    }

    return httpResponse(
      200,
      `Created billing task with ${grouped.length} subtask${
        grouped.length === 1 ? 's' : ''
      }`,
      {
        config: {
          range: {
            from: time.startOfMonthFormatted,
            to: time.endOfMonthFormatted,
          },
          dryRun,
        },
        customers: groupedByCustomers,
      }
    );
  } catch (error) {
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
    const billable = labels.some(({ name }) => name === LABEL_BILLABLE);
    const inRange = time.isBetweenStartAndEndOfMonth(groupingDate);
    return notBilled && billable && inRange;
  });

  return billableTasks.reduce(
    async (acc, { totalSecondsSpent, _id, labels, ...rest }) => {
      const customerName = (
        labels.find(({ name }) => name.startsWith(LABEL_PREFIX))?.name || 'N/A'
      ).replace(LABEL_PREFIX, '');

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
