# lambda.billing-api

This lambda fetches tasks with the label `billable` in the `Done` column (grouped by date) of a [Kanbanflow](https://kanbanflow.com/) board, aggregates the data, sets the tasks to `billed`, creates a billing task and draft invoices with [Debitoor](https://debitoor.de/).

## Environment variables

```bash
# Settings for the billing task
export COLUMN_ID="<column_id>"
export SWIMLANE_ID="<swimlane_id>"
export TARGET_COLUMN_ID="<target_column_id>"

export KANBANFLOW_API_TOKEN="<kanbanflow_api_token>"
export DEBITOOR_API_TOKEN="<debitoor_api_token>"
```

## Payload

```jsonc
{
  // Should the kanbanflow tasks be updated, a billing task and invoices be created
  "dryRun": true,
  // Optional - run for a specific range
  "range": {
    "month": 8,
    "year": 2020
  }
}
```

## TODO

- [x] CiCd
- [ ] Tests
- [ ] E2E Tests
- [x] development deploy
- [x] production deploy
