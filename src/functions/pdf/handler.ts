import 'source-map-support/register';

import { Logger, clearCaches } from '@libs/utils';
import { middyfy } from '@libs/lambda';
import puppeteer from 'puppeteer';

import {
  httpResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from '@libs/apiGateway';

import schema from './schema';
import { fetchDraftInvoiceAsHtml } from '@libs/debitoor';

declare const document: any;

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  try {
    const {
      pathParameters: { draftInvoiceId },
      body: { replacements },
    } = event;

    const html = Object.entries(replacements).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(key, 'g'), value),
      await fetchDraftInvoiceAsHtml(draftInvoiceId)
    );

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const elementHandle = await page.$('body iframe');
    const frame = await elementHandle.contentFrame();
    await frame.waitForSelector('div.page-canvas');

    await frame.evaluate(() => {
      for (const element of document.body.querySelectorAll('div.page-frame')) {
        element.style.border = 'none';
      }
    });

    const buffer = await page.pdf({ format: 'a4' });

    await browser.close();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Invoice_${draftInvoiceId}.pdf`,
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    Logger.error(error);
    return httpResponse(error.statusCode, error.message, error);
  } finally {
    clearCaches();
  }
};

export const main = middyfy(handler);
