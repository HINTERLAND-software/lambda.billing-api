export default {
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
      default: false,
    },
    label: {
      type: 'string',
      default: 'billable',
    },
    type: {
      enum: ['debitoor', 'sheet'],
      default: 'debitoor',
    },
    range: {
      type: 'object',
      default: {},
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
