import { APIGatewayProxyResult } from 'aws-lambda';
import nodeFetch, { RequestInit } from 'node-fetch';

export const httpResponse = (
  statusCode: number = 400,
  message: string,
  result?: any
): APIGatewayProxyResult => {
  Logger.log(JSON.stringify({ statusCode, message, result }, null, 2));
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': '*',
    },
    body: JSON.stringify({
      message,
      result,
    }),
  };
};

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
  const json = await response.json();
  if (json['errors'] || (json['message'] && json['code']))
    return Promise.reject(json);
  return json;
};
