export default {
  type: 'object',
  additionalProperties: false,
  properties: {
    dryRun: {
      type: 'boolean',
      default: false,
    },
    setBilled: {
      type: 'boolean',
      default: false,
    },
    labels: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    customerWhitelist: {
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
