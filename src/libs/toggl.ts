import moment from 'moment';
import * as qs from 'querystring';
import { LABEL_BILLED } from './constants';
import { sortByDate } from './time';
import {
  ClientTimeEntries,
  Customer,
  Day,
  EnrichedProject,
  EnrichedTimeEntry,
  Project,
  TimeEntry
} from './toggl-types';
import { Cache, initFetch, Logger } from './utils';

const BASE_URL = 'https://api.track.toggl.com/api/v8';
const TIME_ENTRIES_PATH = 'time_entries';
const PROJECT_PATH = 'projects';
const CLIENT_PATH = 'clients';

const customerCache = new Cache<{ [customerId: number]: Customer }>(
  'toggl.customers',
  {}
);
const projectCache = new Cache<{ [projectId: string]: Project }>(
  'toggl.projects',
  {}
);

const fetch = initFetch(
  `Basic ${Buffer.from(`${process.env.TOGGL_API_TOKEN}:api_token`).toString(
    'base64'
  )}`
);

export const fetchTimeEntriesBetween = async (
  start: string,
  end: string
): Promise<TimeEntry[]> => {
  const querystring = qs.stringify({
    start_date: start,
    end_date: end,
  });
  const result = await fetch(`${BASE_URL}/${TIME_ENTRIES_PATH}?${querystring}`);
  return result;
};

export const filterClientTimeEntriesByCustomer = (
  ClientTimeEntries: ClientTimeEntries[],
  customerWhitelist: string[] = [],
  customerBlacklist: string[] = []
): ClientTimeEntries[] => {
  return ClientTimeEntries.filter(
    ({ customer }) =>
      (!customerWhitelist?.length ||
        customerWhitelist.includes(customer.name)) &&
      (!customerBlacklist?.length ||
        !customerBlacklist?.includes(customer.name))
  );
};

export const filterTimeEntriesByLabel = (
  timeEntries: TimeEntry[],
  labelWhitelist: string[] = [],
  labelBlacklist: string[] = []
): TimeEntry[] => {
  return timeEntries
    .filter(({ description, pid }) => {
      if (!pid || !description) {
        Logger.error(
          `Project of time entry "${description} <${pid}>" not found`
        );
      }
      return description && pid;
    })
    .filter(
      ({ tags = [] }) =>
        (!labelWhitelist?.length ||
          tags?.some((tag) => labelWhitelist.includes(tag))) &&
        (!tags?.length || tags?.every((tag) => !labelBlacklist?.includes(tag)))
    );
};

export const sanitizeTimeEntries = (timeEntries: TimeEntry[]): TimeEntry[] =>
  timeEntries.reduce(
    (acc, entry) => [
      ...acc,
      ...entry.description.split(',').map((d, i) => ({
        ...entry,
        description: d.trim(),
        duration: i === 0 ? entry.duration : 0,
      })),
    ],
    []
  );

export const fetchProject = async (projectId: string): Promise<Project> => {
  const cachedProject = projectCache.get()?.[projectId];
  if (cachedProject) return cachedProject;

  const result = await fetch(`${BASE_URL}/${PROJECT_PATH}/${projectId}`);
  const project = result?.data;
  projectCache.assign({ [projectId]: project });
  return project;
};

export const fetchClient = async (customerId: number): Promise<Customer> => {
  const cachedClient = customerCache.get()?.[customerId];
  if (cachedClient) return cachedClient;

  const result = await fetch(`${BASE_URL}/${CLIENT_PATH}/${customerId}`);
  const customer = result?.data;
  customerCache.assign({ [customerId]: customer });
  return customer;
};

export const bulkAddBilledTag = async (
  timeEntries: TimeEntry[]
): Promise<{ data: TimeEntry[] }> => {
  const timeEntryIds = timeEntries.map(({ id }) => id).join(',');
  if (!timeEntryIds) return { data: [] };
  return fetch(`${BASE_URL}/${TIME_ENTRIES_PATH}/${timeEntryIds}`, {
    method: 'PUT',
    body: JSON.stringify({
      time_entry: {
        tags: [LABEL_BILLED],
        tag_action: 'add',
      },
    }),
  });
};

const getTimeEntriesByDay = (timeEntries: EnrichedTimeEntry[]): Day[] => {
  return Object.values(
    timeEntries.reduce((acc, entry) => {
      const startDate = moment(entry.start);
      const endDate = moment(entry.stop);
      if (startDate.day() === endDate.day()) {
        const key = startDate.format('ddd YYYY/MM/DD');
        const previous = acc[key] || ({} as Day);
        const {
          totalSecondsSpent = 0,
          timeEntries = [],
          start = entry.start,
        } = previous;
        return {
          ...acc,
          [key]: {
            start,
            stop: entry.stop,
            totalSecondsSpent: totalSecondsSpent + entry.duration,
            timeEntries: [...timeEntries, entry],
          },
        };
      }
      throw new Error('Start date and end date are not the same');
    }, {} as { [date: string]: Day })
  ).sort(sortByDate);
};

interface Grouped {
  [customerId: string]: {
    customer: Customer;
    totalSecondsSpent: number;
    timeEntries: EnrichedTimeEntry[];
    timeEntriesGroupedByProject: {
      [projectId: string]: {
        project: EnrichedProject;
        totalSecondsSpent: number;
        timeEntries: EnrichedTimeEntry[];
      };
    };
  };
}

export const enrichTimeEntries = async (
  billableTimeEntries: TimeEntry[]
): Promise<ClientTimeEntries[]> => {
  const customers: Grouped = {};
  for (let i = 0; i < billableTimeEntries.length; i++) {
    const timeEntry = billableTimeEntries[i];
    const { duration, pid } = timeEntry;
    const project = await fetchProject(pid);
    const customer = await fetchClient(project.cid);

    const previousClient = customers[customer.id];
    const previousTimeEntriesGroupedByProject =
      previousClient?.timeEntriesGroupedByProject || {};
    const previousTimeEntries = previousClient?.timeEntries || [];
    const previousTotalSecondsSpent = previousClient?.totalSecondsSpent || 0;

    const {
      totalSecondsSpent: projectTotalSecondsSpent = 0,
      timeEntries: projectTimeEntries = [],
    } = previousTimeEntriesGroupedByProject[pid] || {};

    const enrichedProject = { ...project, customer };
    const enrichedTimeEntry = { ...timeEntry, project: enrichedProject };

    customers[customer.id] = {
      ...(previousClient || {}),
      customer,
      totalSecondsSpent: previousTotalSecondsSpent + duration,
      timeEntries: [...previousTimeEntries, enrichedTimeEntry].sort(sortByDate),
      timeEntriesGroupedByProject: {
        ...previousTimeEntriesGroupedByProject,
        [pid]: {
          project: enrichedProject,
          totalSecondsSpent: projectTotalSecondsSpent + duration,
          timeEntries: [...projectTimeEntries, enrichedTimeEntry].sort(
            sortByDate
          ),
        },
      },
    };
  }

  return Object.values(customers).map(
    ({ timeEntriesGroupedByProject, ...rest }) => {
      return {
        ...rest,
        projects: Object.values(timeEntriesGroupedByProject).map((project) => ({
          ...project,
          days: getTimeEntriesByDay(project.timeEntries),
        })),
        days: getTimeEntriesByDay(rest.timeEntries),
      };
    }
  );
};
