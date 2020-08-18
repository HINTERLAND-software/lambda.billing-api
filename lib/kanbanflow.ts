import { fetch } from './utils';
import qs from 'querystring';
import { BOARD_PATH, BASE_URL, TASK_PATH, LABEL_BILLABLE } from '../constants';
import { Board, Swimlane, SubTask, GroupedTask, Label } from '../types';
import { Time, getTimeSpent } from './time';

export const fetchBoard = async (): Promise<Board> => {
  const result = await fetch(`${BASE_URL}/${BOARD_PATH}`);
  return result.json();
};

export const fetchTasksUntil = async (
  swimlaneId: string,
  until: string
): Promise<Swimlane[]> => {
  const querystring = qs.stringify({
    swimlaneId,
    columnName: 'Done',
    limit: 100,
    startGroupingDate: until,
  });
  const result = await fetch(`${BASE_URL}/${TASK_PATH}?${querystring}`);
  return result.json();
};

export const addTask = async (body: object): Promise<{ taskId: string }> => {
  const result = await fetch(`${BASE_URL}/${TASK_PATH}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.json();
};

export const addBilledLabel = async (
  taskId: string
): Promise<{ insertIndex: number }> => {
  const result = await fetch(`${BASE_URL}/${TASK_PATH}/${taskId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ name: 'billed' }),
  });
  return result.json();
};

export const addBillingTask = async ({
  name,
  description,
  subTasks,
  columnId,
  swimlaneId,
  targetColumnId,
  dueTimestamp,
}: {
  name: string;
  description: string;
  columnId: string;
  swimlaneId: string;
  targetColumnId: string;
  dueTimestamp: string;
  subTasks: SubTask[];
}) => {
  return addTask({
    name,
    description,
    columnId,
    swimlaneId,
    subTasks,
    position: 'top',
    color: 'yellow',
    labels: [
      {
        name: 'finance',
      },
    ],
    dates: [
      {
        dueTimestamp,
        targetColumnId,
      },
    ],
  });
};

const sanitizeLabels = (labels: Label[]): string =>
  labels
    .filter(({ name }) => name !== LABEL_BILLABLE)
    .map(({ name }) => `\`${name}\``)
    .join(', ');

const sanitizeSubTasks = (subTasks: SubTask[]): string =>
  subTasks
    .map(
      ({ name, userId, finished }) =>
        `    - ${name}${userId ? ` (${userId})` : ''} ${
          finished ? '`DONE`' : '`PENDING`'
        }`
    )
    .join('\n');

export const generateBillingTemplate = (
  grouped: [string, GroupedTask][],
  time: Time
): { name: string; description: string; subTasks: SubTask[] } => {
  return grouped.reduce(
    (acc, [customerName, { tasks, totalSecondsSpent }], i) => {
      const lines = tasks.map(
        ({
          groupingDate,
          totalSecondsSpent,
          name,
          labels = [],
          subTasks = [],
        }) => {
          const line = [
            groupingDate,
            `_${getTimeSpent(totalSecondsSpent)}_`,
            `\n${sanitizeLabels(labels)}`,
            `\n${name}`,
            `\n${sanitizeSubTasks(subTasks)}`,
          ].join(' ');
          return `  - ${line}`;
        }
      );
      const totalTimeSpent = getTimeSpent(totalSecondsSpent);
      const customerLine = `${
        i + 1
      }. *${customerName}* _${totalTimeSpent}_\n${lines.join('\n')}`;
      return {
        ...acc,
        description: `${acc?.description}\n${customerLine}`,
        subTasks: [
          ...acc?.subTasks,
          {
            name: `Bill ${customerName} (${totalTimeSpent})`,
          },
        ],
      };
    },
    {
      name: `Billing from ${time.startOfMonthFormatted} to ${time.endOfMonthFormatted}`,
      description: '*Billing entries*',
      subTasks: [],
    }
  );
};
