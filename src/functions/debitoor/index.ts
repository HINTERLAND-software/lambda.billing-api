import type { AWS } from '@serverless/typescript';
import schema from '../schema';

export default {
  handler: `${__dirname.split(process.cwd())[1].substring(1)}/handler.main`,
  timeout: 60, // timeout 1 min
  events: [
    {
      http: {
        method: 'post',
        path: 'debitoor',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
    {
      schedule: {
        rate: 'cron(0 3 1 * ? *)', // last day of the month 9pm
        enabled: '${self:custom.enabled.${self:provider.stage}}',
        input: {
          usePreviousMonth: true,
        },
      },
    },
  ],
} as AWS['functions'];
