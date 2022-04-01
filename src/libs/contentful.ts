import * as contentful from 'contentful';
import { ATTACH_TIMESHEET, BILL_PER_PROJECT, BOOK, MAIL } from './constants';
import { Locale } from './types';
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

export interface ContentfulCustomer {
  name: string;
  additionalName?: string;
  taxId?: string;
  emails?: string[];
  emailCCs?: string[];
  phone?: string;
  address?: string;
  paymentTerm: number;
  language: Locale;
  notes?: contentful.RichTextContent;
  flags?: Flag[];
  countryCode?: string;
}

export interface ContentfulCompany {
  name: string;
  abbreviation: string;
  isDefault: boolean;
  website: string;
  email: string;
  logo: contentful.Asset;
  incomeTax: number;
}

export interface ContentfulProduct {
  name: string;
  type: string;
  description?: string;
  tax: number;
  netPrice: number;
  skuPrefix: string;
  skuSuffix: string;
}

export interface ContentfulResource {
  key: string;
  value: string;
}

export interface ContentfulProject {
  name: string;
  customer: contentful.Entry<ContentfulCustomer>;
  product: contentful.Entry<ContentfulProduct>;
  company: contentful.Entry<ContentfulCompany>;
}

export async function fetchCustomers(): Promise<
  contentful.Entry<ContentfulCustomer>[]
> {
  const client = initClient();
  const { items } = await client.getEntries<ContentfulCustomer>({
    content_type: 'customer',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchCompanies(): Promise<
  contentful.Entry<ContentfulCompany>[]
> {
  const client = initClient();
  const { items } = await client.getEntries<ContentfulCompany>({
    content_type: 'company',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchProducts(): Promise<
  contentful.Entry<ContentfulProduct>[]
> {
  const client = initClient();
  const { items } = await client.getEntries<ContentfulProduct>({
    content_type: 'product',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchProjects(): Promise<
  contentful.Entry<ContentfulProject>[]
> {
  const client = initClient();
  const { items } = await client.getEntries<ContentfulProject>({
    content_type: 'project',
    ...BASE_QUERY,
  });
  return items;
}

export async function fetchResources(
  locale: 'de-DE' | 'en-US'
): Promise<contentful.Entry<ContentfulResource>[]> {
  const client = initClient();
  const { items } = await client.getEntries<ContentfulResource>({
    content_type: 'resource',
    ...BASE_QUERY,
    locale,
  });
  return items;
}
