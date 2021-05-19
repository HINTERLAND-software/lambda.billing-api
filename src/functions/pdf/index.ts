import type { AWS } from '@serverless/typescript';
import schema from './schema';

export default {
  handler: `${__dirname.split(process.cwd())[1].substring(1)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'pdf/{draftInvoiceId}',
        request: {
          schema: {
            'application/json': schema,
          },
        },
      },
    },
  ],
} as AWS['functions'];
