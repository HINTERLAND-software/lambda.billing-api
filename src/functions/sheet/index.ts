import type { AWS } from '@serverless/typescript';
import schema from '../schema';

export default {
  handler: `${__dirname.split(process.cwd())[1].substring(1)}/handler.main`,
  timeout: 30, // timeout 30 seconds
  events: [
    {
      http: {
        method: 'post',
        path: 'sheet',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
  ],
} as AWS['functions'];
