import type { AWS } from '@serverless/typescript';

export default {
  handler: `${__dirname.split(process.cwd())[1].substring(1)}/handler.main`,
  timeout: 6, // timeout 6 seconds
  events: [
    {
      http: {
        method: 'post',
        path: 'sync-contentful',
      },
    },
  ],
} as AWS['functions'];
