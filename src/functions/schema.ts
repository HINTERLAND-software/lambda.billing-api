export default {
  type: 'object',
  additionalProperties: false,
  properties: {
    dryRun: {
      type: 'boolean',
      default: false,
    },
    label: {
      type: 'string',
    },
    clientWhitelist: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    range: {
      additionalProperties: false,
      type: 'object',
      properties: {
        month: {
          type: 'integer',
        },
        year: {
          type: 'integer',
        },
      },
    },
  },
} as const;
