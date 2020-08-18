# lambda.billing-api

This lambda fetches tasks in the `Done` column of a [Kanbanflow](https://kanbanflow.com/) board, aggregates the data and creates a billing task.

## Payload

      ```json
      {
        "newTask": {
          "columnId": "<column_id>",
          "swimlaneId": "<swimlane_id>",
          "targetColumnId": "1UYVwzWstjha"
        },
        "dryRun": true,
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
