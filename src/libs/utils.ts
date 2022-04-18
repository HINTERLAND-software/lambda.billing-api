import type { FromSchema } from 'json-schema-to-ts';
import nodeFetch, { RequestInit } from 'node-fetch';
import schema from 'src/functions/schema';
import { fetchResources } from './contentful';
import { TypeResource } from './contentful-types';
import { getLastMonth, Time } from './time';
import { ClientTimeEntries, ProjectTimeEntries } from './toggl-types';
import { Locale } from './types';

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

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const FetchCache = new Map();
export const ContentfulCache = new Map();
export function clearCaches() {
  FetchCache.clear();
  ContentfulCache.clear();
}

export const initFetch = (authorization: string) => async <T>(
  url: string,
  options: RequestInit = {},
  jsonResponse = true
): Promise<T> => {
  options.method = options.method || 'GET';

  options.headers = {
    Authorization: authorization,
    ...(options.headers || {}),
  };
  if (['POST', 'PUT', 'PATCH'].includes(options.method)) {
    options.headers['Content-type'] =
      options.headers['Content-type'] || 'application/json';
  }

  const cacheKey = JSON.stringify({ url, options });
  if (FetchCache.has(cacheKey)) {
    return FetchCache.get(cacheKey);
  }
  const response = await nodeFetch(url, options);
  try {
    const res = await (jsonResponse ? response.json() : response.text());
    if (res['errors'] || (res['message'] && res['code']))
      return Promise.reject({ ...res, url });

    FetchCache.set(cacheKey, res);
    return res;
  } catch (error) {
    Logger.error(error);
    return Promise.reject(
      `[${response.status}] - ${response.statusText} (${response.url})`
    );
  }
};
export const download = async (url: string): Promise<NodeJS.ReadableStream> => {
  const response = await nodeFetch(url.replace(/^\/\//, 'https://'));
  if (!response.ok)
    throw new Error(`unexpected response ${response.statusText}`);
  return response.body;
};

export const uniquify = <T>(arr: T[]): T[] => [...new Set(arr)];

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type Range = {
  month?: number;
  year?: number;
};

export type EventBody = FromSchema<typeof schema>;

export type Config = Omit<EventBody, 'dryRun' | 'range'> & {
  time: Time;
  dryRun: boolean;
  setBilled: boolean;
  range: {
    from: string;
    to: string;
  };
};

export const getConfig = <T extends EventBody>(
  body?: T,
  usePreviousMonth?: boolean
): Config => {
  const month =
    body?.range?.month ?? (usePreviousMonth ? getLastMonth() : undefined);

  const time = new Time({ ...(body?.range || {}), month });

  const isProduction = getEnvironment() === 'production';
  return {
    ...(body || {}),
    range: {
      from: time.fromDateFormatted,
      to: time.toDateFormatted,
    },
    dryRun: body?.dryRun ?? !isProduction,
    setBilled: body?.setBilled ?? isProduction,
    time,
  };
};

export type Replacements = Record<string, string | number>;

export async function initTranslate(locale: Locale = 'de') {
  const translations = await fetchResources(
    locale === 'de' ? 'de-DE' : 'en-US'
  );
  if (!translations?.length) {
    throw new Error(`Translation locale "${locale}" not found`);
  }
  return function (key: string, replacements?: Replacements) {
    return translate(translations, key, replacements);
  };
}

const translate = (
  translations: TypeResource[],
  key: string,
  replacements: Replacements = {}
): string => {
  const translation = translations.find(({ fields }) => fields.key === key);
  if (!translation) {
    throw new Error(
      `Translation key "${key}" not found, must be one of ${translations
        .map(({ fields }) => fields.key)
        .join(', ')}`
    );
  }
  return Object.entries(replacements).reduce(
    (acc, [key, value]) =>
      acc.replace(new RegExp(`{{${key}}}`, 'g'), `${value}`),
    translation.fields.value
  );
};

export function isClientTimeEntries(
  timeEntries: ClientTimeEntries | ProjectTimeEntries
): timeEntries is ClientTimeEntries {
  return (<ClientTimeEntries>timeEntries).customer !== undefined;
}
