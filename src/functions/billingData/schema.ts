export default {
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
      default: false,
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
  required: [],
} as const;
