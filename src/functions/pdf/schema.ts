export default {
  type: 'object',
  additionalProperties: false,
  properties: {
    replacements: {
      additionalProperties: true,
      type: 'object',
    },
  },
} as const;
