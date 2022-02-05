import type { AWS } from '@serverless/typescript';
import * as functions from './src/functions';

const serverlessConfiguration: AWS = {
  service: '${file(./package.json):name}',
  frameworkVersion: '2',
  useDotenv: true,
  plugins: [
    'serverless-webpack',
    'serverless-plugin-aws-alerts',
    'serverless-domain-manager',
    'serverless-offline',
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x' as any,
    region: '${env:AWS_REGION}' as AWS['provider']['region'],
    logRetentionInDays: 30,
    stage: '${opt:stage, env:ENV}', // you can override this via the CLI argument
    apiGateway: {
      minimumCompressionSize: 1024, // Enable gzip compression for responses > 1 KB
      shouldStartNameWithService: true,
      apiKeys: ['${self:service}-key-${self:provider.stage}'],
      usagePlan: {
        quota: { limit: 2000, period: 'MONTH' },
        throttle: { burstLimit: 10, rateLimit: 5 },
      },
    },
    environment: {
      TZ: 'Europe/Berlin',
      // Service wide environment variables
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      STAGE: '${self:provider.stage}',
      TOGGL_API_TOKEN: '${env:TOGGL_API_TOKEN}',
      DEBITOOR_API_TOKEN: '${env:DEBITOOR_API_TOKEN}',
      CONTENTFUL_SPACE_ID: '${env:CONTENTFUL_SPACE_ID}',
      CONTENTFUL_ACCESS_TOKEN: '${env:CONTENTFUL_ACCESS_TOKEN}',
      CONTENTFUL_ENVIRONMENT_ID: '${env:CONTENTFUL_ENVIRONMENT_ID}',
    },
    lambdaHashingVersion: '20201221',
  },
  custom: {
    enabled: { development: false, production: true },
    webpack: { webpackConfig: './webpack.config.js', includeModules: true },
    customDomain: {
      // https://github.com/amplify-education/serverless-domain-manager
      basePath: 'lambda-billing',
      domainName: '${env:CUSTOM_DOMAIN}',
      createRoute53Record: false,
    },
    alerts: {
      // https://github.com/ACloudGuru/serverless-plugin-aws-alerts
      topics: {
        alarm: {
          topic:
            'arn:aws:sns:eu-central-1:009255630476:alert-Topic-N47IM5J07MP7',
        },
      },
      definitions: {
        // these defaults are merged with your definitions
        functionErrors: { treatMissingData: 'notBreaching', period: 300 },
        functionInvocations: {
          threshold: 50,
          treatMissingData: 'notBreaching',
          period: 300,
        },
        statusCodeErrors: {
          metric: 'statusCodeErrors',
          threshold: 0,
          statistic: 'Sum',
          period: 300,
          evaluationPeriods: 1,
          comparisonOperator: 'GreaterThanThreshold',
          pattern: '{$.statusCode != 200}',
          treatMissingData: 'missing',
        },
      },
      alarms: [
        {
          name: 'functionErrors',
          enabled: '${self:custom.enabled.${self:provider.stage}}',
        },
        { name: 'functionInvocations', enabled: true },
        {
          name: 'statusCodeErrors',
          enabled: '${self:custom.enabled.${self:provider.stage}}',
        },
      ],
    },
  },
  functions,
};

module.exports = serverlessConfiguration;
