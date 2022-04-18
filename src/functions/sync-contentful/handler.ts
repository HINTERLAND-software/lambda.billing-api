import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';
import {
  updateDebitoorCustomers,
  updateDebitoorProducts,
} from '@libs/debitoor';
import { middyfy } from '@libs/lambda';
import { updateTogglClients, updateTogglProjects } from '@libs/toggl';
import { clearCaches, Logger } from '@libs/utils';
import 'source-map-support/register';

const handler: ValidatedEventAPIGatewayProxyEvent<unknown> = async () => {
  try {
    await updateDebitoorProducts();
    await updateDebitoorCustomers();
    await updateTogglClients();
    await updateTogglProjects();

    return httpResponse(200, `Updated debitoor and toggl with contentful data`);
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    clearCaches();
  }
};

export const main = middyfy(handler);
