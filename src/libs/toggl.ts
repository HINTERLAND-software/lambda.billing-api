import { Cache, initFetch } from './utils';
import * as qs from 'querystring';
import { LABEL_BILLED } from './constants';
import { TimeEntry, Project, Client } from './toggl-types';

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
