export const BASE_URL = 'https://kanbanflow.com/api/v1';
export const TASK_PATH = 'tasks';
export const BOARD_PATH = 'board';
export const AUTH = `Basic ${Buffer.from(
  `apiToken:${process.env.API_TOKEN}`
).toString('base64')}`;

export const LABEL_BILLABLE = 'billable';
export const LABEL_BILLED = 'billed';
export const LABEL_PREFIX = 'cx:';
