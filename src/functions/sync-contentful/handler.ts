import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import * as lexoffice from '@libs/lexoffice';
import * as toggl from '@libs/toggl';
import { clearCaches, Logger } from '@libs/utils';
import 'source-map-support/register';

const handler: ValidatedEventAPIGatewayProxyEvent<unknown> = async () => {
  try {
    await lexoffice.updateCustomers();
    await toggl.updateClients();
    await toggl.updateProjects();

    return httpResponse(
      200,
      `Updated lexoffice and toggl with contentful data`
    );
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    clearCaches();
  }
};

export const main = middyfy(handler);
