import * as contentful from 'contentful';
import { ATTACH_TIMESHEET, BILL_PER_PROJECT, BOOK, MAIL } from './constants';
import {
  TypeCompany,
  TypeCompanyFields,
  TypeCustomer,
  TypeCustomerFields,
  TypeProduct,
  TypeProductFields,
  TypeProject,
  TypeProjectFields,
  TypeResource,
  TypeResourceFields,
} from './contentful-types';
import { ContentfulCache } from './utils';

const flags = [ATTACH_TIMESHEET, BILL_PER_PROJECT, MAIL, BOOK] as const;
export type Flag = typeof flags[number];

const BASE_QUERY = {
  limit: 1000,
  locale: 'en-US',
  include: 10,
};

function initClient(): contentful.ContentfulClientApi {
  const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    space: process.env.CONTENTFUL_SPACE_ID,
    environment: process.env.CONTENTFUL_ENVIRONMENT_ID || 'master',
  });

  const getCachedEntries: contentful.ContentfulClientApi['getEntries'] = async function <
    T
  >(query?: any) {
    const cacheKey = JSON.stringify(query);
    if (ContentfulCache.has(cacheKey)) {
      return ContentfulCache.get(cacheKey);
    }
    const result = await client.getEntries<T>(query);
    ContentfulCache.set(cacheKey, result);
    return result;
  };

  return { ...client, getEntries: getCachedEntries };
}

export async function fetchCustomers(): Promise<TypeCustomer[]> {
  const client = initClient();
  const { items } = await client.getEntries<TypeCustomerFields>({
    content_type: 'customer',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchCompanies(): Promise<TypeCompany[]> {
  const client = initClient();
  const { items } = await client.getEntries<TypeCompanyFields>({
    content_type: 'company',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchProducts(): Promise<TypeProduct[]> {
  const client = initClient();
  const { items } = await client.getEntries<TypeProductFields>({
    content_type: 'product',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchProjects(): Promise<TypeProject[]> {
  const client = initClient();
  const { items } = await client.getEntries<TypeProjectFields>({
    content_type: 'project',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchResources(
  locale: 'de-DE' | 'en-US'
): Promise<TypeResource[]> {
  const client = initClient();
  const { items } = await client.getEntries<TypeResourceFields>({
    content_type: 'resource',
    ...BASE_QUERY,
    locale,
  });
  return items;
}
