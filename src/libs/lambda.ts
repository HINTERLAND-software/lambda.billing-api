import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';

export const middyfy = (handler) =>
  middy(handler)
    .use(jsonBodyParser())
    // .use(validator({ inputSchema }))
    .use(
      httpErrorHandler({
        logger(error) {
          try {
            console.dir(error, { depth: null, colors: true });
          } catch (error) {
            console.log(error);
          }
        },
      })
    );
