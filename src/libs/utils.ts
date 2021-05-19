import nodeFetch, { RequestInit } from 'node-fetch';
import { Time } from './time';
import type { FromSchema } from 'json-schema-to-ts';
import schema from 'src/functions/schema';
import translations, { Locale } from '../translations';

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
  options: RequestInit = {},
  jsonResponse = true
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
    const json = await (jsonResponse ? response.json() : response.text());
    if (json['errors'] || (json['message'] && json['code']))
      return Promise.reject(json);

    return json;
  } catch (error) {
    Logger.error(error);
    return Promise.reject(
      `[${response.status}] - ${response.statusText} (${response.url})`
    );
  } finally {
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

export type Config = {
  time: Time;
  dryRun: boolean;
  range: {
    from: string;
    to: string;
  };
};

export const getConfig = <T extends EventBody>(
  event?: T
): Omit<EventBody, 'dryRun' | 'range'> & Config => {
  const time = new Time(event?.range?.month, event?.range?.year);
  return {
    ...(event || {}),
    range: {
      from: time.startOfMonthFormatted,
      to: time.endOfMonthFormatted,
    },
    dryRun: event.dryRun ?? getEnvironment() !== 'production',
    time,
  };
};

export const translate = (
  locale: Locale,
  key: string,
  replacements: Record<string, string | number> = {}
): string => {
  if (!translations[locale]) {
    throw new Error(
      `Translation locale "${locale}" not found, must be one of ${Object.keys(
        translations
      ).join(', ')}`
    );
  }
  const [, translation] = Object.entries(translations[locale]).find(
    ([translationKey]) => translationKey === key
  );
  if (!translation) {
    throw new Error(
      `Translation key "${key}" not found, must be one of ${Object.keys(
        translations[locale]
      ).join(', ')}`
    );
  }
  return Object.entries(replacements).reduce(
    (acc, [key, value]) =>
      acc.replace(new RegExp(`{{${key}}}`, 'g'), `${value}`),
    translation
  );
};
