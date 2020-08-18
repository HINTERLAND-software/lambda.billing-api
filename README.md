# lambda.sync-estate-api

This lambda fetches estates from Immobilienscout24 or FlowFact and synchronises with Contentful.

> As the runtime is most of the time more than 30 seconds, the invocation of the Lambda is asynchronous and the request returns immediately while letting the Lambda run the tasks.

## Tasks

1. Receive payload

      ```json
      {
         "updates": {
            "created": ["5"],
            "deleted": ["1"],
            "updated": ["2", "4"]
         },
         "config": {
            "domain": "hinterland.software",
            "portal": {
               "type": "immobilienscout24",
               "version": "v1"
            },
            "contentful": {
               "estateContentTypeId": "estate",
               "environmentId": "master",
               "spaceId": "spaceId",
            }
         }
      }
      ```

2. Fetch `created` & `updated` (detailed) estates from portal

3. Parse portal estates to Contentful estate

4. Import parsed estates to Contentful

## TODO

- [x] CiCd
- [x] Tests
- [ ] E2E Tests
- [x] development d
- [x] production deploy
