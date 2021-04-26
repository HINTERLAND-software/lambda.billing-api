import { Cache, initFetch } from './utils';
import * as qs from 'querystring';
import { LABEL_BILLED } from './constants';
import {
  TimeEntry,
  Project,
  Client,
  Grouped,
  GroupedTimeEntries,
  Day,
} from './toggl-types';
import moment from 'moment';
import { sortByDate } from './time';

const BASE_URL = 'https://api.track.toggl.com/api/v8';
const TIME_ENTRIES_PATH = 'time_entries';
const PROJECT_PATH = 'projects';
const CLIENT_PATH = 'clients';

const clientCache = new Cache<{ [clientId: number]: Client }>(
  'toggl.clients',
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

export const fetchProject = async (projectId: string): Promise<Project> => {
  const cachedProject = projectCache.get()?.[projectId];
  if (cachedProject) return cachedProject;

  const result = await fetch(`${BASE_URL}/${PROJECT_PATH}/${projectId}`);
  const project = result?.data;
  projectCache.assign({ [projectId]: project });
  return project;
};

export const fetchClient = async (clientId: number): Promise<Client> => {
  const cachedClient = clientCache.get()?.[clientId];
  if (cachedClient) return cachedClient;

  const result = await fetch(`${BASE_URL}/${CLIENT_PATH}/${clientId}`);
  const client = result?.data;
  clientCache.assign({ [clientId]: client });
  return client;
};

export const bulkAddBilledTag = async (
  timeEntries: TimeEntry[]
): Promise<{ data: TimeEntry[] }> => {
  const timeEntryIds = timeEntries.map(({ id }) => id).join(',');
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

export const groupByClients = async (
  billableTimeEntries: TimeEntry[]
): Promise<GroupedTimeEntries[]> => {
  const clients: Grouped = {};
  for (let i = 0; i < billableTimeEntries.length; i++) {
    const { duration, id, pid, ...rest } = billableTimeEntries[i];
    const project = await fetchProject(pid);
    const client = await fetchClient(project.cid);

    const previous = clients[client.id];
    const { totalSecondsSpent = 0, timeEntries = [] } =
      previous?.timeEntriesGroupedByProject?.[pid] || {};

    clients[client.id] = {
      ...(previous || {}),
      client,
      timeEntriesGroupedByProject: {
        [pid]: {
          project,
          totalSecondsSpent: totalSecondsSpent + duration,
          timeEntries: [...timeEntries, { duration, id, ...rest } as TimeEntry],
        },
      },
    };
  }

  return Object.values(clients).map(
    ({ client, timeEntriesGroupedByProject }) => {
      return {
        client,
        projects: Object.values(timeEntriesGroupedByProject).map((project) => ({
          ...project,
          timeEntries: project.timeEntries.sort(sortByDate),
        })),
      };
    }
  );
};

export const enrichWithTimeEntriesByDay = (
  clients: GroupedTimeEntries[]
): GroupedTimeEntries[] => {
  return clients.map((client) => ({
    ...client,
    projects: client.projects.map((project) => ({
      ...project,
      timeEntriesPerDay: Object.values(
        project.timeEntries.reduce((acc, entry) => {
          const startDate = moment(entry.start);
          const endDate = moment(entry.stop);
          if (startDate.day === endDate.day) {
            const key = startDate.format('ddd DD.MM.YYYY');
            const previous = acc[key] || ({} as Day);
            const {
              totalSecondsSpent = 0,
              timeEntries = [],
              start = startDate.toISOString(),
            } = previous;
            return {
              ...acc,
              [key]: {
                date: key,
                start,
                stop: endDate.toISOString(),
                totalSecondsSpent: totalSecondsSpent + entry.duration,
                timeEntries: [...timeEntries, entry],
              },
            };
          }
          throw new Error('Start day and end day are not the same');
        }, {} as { [date: string]: Day })
      ).sort(sortByDate),
    })),
  }));
};
