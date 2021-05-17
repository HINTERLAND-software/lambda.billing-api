import nodeFetch, { RequestInit } from 'node-fetch';
import { Time } from './time';
import type { FromSchema } from 'json-schema-to-ts';
import schema from 'src/functions/schema';

export const getEnvironment = (): string => {
  const { STAGE, NODE_ENV = 'development' } = process.env;
  return STAGE || NODE_ENV;
};

const isNotTestEnv = getEnvironment() !== 'test';

export class Logger {
  static log(message?: any, ...optionalParams: any[]) {
    isNotTestEnv && console.log(message, ...optionalParams);
  }
  static info(message?: any, ...optionalParams: any[]) {
    isNotTestEnv && console.info(message, ...optionalParams);
  }
  static warn(message?: any, ...optionalParams: any[]) {
    isNotTestEnv && console.warn(message, ...optionalParams);
  }
  static error(message?: any, ...optionalParams: any[]) {
    console.error(message, ...optionalParams);
  }
}

export const initFetch = (authorization) => async (
  url: string,
  options: RequestInit = {}
): Promise<any> => {
  options.method = options.method || 'GET';

  options.headers = {
    Authorization: authorization,
    ...(options.headers || {}),
  };
  if (options.method === 'POST') {
    options.headers['Content-type'] = 'application/json';
  }

  const response = await nodeFetch(url, options);
  try {
    const json = await response.json();
    if (json['errors'] || (json['message'] && json['code']))
      return Promise.reject(json);
    return json;
  } catch (error) {
    return Promise.reject(
      `[${response.status}] - ${response.statusText} (${response.url})`
    );
  }
};

let caches = {};
export const clearCaches = () => (caches = {});
export class Cache<T> {
  constructor(private id: string, private defaultValues: T = null) {
    caches[this.id] = this.defaultValues;
  }
  clear(): void {
    caches[this.id] = this.defaultValues;
  }
  get(): T {
    return caches[this.id];
  }
  set(value: T): void {
    caches[this.id] = value;
  }
  assign(value: T): void {
    caches[this.id] = { ...caches[this.id], ...value };
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type Range = {
  month?: number;
  year?: number;
};

export type EventBody = FromSchema<typeof schema>;

export type Config = Omit<EventBody, 'dryRun' | 'range'> & {
  dryRun: boolean;
  time: Time;
  range: {
    from: string;
    to: string;
  };
};

export const getConfig = (config: EventBody = {}): Config => {
  const time = new Time(config.range?.month, config.range?.year);
  return {
    ...config,
    range: {
      from: time.startOfMonthFormatted,
      to: time.endOfMonthFormatted,
    },
    dryRun: config.dryRun !== undefined ?? getEnvironment() !== 'production',
    time,
  };
};
