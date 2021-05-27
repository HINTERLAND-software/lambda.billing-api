# lambda.billing-api

This lambda fetches time entries with the label `billable` of [Toggl](https://track.toggl.com/), aggregates the data, sets the tasks to `billed` and creates draft invoices with [Debitoor](https://debitoor.de/).

## Environment variables

```bash
# Settings for the billing task
export TOGGL_API_TOKEN="<toggl_api_token>"
export DEBITOOR_API_TOKEN="<debitoor_api_token>"
```

## Payload

```jsonc
{
  // Should invoices be created
  "dryRun": true,
  "setBilled": false,
  // Optional - run for a specific range
  "range": {
    "month": 8,
    "year": 2020
  },
  // Optional - run only for specific customers
  "customerWhitelist": [
      "ACME"
  ],
  // Optional - run only for entries with specific labels
  "labels": [
    "billable"
  ]
}
```

## TODO

- [x] CiCd
- [ ] Tests
- [ ] E2E Tests
- [x] development deploy
- [x] production deploy
