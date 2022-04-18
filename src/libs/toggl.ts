import moment from 'moment';
import * as qs from 'querystring';
import { LABEL_BILLED } from './constants';
import { fetchCustomers, fetchProjects } from './contentful';
import {
  fetchDebitoorCustomerByReference,
  fetchDebitoorProductByReference,
} from './debitoor';
import { sortByDate } from './time';
import {
  ClientTimeEntries,
  Customer,
  Day,
  EnrichedTimeEntry,
  Project,
  TimeEntry,
} from './toggl-types';
import { EnrichedCustomer, EnrichedProject } from './types';
import { initFetch, Logger, sleep } from './utils';

const BASE_URL = 'https://api.track.toggl.com/api/v8';
const TIME_ENTRIES_PATH = 'time_entries';
const PROJECT_PATH = 'projects';
const WORKSPACE_PATH = 'workspaces';
const CLIENT_PATH = 'clients';
const WORKSPACE_ID = 1165756;

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
  const result = await fetch<TimeEntry[]>(
    `${BASE_URL}/${TIME_ENTRIES_PATH}?${querystring}`
  );
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
        customerWhitelist.includes(customer.contentful.name)) &&
      (!customerBlacklist?.length ||
        !customerBlacklist?.includes(customer.contentful.name))
  );
};

export const filterTimeEntriesByLabel = (
  timeEntries: TimeEntry[],
  labelWhitelist: string[] = [],
  labelBlacklist: string[] = []
): TimeEntry[] => {
  return timeEntries
    .filter(({ description, pid, id }) => {
      if (!pid || !description) {
        Logger.error(
          `Project of time entry "${description} (${id}) <project:${pid}>" not found`
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
  const result = await fetch<{ data: Project }>(
    `${BASE_URL}/${PROJECT_PATH}/${projectId}`
  );
  const project = result?.data;
  return project;
};

export const fetchClient = async (customerId: number): Promise<Customer> => {
  const result = await fetch<{ data: Customer }>(
    `${BASE_URL}/${CLIENT_PATH}/${customerId}`
  );
  const customer = result?.data;
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
    customer: EnrichedCustomer;
    project: EnrichedProject;
    totalSecondsSpent: number;
    timeEntries: EnrichedTimeEntry[];
    timeEntriesGroupedByProject: {
      [projectId: string]: {
        customer: EnrichedCustomer;
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
  let cached = false;
  for (const timeEntry of billableTimeEntries) {
    const { duration, pid } = timeEntry;

    const togglProject = await fetchProject(pid);
    if (!cached) await sleep(1000);
    const togglCustomer = await fetchClient(togglProject.cid);
    cached = true;

    const contentfulCustomers = await fetchCustomers();
    const contentfulCustomer = contentfulCustomers.find(
      ({ fields }) => togglCustomer.name === fields.name
    );

    if (!contentfulCustomer)
      throw new Error(`No contentful customer found for ${togglCustomer.name}`);

    const contentfulProjects = await fetchProjects();
    const contentfulProject = contentfulProjects.find(
      ({ fields }) => togglProject.name === fields.name
    );

    if (!contentfulProject)
      throw new Error(`No contentful project found for ${togglProject.name}`);

    const debitoorCustomer = await fetchDebitoorCustomerByReference(
      contentfulCustomer.sys.id
    );

    if (!debitoorCustomer)
      throw new Error(
        `No debitoor customer found for ${contentfulProject.fields.name}`
      );

    const debitoorProduct = await fetchDebitoorProductByReference(
      contentfulProject.fields.product.sys.id
    );

    if (!debitoorProduct)
      throw new Error(
        `No debitoor product found for ${contentfulProject.fields.product.fields.name}`
      );

    const customer: EnrichedCustomer = {
      toggl: togglCustomer,
      contentful: contentfulCustomer.fields,
      debitoor: debitoorCustomer,
    };

    const project: EnrichedProject = {
      toggl: togglProject,
      contentful: contentfulProject.fields,
      customer,
      product: {
        contentful: contentfulProject.fields.product.fields,
        debitoor: debitoorProduct,
      },
    };

    const previousClient = customers[togglCustomer.id];
    const previousTimeEntriesGroupedByProject =
      previousClient?.timeEntriesGroupedByProject || {};
    const previousTimeEntries = previousClient?.timeEntries || [];
    const previousTotalSecondsSpent = previousClient?.totalSecondsSpent || 0;

    const {
      totalSecondsSpent: projectTotalSecondsSpent = 0,
      timeEntries: projectTimeEntries = [],
    } = previousTimeEntriesGroupedByProject[pid] || {};

    const enrichedTimeEntry = {
      ...timeEntry,
      project,
      customer,
    };

    customers[togglCustomer.id] = {
      ...(previousClient || {}),
      customer,
      project,
      totalSecondsSpent: previousTotalSecondsSpent + duration,
      timeEntries: [...previousTimeEntries, enrichedTimeEntry].sort(sortByDate),
      timeEntriesGroupedByProject: {
        ...previousTimeEntriesGroupedByProject,
        [pid]: {
          project,
          customer,
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

export async function updateTogglClients() {
  const togglClients = await fetch<Customer[]>(`${BASE_URL}/${CLIENT_PATH}`);
  const customers = await fetchCustomers();

  for (const customer of customers) {
    const togglClient = togglClients.find(
      ({ name, notes }) =>
        notes === customer.sys.id || customer.fields.name === name
    );

    const payload = {
      name: customer.fields.name,
      wid: WORKSPACE_ID,
      notes: customer.sys.id,
    };
    if (
      !togglClient ||
      togglClient?.name !== payload.name ||
      togglClient?.wid !== payload.wid ||
      togglClient?.notes !== payload.notes
    ) {
      await sleep(1000);
      await fetch(
        `${BASE_URL}/${CLIENT_PATH}${togglClient ? `/${togglClient.id}` : ''}`,
        {
          method: togglClient ? 'PUT' : 'POST',
          body: JSON.stringify({
            client: payload,
          }),
        }
      );
    }
  }
}

export async function updateTogglProjects() {
  const togglClients = await fetch<Customer[]>(`${BASE_URL}/${CLIENT_PATH}`);
  await sleep(1000);
  const togglProjects = await fetch<Project[]>(
    `${BASE_URL}/${WORKSPACE_PATH}/${WORKSPACE_ID}/${PROJECT_PATH}`
  );
  const projects = await fetchProjects();
  for (const project of projects) {
    const togglClient = togglClients.find(
      ({ notes }) => notes === project.fields.customer.sys.id
    );
    const togglProject = togglProjects.find(
      ({ name, cid }) => cid === togglClient.id && project.fields.name === name
    );
    const payload = {
      name: project.fields.name,
      wid: togglClient.wid,
      cid: togglClient.id,
      is_private: true,
    };
    if (
      !togglProject ||
      togglProject?.name !== payload.name ||
      togglProject?.wid !== payload.wid ||
      togglProject?.cid !== payload.cid ||
      togglProject?.is_private !== payload.is_private
    ) {
      await sleep(1000);
      await fetch(
        `${BASE_URL}/${PROJECT_PATH}${
          togglProject ? `/${togglProject.id}` : ''
        }`,
        {
          method: togglProject ? 'PUT' : 'POST',
          body: JSON.stringify({
            project: payload,
          }),
        }
      );
    }
  }
}
