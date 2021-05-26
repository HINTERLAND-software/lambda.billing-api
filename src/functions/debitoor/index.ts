import type { AWS } from '@serverless/typescript';
import schema from '../schema';

export default {
  handler: `${__dirname.split(process.cwd())[1].substring(1)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'debitoor',
        request: {
          schema: {
            'application/json': schema,
          },
        },
      },
    },
    {
      schedule: {
        rate: 'cron(0 3 1 * ? *)', // last day of the month 9pm
        enabled: '${self:custom.enabled.${self:provider.stage}}',
      },
    },
  ],
} as AWS['functions'];
